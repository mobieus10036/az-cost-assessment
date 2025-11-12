/**
 * Azure FinOps Assessment PoC - Main Application
 * 
 * This application provides comprehensive cost analysis for Azure subscriptions,
 * including historical trends, current spending, and forecasted costs.
 */

import { AzureCostManagementService } from './services/azureCostManagementService';
import { AzureResourceService } from './services/azureResourceService';
import { CostTrendAnalyzer } from './analyzers/costTrendAnalyzer';
import { AnomalyDetector } from './analyzers/anomalyDetector';
import { SmartRecommendationAnalyzer } from './analyzers/smartRecommendationAnalyzer';
import { logInfo, logError } from './utils/logger';
import { configService } from './utils/config';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';

class FinOpsAssessmentApp {
    private costService: AzureCostManagementService;
    private resourceService: AzureResourceService;
    private trendAnalyzer: CostTrendAnalyzer;
    private anomalyDetector: AnomalyDetector;
    private smartRecommendations: SmartRecommendationAnalyzer;

    constructor() {
        logInfo('='.repeat(60));
        logInfo('Azure FinOps Assessment PoC');
        logInfo('='.repeat(60));

        // Initialize services
        this.costService = new AzureCostManagementService();
        this.resourceService = new AzureResourceService();
        this.trendAnalyzer = new CostTrendAnalyzer();
        this.anomalyDetector = new AnomalyDetector();
        this.smartRecommendations = new SmartRecommendationAnalyzer();

        logInfo('All services initialized successfully');
    }

    /**
     * Run the complete FinOps assessment
     */
    public async run(): Promise<void> {
        try {
            logInfo('Starting FinOps assessment...\n');

            // Step 1: Gather comprehensive cost analysis
            logInfo('Step 1: Gathering cost data...');
            const costAnalysis = await this.costService.getComprehensiveCostAnalysis();
            logInfo(`✓ Cost analysis complete\n`);

            // Step 2: Analyze cost trends
            logInfo('Step 2: Analyzing cost trends...');
            costAnalysis.trends = this.trendAnalyzer.analyzeTrends(costAnalysis);
            logInfo(`✓ Identified ${costAnalysis.trends.length} trends\n`);

            // Step 3: Detect cost anomalies
            logInfo('Step 3: Detecting cost anomalies...');
            costAnalysis.anomalies = this.anomalyDetector.detectAnomalies(costAnalysis);
            logInfo(`✓ Detected ${costAnalysis.anomalies.length} anomalies\n`);

            // Step 4: Get resource inventory
            logInfo('Step 4: Gathering resource inventory...');
            const resourceSummary = await this.resourceService.getResourceSummary();
            logInfo(`✓ Found ${resourceSummary.totalResources} resources\n`);

            // Step 5: Generate smart recommendations
            logInfo('Step 5: Generating smart recommendations...');
            const recommendations = await this.smartRecommendations.analyze();
            const recommendationSummary = this.smartRecommendations.generateSummary(recommendations);
            logInfo(`✓ Generated ${recommendations.length} recommendations (potential savings: $${recommendationSummary.totalPotentialMonthlySavings.toFixed(2)}/month)\n`);

            // Step 6: Generate and display report
            logInfo('Step 6: Generating assessment report...\n');
            this.displayReport(costAnalysis, resourceSummary, recommendationSummary);
            
            // Step 7: Save results to file
            this.saveResults(costAnalysis, resourceSummary, recommendations, recommendationSummary);

            logInfo('\n' + '='.repeat(60));
            logInfo('FinOps assessment completed successfully!');
            logInfo('='.repeat(60));

        } catch (error) {
            logError(`Fatal error during assessment: ${error}`);
            throw error;
        }
    }

