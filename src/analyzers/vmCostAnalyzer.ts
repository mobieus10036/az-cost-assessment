/**
 * VM Cost Analyzer
 * Analyzes individual VM costs, usage patterns, and generates optimization recommendations
 */

import { CostManagementClient } from '@azure/arm-costmanagement';
import { ComputeManagementClient, VirtualMachine } from '@azure/arm-compute';
import { DefaultAzureCredential } from '@azure/identity';
import { 
    VMCostAnalysis, 
    MonthlyVMCost, 
    VMCostRecommendation, 
    VMCostSummary,
    DailyCostEntry 
} from '../models/vmCostAnalysis';
import { configService } from '../utils/config';
import { logInfo, logWarning, logError } from '../utils/logger';

export class VMCostAnalyzer {
    private costClient: CostManagementClient;
    private computeClient: ComputeManagementClient;
    private subscriptionId: string;
    private scope: string;
    private credential: DefaultAzureCredential;

    private static readonly API_DELAY_MS = 3000;
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_DELAY_MS = 10000;

    constructor() {
        this.credential = new DefaultAzureCredential();
        const azureConfig = configService.getAzureConfig();
        this.subscriptionId = azureConfig.subscriptionId;
        this.scope = azureConfig.scope;
        this.costClient = new CostManagementClient(this.credential);
        this.computeClient = new ComputeManagementClient(this.credential, this.subscriptionId);
    }

    public async analyzeVMCosts(days: number = 90): Promise<VMCostSummary> {
        logInfo(`Starting VM cost analysis for the past ${days} days`);

        try {
            const vmDailyCosts = await this.getVMDailyCosts(days);
            const vmMetadata = await this.getVMMetadata();
            
            const vmAnalyses: VMCostAnalysis[] = [];
            
            for (const [resourceId, dailyCosts] of vmDailyCosts.entries()) {
                const metadata = vmMetadata.get(resourceId.toLowerCase());
                const analysis = this.analyzeIndividualVM(resourceId, dailyCosts, metadata, days);
                vmAnalyses.push(analysis);
            }

            vmAnalyses.sort((a, b) => b.totalCost - a.totalCost);
            const summary = this.createSummary(vmAnalyses);
            
            logInfo(`VM cost analysis complete: ${vmAnalyses.length} VMs analyzed, $${summary.totalPotentialSavings.toFixed(2)} potential monthly savings identified`);
            
            return summary;
        } catch (error) {
            logError(`Failed to analyze VM costs: ${error}`);
            throw error;
        }
    }

    private async getVMDailyCosts(days: number): Promise<Map<string, DailyCostEntry[]>> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const query = {
            type: 'ActualCost' as const,
            timeframe: 'Custom' as const,
            timePeriod: {
                from: startDate,
                to: endDate
            },
            dataset: {
                granularity: 'Daily' as const,
                aggregation: {
                    totalCost: { name: 'Cost', function: 'Sum' as const }
                },
                grouping: [
                    { type: 'Dimension' as const, name: 'ResourceId' },
                    { type: 'Dimension' as const, name: 'ResourceGroupName' }
                ],
                filter: {
                    dimensions: {
                        name: 'MeterCategory',
                        operator: 'In' as const,
                        values: ['Virtual Machines']
                    }
                }
            }
        };

        logInfo('Querying VM costs from Azure Cost Management API...');
        
