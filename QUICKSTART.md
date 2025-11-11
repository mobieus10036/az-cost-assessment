# Quick Start Guide - Azure FinOps Assessment

Get your FinOps assessment running in 5 minutes!

## Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 16+** installed ([download](https://nodejs.org/))
- ✅ **Azure CLI** installed ([install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- ✅ **Azure subscription** with active resources
- ✅ **Permissions**: Cost Management Reader (or Owner/Contributor) role

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/mobieus10036/AzCostAssessment.git
cd AzCostAssessment
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- Azure SDKs (@azure/identity, @azure/arm-costmanagement, @azure/arm-resources)
- Configuration libraries (config, dotenv)
- Logging (winston)
- Date utilities (date-fns)
- TypeScript and development tools

### 3. Set Up Azure Authentication

#### Option A: Azure CLI (Recommended for local development)

```bash
# Login to Azure
az login

# List your subscriptions
az account list --output table

# Set your target subscription
az account set --subscription "your-subscription-id-or-name"

# Verify it's set correctly
az account show
```

#### Option B: Service Principal (For automation/CI/CD)

```bash
# Create service principal with Cost Management Reader role
az ad sp create-for-rbac \
  --name "finops-assessment-sp" \
  --role "Cost Management Reader" \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID

# Output will show:
# {
#   "appId": "xxx",
#   "displayName": "finops-assessment-sp",
#   "password": "xxx",
#   "tenant": "xxx"
# }

# Add these to your .env file as:
# AZURE_CLIENT_ID=appId
# AZURE_CLIENT_SECRET=password
# AZURE_TENANT_ID=tenant
```

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit the file with your subscription details
# Windows:
notepad .env

# Mac/Linux:
nano .env
# or
vim .env
```

**Required variables in `.env`:**

```bash
# Your Azure Tenant ID
AZURE_TENANT_ID=your-tenant-id-here

# Subscription to analyze costs FROM (usually your production subscription)
AZURE_SUBSCRIPTION_ID=your-subscription-id-here

# Optional: Storage account for report persistence (in any subscription)
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_SUBSCRIPTION_ID=storage-subscription-id-here
```

**Quick tips to get these values:**

```bash
# Get your tenant ID
az account show --query tenantId -o tsv

# Get your subscription ID
az account show --query id -o tsv

# Get subscription name
az account show --query name -o tsv
```

### 5. Verify Cost Management Permissions

```bash
# Check if you have the required permissions
az role assignment list \
  --assignee $(az account show --query user.name -o tsv) \
  --subscription $(az account show --query id -o tsv) \
  --query "[?contains(roleDefinitionName, 'Cost') || contains(roleDefinitionName, 'Owner') || contains(roleDefinitionName, 'Contributor')].{Role:roleDefinitionName, Scope:scope}" \
  --output table
```

**If you don't have Cost Management Reader role:**

```bash
# Request the role (requires Owner or User Access Administrator permissions)
az role assignment create \
  --assignee your-email@domain.com \
  --role "Cost Management Reader" \
  --scope "/subscriptions/your-subscription-id"
```

### 6. Run Your First Assessment

```bash
npm start
```

⏱️ **Expected Duration:** Approximately 2 minutes

The assessment takes ~2 minutes to complete intentionally. This ensures:
- ✅ Zero rate limiting from Azure Cost Management API
- ✅ 100% real data with no fallbacks to mock data
- ✅ Sequential API calls with proper delays
- ✅ Reliable, accurate cost analysis

**What happens during execution:**
1. ✅ Connects to Azure subscription (3-5 seconds)
2. ✅ Queries 90-day historical costs (15-20 seconds)
3. ✅ Retrieves current month data (15-20 seconds)
4. ✅ Fetches previous month for comparison (15-20 seconds)
5. ✅ Generates 30-day forecast (15-20 seconds)
6. ✅ Analyzes trends and detects anomalies (2-3 seconds)
7. ✅ Inventories resources (1-2 seconds)
8. ✅ Generates recommendations (1 second)
9. ✅ Saves JSON report to `reports/` (1 second)

## Expected Output

You'll see a comprehensive report like this:

```
============================================================
AZURE FINOPS ASSESSMENT REPORT
============================================================

📊 COST SUMMARY
------------------------------------------------------------
Subscription ID: xxx-xxx-xxx
Historical Total (90 days): $9,425.98 USD
Current Month to Date: $972.25 USD
Estimated Month End: $2,739.99 USD
Average Daily Spend: $101.94 USD
Peak Daily Spend: $140.95 USD

📅 DAILY SPEND (PAST 14 DAYS)
------------------------------------------------------------
Oct 29, 2025 (Wed)       $  147.55  ██████████████████████████████
Oct 30, 2025 (Thu)       $  125.59  █████████████████████████
Oct 31, 2025 (Fri)       $  108.96  ██████████████████████
Nov 01, 2025 (Sat)       $  116.06  ████████████████████████
...
------------------------------------------------------------
14-Day Average: $120.92 USD/day

💰 TOP EXPENSIVE SERVICES
------------------------------------------------------------
1. Virtual Machines          $3,338.83 (35.4%)
2. Storage                   $3,176.35 (33.7%)
3. Microsoft Defender        $895.67 (9.5%)
...

💡 RECOMMENDATIONS
------------------------------------------------------------
1. 🖥️ Optimize Virtual Machines (35.4% of costs)
   Consider Reserved Instances...
   💰 Potential Savings: ~$667.77 USD/90 days

2. ✅ Cost Optimization Success: -70.4% Reduction
   Great job! Continue monitoring...
...
============================================================
✓ Report saved to: reports/finops-assessment-2025-11-11T21-12-08.json
============================================================
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
