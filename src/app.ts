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
import { HtmlReportGenerator } from './services/htmlReportGenerator';
import { logInfo, logError } from './utils/logger';
import { configService } from './utils/config';
import { InteractiveSetup } from './utils/interactiveSetup';
import { format } from 'date-fns';
import * as fs from 'fs';
import * as path from 'path';
import { colors, getSeverityColor, getTrendColor, getChangeColor, formatCurrency, formatPercentChange } from './utils/colors';

class FinOpsAssessmentApp {
    private costService: AzureCostManagementService;
    private resourceService: AzureResourceService;
    private trendAnalyzer: CostTrendAnalyzer;
    private anomalyDetector: AnomalyDetector;
    private smartRecommendations: SmartRecommendationAnalyzer;
    private htmlGenerator: HtmlReportGenerator;

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
        this.htmlGenerator = new HtmlReportGenerator();

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
            logInfo(`[OK] Cost analysis complete\n`);

            // Step 2: Analyze cost trends
            logInfo('Step 2: Analyzing cost trends...');
            costAnalysis.trends = this.trendAnalyzer.analyzeTrends(costAnalysis);
            logInfo(`[OK] Identified ${costAnalysis.trends.length} trends\n`);

            // Step 3: Detect cost anomalies
            logInfo('Step 3: Detecting cost anomalies...');
            costAnalysis.anomalies = this.anomalyDetector.detectAnomalies(costAnalysis);
            logInfo(`[OK] Detected ${costAnalysis.anomalies.length} anomalies\n`);

            // Step 4: Generate smart recommendations
            logInfo('Step 4: Generating smart recommendations...');
            const recommendations = await this.smartRecommendations.analyze();
            const recommendationSummary = this.smartRecommendations.generateSummary(recommendations);
            logInfo(`[OK] Generated ${recommendations.length} recommendations (potential savings: $${recommendationSummary.totalPotentialMonthlySavings.toFixed(2)}/month)\n`);

            // Step 5: Generate and display report
            logInfo('Step 5: Generating assessment report...\n');
            this.displayReport(costAnalysis, recommendationSummary);
            
