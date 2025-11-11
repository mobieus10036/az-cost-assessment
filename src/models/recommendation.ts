/**
 * Recommendation Models for Azure FinOps Optimization
 */

export type RecommendationType = 
    | 'rightsize'
    | 'shutdown'
    | 'reserved-instance'
    | 'savings-plan'
    | 'disk-optimization'
    | 'delete-unused'
    | 'networking'
    | 'storage-tier'
    | 'licensing'
    | 'other';

export type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';
export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'ignored';

export interface Recommendation {
    id: string;
    type: RecommendationType;
    priority: RecommendationPriority;
    status: RecommendationStatus;
    
    // Resource information
    resourceId: string;
    resourceName: string;
    resourceType: string;
    resourceGroup: string;
    location: string;
    
    // Recommendation details
    title: string;
    description: string;
    action: string;
    rationale: string;
    
    // Cost impact
    currentMonthlyCost: number;
    projectedMonthlyCost: number;
    potentialMonthlySavings: number;
    potentialAnnualSavings: number;
    currency: string;
    savingsPercent: number;
    
    // Implementation
    effort: 'low' | 'medium' | 'high';
    implementationSteps: string[];
    risks: string[];
    prerequisites: string[];
    
    // Metadata
    createdAt: string;
    updatedAt: string;
    detectedBy: string; // e.g., 'anomaly-detector', 'usage-analyzer'
    category: string;
    tags?: Record<string, string>;
    
    // Supporting data
    metrics?: {
        cpuUtilization?: number;
        memoryUtilization?: number;
        diskUtilization?: number;
        networkUtilization?: number;
        idleTimePercent?: number;
    };
    
    additionalInfo?: Record<string, any>;
}

export interface RecommendationSummary {
    totalRecommendations: number;
    totalPotentialMonthlySavings: number;
    totalPotentialAnnualSavings: number;
    currency: string;
    
    byType: Record<RecommendationType, {
        count: number;
        savings: number;
    }>;
    
    byPriority: Record<RecommendationPriority, {
        count: number;
        savings: number;
    }>;
    
    byStatus: Record<RecommendationStatus, {
        count: number;
        savings: number;
    }>;
    
    topRecommendations: Recommendation[];
}
