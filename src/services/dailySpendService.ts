import { CostDataPoint, DailySpendChangeReport } from '../models/costAnalysis';
import { DailyCostFluctuationAnalyzer } from '../analyzers/dailyCostFluctuationAnalyzer';
import { AzureCostManagementService } from './azureCostManagementService';
import { configService } from '../utils/config';

export class DailySpendService {
    constructor(
        private readonly costService: AzureCostManagementService,
        private readonly fluctuationAnalyzer = new DailyCostFluctuationAnalyzer()
    ) {}

    public async buildReport(days?: number): Promise<DailySpendChangeReport> {
        const analysisDays = days || configService.getAnalysisConfig().historicalDays || 30;
        const costData = await this.costService.getDailyServiceCostData(analysisDays);
        const dailyCosts = [...costData.dailyCosts]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const completeDailyCosts = this.excludeCurrentDay(dailyCosts);
        const completeDailyServiceCosts = this.excludeCurrentDay(costData.dailyServiceCosts);

        const fluctuations = this.fluctuationAnalyzer.analyze({
            dailyCosts: completeDailyCosts,
            dailyServiceCosts: completeDailyServiceCosts
        });
        const azureConfig = configService.getAzureConfig();

        return {
            generatedAt: new Date().toISOString(),
            summary: {
                subscriptionId: azureConfig.subscriptionId,
                scope: azureConfig.scope,
                startDate: costData.startDate,
                endDate: costData.endDate,
                currency: costData.currency,
                totalCost: costData.totalCost,
                monthToDateCost: this.calculateMonthToDate(dailyCosts),
                averageDailyCost: dailyCosts.length > 0 ? costData.totalCost / dailyCosts.length : 0,
                peakDailyCost: this.findExtremeDailyCost(dailyCosts, 'max'),
                lowestDailyCost: this.findExtremeDailyCost(dailyCosts, 'min')
            },
            dailyCosts,
            serviceTotals: costData.costByService,
            fluctuations,
            dataProvenance: {
                mode: 'live',
                source: 'Azure Cost Management API',
                generatedFromFallback: false,
                queryPolicy: {
                    apiDelayMs: azureConfig.costManagement.apiDelayMs,
                    maxRetries: azureConfig.costManagement.maxRetries,
                    retryBaseDelayMs: azureConfig.costManagement.retryBaseDelayMs,
                    retryMaxDelayMs: azureConfig.costManagement.retryMaxDelayMs
                }
            }
        };
    }

    private calculateMonthToDate(dailyCosts: CostDataPoint[]): number {
        const now = new Date();
        return dailyCosts
            .filter(point => {
                const date = new Date(point.date);
                return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
            })
            .reduce((sum, point) => sum + point.cost, 0);
    }

    private findExtremeDailyCost(dailyCosts: CostDataPoint[], mode: 'min' | 'max'): CostDataPoint | null {
        if (dailyCosts.length === 0) {
            return null;
        }

        return dailyCosts.reduce((selected, current) => {
            if (mode === 'max') {
                return current.cost > selected.cost ? current : selected;
            }

            return current.cost < selected.cost ? current : selected;
        });
    }

    private excludeCurrentDay<T extends { date: string }>(points: T[]): T[] {
        const today = new Date();
        return points.filter(point => {
            const date = new Date(point.date);
            return date.getFullYear() !== today.getFullYear()
                || date.getMonth() !== today.getMonth()
                || date.getDate() !== today.getDate();
        });
    }
}