            // Step 6: Save results to file
            await this.saveResults(costAnalysis, recommendations, recommendationSummary);

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
    private displayReport(costAnalysis: any, recommendationSummary?: any): void {
        console.log('\n' + colors.separator('='.repeat(60)));
        console.log(colors.header('AZURE FINOPS ASSESSMENT REPORT'));
        console.log(colors.separator('='.repeat(60)));
        
        // Summary Section
        console.log('\n' + colors.subheader('COST SUMMARY'));
        console.log(colors.separator('-'.repeat(60)));
        console.log(colors.label('Subscription ID: ') + colors.dim(costAnalysis.subscriptionId));
        console.log(colors.label('Analysis Date:   ') + colors.dim(new Date(costAnalysis.analysisDate).toLocaleString()));
        console.log(colors.label('Currency:        ') + colors.info(costAnalysis.summary.currency));
        console.log('');
        console.log(colors.label(`Historical Total (${costAnalysis.historical.startDate.split('T')[0]} to ${costAnalysis.historical.endDate.split('T')[0]}):`));
        console.log(`  ${formatCurrency(costAnalysis.summary.totalHistoricalCost, costAnalysis.summary.currency)}`);
        console.log('');
        console.log(colors.label(`Current Month to Date:`));
        console.log(`  ${formatCurrency(costAnalysis.summary.currentMonthToDate, costAnalysis.summary.currency)}`);
        console.log('');
        console.log(colors.label(`Estimated Month End:`));
        console.log(`  ${formatCurrency(costAnalysis.summary.forecastedMonthEnd, costAnalysis.summary.currency)}`);
        console.log('');
        console.log(colors.label(`Forecasted Next Period:`));
        console.log(`  ${formatCurrency(costAnalysis.summary.forecastedNextMonth, costAnalysis.summary.currency)}`);
        console.log('');
        console.log(colors.label('Average Daily Spend: ') + formatCurrency(costAnalysis.summary.avgDailySpend, costAnalysis.summary.currency));
        console.log(colors.label('Peak Daily Spend:    ') + formatCurrency(costAnalysis.summary.peakDailySpend, costAnalysis.summary.currency));

        // Daily Spend for Past 14 Days
        console.log('\n' + colors.subheader('DAILY SPEND (PAST 14 DAYS)'));
        console.log(colors.separator('-'.repeat(60)));
        
        if (costAnalysis.historical.dailyCosts && costAnalysis.historical.dailyCosts.length > 0) {
            // Get the last 14 days of daily costs
            const recentDailyCosts = costAnalysis.historical.dailyCosts.slice(-14);
            
            recentDailyCosts.forEach((dayData: any) => {
                const date = new Date(dayData.date);
                const dateStr = format(date, 'MMM dd, yyyy (EEE)');
                const cost = dayData.cost.toFixed(2);
                const padding = ' '.repeat(Math.max(0, 25 - dateStr.length));
                
                console.log(`${colors.dim(dateStr)}${padding}${colors.value('$' + cost.padStart(8))}`);
            });
            
            // Calculate 14-day average
            const fourteenDayTotal = recentDailyCosts.reduce((sum: number, d: any) => sum + d.cost, 0);
            const fourteenDayAvg = fourteenDayTotal / recentDailyCosts.length;
            console.log(colors.separator('-'.repeat(60)));
            console.log(colors.label('14-Day Average: ') + formatCurrency(fourteenDayAvg, costAnalysis.summary.currency) + colors.label('/day'));
        } else {
            console.log(colors.dim('No daily cost data available'));
        }

        // Month-over-Month Comparison (3 months)
        console.log('\n' + colors.subheader('MONTHLY COST COMPARISON'));
        console.log(colors.separator('-'.repeat(60)));
        
        const monthlyComp = costAnalysis.current.monthlyComparison;
        
        // Show three months
        console.log(`${colors.dim(monthlyComp.twoMonthsAgo.name.padEnd(20))} ${formatCurrency(monthlyComp.twoMonthsAgo.total, costAnalysis.summary.currency)}`);
        console.log(`${colors.dim(monthlyComp.lastMonth.name.padEnd(20))} ${formatCurrency(monthlyComp.lastMonth.total, costAnalysis.summary.currency)}`);
        console.log(`${colors.dim(monthlyComp.currentMonth.name.padEnd(20))} ${formatCurrency(monthlyComp.currentMonth.monthToDate, costAnalysis.summary.currency)} ${colors.label('(month-to-date)')}`);
        console.log(`${' '.repeat(20)} ${formatCurrency(monthlyComp.currentMonth.projected, costAnalysis.summary.currency)} ${colors.label('(projected)')}`);
        console.log('');
        
        // Show changes
        const historicalSymbol = monthlyComp.lastTwoMonthsChange.percent > 0 ? '^' : monthlyComp.lastTwoMonthsChange.percent < 0 ? 'v' : '-';
        const projectedSymbol = monthlyComp.projectedChange.percent > 0 ? '^' : monthlyComp.projectedChange.percent < 0 ? 'v' : '-';
        
        console.log(colors.label(`${monthlyComp.twoMonthsAgo.name} to ${monthlyComp.lastMonth.name}:`));
        const historicalChange = `${historicalSymbol} ${monthlyComp.lastTwoMonthsChange.amount > 0 ? '+' : ''}${monthlyComp.lastTwoMonthsChange.amount.toFixed(2)} ${costAnalysis.summary.currency} (${formatPercentChange(monthlyComp.lastTwoMonthsChange.percent)})`;
        console.log(`  ${getChangeColor(monthlyComp.lastTwoMonthsChange.percent)(historicalChange)}`);
        console.log('');
        console.log(colors.label(`${monthlyComp.lastMonth.name} to ${monthlyComp.currentMonth.name} (projected):`));
        const projectedChange = `${projectedSymbol} ${monthlyComp.projectedChange.amount > 0 ? '+' : ''}${monthlyComp.projectedChange.amount.toFixed(2)} ${costAnalysis.summary.currency} (${formatPercentChange(monthlyComp.projectedChange.percent)})`;
        console.log(`  ${getChangeColor(monthlyComp.projectedChange.percent)(projectedChange)}`);
        // Trends
        if (costAnalysis.trends.length > 0) {
            console.log('\n' + colors.subheader('COST TRENDS & PATTERNS'));
            console.log(colors.separator('-'.repeat(60)));
            costAnalysis.trends.forEach((trend: any) => {
                const trendSymbol = trend.direction === 'increasing' ? '^' : trend.direction === 'decreasing' ? 'v' : '-';
                const trendColor = getTrendColor(trend.direction);
                const trendText = `${trendSymbol} ${trend.period.toUpperCase()}: ${trend.direction} (${formatPercentChange(trend.changePercent)})`;
                console.log(trendColor(trendText));
                
                // Show moving averages if available
                if (trend.movingAverages) {
                    if (trend.movingAverages.sevenDay) {
                        console.log(colors.dim(`   7-day moving avg: $${trend.movingAverages.sevenDay.toFixed(2)}/day`));
                    }
                    if (trend.movingAverages.thirtyDay) {
                        console.log(colors.dim(`   30-day moving avg: $${trend.movingAverages.thirtyDay.toFixed(2)}/day`));
                    }
                }
                
                // Show week-over-week change
                if (trend.weekOverWeekChange !== undefined) {
                    const wowSymbol = trend.weekOverWeekChange > 0 ? '^' : 'v';
                    const wowText = `Week-over-week: ${wowSymbol} ${trend.weekOverWeekChange > 0 ? '+' : ''}${trend.weekOverWeekChange.toFixed(1)}%`;
                    console.log(colors.dim(`   ${wowText}`));
                }
                
                // Show projection if available
                if (trend.projectedNextPeriod) {
                    console.log(colors.dim(`   Projected next ${trend.period}: $${trend.projectedNextPeriod.toFixed(2)}`));
                }
                console.log('');
            });
        }

        // Anomalies
        if (costAnalysis.anomalies.length > 0) {
            console.log('\n' + colors.subheader('COST ANOMALIES DETECTED'));
            console.log(colors.separator('-'.repeat(60)));
            
            // Group by severity
            const critical = costAnalysis.anomalies.filter((a: any) => a.severity === 'critical');
            const high = costAnalysis.anomalies.filter((a: any) => a.severity === 'high');
            const medium = costAnalysis.anomalies.filter((a: any) => a.severity === 'medium');
            const low = costAnalysis.anomalies.filter((a: any) => a.severity === 'low');
            
            const summary = `Total: ${costAnalysis.anomalies.length} anomalies (${colors.critical(critical.length + ' critical')}, ${colors.high(high.length + ' high')}, ${colors.medium(medium.length + ' medium')}, ${colors.low(low.length + ' low')})`;
            console.log(summary + '\n');
            
            costAnalysis.anomalies.slice(0, 5).forEach((anomaly: any) => {
                const severityColor = getSeverityColor(anomaly.severity);
                console.log(severityColor(`[${anomaly.severity.toUpperCase()}] ${anomaly.description}`));
                console.log(colors.dim(`   Date: ${anomaly.detectedDate.split('T')[0]}`));
                
                if (anomaly.category) {
                    console.log(colors.dim(`   Type: ${anomaly.category.replace('_', ' ')}`));
                }
                
                if (anomaly.confidence) {
                    console.log(colors.dim(`   Confidence: ${(anomaly.confidence * 100).toFixed(0)}%`));
                }
                
                if (anomaly.recommendations && anomaly.recommendations.length > 0) {
                    console.log(colors.info(`   Action: ${anomaly.recommendations[0]}`));
                }
                console.log('');
            });
            
            if (costAnalysis.anomalies.length > 5) {
                console.log(colors.dim(`   ... and ${costAnalysis.anomalies.length - 5} more anomalies\n`));
            }
        }

        // Service Cost Breakdown
        if (costAnalysis.historical.costByService && costAnalysis.historical.costByService.length > 0) {
            console.log('\n' + colors.subheader('TOP EXPENSIVE SERVICES'));
            console.log(colors.separator('-'.repeat(60)));
            
            // Sort services by cost (descending) and take top 10
            const topServices = costAnalysis.historical.costByService
                .sort((a: any, b: any) => b.cost - a.cost)
                .slice(0, 10);
            
            topServices.forEach((service: any, index: number) => {
                const padding = ' '.repeat(Math.max(0, 35 - service.serviceName.length));
                const costStr = formatCurrency(service.cost, service.currency);
                const pctStr = colors.dim(`(${service.percentageOfTotal.toFixed(1)}%)`);
                console.log(`${colors.dim(index + 1 + '.')} ${colors.info(service.serviceName)}${padding}${costStr} ${pctStr}`);
            });

            // Show total by category
            const categoryTotals = topServices.reduce((acc: any, service: any) => {
                if (!acc[service.serviceCategory]) {
                    acc[service.serviceCategory] = 0;
                }
                acc[service.serviceCategory] += service.cost;
                return acc;
            }, {});

            console.log('\n' + colors.label('Cost by Category:'));
            Object.entries(categoryTotals)
                .sort(([, a]: any, [, b]: any) => b - a)
                .forEach(([category, cost]: any) => {
                    console.log(`  ${colors.dim('-')} ${colors.info(category)}: ${formatCurrency(cost, costAnalysis.summary.currency)}`);
                });
        }

        // Smart Recommendations Section (if available)
        if (recommendationSummary && recommendationSummary.totalRecommendations > 0) {
            console.log('\n' + colors.subheader('SMART RECOMMENDATIONS'));
            console.log(colors.separator('-'.repeat(60)));
            console.log(colors.label('Total Recommendations: ') + colors.value(recommendationSummary.totalRecommendations.toString()));
            console.log(colors.label('Potential Monthly Savings: ') + colors.savings(`$${recommendationSummary.totalPotentialMonthlySavings.toFixed(2)} USD`));
            console.log(colors.label('Potential Annual Savings: ') + colors.savings(`$${recommendationSummary.totalPotentialAnnualSavings.toFixed(2)} USD`));
            
            // Display by category
            if (recommendationSummary.byType && Object.keys(recommendationSummary.byType).length > 0) {
                console.log('\n' + colors.label('By Type:'));
                Object.entries(recommendationSummary.byType).forEach(([type, data]: any) => {
                    console.log(`  ${colors.info(type)}: ${data.count} ${colors.savings(`(save $${data.savings.toFixed(2)}/month)`)}`);
                });
            }

            // Display by priority
            if (recommendationSummary.byPriority && Object.keys(recommendationSummary.byPriority).length > 0) {
                console.log('\n' + colors.label('By Priority:'));
                if (recommendationSummary.byPriority.critical) {
                    console.log(`  ${colors.critical('Critical')}: ${recommendationSummary.byPriority.critical.count} ${colors.savings(`($${recommendationSummary.byPriority.critical.savings.toFixed(2)}/month)`)}`);
                }
                if (recommendationSummary.byPriority.high) {
                    console.log(`  ${colors.high('High')}: ${recommendationSummary.byPriority.high.count} ${colors.savings(`($${recommendationSummary.byPriority.high.savings.toFixed(2)}/month)`)}`);
                }
                if (recommendationSummary.byPriority.medium) {
                    console.log(`  ${colors.medium('Medium')}: ${recommendationSummary.byPriority.medium.count} ${colors.savings(`($${recommendationSummary.byPriority.medium.savings.toFixed(2)}/month)`)}`);
                }
                if (recommendationSummary.byPriority.low) {
                    console.log(`  ${colors.low('Low')}: ${recommendationSummary.byPriority.low.count} ${colors.savings(`($${recommendationSummary.byPriority.low.savings.toFixed(2)}/month)`)}`);
                }
            }

            // Display top 5 recommendations
            if (recommendationSummary.topRecommendations && recommendationSummary.topRecommendations.length > 0) {
                console.log('\n' + colors.label('TOP RECOMMENDATIONS:'));
                const topRecs = recommendationSummary.topRecommendations.slice(0, 5);
                topRecs.forEach((rec: any, index: number) => {
                    const priorityColor = getSeverityColor(rec.priority);
                    console.log(`\n${colors.dim((index + 1) + '.')} ${priorityColor(`[${rec.priority.toUpperCase()}]`)} ${colors.recommendation(rec.title)}`);
                    console.log(colors.label('   Savings: ') + colors.savings(`$${rec.potentialMonthlySavings.toFixed(2)}/month ($${rec.potentialAnnualSavings.toFixed(2)}/year)`));
                    console.log(colors.label('   Effort: ') + colors.dim(rec.effort));
                    console.log(colors.dim(`   ${rec.action}`));
                    if (rec.implementationSteps && rec.implementationSteps.length > 0) {
                        console.log(colors.info(`   Quick Action: ${rec.implementationSteps[0]}`));
                    }
                });
            }
            console.log('');
        }

        // Recommendations Section
        console.log('\n' + colors.subheader('RECOMMENDATIONS'));
        console.log(colors.separator('-'.repeat(60)));
        
        const recommendations = this.generateRecommendations(costAnalysis);
        recommendations.forEach((rec, index) => {
            console.log(colors.recommendation(`${index + 1}. ${rec.title}`));
            console.log(colors.dim(`   ${rec.description}`));
            if (rec.potentialSavings) {
                console.log(colors.savings(`   Potential Savings: ${rec.potentialSavings}`));
            }
            console.log('');
        });

        console.log('\n' + colors.separator('='.repeat(60)));
    }

