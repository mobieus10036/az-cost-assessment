# Implementation Guide: Real Azure Cost Data

## Current Status: Mock Data

⚠️ **IMPORTANT**: The application currently uses **mock/fake data** for demonstration purposes.

The services you see in the reports (Virtual Machines, Azure Kubernetes Service, Azure SQL Database, etc.) are **NOT** from your actual Azure subscription. They are hardcoded sample data to demonstrate what the reporting would look like.

## Why Mock Data?

The Azure Cost Management Query API is complex and requires:
1. Specific IAM permissions (Cost Management Reader role)
2. Complex query structure using the REST API
3. Data may take 24-48 hours to appear after resource deployment
4. Your subscription may have minimal actual costs right now

## Where is the Mock Data?

File: `src/services/azureCostManagementService.ts`
Method: `queryActualCosts()` (lines ~230-285)

```typescript
// Mock service-level cost breakdown
const serviceDistribution = [
    { name: 'Virtual Machines', category: 'Compute', percentage: 35 },
    { name: 'Azure Kubernetes Service', category: 'Compute', percentage: 20 },
    // ... more mock services
];
```

## Implementing Real Azure Cost Data

### Step 1: Verify Permissions

Ensure you have the **Cost Management Reader** role on your subscription:

```powershell
# Check your role assignments
az role assignment list --assignee wchomak@mobieuslabs.onmicrosoft.com --subscription "f007d6d5-becd-4305-8649-2e4b77b66f08"

# If needed, assign the role (requires Owner or User Access Administrator)
az role assignment create `
  --assignee wchomak@mobieuslabs.onmicrosoft.com `
  --role "Cost Management Reader" `
  --scope "/subscriptions/f007d6d5-becd-4305-8649-2e4b77b66f08"
```

### Step 2: Implement the Query API

The `@azure/arm-costmanagement` SDK provides a `query()` method to retrieve actual cost data.

Replace the mock implementation in `queryActualCosts()` with:

```typescript
private async queryActualCosts(startDate: Date, endDate: Date) {
    try {
        // Define the query for actual costs grouped by service
        const queryDefinition = {
            type: "Usage",
            timeframe: "Custom",
            timePeriod: {
                from: startDate.toISOString(),
                to: endDate.toISOString()
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
                    },
                    {
                        type: "Dimension",
                        name: "ServiceFamily" // For category
                    }
                ]
            }
        };

        // Execute the query
        const result = await this.client.query.usage(this.scope, queryDefinition);
        
        // Parse the result
        const columns = result.columns;
        const rows = result.rows;
        
        const costByService: CostByService[] = [];
        const dailyCosts: CostDataPoint[] = [];
        let totalCost = 0;

        // Process rows to extract service costs
        rows.forEach((row: any) => {
            const cost = row[columns.findIndex(c => c.name === 'Cost')];
            const serviceName = row[columns.findIndex(c => c.name === 'ServiceName')];
            const serviceFamily = row[columns.findIndex(c => c.name === 'ServiceFamily')];
            
            totalCost += cost;
            
            // Aggregate by service
            const existing = costByService.find(s => s.serviceName === serviceName);
            if (existing) {
                existing.cost += cost;
            } else {
                costByService.push({
                    serviceName,
                    serviceCategory: serviceFamily || 'Other',
                    cost,
                    currency: 'USD',
                    percentageOfTotal: 0 // Calculate later
                });
            }
        });

        // Calculate percentages
        costByService.forEach(service => {
            service.percentageOfTotal = (service.cost / totalCost) * 100;
        });

        return {
            totalCost,
            currency: 'USD',
            dailyCosts,
            monthlyCosts: [],
            costByResource: [],
            costByService: costByService.sort((a, b) => b.cost - a.cost),
            costByResourceGroup: []
        };
        
    } catch (error) {
        logError(`Error querying actual costs: ${error}`);
        throw error;
    }
}
```

### Step 3: Test with Real Data

```bash
npm start
```

You should now see your **actual** Azure services and their costs!

## Common Issues

### 1. "No data returned"
- Cost data can take 24-48 hours to appear after resource creation
- Verify you have resources running in your subscription
- Check that the date range includes actual usage

### 2. "Authorization failed"
- Ensure you have the "Cost Management Reader" role
- Role assignments can take 5-10 minutes to propagate
- Try logging out and back into Azure CLI: `az logout && az login`

### 3. "Empty service list"
- Your subscription may have very low or no costs yet
- The storage account created for this tool costs ~$0.01/month (too small to show immediately)
- Consider running a small VM for a few hours to generate measurable costs

## API Documentation

- [Azure Cost Management Query API](https://learn.microsoft.com/en-us/rest/api/cost-management/query/usage)
- [Azure Cost Management SDK for JavaScript](https://learn.microsoft.com/en-us/javascript/api/overview/azure/arm-costmanagement-readme)
- [Cost Management Best Practices](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-analysis-common-uses)

## What You'll Get with Real Data

✅ Actual service names from your subscription  
✅ Real costs down to the penny  
✅ Service categories (Compute, Storage, Networking, etc.)  
✅ Daily cost breakdown  
✅ Resource-level detail (optional with additional grouping)  
✅ Historical trends based on actual usage  

## Current Mock Data Distribution

For reference, the mock data simulates:
- 35% Virtual Machines
- 20% Azure Kubernetes Service
- 15% Azure SQL Database
- 8% Storage Accounts
- 7% Application Gateway
- 5% Azure Cosmos DB
- 4% Log Analytics
- 3% Azure Functions
- 2% Azure Cache for Redis
- 1% Azure Monitor

These percentages are typical for a medium-sized production workload but **are not your actual costs**.
