import * as dotenv from 'dotenv';
import * as config from 'config';

dotenv.config();

export interface AppConfig {
    azure: {
        subscriptionId: string;
        tenantId: string;
        scope: string;
    };
    storage: {
        accountName: string;
        containerName: string;
        tableName: string;
        useStorage: boolean;
    };
    analysis: {
        historicalDays: number;
        forecastDays: number;
        anomalyThresholdPercent: number;
        costTrendAnalysis: {
            timeFrame: string;
            thresholdPercent: number;
        };
        resourceOptimization: {
            underutilizationThresholdPercent: number;
            oversizedThresholdPercent: number;
        };
    };
    logging: {
        level: string;
        logFile: string;
    };
}

class ConfigService {
    private static instance: ConfigService;
    private appConfig: AppConfig;

    private constructor() {
        this.appConfig = this.loadConfig();
        this.validate();
    }

    public static getInstance(): ConfigService {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }

    /**
     * Reload configuration from environment variables
     * Call this after .env file is created/updated
     */
    public reload(): void {
        // Reload dotenv to pick up new values
        require('dotenv').config({ override: true });
        this.appConfig = this.loadConfig();
    }

    private loadConfig(): AppConfig {
        // Get config as plain object
        let cfg: any = {};
        try {
            cfg = config.has('azure') ? config.util.toObject() : {};
        } catch (error) {
            // If config file doesn't exist or is invalid, use empty object
            cfg = {};
        }
        
        // Override with environment variables if present
        return {
            azure: {
                subscriptionId: process.env.AZURE_SUBSCRIPTION_ID || cfg.azure?.subscriptionId || '',
                tenantId: process.env.AZURE_TENANT_ID || cfg.azure?.tenantId || '',
                scope: process.env.AZURE_SCOPE || cfg.azure?.scope || `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID || cfg.azure?.subscriptionId}`,
            },
            storage: {
                accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || cfg.storage?.accountName || '',
                containerName: cfg.storage?.containerName || 'finops-reports',
                tableName: cfg.storage?.tableName || 'FinOpsCostData',
                useStorage: cfg.storage?.useStorage || false,
            },
            analysis: cfg.analysis || {
                historicalDays: 90,
                forecastDays: 30,
                anomalyThresholdPercent: 20,
                costTrendAnalysis: {
                    timeFrame: 'monthly',
                    thresholdPercent: 10,
                },
                resourceOptimization: {
                    underutilizationThresholdPercent: 20,
                    oversizedThresholdPercent: 50,
                },
            },
            logging: cfg.logging || {
                level: process.env.LOG_LEVEL || 'info',
                logFile: 'logs/app.log',
            },
        };
    }

    private validate(): void {
        // Don't validate during construction - let app.ts handle missing config
        // This allows interactive setup to run
    }

    public validateRequired(): void {
        const errors: string[] = [];

        if (!this.appConfig.azure.subscriptionId) {
            errors.push('AZURE_SUBSCRIPTION_ID is required');
        }

        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
    }

    public get(): AppConfig {
        return this.appConfig;
    }

    public getAzureConfig() {
        return this.appConfig.azure;
    }

    public getStorageConfig() {
        return this.appConfig.storage;
    }

    public getAnalysisConfig() {
        return this.appConfig.analysis;
    }

    public getLoggingConfig() {
        return this.appConfig.logging;
    }
}

export const configService = ConfigService.getInstance();
export default configService.get();
