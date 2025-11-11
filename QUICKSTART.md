# Quick Start Guide - Azure FinOps Assessment PoC

## Installation Steps

Follow these steps to get your FinOps assessment running:

### 1. Install Dependencies

```powershell
npm install
```

This will install:
- Azure SDKs (@azure/identity, @azure/arm-costmanagement, @azure/arm-resources)
- Configuration libraries (config, dotenv)
- Logging (winston)
- Date utilities (date-fns)
- TypeScript and development tools

### 2. Set Up Azure Authentication

#### Option A: Azure CLI (Recommended for local development)
```powershell
# Login to Azure
az login

# Set your subscription
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify
az account show
```

#### Option B: Service Principal (For automation/CI/CD)
```powershell
# Create service principal
az ad sp create-for-rbac --name "finops-assessment-sp" --role "Reader" --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Copy the output and add to .env file
```

### 3. Configure Environment Variables

```powershell
# Copy the example file
cp .env.example .env

# Edit .env and set your values
notepad .env
```

Required variables:
```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
```

### 4. Update Configuration (Optional)

Edit `config/default.json` to customize:
- `historicalDays`: How many days of history to analyze (default: 90)
- `forecastDays`: How many days to forecast (default: 30)
- `anomalyThresholdPercent`: Sensitivity for anomaly detection (default: 20)

### 5. Grant Required Permissions

Your Azure account needs these roles (at subscription level):

```powershell
# Assign Cost Management Reader role
az role assignment create --assignee YOUR_EMAIL --role "Cost Management Reader" --scope /subscriptions/YOUR_SUBSCRIPTION_ID

# Assign Reader role (for resource inventory)
az role assignment create --assignee YOUR_EMAIL --role "Reader" --scope /subscriptions/YOUR_SUBSCRIPTION_ID
```

### 6. Run the Assessment

```powershell
# Development mode (with hot reload)
npm run dev

# Or standard run
npm start

# Or build and run
npm run build
node dist/app.js
```

### 7. Review the Output

The application will:
1. Display a comprehensive report in the console
2. Save a detailed JSON report to `reports/finops-assessment-YYYY-MM-DD-HH-mm-ss.json`

## Troubleshooting

### Issue: "Cannot find module '@azure/identity'"
**Solution**: Run `npm install` to install dependencies

### Issue: "Configuration validation failed: AZURE_SUBSCRIPTION_ID is required"
**Solution**: Set AZURE_SUBSCRIPTION_ID in your `.env` file or environment variables

### Issue: "Authentication failed"
**Solution**: 
- Make sure you're logged in: `az login`
- Verify your subscription: `az account show`
- Check your permissions: You need "Cost Management Reader" and "Reader" roles

### Issue: "Using mock data for cost query"
**Note**: This is expected in the PoC. The warning indicates the app is using generated sample data for demonstration. To use real data, implement the actual Azure Cost Management API calls in `azureCostManagementService.ts`.

## Next Steps

1. **Review the Generated Report**: Check the console output and JSON file in `reports/`
2. **Analyze Anomalies**: Look for cost spikes or unusual patterns
3. **Review Trends**: Understand if costs are increasing, decreasing, or stable
4. **Check Resource Inventory**: See what resources are consuming the most
5. **Plan Actions**: Use insights to optimize your Azure spending

## Advanced Configuration

### Analyze a Specific Resource Group

Set the scope in your `.env` or `config/default.json`:

```bash
AZURE_SCOPE="/subscriptions/YOUR_SUBSCRIPTION_ID/resourceGroups/YOUR_RESOURCE_GROUP"
```

### Schedule Regular Assessments

On Windows, use Task Scheduler:
```powershell
$Action = New-ScheduledTaskAction -Execute "node" -Argument "dist/app.js" -WorkingDirectory "C:\path\to\project"
$Trigger = New-ScheduledTaskTrigger -Daily -At "6:00AM"
Register-ScheduledTask -TaskName "Azure FinOps Assessment" -Action $Action -Trigger $Trigger
```

On Linux/Mac, use cron:
```bash
0 6 * * * cd /path/to/project && node dist/app.js >> logs/cron.log 2>&1
```

### Export to Excel/CSV

The JSON reports can be imported into Excel for further analysis:
1. Open Excel
2. Data > Get Data > From JSON
3. Select your report file from `reports/`
4. Use Power Query to transform and visualize

## Getting Real Azure Cost Data

To replace mock data with actual Azure API calls, update `azureCostManagementService.ts`:

1. Use the [Cost Details API](https://learn.microsoft.com/en-us/rest/api/cost-management/generate-cost-details-report)
2. Or use [Exports API](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-improved-exports) for large datasets

Example API call structure:
```typescript
const queryDefinition = {
  type: "ActualCost",
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

const result = await client.query.usage(scope, queryDefinition);
```

## Support

For issues or questions:
1. Check the [Azure Cost Management documentation](https://learn.microsoft.com/en-us/azure/cost-management-billing/)
2. Review [Azure SDK for JavaScript docs](https://learn.microsoft.com/en-us/javascript/api/overview/azure/)
3. Consult the main README.md file

---

Happy optimizing! 💰📊