        const result = await this.executeQueryWithRetry(query);
        return this.parseDailyCostsByVM(result);
    }

    private async executeQueryWithRetry(query: any): Promise<any> {
        let lastError: Error | undefined;
        
        for (let attempt = 1; attempt <= VMCostAnalyzer.MAX_RETRIES; attempt++) {
            try {
                await this.delay(VMCostAnalyzer.API_DELAY_MS);
                const result = await this.costClient.query.usage(this.scope, query);
                return result;
            } catch (error: any) {
                lastError = error;
                
                if (error.statusCode === 429 || error.message?.includes('Too many requests')) {
                    const retryDelay = VMCostAnalyzer.RETRY_DELAY_MS * attempt;
                    logWarning(`Rate limited (429). Retry ${attempt}/${VMCostAnalyzer.MAX_RETRIES} after ${retryDelay}ms`);
                    await this.delay(retryDelay);
                } else {
                    throw error;
                }
            }
        }
        
        throw lastError;
    }

    private parseDailyCostsByVM(result: any): Map<string, DailyCostEntry[]> {
        const vmCosts = new Map<string, DailyCostEntry[]>();
        
        if (!result?.rows || result.rows.length === 0) {
            logWarning('No VM cost data returned from API');
            return vmCosts;
        }

        const columns = result.columns || [];
        const costIndex = columns.findIndex((c: any) => c.name === 'Cost');
        const resourceIdIndex = columns.findIndex((c: any) => c.name === 'ResourceId');
        const resourceGroupIndex = columns.findIndex((c: any) => c.name === 'ResourceGroupName');
        const dateIndex = columns.findIndex((c: any) => c.name === 'UsageDate');

        for (const row of result.rows) {
            const cost = parseFloat(row[costIndex]) || 0;
            const resourceId = row[resourceIdIndex] as string;
            const resourceGroup = row[resourceGroupIndex] as string;
            const dateValue = row[dateIndex];
            
            let date: string;
            if (typeof dateValue === 'number') {
                const dateStr = dateValue.toString();
                date = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
            } else {
                date = dateValue;
            }

            // Only include actual VM resources
            if (!resourceId || !resourceId.toLowerCase().includes('/virtualmachines/')) {
                continue;
            }

            const normalizedId = resourceId.toLowerCase();
            if (!vmCosts.has(normalizedId)) {
                vmCosts.set(normalizedId, []);
            }
            
            vmCosts.get(normalizedId)!.push({ date, cost, resourceGroup });
        }

        logInfo(`Parsed costs for ${vmCosts.size} VMs`);
        return vmCosts;
    }

    private async getVMMetadata(): Promise<Map<string, VirtualMachine>> {
        const vmMap = new Map<string, VirtualMachine>();
        
        try {
            logInfo('Fetching VM metadata from Compute API...');
            
            for await (const vm of this.computeClient.virtualMachines.listAll()) {
                if (vm.id) {
                    vmMap.set(vm.id.toLowerCase(), vm);
                }
            }
            
            logInfo(`Retrieved metadata for ${vmMap.size} VMs`);
        } catch (error) {
            logWarning(`Failed to fetch VM metadata: ${error}`);
        }
        
        return vmMap;
    }

    private analyzeIndividualVM(
        resourceId: string,
        dailyCosts: DailyCostEntry[],
        vmMetadata: VirtualMachine | undefined,
        totalDays: number
    ): VMCostAnalysis {
        const vmName = this.extractVMName(resourceId);
        const resourceGroup = dailyCosts[0]?.resourceGroup || 'Unknown';

        dailyCosts.sort((a, b) => a.date.localeCompare(b.date));

        const costs = dailyCosts.map(d => d.cost);
        const totalCost = costs.reduce((sum, c) => sum + c, 0);
        const activeDays = dailyCosts.filter(d => d.cost > 0);
        const daysActive = activeDays.length;
        const averageDailyCost = daysActive > 0 ? totalCost / daysActive : 0;
        const peakDailyCost = costs.length > 0 ? Math.max(...costs) : 0;
        const minDailyCost = activeDays.length > 0 ? Math.min(...activeDays.map(d => d.cost)) : 0;
        const utilizationPercentage = totalDays > 0 ? (daysActive / totalDays) * 100 : 0;

        const monthlyCosts = this.calculateMonthlyCosts(dailyCosts);
        const { trend, trendPercentage } = this.calculateTrend(monthlyCosts);

        const costPerActiveDay = daysActive > 0 ? totalCost / daysActive : 0;
        const projectedMonthlyCost = averageDailyCost * 30 * (utilizationPercentage / 100);

        const recommendations = this.generateRecommendations({
            vmName,
            totalCost,
            averageDailyCost,
            daysActive,
            totalDays,
            utilizationPercentage,
            trend,
            trendPercentage,
            projectedMonthlyCost,
            vmSize: vmMetadata?.hardwareProfile?.vmSize,
            powerState: 'Unknown'
        });

        return {
            vmName,
            resourceId,
            resourceGroup,
            vmSize: vmMetadata?.hardwareProfile?.vmSize,
            location: vmMetadata?.location,
            powerState: 'Unknown',
            totalCost,
            averageDailyCost,
            peakDailyCost,
            minDailyCost,
            daysActive,
            daysInPeriod: totalDays,
            utilizationPercentage,
            monthlyCosts,
            costTrend: trend,
            trendPercentage,
            costPerActiveDay,
            projectedMonthlyCost,
            recommendations
        };
    }

    private calculateMonthlyCosts(dailyCosts: DailyCostEntry[]): MonthlyVMCost[] {
        const monthlyMap = new Map<string, { costs: number[]; activeDays: number }>();

        for (const { date, cost } of dailyCosts) {
            const month = date.substring(0, 7);
            
            if (!monthlyMap.has(month)) {
                monthlyMap.set(month, { costs: [], activeDays: 0 });
            }
            
            const entry = monthlyMap.get(month)!;
            entry.costs.push(cost);
            if (cost > 0) entry.activeDays++;
        }

        const monthlyCosts: MonthlyVMCost[] = [];
        const sortedMonths = Array.from(monthlyMap.keys()).sort();

        for (let i = 0; i < sortedMonths.length; i++) {
            const month = sortedMonths[i];
            const { costs, activeDays } = monthlyMap.get(month)!;
            const totalCost = costs.reduce((a, b) => a + b, 0);
            const daysInMonth = costs.length;
            const averageDailyCost = activeDays > 0 ? totalCost / activeDays : 0;

            let comparedToPreviousMonth: number | undefined;
            if (i > 0) {
                const prevMonth = sortedMonths[i - 1];
                const prevTotal = monthlyMap.get(prevMonth)!.costs.reduce((a, b) => a + b, 0);
                if (prevTotal > 0) {
                    comparedToPreviousMonth = ((totalCost - prevTotal) / prevTotal) * 100;
                }
            }

            monthlyCosts.push({
                month,
                monthName: this.formatMonthName(month),
                totalCost,
                daysActive: activeDays,
                daysInMonth,
                averageDailyCost,
                comparedToPreviousMonth
            });
        }

        return monthlyCosts;
    }

    private calculateTrend(monthlyCosts: MonthlyVMCost[]): { trend: 'increasing' | 'decreasing' | 'stable'; trendPercentage: number } {
        if (monthlyCosts.length < 2) {
            return { trend: 'stable', trendPercentage: 0 };
        }

        const completedMonths = monthlyCosts.filter(m => m.daysInMonth >= 25);
        
        if (completedMonths.length < 2) {
            return { trend: 'stable', trendPercentage: 0 };
        }

        const recent = completedMonths[completedMonths.length - 1];
        const previous = completedMonths[completedMonths.length - 2];

        if (previous.totalCost === 0) {
            return { 
                trend: recent.totalCost > 0 ? 'increasing' : 'stable', 
                trendPercentage: recent.totalCost > 0 ? 100 : 0 
            };
        }

        const change = ((recent.totalCost - previous.totalCost) / previous.totalCost) * 100;

        if (change > 10) return { trend: 'increasing', trendPercentage: change };
        if (change < -10) return { trend: 'decreasing', trendPercentage: change };
        return { trend: 'stable', trendPercentage: change };
    }

    private generateRecommendations(params: {
        vmName: string;
        totalCost: number;
        averageDailyCost: number;
        daysActive: number;
        totalDays: number;
        utilizationPercentage: number;
        trend: string;
        trendPercentage: number;
        projectedMonthlyCost: number;
        vmSize?: string;
        powerState?: string;
    }): VMCostRecommendation[] {
        const recommendations: VMCostRecommendation[] = [];

        // Reserved Instance for high utilization
        if (params.utilizationPercentage >= 70 && params.trend !== 'decreasing') {
            const monthlySavings = params.projectedMonthlyCost * 0.40;
            recommendations.push({
                type: 'reserved-instance',
                title: 'Consider Reserved Instance',
                reason: `VM runs ${params.utilizationPercentage.toFixed(0)}% of the time with ${params.trend} usage. A 1-year Reserved Instance could save ~40% on compute costs.`,
                estimatedMonthlySavings: monthlySavings,
                estimatedAnnualSavings: monthlySavings * 12,
                confidence: params.utilizationPercentage >= 90 ? 'high' : 'medium',
                priority: 1,
                implementationEffort: 'low'
            });
        }

        // Savings Plan for moderate utilization
        if (params.utilizationPercentage >= 50 && params.utilizationPercentage < 70 && params.projectedMonthlyCost > 50) {
            const monthlySavings = params.projectedMonthlyCost * 0.25;
            recommendations.push({
                type: 'savings-plan',
                title: 'Consider Azure Savings Plan',
                reason: `VM has moderate utilization (${params.utilizationPercentage.toFixed(0)}%). A Savings Plan offers flexibility with ~25% savings.`,
                estimatedMonthlySavings: monthlySavings,
                estimatedAnnualSavings: monthlySavings * 12,
                confidence: 'medium',
                priority: 2,
                implementationEffort: 'low'
            });
        }

        // Auto-shutdown for low utilization
        if (params.utilizationPercentage < 50 && params.utilizationPercentage >= 20) {
            const potentialSavings = params.averageDailyCost * 30 * (1 - params.utilizationPercentage / 100) * 0.5;
            recommendations.push({
                type: 'auto-shutdown',
                title: 'Implement Auto-Shutdown Schedule',
                reason: `VM runs only ${params.utilizationPercentage.toFixed(0)}% of the time. Implementing auto-shutdown during inactive hours could reduce costs.`,
                estimatedMonthlySavings: potentialSavings,
                estimatedAnnualSavings: potentialSavings * 12,
                confidence: 'high',
                priority: 2,
                implementationEffort: 'low'
            });
        }

        // Spot VM for very low utilization
        if (params.utilizationPercentage < 40 && params.vmSize?.includes('Standard_D')) {
            const monthlySavings = params.projectedMonthlyCost * 0.60;
            recommendations.push({
                type: 'spot',
                title: 'Consider Spot VM',
                reason: `Low utilization pattern suggests this may be a dev/test workload. Spot VMs offer up to 90% savings for interruptible workloads.`,
                estimatedMonthlySavings: monthlySavings,
                estimatedAnnualSavings: monthlySavings * 12,
                confidence: 'low',
                priority: 3,
                implementationEffort: 'medium'
            });
        }

        // Delete for very low usage
        if (params.utilizationPercentage < 10 && params.daysActive < 5) {
            recommendations.push({
                type: 'delete',
                title: 'Evaluate VM Necessity',
                reason: `VM was active only ${params.daysActive} days out of ${params.totalDays} days (${params.utilizationPercentage.toFixed(0)}% utilization). Consider if this VM is still required.`,
                estimatedMonthlySavings: params.projectedMonthlyCost,
                estimatedAnnualSavings: params.projectedMonthlyCost * 12,
                confidence: 'medium',
                priority: 1,
                implementationEffort: 'low'
            });
        }

        // Resize for large VMs with low utilization
        if (params.vmSize && this.isLargeVMSize(params.vmSize) && params.utilizationPercentage < 60) {
            const monthlySavings = params.projectedMonthlyCost * 0.30;
            recommendations.push({
                type: 'resize',
                title: 'Consider Rightsizing',
                reason: `VM size ${params.vmSize} may be oversized for the workload. Review CPU/memory utilization metrics to determine optimal size.`,
                estimatedMonthlySavings: monthlySavings,
                estimatedAnnualSavings: monthlySavings * 12,
                confidence: 'low',
                priority: 3,
                implementationEffort: 'medium'
            });
        }

        recommendations.sort((a, b) => a.priority - b.priority);

        return recommendations;
    }

    private isLargeVMSize(vmSize: string): boolean {
        const largeIndicators = ['_8', '_16', '_32', '_64', '_96', 'Standard_E', 'Standard_M', 'Standard_L'];
        return largeIndicators.some(indicator => vmSize.includes(indicator));
    }

    private createSummary(vmAnalyses: VMCostAnalysis[]): VMCostSummary {
        const totalVMCost = vmAnalyses.reduce((sum, vm) => sum + vm.totalCost, 0);
        const averageVMCost = vmAnalyses.length > 0 ? totalVMCost / vmAnalyses.length : 0;
        
        const vmsByTrend = {
            increasing: vmAnalyses.filter(vm => vm.costTrend === 'increasing').length,
            decreasing: vmAnalyses.filter(vm => vm.costTrend === 'decreasing').length,
            stable: vmAnalyses.filter(vm => vm.costTrend === 'stable').length
        };

        let totalPotentialSavings = 0;
        const recommendationsByType: Record<string, number> = {};

        for (const vm of vmAnalyses) {
            for (const rec of vm.recommendations) {
                totalPotentialSavings += rec.estimatedMonthlySavings;
                recommendationsByType[rec.type] = (recommendationsByType[rec.type] || 0) + 1;
            }
        }

        return {
            totalVMCost,
            averageVMCost,
            topCostVMs: vmAnalyses.slice(0, 15),
            vmsByTrend,
            totalPotentialSavings,
            recommendationsByType
        };
    }

    private extractVMName(resourceId: string): string {
        const parts = resourceId.split('/');
        return parts[parts.length - 1] || resourceId;
    }

    private formatMonthName(month: string): string {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
