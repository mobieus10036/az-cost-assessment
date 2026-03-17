/**
 * Daily Cost Fluctuation Analyzer
 * Detects day-over-day cost changes and attributes the change to services.
 */

import {
    ComprehensiveCostAnalysis,
    DailyCostFluctuation,
    DailyServiceCostPoint,
    ServiceCostDelta
} from '../models/costAnalysis';
import { configService } from '../utils/config';
import { logInfo } from '../utils/logger';

export class DailyCostFluctuationAnalyzer {
    private readonly thresholdPercent: number;
    private readonly maxDrivers: number;

    constructor() {
        const analysisConfig = configService.getAnalysisConfig();
        this.thresholdPercent = analysisConfig.dailyFluctuationThresholdPercent || 15;
        this.maxDrivers = analysisConfig.dailyFluctuationMaxDrivers || 5;
    }

    public analyzeFluctuations(analysis: ComprehensiveCostAnalysis): DailyCostFluctuation[] {
        const dailyCosts = [...analysis.historical.dailyCosts]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (dailyCosts.length < 2) {
            return [];
        }

        const dailyServiceMap = this.buildDailyServiceMap(analysis.historical.dailyServiceCosts || []);
        const fluctuations: DailyCostFluctuation[] = [];

        for (let i = 1; i < dailyCosts.length; i++) {
            const previousDay = dailyCosts[i - 1];
            const currentDay = dailyCosts[i];
            const totalChangeAmount = currentDay.cost - previousDay.cost;
            const totalChangePercent = previousDay.cost > 0
                ? (totalChangeAmount / previousDay.cost) * 100
                : 0;

            if (Math.abs(totalChangePercent) < this.thresholdPercent) {
                continue;
            }

            const serviceDeltas = this.calculateServiceDeltas(
                previousDay.date,
                currentDay.date,
                dailyServiceMap,
                currentDay.currency || previousDay.currency || 'USD'
            );

            fluctuations.push({
                date: currentDay.date,
                previousDate: previousDay.date,
                totalCost: currentDay.cost,
                previousTotalCost: previousDay.cost,
                totalChangeAmount,
                totalChangePercent,
                direction: this.getDirection(totalChangePercent),
                significance: this.getSignificance(totalChangePercent),
                topServiceDrivers: serviceDeltas.slice(0, this.maxDrivers)
            });
        }

        const sorted = fluctuations.sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        logInfo(`Detected ${sorted.length} daily fluctuations above ${this.thresholdPercent}% threshold`);
        return sorted;
    }

    private buildDailyServiceMap(dailyServiceCosts: DailyServiceCostPoint[]): Map<string, Map<string, DailyServiceCostPoint>> {
        const byDate = new Map<string, Map<string, DailyServiceCostPoint>>();

        for (const point of dailyServiceCosts) {
            if (!byDate.has(point.date)) {
                byDate.set(point.date, new Map<string, DailyServiceCostPoint>());
            }
            byDate.get(point.date)!.set(point.serviceName, point);
        }

        return byDate;
    }

    private calculateServiceDeltas(
        previousDate: string,
        currentDate: string,
        dailyServiceMap: Map<string, Map<string, DailyServiceCostPoint>>,
        currency: string
    ): ServiceCostDelta[] {
        const previous = dailyServiceMap.get(previousDate) || new Map<string, DailyServiceCostPoint>();
        const current = dailyServiceMap.get(currentDate) || new Map<string, DailyServiceCostPoint>();

        const allServices = new Set<string>([...previous.keys(), ...current.keys()]);
        const deltas: ServiceCostDelta[] = [];

        allServices.forEach((serviceName) => {
            const previousCost = previous.get(serviceName)?.cost || 0;
            const currentCost = current.get(serviceName)?.cost || 0;
            const changeAmount = currentCost - previousCost;

            if (Math.abs(changeAmount) < 0.01) {
                return;
            }

            const changePercent = previousCost > 0
                ? (changeAmount / previousCost) * 100
                : (currentCost > 0 ? 100 : 0);

            deltas.push({
                serviceName,
                serviceCategory: current.get(serviceName)?.serviceCategory || previous.get(serviceName)?.serviceCategory || 'Other',
                previousCost,
                currentCost,
                changeAmount,
                changePercent,
                currency
            });
        });

        return deltas.sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount));
    }

    private getDirection(changePercent: number): 'increasing' | 'decreasing' | 'stable' {
        if (Math.abs(changePercent) < 1) {
            return 'stable';
        }
        return changePercent > 0 ? 'increasing' : 'decreasing';
    }

    private getSignificance(changePercent: number): 'low' | 'medium' | 'high' | 'critical' {
        const magnitude = Math.abs(changePercent);

        if (magnitude >= 75) {
            return 'critical';
        }
        if (magnitude >= 40) {
            return 'high';
        }
        if (magnitude >= 20) {
            return 'medium';
        }
        return 'low';
    }
}
