import { DailyCostFluctuationAnalyzer } from '../../src/analyzers/dailyCostFluctuationAnalyzer';
import { ComprehensiveCostAnalysis } from '../../src/models/costAnalysis';

const buildAnalysis = (): ComprehensiveCostAnalysis => ({
    id: 'analysis-1',
    subscriptionId: 'sub-123',
    scope: '/subscriptions/sub-123',
    analysisDate: '2026-03-17T00:00:00.000Z',
    historical: {
        startDate: '2026-03-14T00:00:00.000Z',
        endDate: '2026-03-17T00:00:00.000Z',
        totalCost: 620,
        currency: 'USD',
        dailyCosts: [
            { date: '2026-03-14T00:00:00.000Z', cost: 100, currency: 'USD' },
            { date: '2026-03-15T00:00:00.000Z', cost: 102, currency: 'USD' },
            { date: '2026-03-16T00:00:00.000Z', cost: 180, currency: 'USD' },
            { date: '2026-03-17T00:00:00.000Z', cost: 238, currency: 'USD' }
        ],
        dailyServiceCosts: [
            { date: '2026-03-15T00:00:00.000Z', serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 55, currency: 'USD' },
            { date: '2026-03-15T00:00:00.000Z', serviceName: 'Storage Accounts', serviceCategory: 'Storage', cost: 47, currency: 'USD' },
            { date: '2026-03-16T00:00:00.000Z', serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 95, currency: 'USD' },
            { date: '2026-03-16T00:00:00.000Z', serviceName: 'Storage Accounts', serviceCategory: 'Storage', cost: 50, currency: 'USD' },
            { date: '2026-03-16T00:00:00.000Z', serviceName: 'Azure SQL Database', serviceCategory: 'Databases', cost: 35, currency: 'USD' },
            { date: '2026-03-17T00:00:00.000Z', serviceName: 'Virtual Machines', serviceCategory: 'Compute', cost: 130, currency: 'USD' },
            { date: '2026-03-17T00:00:00.000Z', serviceName: 'Storage Accounts', serviceCategory: 'Storage', cost: 52, currency: 'USD' },
            { date: '2026-03-17T00:00:00.000Z', serviceName: 'Azure SQL Database', serviceCategory: 'Databases', cost: 56, currency: 'USD' }
        ],
        monthlyCosts: [],
        costByResource: [],
        costByService: [],
        costByResourceGroup: []
    },
    current: {
        billingPeriodStart: '2026-03-01T00:00:00.000Z',
        billingPeriodEnd: '2026-03-31T00:00:00.000Z',
        currentDate: '2026-03-17T00:00:00.000Z',
        monthToDateCost: 620,
        estimatedMonthEndCost: 1200,
        currency: 'USD',
        dailyCosts: [],
        topCostResources: [],
        topCostServices: [],
        comparisonToPreviousMonth: {
            previousMonthTotal: 1000,
            changeAmount: -380,
            changePercent: -38
        },
        monthlyComparison: {
            twoMonthsAgo: { name: 'January 2026', total: 900 },
            lastMonth: { name: 'February 2026', total: 1000 },
            currentMonth: { name: 'March 2026', monthToDate: 620, projected: 1200 },
            lastTwoMonthsChange: { amount: 100, percent: 11.1 },
            projectedChange: { amount: 200, percent: 20 }
        }
    },
    forecasted: {
        forecastStartDate: '2026-03-18T00:00:00.000Z',
        forecastEndDate: '2026-04-16T00:00:00.000Z',
        totalForecastedCost: 1400,
        currency: 'USD',
        dailyForecasts: [],
        monthlyForecasts: [],
        forecastMethod: 'linear-projection',
        confidenceLevel: 0.9,
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
            apiDelayMs: 5000,
            maxRetries: 5,
            retryBaseDelayMs: 15000,
            retryMaxDelayMs: 120000
        }
    },
    summary: {
        totalHistoricalCost: 620,
        currentMonthToDate: 620,
        forecastedMonthEnd: 1200,
        forecastedNextMonth: 1400,
        currency: 'USD',
        avgDailySpend: 155,
        peakDailySpend: 238,
        lowestDailySpend: 100
    }
});

describe('DailyCostFluctuationAnalyzer', () => {
    it('identifies significant daily fluctuations and service drivers', () => {
        const analyzer = new DailyCostFluctuationAnalyzer();
        const result = analyzer.analyzeFluctuations(buildAnalysis());

        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toEqual(expect.objectContaining({
            totalChangeAmount: expect.any(Number),
            totalChangePercent: expect.any(Number),
            topServiceDrivers: expect.any(Array)
        }));

        expect(result[0].topServiceDrivers[0]).toEqual(expect.objectContaining({
            serviceName: expect.any(String),
            changeAmount: expect.any(Number)
        }));
    });
});
