/**
 * Azure Cost Management Service
 * Fetches historical, current, and forecasted cost data using Azure Cost Management APIs
 * Uses Managed Identity authentication (preferred) with fallback to other methods
 */

import { AzureCliCredential } from '@azure/identity';
import { CostManagementClient, QueryDefinition, QueryResult } from '@azure/arm-costmanagement';
import { 
    ComprehensiveCostAnalysis,
    HistoricalCostData,
    CurrentCostData,
    ForecastedCostData,
    CostDataPoint,
    DailyServiceCostPoint,
    CostByResource,
    CostByService,
    ForecastDataPoint 
} from '../models/costAnalysis';
import { configService } from '../utils/config';
import { logInfo, logError, logWarning } from '../utils/logger';
import { subDays, format, startOfMonth, endOfMonth, addDays, subMonths } from 'date-fns';

export class AzureCostManagementService {
    private client: CostManagementClient;
    private credential: AzureCliCredential;
    private subscriptionId: string;
    private scope: string;
    private readonly API_DELAY_MS: number;
    private readonly MAX_RETRIES: number;
    private readonly RETRY_DELAY_MS: number;
    private readonly RETRY_MAX_DELAY_MS: number;
    
    // Cache for avoiding redundant API calls within the same session
    private queryCache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly CACHE_TTL_MS = 300000; // 5 minute cache TTL

    constructor() {
        const azureConfig = configService.getAzureConfig();
        this.subscriptionId = azureConfig.subscriptionId;
        this.scope = azureConfig.scope;
        this.API_DELAY_MS = azureConfig.costManagement?.apiDelayMs || 5000;
        this.MAX_RETRIES = azureConfig.costManagement?.maxRetries || 5;
        this.RETRY_DELAY_MS = azureConfig.costManagement?.retryBaseDelayMs || 15000;
        this.RETRY_MAX_DELAY_MS = azureConfig.costManagement?.retryMaxDelayMs || 120000;
        
        // Force Azure CLI credential so runtime az login/subscription context is honored consistently.
        this.credential = new AzureCliCredential({ tenantId: azureConfig.tenantId });
        this.client = new CostManagementClient(this.credential);
        
        logInfo('Azure Cost Management Service initialized');
    }

    /**
     * Delay helper to avoid rate limiting
     */
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Execute API call with retry logic for rate limiting
     */
    private async executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                const isRateLimitError = error?.message?.includes('Too many requests') || 
                                        error?.statusCode === 429;
                
