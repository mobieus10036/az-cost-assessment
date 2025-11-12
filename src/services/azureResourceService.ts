/**
 * Azure Resource Service
 * Fetches resource inventory and usage data for optimization analysis
 * Uses Managed Identity authentication
 */

import { ResourceManagementClient } from '@azure/arm-resources';
import { DefaultAzureCredential } from '@azure/identity';
import { CostManagementClient } from '@azure/arm-costmanagement';
import { ResourceInventoryItem, ResourceSummary, ResourceUsage } from '../models/resourceUsage';
import { configService } from '../utils/config';
import { logInfo, logError, logWarning } from '../utils/logger';

export class AzureResourceService {
    private client: ResourceManagementClient;
    private costClient: CostManagementClient;
    private credential: DefaultAzureCredential;
    private subscriptionId: string;

    constructor() {
        const azureConfig = configService.getAzureConfig();
        this.subscriptionId = azureConfig.subscriptionId;
        this.credential = new DefaultAzureCredential();
        this.client = new ResourceManagementClient(this.credential, this.subscriptionId);
        this.costClient = new CostManagementClient(this.credential);
        
        logInfo('Azure Resource Service initialized');
    }

    /**
     * Get complete resource inventory for the subscription
     */
    public async getResourceInventory(): Promise<ResourceInventoryItem[]> {
        try {
            logInfo('Fetching resource inventory...');
            
            const resources: ResourceInventoryItem[] = [];
            
            // List all resources in the subscription
            for await (const resource of this.client.resources.list()) {
                const inventoryItem: ResourceInventoryItem = {
                    resourceId: resource.id || '',
                    resourceName: resource.name || '',
                    resourceType: resource.type || '',
                    resourceGroup: this.extractResourceGroup(resource.id || ''),
                    location: resource.location || '',
                    subscriptionId: this.subscriptionId,
                    sku: resource.sku?.name,
                    tier: resource.sku?.tier,
                    size: resource.sku?.size,
                    provisioningState: resource.provisioningState || 'Unknown',
                    currentMonthlyCost: 0, // Would be populated from cost data
                    previousMonthCost: 0,
                    currency: 'USD',
                    createdDate: resource.createdTime?.toISOString(),
                    tags: resource.tags || {},
                    hasRecommendations: false,
                    isUnused: false,
                    daysUnused: 0
                };
                
                resources.push(inventoryItem);
            }

            logInfo(`Found ${resources.length} resources`);
            return resources;
            
        } catch (error) {
            logError(`Error fetching resource inventory: ${error}`);
            throw error;
        }
    }

    /**
     * Get resource summary statistics
     */
    public async getResourceSummary(): Promise<ResourceSummary> {
        try {
            logInfo('Calculating resource summary...');
            
            const inventory = await this.getResourceInventory();
            
            // Get actual cost data by resource type
            const costByType = await this.getCostByResourceType();
            
            const summary: ResourceSummary = {
                totalResources: inventory.length,
                totalMonthlyCost: 0, // Will be calculated from costByType
                currency: 'USD',
                byType: {},
                byResourceGroup: {},
                byLocation: {},
                utilizationSummary: {
                    optimized: 0,
                    underutilized: 0,
                    overutilized: 0,
                    avgUtilizationScore: 0
                },
                unusedResources: inventory.filter(r => r.isUnused).length,
                resourcesWithRecommendations: inventory.filter(r => r.hasRecommendations).length
            };

            // Aggregate by type with actual costs
            for (const resource of inventory) {
                if (!summary.byType[resource.resourceType]) {
                    const typeCost = costByType.get(resource.resourceType) || 0;
                    summary.byType[resource.resourceType] = { count: 0, cost: typeCost };
                }
                summary.byType[resource.resourceType].count++;

                // Aggregate by resource group
                if (!summary.byResourceGroup[resource.resourceGroup]) {
                    summary.byResourceGroup[resource.resourceGroup] = { count: 0, cost: 0 };
                }
                summary.byResourceGroup[resource.resourceGroup].count++;

                // Aggregate by location
                if (!summary.byLocation[resource.location]) {
                    summary.byLocation[resource.location] = { count: 0, cost: 0 };
                }
                summary.byLocation[resource.location].count++;
            }

            // Calculate total monthly cost from all resource types
            summary.totalMonthlyCost = Object.values(summary.byType).reduce((sum, type) => sum + type.cost, 0);

            logInfo(`Resource summary calculated: ${summary.totalResources} resources, $${summary.totalMonthlyCost.toFixed(2)}/month`);
            return summary;
            
        } catch (error) {
            logError(`Error calculating resource summary: ${error}`);
            throw error;
        }
    }

