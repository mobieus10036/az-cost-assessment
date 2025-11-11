/**
 * Resource Usage Models for Azure Resource Tracking
 */

export interface UsageMetrics {
    cpuUsage?: number; // Percentage 0-100
    memoryUsage?: number; // Percentage 0-100
    diskUsage?: number; // Percentage 0-100
    diskIOPS?: number;
    networkInbound?: number; // MB
    networkOutbound?: number; // MB
    requestCount?: number;
    errorRate?: number; // Percentage 0-100
}

export interface ResourceUsage {
    id: string;
    resourceId: string;
    resourceName: string;
    resourceType: string;
    resourceGroup: string;
    location: string;
    subscriptionId: string;
    
    // Usage metrics
    usageMetrics: UsageMetrics;
    
    // Time period
    timestamp: string;
    periodStart: string;
    periodEnd: string;
    
    // Cost correlation
    associatedCost: number;
    currency: string;
    
    // Utilization assessment
    utilizationScore: number; // 0-100, where 100 is optimal
    isUnderutilized: boolean;
    isOverutilized: boolean;
    
    // Metadata
    sku?: string;
    tier?: string;
    tags?: Record<string, string>;
}

export interface ResourceInventoryItem {
    resourceId: string;
    resourceName: string;
    resourceType: string;
    resourceGroup: string;
    location: string;
    subscriptionId: string;
    
    // Configuration
    sku?: string;
    tier?: string;
    size?: string;
    provisioningState: string;
    
    // Cost
    currentMonthlyCost: number;
    previousMonthCost: number;
    currency: string;
    
    // Metadata
    createdDate?: string;
    tags?: Record<string, string>;
    
    // Optimization flags
    hasRecommendations: boolean;
    isUnused: boolean;
    daysUnused?: number;
}

export interface ResourceSummary {
    totalResources: number;
    totalMonthlyCost: number;
    currency: string;
    
    byType: Record<string, {
        count: number;
        cost: number;
    }>;
    
    byResourceGroup: Record<string, {
        count: number;
        cost: number;
    }>;
    
    byLocation: Record<string, {
        count: number;
        cost: number;
    }>;
    
    utilizationSummary: {
        optimized: number; // count
        underutilized: number; // count
        overutilized: number; // count
        avgUtilizationScore: number;
    };
    
    unusedResources: number;
    resourcesWithRecommendations: number;
}

// Legacy interface for backward compatibility
export { UsageMetrics as LegacyUsageMetrics };
