# Quick Start Guide - Azure Cost Analyzer

Get your Azure cost analysis running in 5 minutes! **No Azure Storage or other infrastructure needed.**

## Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 18+** installed ([download](https://nodejs.org/))
- ✅ **Azure CLI** installed ([install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- ✅ **Azure subscription** with active resources
- ✅ **Permissions**: Cost Management Reader (or Owner/Contributor) role

That's all! The tool runs entirely locally and just reads cost data from Azure.

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/mobieus10036/azure-cost-analyzer.git
cd azure-cost-analyzer
```

### 2. Install Dependencies

```bash
npm install
```

This installs:

- Azure SDKs for Cost Management and Resource APIs
- TypeScript and development tools
- PDF generation libraries
- Logging and utilities

### 3. Set Up Azure Authentication

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

### 4. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit with your subscription details
```

**Required variables in `.env`:**

```bash
# Your Azure Tenant ID and Subscription ID
AZURE_TENANT_ID=your-tenant-id-here
AZURE_SUBSCRIPTION_ID=your-subscription-id-here
```

**Get these values:**

```bash
az account show
```

### 5. Verify Permissions

You need **Cost Management Reader** role on your subscription.

```bash
# Check your permissions
az role assignment list \
  --assignee $(az account show --query user.name -o tsv) \
  --query "[?contains(roleDefinitionName, 'Cost')].roleDefinitionName" \
  --output table
```

If you don't have the role, ask an admin to grant it:

```bash
az role assignment create \
  --assignee your-email@domain.com \
  --role "Cost Management Reader" \
  --scope "/subscriptions/your-subscription-id"
```

### 6. Run Your First Analysis

```bash
npm start
```

⏱️ **Takes about 2 minutes** - This ensures reliable data with no API rate limiting.

**What happens:**

1. Connects to Azure subscription
2. Queries 90 days of historical costs
3. Retrieves current month data
4. Fetches previous month for comparison
5. Generates 30-day forecast
6. Analyzes trends and detects anomalies
7. Checks for resource optimization opportunities
8. Generates recommendations
9. Saves reports locally to `reports/` folder

## What You'll See

You'll see a comprehensive report like this:

```
============================================================
AZURE COST ANALYZER REPORT
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
✓ Report saved to: reports/cost-analysis-2025-11-11T21-12-08.json
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
2. Save a detailed JSON report to `reports/cost-analysis-YYYY-MM-DD-HH-mm-ss.json`

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

## Next Steps

1. **Review the Report** - Check the console output and files in `reports/`
2. **Analyze Anomalies** - Look for cost spikes or unusual patterns
3. **Review Trends** - Understand if costs are increasing or decreasing
4. **Check Recommendations** - Review suggested optimizations
5. **Take Action** - Implement cost-saving recommendations

## Configuration Options

Edit `config/default.json` to customize:

```json
{
  "analysis": {
    "historicalDays": 90,           // Days of history to analyze
    "forecastDays": 30,              // Days to forecast
    "anomalyThresholdPercent": 20    // Anomaly detection sensitivity
  }
}
```

## Troubleshooting

### "Cannot find module" errors

Run `npm install` to install dependencies.

### "AZURE_SUBSCRIPTION_ID is required"

Make sure your `.env` file exists and contains:

```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
```

### "Authentication failed"

```bash
# Re-login to Azure
az login

# Verify your subscription
az account show
```

### Missing permissions

You need the **Cost Management Reader** role:

```bash
az role assignment create \
  --assignee your-email@domain.com \
  --role "Cost Management Reader" \
  --scope "/subscriptions/your-subscription-id"
```

## That's It!

Your cost analyzer is now running locally with **zero Azure infrastructure dependencies**. Reports are saved to the `reports/` folder.

For more details, see the main [README.md](README.md).

---

**Happy cost optimizing!** 💰📊
