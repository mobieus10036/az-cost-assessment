# Azure Cost Analyzer

A simple command-line tool to track Azure spending and find ways to save money. Runs locally with **no Azure Storage dependencies** - just pulls cost data, analyzes it, and generates reports on your machine.

## What It Does

- Shows your Azure costs for the past 90 days
- Tracks current month spending
- Compares costs across 3 months (so you can see trends without the partial-month confusion)
- Finds unusual spending spikes
- Suggests ways to save money (like removing stopped VMs)
- Creates both console reports and PDFs locally

## Why I Built This

I was tired of manually checking the Azure portal every day to see what we were spending. I wanted something I could run from the command line that would give me the full picture - without needing to set up storage accounts or other Azure infrastructure.

This project was built mostly with help from GitHub Copilot and lots of trial and error. I'm sharing it in case it's useful to others learning Azure or looking for a simple cost tracking solution.

## Important Security Note

This tool reads real cost data from your Azure subscription. The reports it creates will contain your subscription IDs, resource names, and actual costs.

- Don't commit your `.env` file (it's already in .gitignore)
- Reports are saved locally in the `reports/` folder (also gitignored)
- Be careful what you share publicly

## How It Works

The tool connects to Azure's Cost Management API to get your actual spending data. It:
1. Fetches 90 days of historical costs
2. Gets current month data
3. Analyzes trends using moving averages
4. Detects anomalies (unusual spikes or drops)
5. Checks for stopped VMs and unattached disks
6. Generates a report in both console and PDF format

It's written in TypeScript and uses official Azure SDKs. The whole process takes about 2 minutes because I added delays to avoid hitting API rate limits.

## What You Need

- **Node.js 18+** - To run the tool
- **Azure subscription** - To analyze
- **Azure CLI** - For authentication (`az login`)
- **Cost Management Reader role** - Or Owner/Contributor on your subscription

That's it! No Azure Storage, no Cosmos DB, no other infrastructure needed.

## Quick Start

1. **Clone and install:**
```bash
git clone https://github.com/mobieus10036/azure-cost-analyzer.git
cd azure-cost-analyzer
npm install
```

2. **Configure your subscription:**
```bash
cp .env.example .env
```

Edit `.env` and add:
```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
```

Get these values with:
```bash
az account show
```

3. **Login to Azure:**
```bash
az login
az account set --subscription "your-subscription-id"
```

4. **Run it:**
```bash
npm start
```

The analysis takes about 2 minutes. Reports are saved locally to `reports/` folder.

## What You Get

The tool generates:
- **Console output** - Formatted report with colors and charts
- **JSON report** - Saved to `reports/cost-analysis-YYYY-MM-DD.json`
- **PDF report** - Visual summary you can share

Reports include:
- Total costs for the past 90 days
- Daily spending for the past 2 weeks
- Month-over-month comparison (last 3 months)
- Cost trends (going up or down?)
- Anomaly detection (unusual spending patterns)
- Top 10 most expensive services
- Smart recommendations for saving money

## Example Output

Here's what the report looks like:

```
============================================================
AZURE COST ANALYZER REPORT
============================================================

COST SUMMARY
------------------------------------------------------------
Historical Total (past 90 days): $12,450.75
Current Month to Date:            $ 3,250.25
Average Daily Spend:              $   138.34

DAILY SPEND (PAST 14 DAYS)
------------------------------------------------------------
Oct 29 (Wed)    $  147.55  ███████████████
Oct 30 (Thu)    $  125.59  ████████████
Oct 31 (Fri)    $  108.96  ███████████
...

MONTH COMPARISON
------------------------------------------------------------
Previous: $4,125.00
Current:  $3,250.25
Change:   -21.2%

TOP SERVICES
------------------------------------------------------------
1. Virtual Machines          $3,941.18 (35%)
2. Kubernetes Service        $2,252.10 (20%)
3. SQL Database              $1,689.08 (15%)
...
```

The PDF report has all this data plus some charts and recommendations.

## Configuration

Adjust settings in `config/default.json`:

```json
{
  "analysis": {
    "historicalDays": 90,      // Days of history to analyze
    "forecastDays": 30,         // Days to forecast
    "anomalyThresholdPercent": 20  // Sensitivity for anomaly detection
  }
}
```

For example, to analyze 6 months of history, change `historicalDays` to 180.

## Permissions

You need the "Cost Management Reader" role on your Azure subscription. If you don't have it, ask your admin or run:

```bash
az role assignment create \
  --assignee your-email@example.com \
  --role "Cost Management Reader" \
  --scope "/subscriptions/your-subscription-id"
```

## Features

- Real Azure Cost Management API integration
- Daily spend charts (past 14 days)
- Month-over-month comparison
- Cost trend analysis
- Anomaly detection
- Savings recommendations
- JSON and PDF reports
- Colored console output

## Known Issues

The tool takes about 2 minutes to run because I added delays between API calls to avoid rate limiting. I tried making it faster, but Azure would block the requests.

## Contributing

This is a learning project, so I'm open to suggestions. Feel free to open an issue or PR if you have ideas.

## License

MIT License - See LICENSE file

---

## More Info

If you want to learn more about Azure cost management or have questions, check out the [Azure Cost Management docs](https://learn.microsoft.com/en-us/azure/cost-management-billing/).

**Note**: I built this to learn TypeScript and Azure APIs. There are probably better ways to do some of this stuff, but it works for me. If you find bugs or have suggestions, let me know!