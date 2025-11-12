/**
 * PDF Generator Service
 * Converts cost analysis JSON data into a formatted PDF report
 */
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';

export class PDFGeneratorService {
    private doc!: PDFKit.PDFDocument;
    private readonly pageWidth = 612; // Letter size
    private readonly pageHeight = 792;
    private readonly margin = 50;
    private readonly contentWidth = this.pageWidth - (2 * this.margin);
    private yPosition = this.margin;

    /**
     * Generate PDF report from cost analysis data
     */
    async generatePDF(costAnalysis: any, recommendationSummary: any, outputPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.doc = new PDFDocument({ 
                    size: 'LETTER',
                    margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin }
                });
                
                const writeStream = fs.createWriteStream(outputPath);
                this.doc.pipe(writeStream);

                // Generate report content
                this.addHeader(costAnalysis);
                this.addCostSummary(costAnalysis);
                this.addMonthlyComparison(costAnalysis);
                this.addTrends(costAnalysis);
                this.addAnomalies(costAnalysis);
                this.addTopServices(costAnalysis);
                this.addSmartRecommendations(recommendationSummary);
                this.addGeneralRecommendations(costAnalysis);

                this.doc.end();

                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    private addHeader(costAnalysis: any): void {
        // Title
        this.doc.fontSize(24)
            .fillColor('#0078D4') // Azure blue
            .text('Azure FinOps Assessment Report', this.margin, this.yPosition, { align: 'center' });
        
        this.yPosition += 40;
        
        // Metadata
        this.doc.fontSize(10)
            .fillColor('#666666')
            .text(`Subscription ID: ${costAnalysis.subscriptionId}`, this.margin, this.yPosition);
        this.yPosition += 15;
        this.doc.text(`Analysis Date: ${new Date(costAnalysis.analysisDate).toLocaleString()}`, this.margin, this.yPosition);
        this.yPosition += 15;
        this.doc.text(`Currency: ${costAnalysis.summary.currency}`, this.margin, this.yPosition);
        
        this.yPosition += 30;
        this.addHorizontalLine();
    }

    private addCostSummary(costAnalysis: any): void {
        this.checkPageBreak(200);
        
        // Section header
        this.addSectionHeader('Cost Summary');
        
        // Summary items
        const summaryItems = [
            { 
                label: `Historical Total (${costAnalysis.historical.startDate.split('T')[0]} to ${costAnalysis.historical.endDate.split('T')[0]})`,
                value: `$${costAnalysis.summary.totalHistoricalCost.toFixed(2)} ${costAnalysis.summary.currency}`
            },
            { label: 'Current Month to Date', value: `$${costAnalysis.summary.currentMonthToDate.toFixed(2)} ${costAnalysis.summary.currency}` },
            { label: 'Estimated Month End', value: `$${costAnalysis.summary.forecastedMonthEnd.toFixed(2)} ${costAnalysis.summary.currency}` },
            { label: 'Forecasted Next Period', value: `$${costAnalysis.summary.forecastedNextMonth.toFixed(2)} ${costAnalysis.summary.currency}` },
            { label: 'Average Daily Spend', value: `$${costAnalysis.summary.avgDailySpend.toFixed(2)} ${costAnalysis.summary.currency}` },
            { label: 'Peak Daily Spend', value: `$${costAnalysis.summary.peakDailySpend.toFixed(2)} ${costAnalysis.summary.currency}` }
        ];

        summaryItems.forEach(item => {
            this.doc.fontSize(10)
                .fillColor('#333333')
                .text(item.label, this.margin, this.yPosition, { width: this.contentWidth * 0.6, continued: true })
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text(item.value, { align: 'right' })
                .font('Helvetica');
            this.yPosition += 20;
        });

        this.yPosition += 10;
    }

