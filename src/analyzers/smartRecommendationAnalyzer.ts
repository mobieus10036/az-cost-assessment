/**
 * Smart Recommendation Analyzer
 * Detects cost optimization opportunities including:
 * - Unattached disks
 * - Idle/underutilized VMs
 * - Oversized resources
 */

import { DefaultAzureCredential } from '@azure/identity';
import { ComputeManagementClient } from '@azure/arm-compute';
import { Recommendation, RecommendationSummary } from '../models/recommendation';
import { configService } from '../utils/config';
import { logInfo, logWarning } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface VMMetrics {
    resourceId: string;
    avgCpuPercent: number;
    avgMemoryPercent?: number;
    dataPoints: number;
    periodDays: number;
}

interface DiskInfo {
    id: string;
    name: string;
    resourceGroup: string;
    location: string;
    diskSizeGB: number;
    diskState: string;
    sku: string;
    monthlyEstimatedCost: number;
}

interface VMInfo {
    id: string;
    name: string;
    resourceGroup: string;
    location: string;
    vmSize: string;
    powerState: string;
    monthlyEstimatedCost: number;
}

export class SmartRecommendationAnalyzer {
    private credential: DefaultAzureCredential;
    private subscriptionId: string;
    private computeClient: ComputeManagementClient;
    
    // Configurable thresholds
    private readonly IDLE_CPU_THRESHOLD = 5; // % average CPU
    private readonly UNDERUTILIZED_CPU_THRESHOLD = 15; // % average CPU
    private readonly ANALYSIS_PERIOD_DAYS = 14; // Days to analyze metrics
    private readonly MIN_DATA_POINTS = 10; // Minimum data points for reliable analysis

    constructor() {
        this.credential = new DefaultAzureCredential();
        const config = configService.get();
        this.subscriptionId = config.azure.subscriptionId;
        this.computeClient = new ComputeManagementClient(this.credential, this.subscriptionId);
    }

    /**
     * Generate all smart recommendations
     */
    async analyze(): Promise<Recommendation[]> {
        logInfo('Starting smart recommendation analysis...');
        const recommendations: Recommendation[] = [];

        try {
            // 1. Detect unattached disks
            const unattachedDiskRecommendations = await this.detectUnattachedDisks();
            recommendations.push(...unattachedDiskRecommendations);
            
            // 2. Detect stopped/deallocated VMs that could be deleted
            const stoppedVMRecommendations = await this.detectStoppedVMs();
            recommendations.push(...stoppedVMRecommendations);

            logInfo(`Generated ${recommendations.length} smart recommendations`);
            return recommendations;
        } catch (error) {
            logWarning(`Error generating recommendations: ${error}`);
            return recommendations;
        }
    }

    /**
     * Detect unattached managed disks
     */
    private async detectUnattachedDisks(): Promise<Recommendation[]> {
        logInfo('Analyzing unattached disks...');
        const recommendations: Recommendation[] = [];

        try {
            const disks = await this.listAllDisks();
            const unattachedDisks = disks.filter(disk => disk.diskState === 'Unattached');

            logInfo(`Found ${unattachedDisks.length} unattached disks`);

            for (const disk of unattachedDisks) {
                const recommendation: Recommendation = {
                    id: uuidv4(),
                    type: 'delete-unused',
                    priority: disk.monthlyEstimatedCost > 50 ? 'high' : 
                             disk.monthlyEstimatedCost > 20 ? 'medium' : 'low',
                    status: 'pending',
                    
                    resourceId: disk.id,
                    resourceName: disk.name,
                    resourceType: 'Microsoft.Compute/disks',
                    resourceGroup: disk.resourceGroup,
                    location: disk.location,
                    
                    title: `Delete unattached disk: ${disk.name}`,
                    description: `Managed disk "${disk.name}" (${disk.diskSizeGB} GB, ${disk.sku}) is not attached to any VM and is incurring storage costs.`,
                    action: 'Delete the unattached disk',
                    rationale: 'Unattached disks continue to incur storage charges even when not in use. If this disk is not needed for backup or future use, deleting it will eliminate ongoing costs.',
                    
                    currentMonthlyCost: disk.monthlyEstimatedCost,
                    projectedMonthlyCost: 0,
                    potentialMonthlySavings: disk.monthlyEstimatedCost,
                    potentialAnnualSavings: disk.monthlyEstimatedCost * 12,
                    currency: 'USD',
                    savingsPercent: 100,
                    
                    effort: 'low',
                    implementationSteps: [
                        '1. Verify the disk is not needed (check with resource owner)',
                        '2. Create a snapshot if needed for backup purposes',
                        '3. Navigate to Azure Portal → Disks → Select disk',
                        '4. Click "Delete" and confirm',
                        'Or use Azure CLI: az disk delete --name ' + disk.name + ' --resource-group ' + disk.resourceGroup
                    ],
                    risks: [
                        'Data loss if disk contains important data',
                        'May be reserved for future VM deployment'
                    ],
                    prerequisites: [
                        'Confirm disk is not needed',
                        'Ensure no backup/compliance requirements',
                        'Verify with resource owner/team'
                    ],
                    
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    detectedBy: 'smart-recommendation-analyzer',
                    category: 'Storage Optimization',
                    
                    additionalInfo: {
                        diskSizeGB: disk.diskSizeGB,
                        sku: disk.sku,
                        diskState: disk.diskState
                    }
                };

                recommendations.push(recommendation);
            }
        } catch (error) {
            logWarning(`Error analyzing unattached disks: ${error}`);
        }

        return recommendations;
    }

