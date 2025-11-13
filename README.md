# Azure Cost Analyzer

A tool I built to track my Azure spending and find ways to save money. It pulls cost data from Azure, analyzes it, and generates reports.

## What It Does

- Shows your Azure costs for the past 90 days
- Tracks current month spending
- Compares costs across 3 months (so you can see trends without the partial-month confusion)
- Finds unusual spending spikes
- Suggests ways to save money (like removing stopped VMs)
- Creates both text reports and PDFs

## Why I Built This

I was tired of manually checking the Azure portal every day to see what we were spending. I wanted something I could run from the command line that would give me the full picture. Plus, I wanted to learn more about TypeScript and working with Azure APIs.

This project was built mostly with help from GitHub Copilot and lots of trial and error. I'm sharing it in case it's useful to others learning Azure or looking for a simple cost tracking solution.

## Important Security Note

This tool reads real cost data from your Azure subscription. The reports it creates will contain your subscription IDs, resource names, and actual costs. 

- Don't commit your `.env` file (it's already in .gitignore)
- The reports folder is also gitignored by default
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

- Node.js 18 or newer
- An Azure subscription
- Azure CLI installed and logged in
- The "Cost Management Reader" role on your subscription (or Contributor/Owner)

## Setup

1. Clone this repo:
```bash
git clone https://github.com/mobieus10036/azure-cost-analyzer.git
cd azure-cost-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example env file and add your subscription ID:
```bash
cp .env.example .env
```

Edit the `.env` file and add your Azure subscription ID. You can get it with:
```bash
az account show --query id -o tsv
```

4. Make sure you're logged into Azure:
```bash
az login
az account set --subscription "your-subscription-id"
```

5. Run it:
```bash
npm start
```

The first run takes about 2 minutes. Reports are saved to the `reports/` folder.

## What You Get

The tool shows you:
- Total costs for the past 90 days
- Daily spending for the past 2 weeks
- Month-over-month comparison (last 3 months)
- Cost trends (going up or down?)
- Any unusual spending patterns
- Your top 10 most expensive services
- Recommendations for saving money

Everything prints to the console with colors, and you also get a PDF report you can share.

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

You can change settings in `config/default.json`:

```json
{
  "analysis": {
    "historicalDays": 90,
    "forecastDays": 30,
    "anomalyThresholdPercent": 20
  }
}
```

I set these defaults based on what I found useful, but you can adjust them. For example, if you want to look back 6 months instead of 3, change `historicalDays` to 180.

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