    private addMonthlyComparison(costAnalysis: any): void {
        this.checkPageBreak(200);
        this.addSectionHeader('Monthly Cost Comparison');

        const monthlyComp = costAnalysis.current.monthlyComparison;
        
        // Three months display
        this.doc.fontSize(10)
            .fillColor('#666666')
            .text(monthlyComp.twoMonthsAgo.name, this.margin, this.yPosition, { width: this.contentWidth * 0.5, continued: true })
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text(`$${monthlyComp.twoMonthsAgo.total.toFixed(2)}`, { align: 'right' })
            .font('Helvetica');
        this.yPosition += 20;

        this.doc.fillColor('#666666')
            .text(monthlyComp.lastMonth.name, this.margin, this.yPosition, { width: this.contentWidth * 0.5, continued: true })
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text(`$${monthlyComp.lastMonth.total.toFixed(2)}`, { align: 'right' })
            .font('Helvetica');
        this.yPosition += 20;

        this.doc.fillColor('#666666')
            .text(`${monthlyComp.currentMonth.name} (month-to-date)`, this.margin, this.yPosition, { width: this.contentWidth * 0.5, continued: true })
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text(`$${monthlyComp.currentMonth.monthToDate.toFixed(2)}`, { align: 'right' })
            .font('Helvetica');
        this.yPosition += 20;

        this.doc.fillColor('#666666')
            .text(`${monthlyComp.currentMonth.name} (projected)`, this.margin, this.yPosition, { width: this.contentWidth * 0.5, continued: true })
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text(`$${monthlyComp.currentMonth.projected.toFixed(2)}`, { align: 'right' })
            .font('Helvetica');
        this.yPosition += 30;

        // Changes
        const historicalChangeColor = monthlyComp.lastTwoMonthsChange.percent < 0 ? '#107C10' : '#D13438'; // Green or Red
        const projectedChangeColor = monthlyComp.projectedChange.percent < 0 ? '#107C10' : '#D13438';

        this.doc.fontSize(9)
            .fillColor('#666666')
            .text(`${monthlyComp.twoMonthsAgo.name} to ${monthlyComp.lastMonth.name}:`, this.margin, this.yPosition);
        this.yPosition += 15;
        this.doc.fillColor(historicalChangeColor)
            .text(`  ${monthlyComp.lastTwoMonthsChange.amount > 0 ? '+' : ''}$${monthlyComp.lastTwoMonthsChange.amount.toFixed(2)} (${monthlyComp.lastTwoMonthsChange.percent > 0 ? '+' : ''}${monthlyComp.lastTwoMonthsChange.percent.toFixed(1)}%)`, this.margin, this.yPosition);
        this.yPosition += 20;

        this.doc.fillColor('#666666')
            .text(`${monthlyComp.lastMonth.name} to ${monthlyComp.currentMonth.name} (projected):`, this.margin, this.yPosition);
        this.yPosition += 15;
        this.doc.fillColor(projectedChangeColor)
            .text(`  ${monthlyComp.projectedChange.amount > 0 ? '+' : ''}$${monthlyComp.projectedChange.amount.toFixed(2)} (${monthlyComp.projectedChange.percent > 0 ? '+' : ''}${monthlyComp.projectedChange.percent.toFixed(1)}%)`, this.margin, this.yPosition);
        
        this.yPosition += 25;
    }

    private addTrends(costAnalysis: any): void {
        if (!costAnalysis.trends || costAnalysis.trends.length === 0) return;

        this.checkPageBreak(150);
        this.addSectionHeader('Cost Trends & Patterns');

        costAnalysis.trends.forEach((trend: any) => {
            const trendColor = trend.direction === 'decreasing' ? '#107C10' : trend.direction === 'increasing' ? '#D13438' : '#666666';
            
            this.doc.fontSize(10)
                .fillColor(trendColor)
                .text(`${trend.period.toUpperCase()}: ${trend.direction} (${trend.changePercent > 0 ? '+' : ''}${trend.changePercent.toFixed(1)}%)`, this.margin, this.yPosition);
            this.yPosition += 20;
        });

        this.yPosition += 10;
    }

    private addAnomalies(costAnalysis: any): void {
        if (!costAnalysis.anomalies || costAnalysis.anomalies.length === 0) return;

        this.checkPageBreak(200);
        this.addSectionHeader('Cost Anomalies Detected');

        const critical = costAnalysis.anomalies.filter((a: any) => a.severity === 'critical').length;
        const high = costAnalysis.anomalies.filter((a: any) => a.severity === 'high').length;
        const medium = costAnalysis.anomalies.filter((a: any) => a.severity === 'medium').length;
        const low = costAnalysis.anomalies.filter((a: any) => a.severity === 'low').length;

        this.doc.fontSize(10)
            .fillColor('#333333')
            .text(`Total: ${costAnalysis.anomalies.length} anomalies (${critical} critical, ${high} high, ${medium} medium, ${low} low)`, this.margin, this.yPosition);
        this.yPosition += 25;

        // Show top 5 anomalies
        const topAnomalies = costAnalysis.anomalies.slice(0, 5);
        topAnomalies.forEach((anomaly: any) => {
            this.checkPageBreak(80);
            
            const severityColor = this.getSeverityColor(anomaly.severity);
            this.doc.fontSize(9)
                .fillColor(severityColor)
                .font('Helvetica-Bold')
                .text(`[${anomaly.severity.toUpperCase()}]`, this.margin, this.yPosition, { continued: true })
                .font('Helvetica')
                .fillColor('#000000')
                .text(` ${anomaly.description}`);
            this.yPosition += 15;

            if (anomaly.detectedDate) {
                this.doc.fontSize(8)
                    .fillColor('#666666')
                    .text(`Date: ${anomaly.detectedDate.split('T')[0]}`, this.margin + 15, this.yPosition);
                this.yPosition += 12;
            }

            this.yPosition += 5;
        });

        this.yPosition += 10;
    }