    /**
     * Get resource by ID
     */
    public async getResourceById(resourceId: string, apiVersion: string = '2021-04-01'): Promise<any> {
        try {
            logInfo(`Fetching resource: ${resourceId}`);
            const resource = await this.client.resources.getById(resourceId, apiVersion);
            return resource;
        } catch (error) {
            logError(`Error fetching resource ${resourceId}: ${error}`);
            throw error;
        }
    }

    /**
     * List all resource groups
     */
    public async listResourceGroups(): Promise<Array<{ name: string; location: string; id: string }>> {
        try {
            logInfo('Fetching resource groups...');
            
            const resourceGroups: Array<{ name: string; location: string; id: string }> = [];
            
            for await (const rg of this.client.resourceGroups.list()) {
                resourceGroups.push({
                    name: rg.name || '',
                    location: rg.location || '',
                    id: rg.id || ''
                });
            }

            logInfo(`Found ${resourceGroups.length} resource groups`);
            return resourceGroups;
            
        } catch (error) {
            logError(`Error fetching resource groups: ${error}`);
            throw error;
        }
    }

    /**
     * Get resources by type
     */
    public async getResourcesByType(resourceType: string): Promise<ResourceInventoryItem[]> {
        try {
            logInfo(`Fetching resources of type: ${resourceType}`);
            
            const allResources = await this.getResourceInventory();
            const filteredResources = allResources.filter(r => r.resourceType === resourceType);
            
            logInfo(`Found ${filteredResources.length} resources of type ${resourceType}`);
            return filteredResources;
            
        } catch (error) {
            logError(`Error fetching resources by type: ${error}`);
            throw error;
        }
    }

    /**
     * Get resources by resource group
     */
    public async getResourcesByResourceGroup(resourceGroupName: string): Promise<ResourceInventoryItem[]> {
        try {
            logInfo(`Fetching resources in resource group: ${resourceGroupName}`);
            
            const allResources = await this.getResourceInventory();
            const filteredResources = allResources.filter(r => r.resourceGroup === resourceGroupName);
            
            logInfo(`Found ${filteredResources.length} resources in ${resourceGroupName}`);
            return filteredResources;
            
        } catch (error) {
            logError(`Error fetching resources by resource group: ${error}`);
            throw error;
        }
    }

    /**
     * Extract resource group name from resource ID
     */
    private extractResourceGroup(resourceId: string): string {
        const match = resourceId.match(/resourceGroups\/([^\/]+)/i);
        return match ? match[1] : '';
    }

    /**
     * Get cost data by resource type from Azure Cost Management
     */
    private async getCostByResourceType(): Promise<Map<string, number>> {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30); // Last 30 days

            const costByType = new Map<string, number>();

            logInfo('Fetching cost data by resource type...');

            const queryDefinition = {
                type: 'Usage',
                timeframe: 'Custom',
                timePeriod: {
                    from: startDate.toISOString(),
                    to: endDate.toISOString()
                },
                dataset: {
                    granularity: 'None',
                    aggregation: {
                        totalCost: {
                            name: 'Cost',
                            function: 'Sum'
                        }
                    },
                    grouping: [
                        {
                            type: 'Dimension',
                            name: 'ResourceType'
                        }
                    ]
                }
            };

            // Add delay to avoid rate limiting
            await this.delay(15000);

            const scope = `/subscriptions/${this.subscriptionId}`;
            const result = await this.costClient.query.usage(scope, queryDefinition as any);

            if (result.rows && result.rows.length > 0) {
                const costIndex = result.columns?.findIndex((col: any) => col.name === 'Cost') ?? 0;
                const resourceTypeIndex = result.columns?.findIndex((col: any) => col.name === 'ResourceType') ?? 1;

                result.rows.forEach((row: any) => {
                    const cost = costIndex >= 0 ? parseFloat(row[costIndex]) || 0 : 0;
                    const resourceType = resourceTypeIndex >= 0 ? row[resourceTypeIndex] as string : '';
                    
                    if (resourceType && resourceType !== 'null' && resourceType.trim() !== '') {
                        costByType.set(resourceType, cost);
                    }
                });
            }

            logInfo(`Retrieved costs for ${costByType.size} resource types`);
            return costByType;

        } catch (error) {
            logWarning('Failed to get resource type costs, using zero costs');
            return new Map<string, number>();
        }
    }

    /**
     * Delay helper for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
