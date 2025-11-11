import { CosmosClient } from "@azure/cosmos";
import { Config } from "../utils/config";

async function setupCosmosDB() {
    const config = Config.load();
    const client = new CosmosClient({
        endpoint: config.cosmosDb.endpoint,
        key: config.cosmosDb.key,
    });

    const databaseId = config.cosmosDb.databaseId;
    const containerId = config.cosmosDb.containerId;

    // Create database if it doesn't exist
    const { database } = await client.databases.createIfNotExists({ id: databaseId });
    console.log(`Database "${database.id}" is ready.`);

    // Create container if it doesn't exist
    const { container } = await database.containers.createIfNotExists({ id: containerId });
    console.log(`Container "${container.id}" is ready.`);
}

setupCosmosDB().catch((error) => {
    console.error("Error setting up Cosmos DB:", error);
});