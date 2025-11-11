# Installation & Setup Instructions

## Step-by-Step Guide to Get Started

### 1. Install Dependencies

```powershell
npm install
```

This will install all required packages including:
- Azure SDK packages
- TypeScript tooling
- Logging libraries
- Configuration management

### 2. Validate Your Setup

```powershell
npm run validate
```

This script checks:
- ✓ Node.js version (16+)
- ✓ .env file configuration
- ✓ Azure CLI installation and login
- ✓ Required npm packages
- ✓ TypeScript configuration
- ✓ Output directories

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
```
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

### 6. Run the Assessment

```powershell
npm start
```

Or for development with auto-reload:
```powershell
npm run dev
```

### 7. Review Results

**Console Output**: Comprehensive report displayed in terminal

**JSON Report**: Saved to `reports/finops-assessment-YYYY-MM-DD-HH-mm-ss.json`

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

### "Using mock data" warning
This is normal for the PoC! The application uses sample data for demonstration. To use real Azure data, you'll need to implement actual API calls in the service files.

## Quick Commands Reference

```powershell
# Complete setup from scratch
npm run setup

# Validate configuration
npm run validate

# Run assessment
npm start

# Development mode
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test
```

## Directory Structure After Setup

```
azure-finops-assessment-poc/
├── node_modules/         # Dependencies (after npm install)
├── dist/                 # Compiled JavaScript (after npm run build)
├── reports/              # Generated assessment reports
├── logs/                 # Application logs
├── .env                  # Your configuration (create from .env.example)
└── [source files]
```

## What Happens When You Run It?

1. **Initialization**: Services connect to Azure
2. **Data Collection**: 
   - Fetches 90 days of historical cost data
   - Gets current month-to-date costs
   - Retrieves resource inventory
3. **Analysis**:
   - Calculates trends
   - Detects anomalies
   - Generates forecasts
4. **Reporting**:
   - Displays summary in console
   - Saves detailed JSON report
   - Logs all operations

## Next Steps After Installation

1. **Review the README.md** - Comprehensive documentation
2. **Check QUICKSTART.md** - Detailed usage guide
3. **Read VALUE.md** - Understand the benefits
4. **Run the assessment** - See your cost analysis
5. **Customize config/** - Adjust to your needs

## Getting Help

- Check the main README.md for detailed documentation
- Review QUICKSTART.md for common scenarios
- Run `npm run validate` to check your setup
- Check logs/ directory for error details

## Production Considerations

Before using in production:

1. **Implement Real API Calls**: Replace mock data with actual Azure Cost Management API
2. **Add Error Handling**: Enhance retry logic and error recovery
3. **Security Review**: Ensure credentials are properly secured
4. **Performance Testing**: Test with your actual data volume
5. **Monitoring**: Set up alerting for failures
6. **Scheduling**: Automate regular runs (cron, Azure Functions, etc.)

---

**Estimated Setup Time**: 15-30 minutes
**Prerequisites**: Node.js 16+, Azure subscription, Azure CLI

Ready to start? Run:
```powershell
npm run setup
```
