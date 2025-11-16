# Quick Start Guide - Azure Cost Analyzer

Get your Azure cost analysis running in **under 2 minutes**! No manual configuration needed.

## Prerequisites

- ✅ **Node.js 18+** installed ([download](https://nodejs.org/))
- ✅ **Azure CLI** installed ([install guide](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- ✅ **Azure subscription** with active resources

That's it! The tool will guide you through the rest interactively.

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/mobieus10036/azure-cost-analyzer.git
cd azure-cost-analyzer
npm install
```

### 2. Run the Tool

```bash
npm start
```

That's it! The tool will:

1. ✅ Check if Azure CLI is installed
2. 🔐 Prompt you to login to Azure (if needed)
3. 📋 Show your subscriptions and let you choose
4. 💾 Save your selection automatically
5. 📊 Run the cost analysis

## First Run Example

```
╔═══════════════════════════════════════════════════════════╗
║       Azure Cost Analyzer - Interactive Setup            ║
╚═══════════════════════════════════════════════════════════╝

🔍 Checking prerequisites...

✅ Azure CLI is installed

⚠️  Not logged in to Azure

Would you like to login now? (Y/n): y

🔐 Opening Azure login in your browser...
Please complete the authentication in your browser.

✅ Successfully logged in to Azure!

📋 Available Subscriptions:

1. Production Subscription
   ID: xxxxx-xxxxx-xxxxx-xxxxx
   State: Enabled

2. Development Subscription
   ID: yyyyy-yyyyy-yyyyy-yyyyy
   State: Enabled

Select subscription number (or press Enter for default): 1

✅ Configuration saved to .env file

╔═══════════════════════════════════════════════════════════╗
║                   Setup Complete! 🎉                      ║
╚═══════════════════════════════════════════════════════════╝

Starting cost analysis...
```

## What Happens Next

After setup, the analyzer will:

⏱️ **Takes about 2 minutes total**

1. Query 90 days of historical costs
2. Analyze trends and patterns
3. Detect cost anomalies
4. Generate 30-day forecasts
5. Provide smart recommendations
6. Save reports to `reports/` folder

## Output Example

```
============================================================
AZURE COST ANALYZER REPORT
============================================================

📊 COST SUMMARY
------------------------------------------------------------
Subscription: Production Subscription
Historical Total (90 days): $9,425.98 USD
Current Month to Date: $972.25 USD
Estimated Month End: $2,739.99 USD
Average Daily Spend: $101.94 USD

💰 TOP EXPENSIVE SERVICES
------------------------------------------------------------
1. Virtual Machines          $3,338.83 (35.4%)
2. Storage                   $3,176.35 (33.7%)
3. Microsoft Defender        $895.67 (9.5%)

💡 RECOMMENDATIONS
------------------------------------------------------------
1. 🖥️ Optimize Virtual Machines (35.4% of costs)
   Consider Reserved Instances...
   💰 Potential Savings: ~$667.77 USD/90 days
============================================================
✓ Report saved to: reports/cost-analysis-2025-11-16.json
✓ PDF report saved to: reports/cost-analysis-2025-11-16.pdf
============================================================
```

## Running Again

After initial setup, just run:

```bash
npm start
```

It will use your saved configuration automatically.

## Switching Subscriptions

Want to analyze a different subscription?

```bash
# Delete the saved config
rm .env

# Run again - you'll be prompted to choose
npm start
```

Or manually run the setup:

```bash
npm run setup
```

## Troubleshooting

### "Azure CLI is not installed"

Install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

### "No subscriptions found"

Make sure you have access to at least one Azure subscription. Check in the Azure Portal or run:

```bash
az account list
```

### Login issues

```bash
# Clear Azure CLI cache
az account clear

# Try again
npm start
```

### "ts-node is not recognized"

This happens if dependencies weren't installed correctly:

```bash
# Reinstall dependencies
npm install

# Try again
npm start
```

## Configuration Options

Edit `config/default.json` to customize analysis settings:

```json
{
  "analysis": {
    "historicalDays": 90,           // Days of history to analyze
    "forecastDays": 30,              // Days to forecast
    "anomalyThresholdPercent": 20    // Anomaly detection sensitivity
  }
}
```

## Advanced: Manual Configuration

If you prefer to configure manually (not recommended):

1. Create `.env` file:
```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
```

2. Login to Azure:
```bash
az login
az account set --subscription "your-subscription-id"
```

3. Run:
```bash
npm start
```

## That's It!

No configuration files to edit. No subscription IDs to copy/paste. Just run `npm start` and follow the prompts!

---

**Happy cost optimizing!** 💰📊
