/**
 * Anomaly Detector
 * Detects cost anomalies using statistical methods
 */

import { CostAnomaly, CostDataPoint, ComprehensiveCostAnalysis } from '../models/costAnalysis';
import { logInfo, logWarning } from '../utils/logger';
import { configService } from '../utils/config';

export class AnomalyDetector {
    private anomalyThresholdPercent: number;

    constructor() {
        const analysisConfig = configService.getAnalysisConfig();
        this.anomalyThresholdPercent = analysisConfig.anomalyThresholdPercent;
    }

    /**
     * Detect cost anomalies in the cost analysis data
     */
    public detectAnomalies(analysis: ComprehensiveCostAnalysis): CostAnomaly[] {
        logInfo('Detecting cost anomalies...');
        
        const anomalies: CostAnomaly[] = [];
        
        // Detect daily cost anomalies
        const dailyAnomalies = this.detectDailyAnomalies(analysis.historical.dailyCosts);
        anomalies.push(...dailyAnomalies);
        
        // Detect service-level anomalies
        const serviceAnomalies = this.detectServiceAnomalies(analysis);
        anomalies.push(...serviceAnomalies);
        
        logInfo(`Detected ${anomalies.length} cost anomalies`);
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
                
                anomalies.push({
                    id: `anomaly-daily-${Date.now()}-${index}`,
                    detectedDate: dataPoint.date,
                    expectedCost: mean,
                    actualCost: dataPoint.cost,
                    deviationPercent,
                    severity,
                    description: `Daily cost ${deviationPercent > 0 ? 'spike' : 'drop'} detected: ${Math.abs(deviationPercent).toFixed(1)}% deviation from average`
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
                    description: `Service ${service.serviceName} represents ${service.percentageOfTotal.toFixed(1)}% of total costs - consider investigation`
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