                if (isRateLimitError && attempt < this.MAX_RETRIES) {
                    const waitTime = Math.min(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1), this.RETRY_MAX_DELAY_MS);
                    logWarning(`Rate limit hit for ${operationName}. Waiting ${waitTime}ms before retry ${attempt}/${this.MAX_RETRIES}...`);
                    await this.delay(waitTime);
                } else {
                    throw error;
                }
            }
        }
        throw new Error(`Failed after ${this.MAX_RETRIES} retries`);
    }

    private async queryUsageAllPages(scope: string, query: QueryDefinition, operationName: string): Promise<QueryResult> {
        const firstPage = await this.executeWithRetry(
            () => this.client.query.usage(scope, query, {
                requestOptions: {
                    customHeaders: {
                        ClientType: 'GitHubCopilotForAzure'
                    }
                }
            } as any),
            operationName
        );

        return this.collectQueryPages(firstPage, query, operationName);
    }

    private async collectQueryPages(firstPage: QueryResult, query: QueryDefinition, operationName: string): Promise<QueryResult> {
        const rows = [...(firstPage.rows || [])];
        let nextLink = firstPage.nextLink;
        let pageNumber = 1;

        while (nextLink) {
            pageNumber++;
            const pageUrl = nextLink;
            const nextPage = await this.executeWithRetry(
                () => this.fetchQueryNextPage(pageUrl, query),
                `${operationName} page ${pageNumber}`
            );

            rows.push(...(nextPage.rows || []));
            nextLink = nextPage.nextLink;
        }

        if (pageNumber > 1) {
            logInfo(`Fetched ${pageNumber} pages for ${operationName}`);
        }

        return {
            ...firstPage,
            rows,
            nextLink: undefined
        };
    }

    private async fetchQueryNextPage(nextLink: string, query: QueryDefinition): Promise<QueryResult> {
        const token = await this.credential.getToken('https://management.azure.com/.default');
        if (!token?.token) {
            throw new Error('Unable to acquire Azure management token for Cost Management query pagination.');
        }

        const response = await fetch(nextLink, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token.token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ClientType: 'GitHubCopilotForAzure'
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const body = await response.text();
            const error: any = new Error(`Cost Management query page request failed with ${response.status}: ${body}`);
            error.statusCode = response.status;
            throw error;
        }

        return response.json() as Promise<QueryResult>;
    }

    /**
     * Generate cache key for query results
     */
    private getCacheKey(startDate: Date, endDate: Date, queryType: string): string {
        return `${queryType}-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}`;
    }

    /**
     * Get cached result if available and not expired
     */
    private getCachedResult(cacheKey: string): any | null {
        const cached = this.queryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL_MS) {
            logInfo(`Using cached result for ${cacheKey}`);
            return cached.data;
        }
        return null;
    }

    /**
     * Store result in cache
     */
    private setCachedResult(cacheKey: string, data: any): void {
        this.queryCache.set(cacheKey, { data, timestamp: Date.now() });
    }

    /**
     * Get comprehensive cost analysis including historical, current, and forecasted data
     */
    public async getComprehensiveCostAnalysis(): Promise<ComprehensiveCostAnalysis> {
        try {
            logInfo('Starting comprehensive cost analysis...');
            logInfo('Using optimized API calls with intelligent caching...');
            
            const analysisConfig = configService.getAnalysisConfig();
            const now = new Date();
            
            // Fetch historical data first (will be reused for forecast)
            logInfo('Fetching historical data...');
            const historical = await this.getHistoricalCostData(analysisConfig.historicalDays);
            
            // Fetch current month data (parallel-friendly queries are batched internally)
            logInfo('Fetching current month data...');
            const current = await this.getCurrentCostData();
            
            // Generate forecast using cached historical data (no additional API calls needed)
            logInfo('Generating forecast...');
            const forecasted = await this.getForecastedCostData(analysisConfig.forecastDays, historical);

            // Calculate summary metrics
            const summary = this.calculateSummary(historical, current, forecasted);

            const analysis: ComprehensiveCostAnalysis = {
                id: `analysis-${Date.now()}`,
                subscriptionId: this.subscriptionId,
                scope: this.scope,
                analysisDate: now.toISOString(),
                historical,
                current,
                forecasted,
                trends: [], // Will be populated by trend analyzer
                anomalies: [], // Will be populated by anomaly detector
                fluctuations: [],
                dataProvenance: {
                    mode: 'live',
                    source: 'Azure Cost Management API',
                    generatedFromFallback: false,
                    queryPolicy: {
                        apiDelayMs: this.API_DELAY_MS,
                        maxRetries: this.MAX_RETRIES,
                        retryBaseDelayMs: this.RETRY_DELAY_MS,
                        retryMaxDelayMs: this.RETRY_MAX_DELAY_MS
                    }
                },
                summary
            };

            logInfo('Comprehensive cost analysis completed');
            return analysis;
            
        } catch (error) {
            logError(`Error in comprehensive cost analysis: ${error}`);
            throw error;
        }
    }

    /**
     * Get historical cost data for the specified number of days
     */
    public async getHistoricalCostData(days: number = 90): Promise<HistoricalCostData> {
        try {
            logInfo(`Fetching historical cost data for ${days} days...`);
            
            const endDate = new Date();
            const startDate = subDays(endDate, days);
            
            // Query Azure Cost Management API for actual cost data
            const queryResult = await this.queryActualCosts(startDate, endDate);
            
            const historicalData: HistoricalCostData = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                totalCost: queryResult.totalCost,
                currency: queryResult.currency || 'USD',
                dailyCosts: queryResult.dailyCosts,
                dailyServiceCosts: queryResult.dailyServiceCosts,
                monthlyCosts: queryResult.monthlyCosts,
                costByResource: queryResult.costByResource,
                costByService: queryResult.costByService,
                costByResourceGroup: queryResult.costByResourceGroup
            };

            logInfo(`Historical data fetched: ${historicalData.totalCost} ${historicalData.currency}`);
            return historicalData;
            
        } catch (error) {
            logError(`Error fetching historical cost data: ${error}`);
            throw error;
        }
    }

    /**
     * Get the lean daily service cost dataset used by the default spend-change workflow.
     * This intentionally avoids forecast, resource inventory, and optimization queries.
     */
    public async getDailyServiceCostData(days: number = 30): Promise<{
        startDate: string;
        endDate: string;
        totalCost: number;
        currency: string;
        dailyCosts: CostDataPoint[];
        dailyServiceCosts: DailyServiceCostPoint[];
        costByService: CostByService[];
    }> {
        const endDate = new Date();
        const startDate = subDays(endDate, days);
        const cacheKey = this.getCacheKey(startDate, endDate, 'daily-service-costs');
        const cachedResult = this.getCachedResult(cacheKey);

        if (cachedResult) {
            return cachedResult;
        }

        try {
            logInfo(`Querying daily service costs from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}...`);

            const dailyServiceQuery: QueryDefinition = {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: startDate,
                    to: endDate
                },
                dataset: {
                    granularity: "Daily",
                    aggregation: {
                        totalCost: {
                            name: "Cost",
                            function: "Sum"
                        }
                    },
                    grouping: [
                        {
                            type: "Dimension",
                            name: "ServiceName"
                        }
                    ]
                }
            };

            const result = await this.queryUsageAllPages(this.scope, dailyServiceQuery, 'daily service costs query');

            const dailyServiceCosts: DailyServiceCostPoint[] = [];
            const dailyTotals = new Map<string, { cost: number; currency: string }>();
            const serviceTotals = new Map<string, { cost: number; currency: string; category: string }>();
            let totalCost = 0;
            let currency = 'USD';

            if (result.rows && result.rows.length > 0) {
                const costIndex = result.columns?.findIndex((col: any) => col.name === 'Cost') ?? -1;
                const dateIndex = result.columns?.findIndex((col: any) => col.name === 'UsageDate') ?? -1;
                const currencyIndex = result.columns?.findIndex((col: any) => col.name === 'Currency') ?? -1;
                const serviceIndex = result.columns?.findIndex((col: any) => col.name === 'ServiceName') ?? -1;

                result.rows.forEach((row: any) => {
                    const cost = costIndex >= 0 ? parseFloat(row[costIndex]) : 0;
                    const rawDate = dateIndex >= 0 ? row[dateIndex] : '';
                    const rowCurrency = currencyIndex >= 0 ? row[currencyIndex] : currency;
                    const serviceName = serviceIndex >= 0 ? row[serviceIndex] : 'Unknown';

                    if (!serviceName || cost <= 0) {
                        return;
                    }

                    const date = this.parseUsageDate(rawDate);
                    const serviceCategory = this.categorizeService(serviceName);
                    currency = rowCurrency || currency;
                    totalCost += cost;

                    dailyServiceCosts.push({
                        date,
                        serviceName,
                        serviceCategory,
                        cost,
                        currency
                    });

                    const existingDay = dailyTotals.get(date) || { cost: 0, currency };
                    dailyTotals.set(date, {
                        cost: existingDay.cost + cost,
                        currency
                    });

                    const existingService = serviceTotals.get(serviceName) || {
                        cost: 0,
                        currency,
                        category: serviceCategory
                    };
                    serviceTotals.set(serviceName, {
                        cost: existingService.cost + cost,
                        currency,
                        category: serviceCategory
                    });
                });
            }

            const dailyCosts: CostDataPoint[] = Array.from(dailyTotals.entries())
                .map(([date, value]) => ({
                    date,
                    cost: value.cost,
                    currency: value.currency
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const costByService: CostByService[] = Array.from(serviceTotals.entries())
                .map(([serviceName, value]) => ({
                    serviceName,
                    serviceCategory: value.category,
                    cost: value.cost,
                    currency: value.currency,
                    percentageOfTotal: totalCost > 0 ? (value.cost / totalCost) * 100 : 0
                }))
                .sort((a, b) => b.cost - a.cost);

            const response = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                totalCost,
                currency,
                dailyCosts,
                dailyServiceCosts,
                costByService
            };

            logInfo(`Daily service cost query complete: ${totalCost.toFixed(2)} ${currency} across ${dailyCosts.length} days and ${costByService.length} services`);
            this.setCachedResult(cacheKey, response);
            return response;
        } catch (error) {
            logError(`Error querying daily service costs: ${error}`);
            throw new Error(
                `Live daily service cost query failed. Fake or synthetic fallback data is disabled by design. ` +
                `Please retry later or increase AZURE_COST_API_DELAY_MS / AZURE_COST_MAX_RETRIES.`
            );
        }
    }

    /**
     * Get current month-to-date cost data
     */
    public async getCurrentCostData(): Promise<CurrentCostData> {
        try {
            logInfo('Fetching current month cost data...');
            
            const now = new Date();
            const monthStart = startOfMonth(now);
            const monthEnd = endOfMonth(now);
            
            // Query current month costs
            const currentMonthQuery = await this.queryActualCosts(monthStart, now);
            
            // Add delay before next query
            await this.delay(this.API_DELAY_MS);
            
            // Get previous month (last full month)
            const prevMonthStart = subMonths(monthStart, 1);
            const prevMonthEnd = endOfMonth(prevMonthStart);
            const prevMonthQuery = await this.queryActualCosts(prevMonthStart, prevMonthEnd);
            
            // Add delay before next query
            await this.delay(this.API_DELAY_MS);
            
            // Get 2 months ago (second to last full month)
            const twoMonthsAgoStart = subMonths(monthStart, 2);
            const twoMonthsAgoEnd = endOfMonth(twoMonthsAgoStart);
            const twoMonthsAgoQuery = await this.queryActualCosts(twoMonthsAgoStart, twoMonthsAgoEnd);
            
            // Calculate estimated month-end cost based on daily average
            const daysElapsed = Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const daysInMonth = Math.floor((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const avgDailyCost = currentMonthQuery.totalCost / daysElapsed;
            const estimatedMonthEndCost = avgDailyCost * daysInMonth;
            
            // Old comparison (current partial vs last full) - keeping for backward compatibility
            const changeAmount = currentMonthQuery.totalCost - prevMonthQuery.totalCost;
            const changePercent = prevMonthQuery.totalCost > 0 
                ? (changeAmount / prevMonthQuery.totalCost) * 100 
                : 0;

            // New 3-month comparison
            const lastTwoMonthsChangeAmount = prevMonthQuery.totalCost - twoMonthsAgoQuery.totalCost;
            const lastTwoMonthsChangePercent = twoMonthsAgoQuery.totalCost > 0
                ? (lastTwoMonthsChangeAmount / twoMonthsAgoQuery.totalCost) * 100
                : 0;
                
            const projectedChangeAmount = estimatedMonthEndCost - prevMonthQuery.totalCost;
            const projectedChangePercent = prevMonthQuery.totalCost > 0
                ? (projectedChangeAmount / prevMonthQuery.totalCost) * 100
                : 0;

            const currentData: CurrentCostData = {
                billingPeriodStart: monthStart.toISOString(),
                billingPeriodEnd: monthEnd.toISOString(),
                currentDate: now.toISOString(),
                monthToDateCost: currentMonthQuery.totalCost,
                estimatedMonthEndCost,
                currency: currentMonthQuery.currency || 'USD',
                dailyCosts: currentMonthQuery.dailyCosts,
                topCostResources: currentMonthQuery.costByResource.slice(0, 10),
                topCostServices: currentMonthQuery.costByService.slice(0, 10),
                comparisonToPreviousMonth: {
                    previousMonthTotal: prevMonthQuery.totalCost,
                    changeAmount,
                    changePercent
                },
                monthlyComparison: {
                    twoMonthsAgo: {
                        name: format(twoMonthsAgoStart, 'MMMM yyyy'),
                        total: twoMonthsAgoQuery.totalCost
                    },
                    lastMonth: {
                        name: format(prevMonthStart, 'MMMM yyyy'),
                        total: prevMonthQuery.totalCost
                    },
                    currentMonth: {
                        name: format(monthStart, 'MMMM yyyy'),
                        monthToDate: currentMonthQuery.totalCost,
                        projected: estimatedMonthEndCost
                    },
                    lastTwoMonthsChange: {
                        amount: lastTwoMonthsChangeAmount,
                        percent: lastTwoMonthsChangePercent
                    },
                    projectedChange: {
                        amount: projectedChangeAmount,
                        percent: projectedChangePercent
                    }
                }
            };

            logInfo(`Current month-to-date: ${currentData.monthToDateCost} ${currentData.currency}`);
            return currentData;
            
        } catch (error) {
            logError(`Error fetching current cost data: ${error}`);
            throw error;
        }
    }

    /**
     * Get forecasted cost data for the specified number of days
     * @param days Number of days to forecast
     * @param existingHistoricalData Optional pre-fetched historical data to avoid redundant API calls
     */
    public async getForecastedCostData(days: number = 30, existingHistoricalData?: HistoricalCostData): Promise<ForecastedCostData> {
        try {
            logInfo(`Generating cost forecast for ${days} days...`);
            
            const startDate = addDays(new Date(), 1);
            const endDate = addDays(startDate, days);
            
            // Use provided historical data or fetch fresh (with caching)
            const historicalData = existingHistoricalData || await this.getHistoricalCostData(30);
            const historicalDays = historicalData.dailyCosts.length || 30;
            const avgDailyCost = historicalData.totalCost / historicalDays;
            
            const dailyForecasts: ForecastDataPoint[] = [];
            let cumulativeCost = 0;
            
            for (let i = 0; i < days; i++) {
                const forecastDate = addDays(startDate, i);
                const predictedCost = avgDailyCost;
                cumulativeCost += predictedCost;
                
                dailyForecasts.push({
                    date: forecastDate.toISOString(),
                    predictedCost,
                    confidenceLower: predictedCost,
                    confidenceUpper: predictedCost,
                    currency: historicalData.currency
                });
            }

            const forecastedData: ForecastedCostData = {
                forecastStartDate: startDate.toISOString(),
                forecastEndDate: endDate.toISOString(),
                totalForecastedCost: cumulativeCost,
                currency: historicalData.currency,
                dailyForecasts,
                monthlyForecasts: [], // Could aggregate daily into monthly
                forecastMethod: 'average-daily-projection',
                confidenceLevel: 0,
                assumptions: [
                    'Simple local projection based on historical average daily cost',
                    'Not an Azure Forecast API result',
                    'Does not account for planned changes, seasonality, reservations, or usage shifts'
                ]
            };

            logInfo(`Forecasted cost for next ${days} days: ${forecastedData.totalForecastedCost} ${forecastedData.currency}`);
            return forecastedData;
            
        } catch (error) {
            logError(`Error generating cost forecast: ${error}`);
            throw error;
        }
    }

    /**
     * Query actual costs from Azure Cost Management API
     */
    private async queryActualCosts(startDate: Date, endDate: Date): Promise<{
        totalCost: number;
        currency: string;
        dailyCosts: CostDataPoint[];
        dailyServiceCosts: DailyServiceCostPoint[];
        monthlyCosts: CostDataPoint[];
        costByResource: CostByResource[];
        costByService: CostByService[];
        costByResourceGroup: Array<{ resourceGroup: string; cost: number; resourceCount: number }>;
    }> {
        // Check cache first
        const cacheKey = this.getCacheKey(startDate, endDate, 'costs');
        const cachedResult = this.getCachedResult(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            logInfo(`Querying actual costs from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}...`);
            
            // Query 1: Get daily costs
            const dailyQuery: QueryDefinition = {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: startDate,
                    to: endDate
                },
                dataset: {
                    granularity: "Daily",
                    aggregation: {
                        totalCost: {
                            name: "Cost",
                            function: "Sum"
                        }
                    }
                }
            };

            // Query 2: Get costs by service
            const serviceQuery: QueryDefinition = {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: startDate,
                    to: endDate
                },
                dataset: {
                    granularity: "None",
                    aggregation: {
                        totalCost: {
                            name: "Cost",
                            function: "Sum"
                        }
                    },
                    grouping: [
                        {
                            type: "Dimension",
                            name: "ServiceName"
                        }
                    ]
                }
            };

            // Query 3: Get daily costs by service to attribute daily fluctuations
            const dailyServiceQuery: QueryDefinition = {
                type: "Usage",
                timeframe: "Custom",
                timePeriod: {
                    from: startDate,
                    to: endDate
                },
                dataset: {
                    granularity: "Daily",
                    aggregation: {
                        totalCost: {
                            name: "Cost",
                            function: "Sum"
                        }
                    },
                    grouping: [
                        {
                            type: "Dimension",
                            name: "ServiceName"
                        }
                    ]
                }
            };

            // Execute queries sequentially with delay and retry logic to avoid rate limiting
            const dailyResult = await this.queryUsageAllPages(this.scope, dailyQuery, 'daily costs query');
            await this.delay(this.API_DELAY_MS);
            
            const serviceResult = await this.queryUsageAllPages(this.scope, serviceQuery, 'service costs query');
            await this.delay(this.API_DELAY_MS);

            const dailyServiceResult = await this.queryUsageAllPages(this.scope, dailyServiceQuery, 'daily service costs query');

            // Parse daily costs
            const dailyCosts: CostDataPoint[] = [];
            let totalCost = 0;
            
            if (dailyResult.rows && dailyResult.rows.length > 0) {
                const costIndex = dailyResult.columns?.findIndex((col: any) => col.name === 'Cost') ?? -1;
                const dateIndex = dailyResult.columns?.findIndex((col: any) => col.name === 'UsageDate') ?? -1;
                const currencyIndex = dailyResult.columns?.findIndex((col: any) => col.name === 'Currency') ?? -1;

                dailyResult.rows.forEach((row: any) => {
                    const cost = costIndex >= 0 ? parseFloat(row[costIndex]) : 0;
                    const date = dateIndex >= 0 ? row[dateIndex] : '';
                    const currency = currencyIndex >= 0 ? row[currencyIndex] : 'USD';
                    
                    totalCost += cost;
                    
                    // Parse the date correctly - Azure returns it in YYYYMMDD format as a number
                    let dateString: string;
                    if (typeof date === 'number') {
                        // Convert YYYYMMDD number to Date object
                        const dateStr = date.toString();
                        const year = parseInt(dateStr.substring(0, 4));
                        const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
                        const day = parseInt(dateStr.substring(6, 8));
                        dateString = new Date(year, month, day).toISOString();
                    } else if (typeof date === 'string' && date.length === 8) {
                        // Handle string format YYYYMMDD
                        const year = parseInt(date.substring(0, 4));
                        const month = parseInt(date.substring(4, 6)) - 1;
                        const day = parseInt(date.substring(6, 8));
                        dateString = new Date(year, month, day).toISOString();
                    } else {
                        dateString = date;
                    }
                    
                    dailyCosts.push({
                        date: dateString,
                        cost,
                        currency
                    });
                });
            }

            // Parse service costs
            const costByService: CostByService[] = [];
            const serviceMap = new Map<string, number>();
            const dailyServiceCosts: DailyServiceCostPoint[] = [];
            
            if (serviceResult.rows && serviceResult.rows.length > 0) {
                const costIndex = serviceResult.columns?.findIndex((col: any) => col.name === 'Cost') ?? -1;
                const serviceIndex = serviceResult.columns?.findIndex((col: any) => col.name === 'ServiceName') ?? -1;

                serviceResult.rows.forEach((row: any) => {
                    const cost = costIndex >= 0 ? parseFloat(row[costIndex]) : 0;
                    const serviceName = serviceIndex >= 0 ? row[serviceIndex] : 'Unknown';
                    
                    if (serviceName && cost > 0) {
                        const existing = serviceMap.get(serviceName) || 0;
                        serviceMap.set(serviceName, existing + cost);
                    }
                });

                // Convert map to array and calculate percentages
                const totalServiceCost = Array.from(serviceMap.values()).reduce((sum, cost) => sum + cost, 0);
                
                serviceMap.forEach((cost, serviceName) => {
                    const category = this.categorizeService(serviceName);
                    costByService.push({
                        serviceName,
                        serviceCategory: category,
                        cost,
                        currency: 'USD',
                        percentageOfTotal: totalServiceCost > 0 ? (cost / totalServiceCost) * 100 : 0
                    });
                });

                // Sort by cost descending
                costByService.sort((a, b) => b.cost - a.cost);
            }

            // Parse daily service costs
            if (dailyServiceResult.rows && dailyServiceResult.rows.length > 0) {
                const costIndex = dailyServiceResult.columns?.findIndex((col: any) => col.name === 'Cost') ?? -1;
                const dateIndex = dailyServiceResult.columns?.findIndex((col: any) => col.name === 'UsageDate') ?? -1;
                const currencyIndex = dailyServiceResult.columns?.findIndex((col: any) => col.name === 'Currency') ?? -1;
                const serviceIndex = dailyServiceResult.columns?.findIndex((col: any) => col.name === 'ServiceName') ?? -1;

                dailyServiceResult.rows.forEach((row: any) => {
                    const cost = costIndex >= 0 ? parseFloat(row[costIndex]) : 0;
                    const date = dateIndex >= 0 ? row[dateIndex] : '';
                    const currency = currencyIndex >= 0 ? row[currencyIndex] : 'USD';
                    const serviceName = serviceIndex >= 0 ? row[serviceIndex] : 'Unknown';

                    if (!serviceName || cost <= 0) {
                        return;
                    }

                    let dateString: string;
                    if (typeof date === 'number') {
                        const dateStr = date.toString();
                        const year = parseInt(dateStr.substring(0, 4));
                        const month = parseInt(dateStr.substring(4, 6)) - 1;
                        const day = parseInt(dateStr.substring(6, 8));
                        dateString = new Date(year, month, day).toISOString();
                    } else if (typeof date === 'string' && date.length === 8) {
                        const year = parseInt(date.substring(0, 4));
                        const month = parseInt(date.substring(4, 6)) - 1;
                        const day = parseInt(date.substring(6, 8));
                        dateString = new Date(year, month, day).toISOString();
                    } else {
                        dateString = date;
                    }

                    dailyServiceCosts.push({
                        date: dateString,
                        serviceName,
                        serviceCategory: this.categorizeService(serviceName),
                        cost,
                        currency
                    });
                });
            }

            logInfo(`Query complete: ${totalCost.toFixed(2)} USD across ${dailyCosts.length} days, ${costByService.length} services, ${dailyServiceCosts.length} daily service points`);

            const result = {
                totalCost,
                currency: 'USD',
                dailyCosts,
                dailyServiceCosts,
                monthlyCosts: [],
                costByResource: [],
                costByService,
                costByResourceGroup: []
            };

            // Cache the result
            this.setCachedResult(cacheKey, result);

            return result;
            
        } catch (error) {
            logError(`Error querying actual costs: ${error}`);
            const errorText = String(error);
            const wrongIssuerDetected = errorText.includes('wrong issuer') && errorText.includes('must match the tenant');
            if (wrongIssuerDetected) {
                throw new Error(
                    'Live cost query failed due to Azure tenant token mismatch. ' +
                    'Run `az account clear`, then `az login --tenant <AZURE_TENANT_ID>`, and ensure the active subscription belongs to that tenant. ' +
                    'Fake or synthetic fallback data is disabled by design.'
                );
            }

            throw new Error(
                `Live cost query failed. Fake or synthetic fallback data is disabled by design. ` +
                `Please retry later or increase AZURE_COST_API_DELAY_MS / AZURE_COST_MAX_RETRIES.`
            );
        }
    }

    private parseUsageDate(date: any): string {
        if (typeof date === 'number') {
            const dateStr = date.toString();
            const year = parseInt(dateStr.substring(0, 4), 10);
            const month = parseInt(dateStr.substring(4, 6), 10) - 1;
            const day = parseInt(dateStr.substring(6, 8), 10);
            return new Date(year, month, day).toISOString();
        }

        if (typeof date === 'string' && date.length === 8) {
            const year = parseInt(date.substring(0, 4), 10);
            const month = parseInt(date.substring(4, 6), 10) - 1;
            const day = parseInt(date.substring(6, 8), 10);
            return new Date(year, month, day).toISOString();
        }

        return date;
    }

    /**
     * Categorize Azure service into a logical category
     */
    private categorizeService(serviceName: string): string {
        const name = serviceName.toLowerCase();
        
        if (name.includes('virtual machine') || name.includes('compute') || name.includes('kubernetes') || 
            name.includes('container') || name.includes('functions') || name.includes('app service')) {
            return 'Compute';
        }
        if (name.includes('storage') || name.includes('blob') || name.includes('file') || 
            name.includes('disk') || name.includes('backup')) {
            return 'Storage';
        }
        if (name.includes('sql') || name.includes('database') || name.includes('cosmos') || 
            name.includes('redis') || name.includes('cache')) {
            return 'Databases';
        }
        if (name.includes('network') || name.includes('gateway') || name.includes('load balancer') || 
            name.includes('firewall') || name.includes('vpn') || name.includes('dns')) {
            return 'Networking';
        }
        if (name.includes('monitor') || name.includes('log') || name.includes('insight') || 
            name.includes('alert') || name.includes('metric')) {
            return 'Management';
        }
        if (name.includes('ai') || name.includes('cognitive') || name.includes('bot') || 
            name.includes('machine learning')) {
            return 'AI + ML';
        }
        if (name.includes('security') || name.includes('key vault') || name.includes('sentinel')) {
            return 'Security';
        }
        
        return 'Other';
    }

    /**
     * Calculate summary metrics from all cost data
     */
    private calculateSummary(
        historical: HistoricalCostData,
        current: CurrentCostData,
        forecasted: ForecastedCostData
    ) {
        const allDailyCosts = [...historical.dailyCosts, ...current.dailyCosts];
        const costs = allDailyCosts.map(d => d.cost);
        
        return {
            totalHistoricalCost: historical.totalCost,
            currentMonthToDate: current.monthToDateCost,
            forecastedMonthEnd: current.estimatedMonthEndCost,
            forecastedNextMonth: forecasted.totalForecastedCost,
            currency: historical.currency,
            avgDailySpend: costs.reduce((a, b) => a + b, 0) / costs.length,
            peakDailySpend: Math.max(...costs),
            lowestDailySpend: Math.min(...costs)
        };
    }
}
