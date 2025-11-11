import { CosmosDbService } from '../services/cosmosDbService';
import { CostAnalysis } from '../models/costAnalysis';
import { ResourceUsage } from '../models/resourceUsage';
import { Recommendation } from '../models/recommendation';

async function seedData() {
    const cosmosDbService = new CosmosDbService();

    const costAnalysisData: CostAnalysis[] = [
        {
            totalCosts: 1000,
            costTrends: [{ month: '2023-01', cost: 200 }, { month: '2023-02', cost: 250 }],
            associatedResources: ['resource1', 'resource2']
        },
        {
            totalCosts: 1500,
            costTrends: [{ month: '2023-01', cost: 300 }, { month: '2023-02', cost: 400 }],
            associatedResources: ['resource3', 'resource4']
        }
    ];

    const resourceUsageData: ResourceUsage[] = [
        {
            resourceType: 'VM',
            usageMetrics: [{ timestamp: '2023-01-01', usage: 80 }, { timestamp: '2023-02-01', usage: 60 }],
        },
        {
            resourceType: 'Storage',
            usageMetrics: [{ timestamp: '2023-01-01', usage: 50 }, { timestamp: '2023-02-01', usage: 70 }],
        }
    ];

    const recommendationsData: Recommendation[] = [
        {
            suggestedAction: 'Resize VM',
            potentialCostSavings: 100
        },
        {
            suggestedAction: 'Delete unused storage',
            potentialCostSavings: 50
        }
    ];

    await cosmosDbService.insertCostAnalysis(costAnalysisData);
    await cosmosDbService.insertResourceUsage(resourceUsageData);
    await cosmosDbService.insertRecommendations(recommendationsData);

    console.log('Seed data inserted successfully.');
}

seedData().catch(error => {
    console.error('Error seeding data:', error);
});