# Installation & Setup Instructions

Simple step-by-step guide to get the AZ Cost Assessment running locally. No Azure Storage or other infrastructure needed.

## Step-by-Step Setup

### 1. Install Dependencies

```powershell
npm install
```

This will install all required packages including:

- Azure SDK packages for Cost Management and Resources
- TypeScript tooling
- Logging libraries
- PDF generation
- Configuration management

### 2. Validate Your Setup

```powershell
npm run validate
```

This script checks:

- Node.js version (18+)
- .env file configuration
- Azure CLI installation and login
- Required npm packages
- TypeScript configuration
- Output directories

### 3. Configure Environment

```powershell
# Copy the example environment file
cp .env.example .env

# Edit with your Azure details
notepad .env   # Windows
# OR
nano .env      # Linux/Mac
```

Set these required values:

```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id-here
AZURE_TENANT_ID=your-tenant-id-here
```

To find your subscription ID and tenant ID:

```powershell
az login
az account show
```

### 4. Authenticate with Azure

```powershell
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# Verify you're logged in
az account show
```

### 5. Verify Permissions

You need these Azure roles:

- **Cost Management Reader** - to read cost data
- **Reader** - to list resources

Check your permissions:

```powershell
az role assignment list --assignee YOUR_EMAIL --output table
```

If missing, have an admin grant them:

```powershell
# Cost Management Reader
az role assignment create \
  --assignee YOUR_EMAIL \
  --role "Cost Management Reader" \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID

# Reader role
az role assignment create \
  --assignee YOUR_EMAIL \
  --role "Reader" \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID
```

### 6. Run the Cost Analysis

```powershell
npm start
```

Or for development with auto-reload:

```powershell
npm run dev
```

### 7. Review Results

**Console Output**: Comprehensive report displayed in terminal

**JSON Report**: Saved to `reports/cost-analysis-YYYY-MM-DD-HH-mm-ss.json`

**PDF Report**: Visual report saved to `reports/`

**Logs**: Application logs saved to `logs/` directory
```powershell
npm run dev
```

### 7. Review Results

**Console Output**: Comprehensive report displayed in terminal

**JSON Report**: Saved to `reports/cost-analysis-YYYY-MM-DD-HH-mm-ss.json`

**PDF Report**: Visual report saved to `reports/`

**Logs**: Application logs saved to `logs/` directory

## Troubleshooting

### "Cannot find module" errors

```powershell
rm -rf node_modules package-lock.json
npm install
```

### "AZURE_SUBSCRIPTION_ID is required"

- Make sure `.env` file exists
- Check that values are set (not the placeholder text)
- Verify no spaces around the `=` sign

### "Authentication failed"

```powershell
# Re-login to Azure
az login

# Make sure you're on the right subscription
az account show
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### TypeScript compilation errors

```powershell
# Rebuild
npm run build

# Check for errors
npx tsc --noEmit
```

## Quick Commands Reference

```powershell
# Complete setup from scratch
npm run setup

# Validate configuration
npm run validate

# Run analysis
npm start

# Development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test
```

## Directory Structure After Setup

```text
azure-cost-analyzer/
├── node_modules/         # Dependencies (after npm install)
├── dist/                 # Compiled JavaScript (after npm run build)
├── reports/              # Generated cost analysis reports (local)
├── logs/                 # Application logs
├── .env                  # Your configuration (create from .env.example)
└── [source files]
```

## What Happens When You Run It?

1. **Initialization**: Services connect to Azure using CLI credentials
2. **Data Collection**: Fetches 90 days of historical cost data from Azure
3. **Analysis**: Calculates trends, detects anomalies, generates forecasts
4. **Reporting**: Displays summary in console and saves JSON/PDF reports locally

Takes about 2 minutes to complete.

## Next Steps After Installation

1. **Review the README.md** - Comprehensive documentation
2. **Check QUICKSTART.md** - Detailed usage guide
3. **Run the analysis** - See your cost report
4. **Customize config/** - Adjust analysis settings to your needs

## Getting Help

- Check the main README.md for detailed documentation
- Review QUICKSTART.md for common scenarios
- Run `npm run validate` to check your setup
- Check `logs/` directory for error details

---

**Estimated Setup Time**: 10-15 minutes

**Prerequisites**: Node.js 18+, Azure subscription, Azure CLI

Ready to start? Run:

```powershell
npm run setup
```