    /**
     * Detect stopped/deallocated VMs
     */
    private async detectStoppedVMs(): Promise<Recommendation[]> {
        logInfo('Analyzing stopped/deallocated VMs...');
        const recommendations: Recommendation[] = [];

        try {
            const vms = await this.listAllVMs();
            const stoppedVMs = vms.filter(vm => vm.powerState.includes('deallocated') || vm.powerState.includes('stopped'));

            logInfo(`Found ${stoppedVMs.length} stopped/deallocated VMs`);

            for (const vm of stoppedVMs) {
                // Estimate monthly disk cost for stopped VM (still incurring storage charges)
                const diskCost = vm.monthlyEstimatedCost * 0.1; // Rough estimate: 10% of running cost

                const recommendation: Recommendation = {
                    id: uuidv4(),
                    type: 'delete-unused',
                    priority: diskCost > 50 ? 'medium' : 'low',
                    status: 'pending',
                    
                    resourceId: vm.id,
                    resourceName: vm.name,
                    resourceType: 'Microsoft.Compute/virtualMachines',
                    resourceGroup: vm.resourceGroup,
                    location: vm.location,
                    
                    title: `Review deallocated VM: ${vm.name}`,
                    description: `VM "${vm.name}" (${vm.vmSize}) is currently ${vm.powerState}. While deallocated VMs don't incur compute charges, they still incur storage costs for attached disks.`,
                    action: 'Review if VM is still needed, consider deleting if unused',
                    rationale: `Deallocated VMs continue to incur storage charges for OS and data disks. If this VM is no longer needed, deleting it will eliminate storage costs.`,
                    
                    currentMonthlyCost: diskCost,
                    projectedMonthlyCost: 0,
                    potentialMonthlySavings: diskCost,
                    potentialAnnualSavings: diskCost * 12,
                    currency: 'USD',
                    savingsPercent: 100,
                    
                    effort: 'low',
                    implementationSteps: [
                        '1. Verify the VM is not needed (check with resource owner)',
                        '2. Export VM configuration if needed for future reference',
                        '3. Create snapshots of disks if data needs to be retained',
                        '4. Delete the VM and associated resources',
                        '   az vm delete --name ' + vm.name + ' --resource-group ' + vm.resourceGroup + ' --yes',
                        '5. Delete unattached disks separately if desired'
                    ],
                    risks: [
                        'Data loss if VM or disks are deleted without backup',
                        'May be reserved for future use or disaster recovery'
                    ],
                    prerequisites: [
                        'Confirm VM is not needed',
                        'Backup important data',
                        'Verify with resource owner/team'
                    ],
                    
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    detectedBy: 'smart-recommendation-analyzer',
                    category: 'VM Optimization',
                    
                    additionalInfo: {
                        vmSize: vm.vmSize,
                        powerState: vm.powerState
                    }
                };

                recommendations.push(recommendation);
            }
        } catch (error) {
            logWarning(`Error analyzing stopped VMs: ${error}`);
        }

        return recommendations;
    }

    /**
     * Generate recommendation summary
     */
    generateSummary(recommendations: Recommendation[]): RecommendationSummary {
        const summary: RecommendationSummary = {
            totalRecommendations: recommendations.length,
            totalPotentialMonthlySavings: recommendations.reduce((sum, r) => sum + r.potentialMonthlySavings, 0),
            totalPotentialAnnualSavings: recommendations.reduce((sum, r) => sum + r.potentialAnnualSavings, 0),
            currency: 'USD',
            byType: {} as any,
            byPriority: {} as any,
            byStatus: {} as any,
            topRecommendations: []
        };

        // Group by type
        for (const rec of recommendations) {
            if (!summary.byType[rec.type]) {
                summary.byType[rec.type] = { count: 0, savings: 0 };
            }
            summary.byType[rec.type].count++;
            summary.byType[rec.type].savings += rec.potentialMonthlySavings;
        }

        // Group by priority
        for (const rec of recommendations) {
            if (!summary.byPriority[rec.priority]) {
                summary.byPriority[rec.priority] = { count: 0, savings: 0 };
            }
            summary.byPriority[rec.priority].count++;
            summary.byPriority[rec.priority].savings += rec.potentialMonthlySavings;
        }

        // Group by status
        for (const rec of recommendations) {
            if (!summary.byStatus[rec.status]) {
                summary.byStatus[rec.status] = { count: 0, savings: 0 };
            }
            summary.byStatus[rec.status].count++;
            summary.byStatus[rec.status].savings += rec.potentialMonthlySavings;
        }

        // Get top 10 recommendations by savings
        summary.topRecommendations = [...recommendations]
            .sort((a, b) => b.potentialMonthlySavings - a.potentialMonthlySavings)
            .slice(0, 10);

        return summary;
    }