    private addTopServices(costAnalysis: any): void {
        if (!costAnalysis.historical.costByService || costAnalysis.historical.costByService.length === 0) return;

        this.checkPageBreak(250);
        this.addSectionHeader('Top Expensive Services');

        const topServices = costAnalysis.historical.costByService
            .sort((a: any, b: any) => b.cost - a.cost)
            .slice(0, 10);

        topServices.forEach((service: any, index: number) => {
            this.doc.fontSize(9)
                .fillColor('#333333')
                .text(`${index + 1}. ${service.serviceName}`, this.margin, this.yPosition, { width: this.contentWidth * 0.55, continued: true })
                .fillColor('#000000')
                .font('Helvetica-Bold')
                .text(`$${service.cost.toFixed(2)}`, { align: 'right', width: this.contentWidth * 0.25, continued: true })
                .fillColor('#666666')
                .font('Helvetica')
                .text(` (${service.percentageOfTotal.toFixed(1)}%)`, { align: 'right', width: this.contentWidth * 0.2 });
            this.yPosition += 18;
        });

        this.yPosition += 15;
    }

    private addSmartRecommendations(recommendationSummary: any): void {
        if (!recommendationSummary || recommendationSummary.totalRecommendations === 0) return;

        this.checkPageBreak(250);
        this.addSectionHeader('Smart Recommendations');

        this.doc.fontSize(10)
            .fillColor('#333333')
            .text(`Total Recommendations: ${recommendationSummary.totalRecommendations}`, this.margin, this.yPosition);
        this.yPosition += 18;

        this.doc.fillColor('#107C10')
            .font('Helvetica-Bold')
            .text(`Potential Monthly Savings: $${recommendationSummary.totalPotentialMonthlySavings.toFixed(2)}`, this.margin, this.yPosition);
        this.yPosition += 18;

        this.doc.text(`Potential Annual Savings: $${recommendationSummary.totalPotentialAnnualSavings.toFixed(2)}`, this.margin, this.yPosition);
        this.yPosition += 30;

        // Top recommendations
        if (recommendationSummary.topRecommendations && recommendationSummary.topRecommendations.length > 0) {
            this.doc.font('Helvetica')
                .fontSize(11)
                .fillColor('#0078D4')
                .text('Top Recommendations:', this.margin, this.yPosition);
            this.yPosition += 20;

            const topRecs = recommendationSummary.topRecommendations.slice(0, 5);
            topRecs.forEach((rec: any, index: number) => {
                this.checkPageBreak(100);

                const severityColor = this.getSeverityColor(rec.priority);
                this.doc.fontSize(9)
                    .fillColor('#333333')
                    .text(`${index + 1}. `, this.margin, this.yPosition, { continued: true })
                    .fillColor(severityColor)
                    .font('Helvetica-Bold')
                    .text(`[${rec.priority.toUpperCase()}] `, { continued: true })
                    .fillColor('#000000')
                    .font('Helvetica')
                    .text(rec.title);
                this.yPosition += 15;

                this.doc.fontSize(8)
                    .fillColor('#107C10')
                    .text(`   Savings: $${rec.potentialMonthlySavings.toFixed(2)}/month ($${rec.potentialAnnualSavings.toFixed(2)}/year)`, this.margin, this.yPosition);
                this.yPosition += 12;

                this.doc.fillColor('#666666')
                    .text(`   Effort: ${rec.effort}`, this.margin, this.yPosition);
                this.yPosition += 12;

                this.doc.text(`   ${rec.action}`, this.margin, this.yPosition, { width: this.contentWidth - 15 });
                this.yPosition += 20;
            });
        }

        this.yPosition += 10;
    }

    private addGeneralRecommendations(costAnalysis: any): void {
        this.checkPageBreak(200);
        this.addSectionHeader('General Recommendations');

        // Add some basic recommendations
        const recommendations = [
            'Review and right-size virtual machines based on actual usage',
            'Consider Azure Reserved Instances for predictable workloads (save 30-72%)',
            'Implement auto-shutdown schedules for dev/test resources',
            'Enable Azure Cost Management alerts for budget monitoring',
            'Review and delete unused resources and orphaned disks'
        ];

        recommendations.forEach((rec, index) => {
            this.checkPageBreak(30);
            this.doc.fontSize(9)
                .fillColor('#333333')
                .text(`${index + 1}. ${rec}`, this.margin, this.yPosition, { width: this.contentWidth });
            this.yPosition += 20;
        });
    }

    private addSectionHeader(title: string): void {
        this.doc.fontSize(14)
            .fillColor('#0078D4')
            .font('Helvetica-Bold')
            .text(title, this.margin, this.yPosition);
        this.yPosition += 25;
        this.doc.font('Helvetica');
    }

    private addHorizontalLine(): void {
        this.doc.strokeColor('#CCCCCC')
            .lineWidth(1)
            .moveTo(this.margin, this.yPosition)
            .lineTo(this.pageWidth - this.margin, this.yPosition)
            .stroke();
        this.yPosition += 20;
    }

    private checkPageBreak(requiredSpace: number): void {
        if (this.yPosition + requiredSpace > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.yPosition = this.margin;
        }
    }

    private getSeverityColor(severity: string): string {
        switch (severity.toLowerCase()) {
            case 'critical':
                return '#D13438'; // Red
            case 'high':
                return '#FF8C00'; // Orange
            case 'medium':
                return '#FFB900'; // Yellow
            case 'low':
                return '#0078D4'; // Blue
            default:
                return '#666666'; // Gray
        }
    }
}
