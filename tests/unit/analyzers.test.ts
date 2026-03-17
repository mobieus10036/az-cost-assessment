import { CostTrendAnalyzer } from '../../src/analyzers/costTrendAnalyzer';
import { AnomalyDetector } from '../../src/analyzers/anomalyDetector';
import { ComprehensiveCostAnalysis } from '../../src/models/costAnalysis';

const buildAnalysis = (): ComprehensiveCostAnalysis => ({
    id: 'test-analysis',
    subscriptionId: 'sub-1',
    scope: '/subscriptions/sub-1',
    analysisDate: '2026-03-17T00:00:00.000Z',
    historical: {
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-17T00:00:00.000Z',
        totalCost: 520,
        currency: 'USD',
        dailyCosts: [
            { date: '2026-03-15T00:00:00.000Z', cost: 100, currency: 'USD' },
            { date: '2026-03-16T00:00:00.000Z', cost: 300, currency: 'USD' },
            { date: '2026-03-17T00:00:00.000Z', cost: 120, currency: 'USD' }
        ],
        dailyServiceCosts: [],
        monthlyCosts: [
            { date: '2026-01-01T00:00:00.000Z', cost: 1200, currency: 'USD' },
            { date: '2026-02-01T00:00:00.000Z', cost: 1400, currency: 'USD' },
            { date: '2026-03-01T00:00:00.000Z', cost: 1600, currency: 'USD' }
        ],
        costByResource: [],
        costByService: [
            {
                serviceName: 'Virtual Machines',
                serviceCategory: 'Compute',
                cost: 320,
                currency: 'USD',
                percentageOfTotal: 61.5
            }
        ],
        costByResourceGroup: []
    },
    current: {
        billingPeriodStart: '2026-03-01T00:00:00.000Z',
        billingPeriodEnd: '2026-03-31T00:00:00.000Z',
        currentDate: '2026-03-17T00:00:00.000Z',
        monthToDateCost: 900,
        estimatedMonthEndCost: 1550,
        currency: 'USD',
        dailyCosts: [
            { date: '2026-03-15T00:00:00.000Z', cost: 100, currency: 'USD' },
            { date: '2026-03-16T00:00:00.000Z', cost: 300, currency: 'USD' },
            { date: '2026-03-17T00:00:00.000Z', cost: 120, currency: 'USD' }
        ],
        topCostResources: [],
        topCostServices: [
            {
                serviceName: 'Virtual Machines',
                serviceCategory: 'Compute',
                cost: 320,
                currency: 'USD',
                percentageOfTotal: 61.5
            }
        ],
        comparisonToPreviousMonth: {
            previousMonthTotal: 1300,
            changeAmount: -400,
            changePercent: -30.7
        },
        monthlyComparison: {
            twoMonthsAgo: { name: 'January 2026', total: 1200 },
            lastMonth: { name: 'February 2026', total: 1300 },
            currentMonth: { name: 'March 2026', monthToDate: 900, projected: 1550 },
            lastTwoMonthsChange: { amount: 100, percent: 8.3 },
            projectedChange: { amount: 250, percent: 19.2 }
        }
    },
    forecasted: {
        forecastStartDate: '2026-03-18T00:00:00.000Z',
        forecastEndDate: '2026-04-16T00:00:00.000Z',
        totalForecastedCost: 1500,
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
        totalHistoricalCost: 520,
        currentMonthToDate: 900,
        forecastedMonthEnd: 1550,
        forecastedNextMonth: 1500,
        currency: 'USD',
        avgDailySpend: 173.3,
        peakDailySpend: 300,
        lowestDailySpend: 100
    }
});

describe('CostTrendAnalyzer', () => {
    let costTrendAnalyzer: CostTrendAnalyzer;

    beforeEach(() => {
        costTrendAnalyzer = new CostTrendAnalyzer();
    });

    it('analyzes trends from comprehensive analysis', () => {
        const result = costTrendAnalyzer.analyzeTrends(buildAnalysis());

        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toEqual(expect.objectContaining({
            period: expect.any(String),
            direction: expect.any(String),
            changePercent: expect.any(Number)
        }));
    });
});

describe('AnomalyDetector', () => {
    let anomalyDetector: AnomalyDetector;

    beforeEach(() => {
        anomalyDetector = new AnomalyDetector();
    });

    it('detects anomalies from comprehensive analysis', () => {
        const result = anomalyDetector.detectAnomalies(buildAnalysis());
        expect(Array.isArray(result)).toBe(true);
    });
});