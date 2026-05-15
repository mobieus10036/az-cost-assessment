import {
    ComprehensiveCostAnalysis,
    CostDataPoint,
    DailySpendChangeReport
} from '../models/costAnalysis';
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

        const analysis = this.toComprehensiveAnalysis(costData);
        const fluctuations = this.fluctuationAnalyzer.analyzeFluctuations(analysis);

        return {
            generatedAt: new Date().toISOString(),
            summary: {
                subscriptionId: analysis.subscriptionId,
                scope: analysis.scope,
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
            fluctuations
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

    private toComprehensiveAnalysis(costData: Awaited<ReturnType<AzureCostManagementService['getDailyServiceCostData']>>): ComprehensiveCostAnalysis {
        const azureConfig = configService.getAzureConfig();
        const dailyCosts = costData.dailyCosts;
        const costs = dailyCosts.map(day => day.cost);

        return {
            id: `daily-spend-${Date.now()}`,
            subscriptionId: azureConfig.subscriptionId,
            scope: azureConfig.scope,
            analysisDate: new Date().toISOString(),
            historical: {
                startDate: costData.startDate,
                endDate: costData.endDate,
                totalCost: costData.totalCost,
                currency: costData.currency,
                dailyCosts,
                dailyServiceCosts: costData.dailyServiceCosts,
                monthlyCosts: [],
                costByResource: [],
                costByService: costData.costByService,
                costByResourceGroup: []
            },
            current: {
                billingPeriodStart: costData.startDate,
                billingPeriodEnd: costData.endDate,
                currentDate: new Date().toISOString(),
                monthToDateCost: 0,
                estimatedMonthEndCost: 0,
                currency: costData.currency,
                dailyCosts,
                topCostResources: [],
                topCostServices: costData.costByService.slice(0, 10),
                comparisonToPreviousMonth: {
                    previousMonthTotal: 0,
                    changeAmount: 0,
                    changePercent: 0
                },
                monthlyComparison: {
                    twoMonthsAgo: { name: '', total: 0 },
                    lastMonth: { name: '', total: 0 },
                    currentMonth: { name: '', monthToDate: 0, projected: 0 },
                    lastTwoMonthsChange: { amount: 0, percent: 0 },
                    projectedChange: { amount: 0, percent: 0 }
                }
            },
            forecasted: {
                forecastStartDate: '',
                forecastEndDate: '',
                totalForecastedCost: 0,
                currency: costData.currency,
                dailyForecasts: [],
                monthlyForecasts: [],
                forecastMethod: 'not-run',
                confidenceLevel: 0,
                assumptions: []
            },
            trends: [],
            anomalies: [],
            fluctuations: [],
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
            },
            summary: {
                totalHistoricalCost: costData.totalCost,
                currentMonthToDate: 0,
                forecastedMonthEnd: 0,
                forecastedNextMonth: 0,
                currency: costData.currency,
                avgDailySpend: costs.length > 0 ? costData.totalCost / costs.length : 0,
                peakDailySpend: costs.length > 0 ? Math.max(...costs) : 0,
                lowestDailySpend: costs.length > 0 ? Math.min(...costs) : 0
            }
        };
    }
}
