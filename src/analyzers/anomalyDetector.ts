/**
 * Anomaly Detector
 * Detects cost anomalies using statistical methods
 */

import { CostAnomaly, CostDataPoint, ComprehensiveCostAnalysis } from '../models/costAnalysis';
import { logInfo, logWarning } from '../utils/logger';
import { configService } from '../utils/config';
import { subDays, isAfter } from 'date-fns';

export class AnomalyDetector {
    private anomalyThresholdPercent: number;
    private anomalyLookbackDays: number;
    private anomalyMinSeverity: 'low' | 'medium' | 'high' | 'critical';
    private anomalyMaxDisplay: number;

    constructor() {
        const analysisConfig = configService.getAnalysisConfig();
        this.anomalyThresholdPercent = analysisConfig.anomalyThresholdPercent;
        this.anomalyLookbackDays = analysisConfig.anomalyLookbackDays || 60;
        this.anomalyMinSeverity = analysisConfig.anomalyMinSeverity || 'medium';
        this.anomalyMaxDisplay = analysisConfig.anomalyMaxDisplay || 15;
    }

    /**
     * Detect cost anomalies in the cost analysis data
     */
    public detectAnomalies(analysis: ComprehensiveCostAnalysis): CostAnomaly[] {
        logInfo('Detecting cost anomalies...');
        
        let anomalies: CostAnomaly[] = [];
        
        // Filter daily costs to only include data within lookback period
        const cutoffDate = subDays(new Date(), this.anomalyLookbackDays);
        const recentDailyCosts = analysis.historical.dailyCosts.filter(
            d => isAfter(new Date(d.date), cutoffDate)
        );
        
        logInfo(`Analyzing ${recentDailyCosts.length} days of cost data (lookback: ${this.anomalyLookbackDays} days)`);
        
        // Detect daily cost anomalies (using recent data only)
        const dailyAnomalies = this.detectDailyAnomalies(recentDailyCosts);
        anomalies.push(...dailyAnomalies);
        
        // Detect service-level anomalies
        const serviceAnomalies = this.detectServiceAnomalies(analysis);
        anomalies.push(...serviceAnomalies);
        
        // Filter by minimum severity
        const severityOrder = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        const minSeverityLevel = severityOrder[this.anomalyMinSeverity];
        anomalies = anomalies.filter(a => severityOrder[a.severity] >= minSeverityLevel);
        
        // Sort by severity (descending) and deviation (descending)
        anomalies.sort((a, b) => {
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0) return severityDiff;
            return Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent);
        });
        
        // Limit to max display count
        if (anomalies.length > this.anomalyMaxDisplay) {
            logInfo(`Limiting anomalies from ${anomalies.length} to ${this.anomalyMaxDisplay} (max display setting)`);
            anomalies = anomalies.slice(0, this.anomalyMaxDisplay);
        }
        
        logInfo(`Detected ${anomalies.length} cost anomalies (filtered by severity >= ${this.anomalyMinSeverity})`);
        return anomalies;
    }

    /**
     * Detect anomalies in daily cost data using statistical methods
     */
    private detectDailyAnomalies(dailyCosts: CostDataPoint[]): CostAnomaly[] {
        if (dailyCosts.length < 7) {
            logWarning('Insufficient data for anomaly detection (need at least 7 days)');
            return [];
        }

        const anomalies: CostAnomaly[] = [];
        const costs = dailyCosts.map(d => d.cost);
        
        // Calculate mean and standard deviation
        const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
        const squaredDiffs = costs.map(cost => Math.pow(cost - mean, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / costs.length;
        const stdDev = Math.sqrt(variance);
        
        // Detect outliers using Z-score method (typically, |z| > 3 is an outlier)
        dailyCosts.forEach((dataPoint, index) => {
            const zScore = (dataPoint.cost - mean) / stdDev;
            const deviationPercent = ((dataPoint.cost - mean) / mean) * 100;
            
            // Flag as anomaly if deviation exceeds threshold
            if (Math.abs(deviationPercent) > this.anomalyThresholdPercent) {
                const severity = this.calculateSeverity(Math.abs(deviationPercent));
                const category: 'spike' | 'drop' = deviationPercent > 0 ? 'spike' : 'drop';
                const confidence = this.calculateConfidence(Math.abs(zScore));
                
                anomalies.push({
                    id: `anomaly-daily-${Date.now()}-${index}`,
                    detectedDate: dataPoint.date,
                    expectedCost: mean,
                    actualCost: dataPoint.cost,
                    deviationPercent,
                    severity,
                    category,
                    confidence,
                    description: `Daily cost ${category} detected: ${Math.abs(deviationPercent).toFixed(1)}% deviation from average`,
                    recommendations: this.getAnomalyRecommendations(category, deviationPercent)
                });
            }
        });

        return anomalies;
    }

    /**
     * Detect anomalies at the service level
     */
    private detectServiceAnomalies(analysis: ComprehensiveCostAnalysis): CostAnomaly[] {
        const anomalies: CostAnomaly[] = [];
        
        // Compare current month services to historical average
        const currentServices = analysis.current.topCostServices;
        
        currentServices.forEach(service => {
            // Check if service cost is unusually high compared to its percentage
            if (service.percentageOfTotal > 50) {
                anomalies.push({
                    id: `anomaly-service-${Date.now()}-${service.serviceName}`,
                    detectedDate: analysis.current.currentDate,
                    service: service.serviceName,
                    expectedCost: 0, // Would need historical data for expected
                    actualCost: service.cost,
                    deviationPercent: service.percentageOfTotal,
                    severity: 'medium',
                    category: 'service_concentration',
                    confidence: 0.8,
                    description: `Service ${service.serviceName} represents ${service.percentageOfTotal.toFixed(1)}% of total costs - consider investigation`,
                    recommendations: [
                        `Review ${service.serviceName} usage patterns for optimization opportunities`,
                        'Consider diversifying workloads to reduce concentration risk',
                        'Implement cost allocation tags to track service usage by team/project'
                    ]
                });
            }
        });

        return anomalies;
    }

    /**
     * Calculate anomaly severity based on deviation percentage
     */
    private calculateSeverity(deviationPercent: number): 'low' | 'medium' | 'high' | 'critical' {
        if (deviationPercent > 100) return 'critical';
        if (deviationPercent > 50) return 'high';
        if (deviationPercent > 30) return 'medium';
        return 'low';
    }

    /**
     * Calculate confidence score based on Z-score (0-1 scale)
     */
    private calculateConfidence(zScore: number): number {
        // Higher Z-score = more confident it's an anomaly
        // Z-score of 3 = ~99.7% confidence
        if (zScore >= 3) return 0.997;
        if (zScore >= 2) return 0.95;
        if (zScore >= 1.5) return 0.85;
        if (zScore >= 1) return 0.68;
        return 0.5;
    }

    /**
     * Get recommendations for handling specific anomaly types
     */
    private getAnomalyRecommendations(category: 'spike' | 'drop', deviationPercent: number): string[] {
        const recommendations: string[] = [];
        
        if (category === 'spike') {
            recommendations.push('Review Azure Activity Log for unusual deployments or resource changes');
            recommendations.push('Check for runaway processes or unexpected auto-scaling events');
            if (Math.abs(deviationPercent) > 50) {
                recommendations.push('URGENT: Investigate immediately to prevent continued overspending');
            }
            recommendations.push('Use Azure Cost Analysis to identify which services contributed to the spike');
        } else {
            recommendations.push('Verify if cost reduction was intentional (resource deletion, optimization)');
            recommendations.push('Check for service interruptions or suspended resources');
            recommendations.push('Review if workloads were moved to different subscriptions');
        }
        
        return recommendations;
    }

    /**
     * Detect sudden cost spikes in the last N days
     */
    public detectRecentSpikes(dailyCosts: CostDataPoint[], days: number = 7): CostAnomaly[] {
        if (dailyCosts.length < days) return [];
        
        const recentCosts = dailyCosts.slice(-days);
        const previousCosts = dailyCosts.slice(-days * 2, -days);
        
        if (previousCosts.length === 0) return [];
        
        const recentAvg = recentCosts.reduce((sum, d) => sum + d.cost, 0) / recentCosts.length;
        const previousAvg = previousCosts.reduce((sum, d) => sum + d.cost, 0) / previousCosts.length;
        
        const changePercent = ((recentAvg - previousAvg) / previousAvg) * 100;
        
        if (changePercent > this.anomalyThresholdPercent) {
            return [{
                id: `anomaly-spike-${Date.now()}`,
                detectedDate: recentCosts[recentCosts.length - 1].date,
                expectedCost: previousAvg,
                actualCost: recentAvg,
                deviationPercent: changePercent,
                severity: this.calculateSeverity(changePercent),
                description: `Recent ${days}-day cost spike: ${changePercent.toFixed(1)}% increase compared to previous period`
            }];
        }
        
        return [];
    }
}
