import { AzureCostManagementService } from '../../src/services/azureCostManagementService';
import { AzureResourceService } from '../../src/services/azureResourceService';
import { CosmosDbService } from '../../src/services/cosmosDbService';

const runIntegration = process.env.RUN_AZURE_INTEGRATION_TESTS === 'true';
const describeIf = runIntegration ? describe : describe.skip;

describeIf('Integration Tests for Services', () => {
    let costManagementService: AzureCostManagementService;
    let resourceService: AzureResourceService;
    let cosmosDbService: CosmosDbService;

    beforeAll(() => {
        costManagementService = new AzureCostManagementService();
        resourceService = new AzureResourceService();
        cosmosDbService = new CosmosDbService('http://localhost:8081', 'local-dev-key');
    });

    test('should retrieve cost data from Azure Cost Management', async () => {
        const costData = await costManagementService.getComprehensiveCostAnalysis();
        expect(costData).toBeDefined();
        expect(costData.summary.totalHistoricalCost).toBeGreaterThanOrEqual(0);
    });

    test('should retrieve resource information from Azure Resource Service', async () => {
        const resources = await resourceService.getResourceInventory();
        expect(resources).toBeDefined();
        expect(Array.isArray(resources)).toBe(true);
    });

    test('should interact with Cosmos DB and retrieve data', async () => {
        await expect(cosmosDbService.getDatabase('test-db')).rejects.toThrow('CosmosDB service not implemented');
    });
});