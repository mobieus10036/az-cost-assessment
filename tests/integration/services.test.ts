import { AzureCostManagementService } from '../../src/services/azureCostManagementService';
import { AzureResourceService } from '../../src/services/azureResourceService';
import { CosmosDbService } from '../../src/services/cosmosDbService';

describe('Integration Tests for Services', () => {
    let costManagementService: AzureCostManagementService;
    let resourceService: AzureResourceService;
    let cosmosDbService: CosmosDbService;

    beforeAll(() => {
        costManagementService = new AzureCostManagementService();
        resourceService = new AzureResourceService();
        cosmosDbService = new CosmosDbService();
    });

    test('should retrieve cost data from Azure Cost Management', async () => {
        const costData = await costManagementService.getCostData();
        expect(costData).toBeDefined();
        expect(costData.totalCosts).toBeGreaterThan(0);
    });

    test('should retrieve resource information from Azure Resource Service', async () => {
        const resources = await resourceService.getResources();
        expect(resources).toBeDefined();
        expect(Array.isArray(resources)).toBe(true);
    });

    test('should interact with Cosmos DB and retrieve data', async () => {
        const data = await cosmosDbService.getData();
        expect(data).toBeDefined();
        expect(Array.isArray(data)).toBe(true);
    });
});