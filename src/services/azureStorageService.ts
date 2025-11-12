/**
 * Azure Storage Service
 * Cost-effective alternative to Cosmos DB for storing cost analysis data
 * Uses Blob Storage for JSON reports and Table Storage for structured data
 */

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { TableClient, AzureNamedKeyCredential } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';
import { configService } from '../utils/config';
import { logInfo, logError, logWarning } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

export class AzureStorageService {
    private blobServiceClient?: BlobServiceClient;
    private containerClient?: ContainerClient;
    private tableClient?: TableClient;
    private storageAccountName: string;
    private containerName: string;
    private tableName: string;
    private useStorage: boolean;

    constructor() {
        const config = configService.get();
        this.storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || config.storage?.accountName || '';
        this.containerName = config.storage?.containerName || 'finops-reports';
        this.tableName = config.storage?.tableName || 'FinOpsCostData';
        this.useStorage = config.storage?.useStorage || false;

        if (this.useStorage && this.storageAccountName) {
            this.initializeClients();
        } else {
            logInfo('Azure Storage not configured - using local file system only');
        }
    }

    /**
     * Initialize Azure Storage clients
     */
    private initializeClients(): void {
        try {
            const credential = new DefaultAzureCredential();
            
            // Initialize Blob Storage client
            const blobEndpoint = `https://${this.storageAccountName}.blob.core.windows.net`;
            this.blobServiceClient = new BlobServiceClient(blobEndpoint, credential);
            this.containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            
            // Initialize Table Storage client
            const tableEndpoint = `https://${this.storageAccountName}.table.core.windows.net`;
            this.tableClient = new TableClient(tableEndpoint, this.tableName, credential);
            
            logInfo(`Azure Storage initialized: ${this.storageAccountName}`);
        } catch (error) {
            logError(`Failed to initialize Azure Storage: ${error}`);
            this.useStorage = false;
        }
    }

    /**
     * Save assessment report to both local file and Azure Blob Storage
     */
    public async saveAssessmentReport(report: any): Promise<string> {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const filename = `cost-analysis-${timestamp}.json`;
        
        // Always save locally first
        const localPath = await this.saveLocalReport(report, filename);
        
        // Optionally save to Azure Blob Storage
        if (this.useStorage && this.containerClient) {
            try {
                await this.saveToBlobStorage(report, filename);
                logInfo(`[OK] Report saved to Azure Blob Storage: ${filename}`);
            } catch (error) {
                logWarning(`Could not save to Azure Storage (saved locally): ${error}`);
            }
        }
        
        return localPath;
    }

    /**
     * Save report to local file system
     */
    private async saveLocalReport(report: any, filename: string): Promise<string> {
        const outputDir = path.join(process.cwd(), 'reports');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
        
        return filepath;
    }

    /**
     * Save report to Azure Blob Storage
     */
    private async saveToBlobStorage(report: any, filename: string): Promise<void> {
        if (!this.containerClient) {
            throw new Error('Blob Storage client not initialized');
        }

        // Ensure container exists
        await this.containerClient.createIfNotExists({
            access: 'blob'
        });

        // Upload blob
        const blockBlobClient = this.containerClient.getBlockBlobClient(filename);
        const content = JSON.stringify(report, null, 2);
        await blockBlobClient.upload(content, content.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            }
        });
    }

    /**
     * Save cost summary to Azure Table Storage for time-series analysis
     */
    public async saveCostSummary(summary: {
        date: string;
        subscriptionId: string;
        totalCost: number;
        currency: string;
        monthToDate: number;
        forecastMonthEnd: number;
        resourceCount: number;
        anomalyCount: number;
    }): Promise<void> {
        if (!this.useStorage || !this.tableClient) {
            return; // Skip if storage not configured
        }

        try {
            // Ensure table exists
            await this.tableClient.createTable();

            // Create entity (row key is ISO date, partition key is subscription ID)
            const entity = {
                partitionKey: summary.subscriptionId,
                rowKey: summary.date.replace(/:/g, '-'),
                timestamp: new Date(summary.date),
                totalCost: summary.totalCost,
                currency: summary.currency,
                monthToDate: summary.monthToDate,
                forecastMonthEnd: summary.forecastMonthEnd,
                resourceCount: summary.resourceCount,
                anomalyCount: summary.anomalyCount
            };

            await this.tableClient.createEntity(entity);
            logInfo('✓ Cost summary saved to Azure Table Storage');
        } catch (error) {
            logWarning(`Could not save to Table Storage: ${error}`);
        }
    }

    /**
     * Retrieve historical assessments from Azure Blob Storage
     */
    public async listHistoricalReports(limit: number = 10): Promise<Array<{
        name: string;
        date: Date;
        url: string;
    }>> {
        if (!this.useStorage || !this.containerClient) {
            return this.listLocalReports(limit);
        }

        try {
            const reports: Array<{ name: string; date: Date; url: string }> = [];
            
            for await (const blob of this.containerClient.listBlobsFlat()) {
                if (blob.name.endsWith('.json')) {
                    reports.push({
                        name: blob.name,
                        date: blob.properties.createdOn || new Date(),
                        url: `https://${this.storageAccountName}.blob.core.windows.net/${this.containerName}/${blob.name}`
                    });
                }
            }

            // Sort by date descending and limit
            return reports
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, limit);
        } catch (error) {
            logWarning(`Could not list reports from Azure Storage: ${error}`);
            return this.listLocalReports(limit);
        }
    }

    /**
     * List reports from local file system
     */
    private listLocalReports(limit: number): Array<{ name: string; date: Date; url: string }> {
        const reportsDir = path.join(process.cwd(), 'reports');
        
        if (!fs.existsSync(reportsDir)) {
            return [];
        }

        const files = fs.readdirSync(reportsDir)
            .filter(f => f.endsWith('.json'))
            .map(name => {
                const filepath = path.join(reportsDir, name);
                const stats = fs.statSync(filepath);
                return {
                    name,
                    date: stats.mtime,
                    url: filepath
                };
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, limit);

        return files;
    }

    /**
     * Get historical cost data from Table Storage for trend analysis
     */
    public async getHistoricalCostData(
        subscriptionId: string,
        days: number = 30
    ): Promise<Array<{
        date: string;
        totalCost: number;
        currency: string;
    }>> {
        if (!this.useStorage || !this.tableClient) {
            return [];
        }

        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const entities = this.tableClient.listEntities({
                queryOptions: {
                    filter: `PartitionKey eq '${subscriptionId}' and Timestamp ge datetime'${startDate.toISOString()}'`
                }
            });

            const results: Array<{ date: string; totalCost: number; currency: string }> = [];
            
            for await (const entity of entities) {
                results.push({
                    date: entity.rowKey as string,
                    totalCost: entity.totalCost as number,
                    currency: entity.currency as string
                });
            }

            return results.sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            logWarning(`Could not retrieve historical data from Table Storage: ${error}`);
            return [];
        }
    }

    /**
     * Get storage account information
     */
    public getStorageInfo(): {
        enabled: boolean;
        accountName: string;
        containerName: string;
        tableName: string;
        estimatedMonthlyCost: string;
    } {
        return {
            enabled: this.useStorage,
            accountName: this.storageAccountName,
            containerName: this.containerName,
            tableName: this.tableName,
            estimatedMonthlyCost: this.useStorage 
                ? '~$0.01-0.10 USD (depending on usage)'
                : '$0 (local only)'
        };
    }
}
