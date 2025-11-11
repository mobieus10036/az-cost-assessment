/**
 * Cost Analysis Models for Azure FinOps Assessment
 * Supports historical, current, and forecasted cost data
 */

export interface CostDataPoint {
    date: string; // ISO date string
    cost: number;
    currency: string;
}

export interface CostByResource {
    resourceId: string;
    resourceName: string;
    resourceType: string;
    resourceGroup: string;
    location: string;
    cost: number;
    currency: string;
    tags?: Record<string, string>;
}

export interface CostByService {
    serviceName: string;
    serviceCategory: string;
    cost: number;
    currency: string;
    percentageOfTotal: number;
}

export interface HistoricalCostData {
    startDate: string;
    endDate: string;
    totalCost: number;
    currency: string;
    dailyCosts: CostDataPoint[];
    monthlyCosts: CostDataPoint[];
    costByResource: CostByResource[];
    costByService: CostByService[];
    costByResourceGroup: Array<{
        resourceGroup: string;
        cost: number;
        resourceCount: number;
    }>;
}

export interface CurrentCostData {
    billingPeriodStart: string;
    billingPeriodEnd: string;
    currentDate: string;
    monthToDateCost: number;
    estimatedMonthEndCost: number;
    currency: string;
    dailyCosts: CostDataPoint[];
    topCostResources: CostByResource[];
    topCostServices: CostByService[];
    comparisonToPreviousMonth: {
        previousMonthTotal: number;
        changeAmount: number;
        changePercent: number;
    };
}

export interface ForecastDataPoint {
    date: string;
    predictedCost: number;
    confidenceLower: number; // Lower bound of confidence interval
    confidenceUpper: number; // Upper bound of confidence interval
    currency: string;
}

export interface ForecastedCostData {
    forecastStartDate: string;
    forecastEndDate: string;
    totalForecastedCost: number;
    currency: string;
    dailyForecasts: ForecastDataPoint[];
    monthlyForecasts: ForecastDataPoint[];
    forecastMethod: string; // e.g., 'linear', 'exponential', 'azure-api'
    confidenceLevel: number; // e.g., 0.95 for 95% confidence
    assumptions: string[];
}

export interface CostAnomaly {
    id: string;
    detectedDate: string;
    resourceId?: string;
    resourceType?: string;
    service?: string;
    expectedCost: number;
    actualCost: number;
    deviationPercent: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

export interface CostTrend {
    period: 'daily' | 'weekly' | 'monthly';
    direction: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    changeAmount: number;
    dataPoints: CostDataPoint[];
}

export interface ComprehensiveCostAnalysis {
    id: string;
    subscriptionId: string;
    scope: string;
    analysisDate: string;
    historical: HistoricalCostData;
    current: CurrentCostData;
    forecasted: ForecastedCostData;
    trends: CostTrend[];
    anomalies: CostAnomaly[];
    summary: {
        totalHistoricalCost: number;
        currentMonthToDate: number;
        forecastedMonthEnd: number;
        forecastedNextMonth: number;
        currency: string;
        avgDailySpend: number;
        peakDailySpend: number;
        lowestDailySpend: number;
    };
}

// Legacy interface for backward compatibility
export interface CostAnalysis {
    totalCosts: number;
    costTrends: Array<{
        date: string;
        cost: number;
    }>;
    associatedResources: Array<{
        resourceId: string;
        resourceType: string;
        cost: number;
    }>;
}