    /**
     * Helper: List all disks in subscription
     */
    private async listAllDisks(): Promise<DiskInfo[]> {
        const disks: DiskInfo[] = [];
        
        try {
            const diskIterator = this.computeClient.disks.list();
            
            for await (const disk of diskIterator) {
                // Estimate cost based on disk size and SKU
                const monthlyCost = this.estimateDiskCost(disk.diskSizeGB || 0, disk.sku?.name || 'Standard_LRS');
                
                disks.push({
                    id: disk.id || '',
                    name: disk.name || '',
                    resourceGroup: this.extractResourceGroup(disk.id || ''),
                    location: disk.location || '',
                    diskSizeGB: disk.diskSizeGB || 0,
                    diskState: disk.diskState || 'Unknown',
                    sku: disk.sku?.name || 'Unknown',
                    monthlyEstimatedCost: monthlyCost
                });
            }
        } catch (error) {
            logWarning(`Error listing disks: ${error}`);
        }

        return disks;
    }

    /**
     * Helper: List all VMs in subscription
     */
    private async listAllVMs(): Promise<VMInfo[]> {
        const vms: VMInfo[] = [];
        
        try {
            const vmIterator = this.computeClient.virtualMachines.listAll();
            
            for await (const vm of vmIterator) {
                // Get power state
                const instanceView = await this.computeClient.virtualMachines.instanceView(
                    this.extractResourceGroup(vm.id || ''),
                    vm.name || ''
                );
                
                const powerState = instanceView.statuses?.find((s: any) => s.code?.startsWith('PowerState/'))?.code || 'Unknown';
                
                // Estimate cost based on VM size
                const monthlyCost = this.estimateVMCost(vm.hardwareProfile?.vmSize || '');
                
                vms.push({
                    id: vm.id || '',
                    name: vm.name || '',
                    resourceGroup: this.extractResourceGroup(vm.id || ''),
                    location: vm.location || '',
                    vmSize: vm.hardwareProfile?.vmSize || 'Unknown',
                    powerState: powerState,
                    monthlyEstimatedCost: monthlyCost
                });
            }
        } catch (error) {
            logWarning(`Error listing VMs: ${error}`);
        }

        return vms;
    }

    /**
     * Helper: Estimate disk cost based on size and SKU
     */
    private estimateDiskCost(sizeGB: number, sku: string): number {
        // Rough estimates (actual pricing varies by region)
        const pricePerGBPerMonth: Record<string, number> = {
            'Standard_LRS': 0.05,
            'StandardSSD_LRS': 0.10,
            'Premium_LRS': 0.15,
            'UltraSSD_LRS': 0.20
        };

        const rate = pricePerGBPerMonth[sku] || 0.05;
        return sizeGB * rate;
    }

    /**
     * Helper: Estimate VM cost based on size
     */
    private estimateVMCost(vmSize: string): number {
        // Very rough estimates - actual pricing varies significantly
        // This should be replaced with Azure Retail Prices API
        const estimates: Record<string, number> = {
            'Standard_B1s': 10,
            'Standard_B2s': 40,
            'Standard_D2s_v3': 100,
            'Standard_D4s_v3': 200,
            'Standard_D8s_v3': 400,
            'Standard_E2s_v3': 120,
            'Standard_E4s_v3': 240
        };

        return estimates[vmSize] || 100; // Default estimate
    }

    /**
     * Helper: Suggest a smaller VM size
     */
    private suggestSmallerVMSize(currentSize: string): string {
        const downsizeMap: Record<string, string> = {
            'Standard_D4s_v3': 'Standard_D2s_v3',
            'Standard_D8s_v3': 'Standard_D4s_v3',
            'Standard_D16s_v3': 'Standard_D8s_v3',
            'Standard_E4s_v3': 'Standard_E2s_v3',
            'Standard_E8s_v3': 'Standard_E4s_v3',
            'Standard_E16s_v3': 'Standard_E8s_v3'
        };

        return downsizeMap[currentSize] || currentSize.replace(/\d+/, (match) => String(parseInt(match) / 2));
    }

    /**
     * Helper: Get VM series from size
     */
    private getVMSeries(vmSize: string): string {
        const match = vmSize.match(/Standard_([A-Z]+)/);
        return match ? match[1] : 'Unknown';
    }

    /**
     * Helper: Extract resource group from resource ID
     */
    private extractResourceGroup(resourceId: string): string {
        const match = resourceId.match(/resourceGroups\/([^\/]+)/);
        return match ? match[1] : '';
    }

    /**
     * Helper: Delay function to avoid rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
