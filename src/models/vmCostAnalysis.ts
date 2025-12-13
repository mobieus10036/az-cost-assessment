/**
 * VM Cost Analysis Models
 * Provides detailed cost tracking and analysis for individual virtual machines
 */

export interface VMCostAnalysis {
    vmName: string;
    resourceId: string;
    resourceGroup: string;
    vmSize?: string;
    location?: string;
    powerState?: string;
    
    // Deletion status
    isDeleted: boolean;
    lastSeenDate?: string;
    
    // Cost metrics
    totalCost: number;
    averageDailyCost: number;
    peakDailyCost: number;
    minDailyCost: number;
    
    // Usage patterns
    daysActive: number;
    daysInPeriod: number;
    utilizationPercentage: number;
    
    // Monthly breakdown
    monthlyCosts: MonthlyVMCost[];
    
    // Trend analysis
    costTrend: 'increasing' | 'decreasing' | 'stable';
    trendPercentage: number;
    
    // Cost efficiency
    costPerActiveDay: number;
    projectedMonthlyCost: number;
    
    // Recommendations
    recommendations: VMCostRecommendation[];
}

export interface MonthlyVMCost {
    month: string;
    monthName: string;
    totalCost: number;
    daysActive: number;
    daysInMonth: number;
    averageDailyCost: number;
    comparedToPreviousMonth?: number;
}

export interface VMCostRecommendation {
    type: 'reserved-instance' | 'spot' | 'auto-shutdown' | 'resize' | 'delete' | 'savings-plan';
    title: string;
    reason: string;
    estimatedMonthlySavings: number;
    estimatedAnnualSavings: number;
    confidence: 'high' | 'medium' | 'low';
    priority: number;
    implementationEffort: 'low' | 'medium' | 'high';
}

export interface VMCostSummary {
    totalVMCost: number;
    averageVMCost: number;
    topCostVMs: VMCostAnalysis[];
    vmsByTrend: {
        increasing: number;
        decreasing: number;
        stable: number;
    };
    totalPotentialSavings: number;
    recommendationsByType: Record<string, number>;
}

export interface DailyCostEntry {
    date: string;
    cost: number;
    resourceGroup: string;
}
