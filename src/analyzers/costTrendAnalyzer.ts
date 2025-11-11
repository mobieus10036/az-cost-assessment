/**
 * Cost Trend Analyzer
 * Analyzes cost trends over time to identify patterns and growth
 */

import { CostDataPoint, CostTrend, ComprehensiveCostAnalysis } from '../models/costAnalysis';
import { logInfo } from '../utils/logger';

export class CostTrendAnalyzer {
    /**
     * Analyze cost trends from comprehensive cost analysis data
     */
    public analyzeTrends(analysis: ComprehensiveCostAnalysis): CostTrend[] {
        logInfo('Analyzing cost trends...');
        
        const trends: CostTrend[] = [];
        
        // Analyze daily trends
        const dailyTrend = this.analyzePeriodTrend(
            analysis.historical.dailyCosts,
            'daily'
        );
        if (dailyTrend) trends.push(dailyTrend);
        
        // Analyze monthly trends
        const monthlyTrend = this.analyzePeriodTrend(
            analysis.historical.monthlyCosts,
            'monthly'
        );
        if (monthlyTrend) trends.push(monthlyTrend);
        
        logInfo(`Identified ${trends.length} cost trends`);
        return trends;
    }

    /**
     * Analyze trend for a specific time period
     */
    private analyzePeriodTrend(
        dataPoints: CostDataPoint[],
        period: 'daily' | 'weekly' | 'monthly'
    ): CostTrend | null {
        if (dataPoints.length < 2) return null;

        const costs = dataPoints.map(d => d.cost);
        const firstCost = costs[0];
        const lastCost = costs[costs.length - 1];
        const changeAmount = lastCost - firstCost;
        const changePercent = firstCost > 0 ? (changeAmount / firstCost) * 100 : 0;

        // Determine direction
        let direction: 'increasing' | 'decreasing' | 'stable';
        if (Math.abs(changePercent) < 5) {
            direction = 'stable';
        } else if (changePercent > 0) {
            direction = 'increasing';
        } else {
            direction = 'decreasing';
        }

        return {
            period,
            direction,
            changePercent,
            changeAmount,
            dataPoints
        };
    }

    /**
     * Calculate statistics for cost data
     */
    public calculateStatistics(dataPoints: CostDataPoint[]): {
        average: number;
        highest: number;
        lowest: number;
        median: number;
        stdDeviation: number;
    } {
        const costs = dataPoints.map(d => d.cost);
        const sorted = [...costs].sort((a, b) => a - b);
        
        const average = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
        const highest = Math.max(...costs);
        const lowest = Math.min(...costs);
        const median = sorted[Math.floor(sorted.length / 2)];
        
        // Calculate standard deviation
        const squaredDiffs = costs.map(cost => Math.pow(cost - average, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / costs.length;
        const stdDeviation = Math.sqrt(variance);

        return {
            average,
            highest,
            lowest,
            median,
            stdDeviation
        };
    }
}