    /**
     * Generate actionable recommendations based on cost analysis
     */
    private generateRecommendations(costAnalysis: any): Array<{
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
            
            if (topService.serviceName.toLowerCase().includes('storage')) {
                description = 'Review storage lifecycle policies, delete unused blobs, and move cold data to Archive tier.';
            } else if (topService.serviceName.toLowerCase().includes('virtual machine')) {
                description = 'Consider Reserved Instances for consistent workloads, right-size underutilized VMs, and use auto-shutdown for dev/test.';
            } else if (topService.serviceName.toLowerCase().includes('database') || topService.serviceName.toLowerCase().includes('sql')) {
                description = 'Review DTU/vCore sizing, consider serverless tier for variable workloads, and optimize query performance.';
            } else if (topService.serviceName.toLowerCase().includes('backup')) {
                description = 'Review backup retention policies, remove backups for deleted resources, and adjust backup frequency.';
            } else if (topService.serviceName.toLowerCase().includes('bastion')) {
                description = 'Consider scheduled auto-shutdown for non-production hours or explore alternative remote access solutions.';
            } else {
                description = `Review usage patterns and explore optimization opportunities for ${topService.serviceName}.`;
            }

            recommendations.push({
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
                    title: `Investigate ${highAnomalies} High-Priority Cost Anomalies`,
                    description: 'Review unusual spending spikes to identify misconfigurations, runaway processes, or unexpected usage patterns.'
                });
            }
        }

        // Recommendation 3: Cost trend analysis
        const comparison = costAnalysis.current.comparisonToPreviousMonth;
        if (comparison.changePercent > 20) {
            recommendations.push({
                title: `Cost Increase Alert: +${comparison.changePercent.toFixed(1)}% Month-over-Month`,
                description: 'Significant cost increase detected. Review new resource deployments and usage changes.',
                potentialSavings: `Address to prevent +$${Math.abs(comparison.changeAmount).toFixed(2)} monthly increase`
            });
        } else if (comparison.changePercent < -20) {
            recommendations.push({
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
                title: 'Consider Reserved Instances/Capacity',
                description: 'For consistent compute workloads, Reserved Instances can save 30-72% compared to pay-as-you-go.',
                potentialSavings: `~$${reservationSavings} USD/90 days`
            });
        }

        // Recommendation 5: Tagging and cost allocation
        recommendations.push({
            title: 'Implement Cost Allocation Tags',
            description: 'Tag resources by department, project, or environment to enable detailed cost tracking and chargeback.',
        });

        // Recommendation 6: Budget alerts
        const avgMonthlyCost = costAnalysis.summary.avgDailySpend * 30;
        recommendations.push({
            title: 'Set Up Budget Alerts',
            description: `Create budget alerts at $${(avgMonthlyCost * 0.8).toFixed(2)}, $${avgMonthlyCost.toFixed(2)}, and $${(avgMonthlyCost * 1.2).toFixed(2)} to catch unexpected spending.`,
        });

        return recommendations.slice(0, 6); // Return top 6 recommendations
    }

    /**
     * Save assessment results to JSON file
     */
    private async saveResults(costAnalysis: any, recommendations?: any[], recommendationSummary?: any): Promise<void> {
        try {
            const outputDir = path.join(process.cwd(), 'reports');
            
            // Create reports directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
            
            // Save JSON report
            const jsonFilename = `finops-assessment-${timestamp}.json`;
            const jsonFilepath = path.join(outputDir, jsonFilename);

            const report: any = {
                generatedAt: new Date().toISOString(),
                costAnalysis
            };

            // Add smart recommendations if available
            if (recommendations && recommendationSummary) {
                report.smartRecommendations = {
                    summary: recommendationSummary,
                    recommendations: recommendations
                };
            }

            fs.writeFileSync(jsonFilepath, JSON.stringify(report, null, 2));
            logInfo(`\n${colors.success('[OK]')} JSON report saved to: ${jsonFilepath}`);

            // Generate HTML report
            const htmlFilename = `finops-assessment-${timestamp}.html`;
            const htmlFilepath = path.join(outputDir, htmlFilename);
            
            const htmlContent = this.htmlGenerator.generate(
                costAnalysis,
                recommendations,
                recommendationSummary
            );
            
            fs.writeFileSync(htmlFilepath, htmlContent, 'utf-8');
            logInfo(`${colors.success('[OK]')} HTML report saved to: ${htmlFilepath}`);
            
        } catch (error) {
            logError(`Error saving results: ${error}`);
        }
    }
}

// Main execution
async function main() {
    try {
        // Check if configuration is valid
        const envPath = path.join(process.cwd(), '.env');
        const envExists = fs.existsSync(envPath);

        let configValid = false;
        try {
            configService.validateRequired();
            configValid = true;
        } catch (error) {
            configValid = false;
        }

        // Run interactive setup if config is missing or invalid
        if (!envExists || !configValid) {
            console.log('⚠️  Configuration not found or incomplete.\n');
            const setup = new InteractiveSetup();
            const setupSuccess = await setup.run();

            if (!setupSuccess) {
                console.log('\n❌ Setup failed. Please try again.');
                process.exit(1);
            }

            console.log('\nStarting cost analysis...\n');
            
            // Reload configuration after setup to pick up new environment variables
            configService.reload();
        }

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