    /**
     * Display assessment report to console
     */
    private displayReport(costAnalysis: any, resourceSummary: any, recommendationSummary?: any): void {
        console.log('\n' + '='.repeat(60));
        console.log('AZURE FINOPS ASSESSMENT REPORT');
        console.log('='.repeat(60));
        
        // Summary Section
        console.log('\n💰 COST SUMMARY');
        console.log('-'.repeat(60));
        console.log(`Subscription ID: ${costAnalysis.subscriptionId}`);
        console.log(`Analysis Date:   ${new Date(costAnalysis.analysisDate).toLocaleString()}`);
        console.log(`Currency:        ${costAnalysis.summary.currency}`);
        console.log('');
        console.log(`Historical Total (${costAnalysis.historical.startDate.split('T')[0]} to ${costAnalysis.historical.endDate.split('T')[0]}):`);
        console.log(`  ${costAnalysis.summary.totalHistoricalCost.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log('');
        console.log(`Current Month to Date:`);
        console.log(`  ${costAnalysis.summary.currentMonthToDate.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log('');
        console.log(`Estimated Month End:`);
        console.log(`  ${costAnalysis.summary.forecastedMonthEnd.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log('');
        console.log(`Forecasted Next Period:`);
        console.log(`  ${costAnalysis.summary.forecastedNextMonth.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log('');
        console.log(`Average Daily Spend: ${costAnalysis.summary.avgDailySpend.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log(`Peak Daily Spend:    ${costAnalysis.summary.peakDailySpend.toFixed(2)} ${costAnalysis.summary.currency}`);

        // Daily Spend for Past 14 Days
        console.log('\n📊 DAILY SPEND (PAST 14 DAYS)');
        console.log('-'.repeat(60));
        
        if (costAnalysis.historical.dailyCosts && costAnalysis.historical.dailyCosts.length > 0) {
            // Get the last 14 days of daily costs
            const recentDailyCosts = costAnalysis.historical.dailyCosts.slice(-14);
            const maxDailyCost = Math.max(...recentDailyCosts.map((d: any) => d.cost));
            
            recentDailyCosts.forEach((dayData: any) => {
                const date = new Date(dayData.date);
                const dateStr = format(date, 'MMM dd, yyyy (EEE)');
                const cost = dayData.cost.toFixed(2);
                const barLength = Math.round((dayData.cost / maxDailyCost) * 30); // Max 30 chars
                const bar = '█'.repeat(barLength);
                const padding = ' '.repeat(Math.max(0, 25 - dateStr.length));
                
                console.log(`${dateStr}${padding}$${cost.padStart(8)}  ${bar}`);
            });
            
            // Calculate 14-day average
            const fourteenDayTotal = recentDailyCosts.reduce((sum: number, d: any) => sum + d.cost, 0);
            const fourteenDayAvg = fourteenDayTotal / recentDailyCosts.length;
            console.log('-'.repeat(60));
            console.log(`14-Day Average: $${fourteenDayAvg.toFixed(2)} ${costAnalysis.summary.currency}/day`);
        } else {
            console.log('No daily cost data available');
        }

        // Month-over-Month Comparison
        console.log('\n📈 MONTH-OVER-MONTH COMPARISON');
        console.log('-'.repeat(60));
        const comparison = costAnalysis.current.comparisonToPreviousMonth;
        const changeSymbol = comparison.changePercent > 0 ? '↑' : comparison.changePercent < 0 ? '↓' : '→';
        console.log(`Previous Month:  ${comparison.previousMonthTotal.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log(`Current Month:   ${costAnalysis.current.monthToDateCost.toFixed(2)} ${costAnalysis.summary.currency}`);
        console.log(`Change:          ${changeSymbol} ${comparison.changeAmount > 0 ? '+' : ''}${comparison.changeAmount.toFixed(2)} (${comparison.changePercent > 0 ? '+' : ''}${comparison.changePercent.toFixed(1)}%)`);

        // Trends
        if (costAnalysis.trends.length > 0) {
            console.log('\n📉 COST TRENDS');
            console.log('-'.repeat(60));
            costAnalysis.trends.forEach((trend: any) => {
                const trendSymbol = trend.direction === 'increasing' ? '↑' : trend.direction === 'decreasing' ? '↓' : '→';
                console.log(`${trendSymbol} ${trend.period.toUpperCase()}: ${trend.direction} (${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%)`);
            });
        }

        // Anomalies
        if (costAnalysis.anomalies.length > 0) {
            console.log('\n⚠️  COST ANOMALIES DETECTED');
            console.log('-'.repeat(60));
            costAnalysis.anomalies.slice(0, 5).forEach((anomaly: any) => {
                const severityIcon = anomaly.severity === 'critical' ? '🔴' : anomaly.severity === 'high' ? '🟠' : anomaly.severity === 'medium' ? '🟡' : '🟢';
                console.log(`${severityIcon} [${anomaly.severity.toUpperCase()}] ${anomaly.description}`);
                console.log(`   Date: ${anomaly.detectedDate.split('T')[0]}`);
            });
            if (costAnalysis.anomalies.length > 5) {
                console.log(`\n   ... and ${costAnalysis.anomalies.length - 5} more anomalies`);
            }
        }

        // Service Cost Breakdown
        if (costAnalysis.historical.costByService && costAnalysis.historical.costByService.length > 0) {
            console.log('\n💵 TOP EXPENSIVE SERVICES');
            console.log('-'.repeat(60));
            
            // Sort services by cost (descending) and take top 10
            const topServices = costAnalysis.historical.costByService
                .sort((a: any, b: any) => b.cost - a.cost)
                .slice(0, 10);
            
            topServices.forEach((service: any, index: number) => {
                const bar = '█'.repeat(Math.round(service.percentageOfTotal / 2)); // Visual bar (50% = 25 chars)
                const padding = ' '.repeat(Math.max(0, 35 - service.serviceName.length));
                console.log(`${index + 1}. ${service.serviceName}${padding}${service.cost.toFixed(2)} ${service.currency} (${service.percentageOfTotal.toFixed(1)}%)`);
                console.log(`   ${bar}`);
            });

            // Show total by category
            const categoryTotals = topServices.reduce((acc: any, service: any) => {
                if (!acc[service.serviceCategory]) {
                    acc[service.serviceCategory] = 0;
                }
                acc[service.serviceCategory] += service.cost;
                return acc;
            }, {});

            console.log('\n💰 Cost by Category:');
            Object.entries(categoryTotals)
                .sort(([, a]: any, [, b]: any) => b - a)
                .forEach(([category, cost]: any) => {
                    console.log(`  - ${category}: ${cost.toFixed(2)} ${costAnalysis.summary.currency}`);
                });
        }

        // Smart Recommendations Section (if available)
        if (recommendationSummary && recommendationSummary.totalRecommendations > 0) {
            console.log('\n📋 SMART RECOMMENDATIONS');
            console.log('-'.repeat(60));
            console.log(`Total Recommendations: ${recommendationSummary.totalRecommendations}`);
            console.log(`Potential Monthly Savings: $${recommendationSummary.totalPotentialMonthlySavings.toFixed(2)} USD`);
            console.log(`Potential Annual Savings: $${recommendationSummary.totalPotentialAnnualSavings.toFixed(2)} USD`);
            
            // Display by category
            if (recommendationSummary.byType && Object.keys(recommendationSummary.byType).length > 0) {
                console.log('\nBy Type:');
                Object.entries(recommendationSummary.byType).forEach(([type, data]: any) => {
                    console.log(`  ${type}: ${data.count} (save $${data.savings.toFixed(2)}/month)`);
                });
            }

            // Display by priority
            if (recommendationSummary.byPriority && Object.keys(recommendationSummary.byPriority).length > 0) {
                console.log('\nBy Priority:');
                if (recommendationSummary.byPriority.critical) {
                    console.log(`  🔴 Critical: ${recommendationSummary.byPriority.critical.count} ($${recommendationSummary.byPriority.critical.savings.toFixed(2)}/month)`);
                }
                if (recommendationSummary.byPriority.high) {
                    console.log(`  🟠 High: ${recommendationSummary.byPriority.high.count} ($${recommendationSummary.byPriority.high.savings.toFixed(2)}/month)`);
                }
                if (recommendationSummary.byPriority.medium) {
                    console.log(`  🟡 Medium: ${recommendationSummary.byPriority.medium.count} ($${recommendationSummary.byPriority.medium.savings.toFixed(2)}/month)`);
                }
                if (recommendationSummary.byPriority.low) {
                    console.log(`  🟢 Low: ${recommendationSummary.byPriority.low.count} ($${recommendationSummary.byPriority.low.savings.toFixed(2)}/month)`);
                }
            }

            // Display top 5 recommendations
            if (recommendationSummary.topRecommendations && recommendationSummary.topRecommendations.length > 0) {
                console.log('\n🔝 TOP RECOMMENDATIONS:');
                const topRecs = recommendationSummary.topRecommendations.slice(0, 5);
                topRecs.forEach((rec: any, index: number) => {
                    const priorityIcon = rec.priority === 'critical' ? '🔴' : 
                                        rec.priority === 'high' ? '🟠' : 
                                        rec.priority === 'medium' ? '🟡' : '🟢';
                    console.log(`\n${index + 1}. ${priorityIcon} ${rec.title}`);
                    console.log(`   💰 Savings: $${rec.potentialMonthlySavings.toFixed(2)}/month ($${rec.potentialAnnualSavings.toFixed(2)}/year)`);
                    console.log(`   ⏱️  Effort: ${rec.effort}`);
                    console.log(`   📝 ${rec.action}`);
                    if (rec.implementationSteps && rec.implementationSteps.length > 0) {
                        console.log(`   📌 Quick Action: ${rec.implementationSteps[0]}`);
                    }
                });
            }
            console.log('');
        }

        // Resource Summary
        console.log('\n🗂️ RESOURCE SUMMARY');
        console.log('-'.repeat(60));
        console.log(`Total Resources: ${resourceSummary.totalResources}`);
        console.log(`Total Monthly Cost: ${resourceSummary.totalMonthlyCost.toFixed(2)} ${resourceSummary.currency}`);
        
        // Top resource types by count
        const topTypes = Object.entries(resourceSummary.byType)
            .sort(([, a]: any, [, b]: any) => b.count - a.count)
            .slice(0, 5);
        
        if (topTypes.length > 0) {
            console.log('\nTop Resource Types:');
            topTypes.forEach(([type, data]: any) => {
                console.log(`  - ${type}: ${data.count} resources`);
            });
        }

        // Recommendations Section
        console.log('\n💡 RECOMMENDATIONS');
        console.log('-'.repeat(60));
        
        const recommendations = this.generateRecommendations(costAnalysis, resourceSummary);
        recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. ${rec.icon} ${rec.title}`);
            console.log(`   ${rec.description}`);
            if (rec.potentialSavings) {
                console.log(`   💵 Potential Savings: ${rec.potentialSavings}`);
            }
            console.log('');
        });

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Generate actionable recommendations based on cost analysis
     */
    private generateRecommendations(costAnalysis: any, resourceSummary: any): Array<{
        icon: string;
        title: string;
        description: string;
        potentialSavings?: string;
    }> {
        const recommendations = [];
        const topServices = costAnalysis.historical.costByService?.slice(0, 5) || [];
        const totalCost = costAnalysis.historical.totalCost;

        // Recommendation 1: Top service optimization
        if (topServices.length > 0) {
            const topService = topServices[0];
            const savingsEstimate = (topService.cost * 0.2).toFixed(2); // Assume 20% optimization potential
            
            let description = '';
            let icon = '💰';
            
            if (topService.serviceName.toLowerCase().includes('storage')) {
                description = 'Review storage lifecycle policies, delete unused blobs, and move cold data to Archive tier.';
                icon = '📦';
            } else if (topService.serviceName.toLowerCase().includes('virtual machine')) {
                description = 'Consider Reserved Instances for consistent workloads, right-size underutilized VMs, and use auto-shutdown for dev/test.';
                icon = '🖥️';
            } else if (topService.serviceName.toLowerCase().includes('database') || topService.serviceName.toLowerCase().includes('sql')) {
                description = 'Review DTU/vCore sizing, consider serverless tier for variable workloads, and optimize query performance.';
                icon = '🗄️';
            } else if (topService.serviceName.toLowerCase().includes('backup')) {
                description = 'Review backup retention policies, remove backups for deleted resources, and adjust backup frequency.';
                icon = '💾';
            } else if (topService.serviceName.toLowerCase().includes('bastion')) {
                description = 'Consider scheduled auto-shutdown for non-production hours or explore alternative remote access solutions.';
                icon = '🔒';
            } else {
                description = `Review usage patterns and explore optimization opportunities for ${topService.serviceName}.`;
            }

            recommendations.push({
                icon,
                title: `Optimize ${topService.serviceName} (${topService.percentageOfTotal.toFixed(1)}% of costs)`,
                description,
                potentialSavings: `~$${savingsEstimate} USD/90 days`
            });
        }

        // Recommendation 2: Anomaly investigation
        if (costAnalysis.anomalies?.length > 0) {
            const highAnomalies = costAnalysis.anomalies.filter((a: any) => 
                a.severity === 'high' || a.severity === 'critical'
            ).length;
            
            if (highAnomalies > 0) {
                recommendations.push({
                    icon: '⚠️',
                    title: `Investigate ${highAnomalies} High-Priority Cost Anomalies`,
                    description: 'Review unusual spending spikes to identify misconfigurations, runaway processes, or unexpected usage patterns.'
                });
            }
        }

        // Recommendation 3: Cost trend analysis
        const comparison = costAnalysis.current.comparisonToPreviousMonth;
        if (comparison.changePercent > 20) {
            recommendations.push({
                icon: '📈',
                title: `Cost Increase Alert: +${comparison.changePercent.toFixed(1)}% Month-over-Month`,
                description: 'Significant cost increase detected. Review new resource deployments and usage changes.',
                potentialSavings: `Address to prevent +$${Math.abs(comparison.changeAmount).toFixed(2)} monthly increase`
            });
        } else if (comparison.changePercent < -20) {
            recommendations.push({
                icon: '✅',
                title: `Cost Optimization Success: ${comparison.changePercent.toFixed(1)}% Reduction`,
                description: 'Great job! Continue monitoring to ensure savings are sustained and explore similar optimizations for other services.'
            });
        }

        // Recommendation 4: Reserved capacity opportunities
        const computeCosts = topServices.filter((s: any) => 
            s.serviceCategory === 'Compute' && s.percentageOfTotal > 15
        );
        
        if (computeCosts.length > 0) {
            const computeCost = computeCosts[0];
            const reservationSavings = (computeCost.cost * 0.30).toFixed(2); // 30% typical RI savings
            
            recommendations.push({
                icon: '🎫',
                title: 'Consider Reserved Instances/Capacity',
                description: 'For consistent compute workloads, Reserved Instances can save 30-72% compared to pay-as-you-go.',
                potentialSavings: `~$${reservationSavings} USD/90 days`
            });
        }

        // Recommendation 5: Unused resources cleanup
        if (resourceSummary.totalResources > 100) {
            recommendations.push({
                icon: '🧹',
                title: 'Clean Up Unused Resources',
                description: 'Review unattached disks, unused NICs, orphaned snapshots, and idle resources. Use Azure Advisor for recommendations.',
                potentialSavings: 'Typically 5-10% of total costs'
            });
        }

        // Recommendation 6: Tagging and cost allocation
        recommendations.push({
            icon: '🏷️',
            title: 'Implement Cost Allocation Tags',
            description: 'Tag resources by department, project, or environment to enable detailed cost tracking and chargeback.',
        });

        // Recommendation 7: Budget alerts
        const avgMonthlyCost = costAnalysis.summary.avgDailySpend * 30;
        recommendations.push({
            icon: '🔔',
            title: 'Set Up Budget Alerts',
            description: `Create budget alerts at $${(avgMonthlyCost * 0.8).toFixed(2)}, $${avgMonthlyCost.toFixed(2)}, and $${(avgMonthlyCost * 1.2).toFixed(2)} to catch unexpected spending.`,
        });

        return recommendations.slice(0, 7); // Return top 7 recommendations
    }

    /**
     * Save assessment results to JSON file
     */
    private saveResults(costAnalysis: any, resourceSummary: any, recommendations?: any[], recommendationSummary?: any): void {
        try {
            const outputDir = path.join(process.cwd(), 'reports');
            
            // Create reports directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            const filename = `finops-assessment-${timestamp}.json`;
            const filepath = path.join(outputDir, filename);

            const report: any = {
                generatedAt: new Date().toISOString(),
                costAnalysis,
                resourceSummary
            };

            // Add smart recommendations if available
            if (recommendations && recommendationSummary) {
                report.smartRecommendations = {
                    summary: recommendationSummary,
                    recommendations: recommendations
                };
            }

            fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
            logInfo(`\n✓ Report saved to: ${filepath}`);
        } catch (error) {
            logError(`Error saving results: ${error}`);
        }
    }
}

// Main execution
async function main() {
    try {
        const app = new FinOpsAssessmentApp();
        await app.run();
        process.exit(0);
    } catch (error) {
        logError(`Application error: ${error}`);
        process.exit(1);
    }
}

// Run the application
main();
