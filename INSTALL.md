# Installation & Setup Instructions

Simple step-by-step guide to get AZ Cost Assessment running locally.

## Step-by-Step Setup

### 1. Install dependencies

```powershell
npm install
```

This installs required packages, including Azure SDKs, TypeScript tooling, logging, and configuration support.

### 2. Validate your setup

```powershell
npm run validate
```

This script checks:

- Node.js version (18+)
- Environment configuration readiness
- Azure CLI availability and login state
- Installed npm dependencies
- TypeScript configuration
- Output directories

### 3. Configure environment (optional)

The app supports interactive subscription selection. You can still set defaults in `.env`.

```powershell
# Copy the example environment file
Copy-Item .env.example .env

# Edit with your Azure details (Windows)
notepad .env
```

Recommended values:

```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
HISTORICAL_DAYS=30
```

To locate your subscription and tenant values:

```powershell
az login
az account show
```

### 4. Authenticate with Azure

```powershell
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
az account show
```

### 5. Verify permissions

Required roles:

- **Cost Management Reader** (read cost data)
- **Reader** (enumerate resources)

Check your permissions:

```powershell
az role assignment list --assignee YOUR_EMAIL --output table
```

### 6. Run the default daily spend change analysis

```powershell
npm start
```

Full legacy assessment:

```powershell
npm run full
```

Development mode:

```powershell
npm run dev
```

### 7. Review results

- **Console output**: Summary in terminal
- **Default JSON report**: `reports/daily-spend-changes-<timestamp>.json`
- **Full-mode JSON report**: `reports/finops-assessment-<timestamp>.json`
- **Full-mode HTML report**: `reports/finops-assessment-<timestamp>.html`
- **Logs**: `logs/` directory

## Troubleshooting

### Dependency errors

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

### Missing subscription or tenant settings

- Confirm `.env` exists if you rely on fixed defaults
- Confirm values are not placeholders
- Confirm there are no spaces around `=`

### Azure authentication failures

```powershell
az login
az account show
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

### TypeScript build issues

```powershell
npm run build
npm run typecheck
```

## Quick command reference

```powershell
npm run setup
npm run validate
npm start
npm run full
npm run dev
npm run build
npm run typecheck
npm test
```

## Directory structure after setup

```text
az-cost-assessment/
├── node_modules/         # Dependencies (after npm install)
├── reports/              # Generated local reports
├── logs/                 # Application logs
├── .env                  # Optional defaults (from .env.example)
└── [source files]
```

## What happens when you run it

1. Initialization: authenticates using Azure CLI context
2. Data collection: retrieves recent daily costs grouped by service
3. Analysis: identifies daily spend changes and service drivers
4. Reporting: writes summary to console and a JSON report file

`npm run full` runs the broader assessment with trend, anomaly, recommendation, VM, JSON, and HTML reporting.

## Next steps

1. Review `README.md` for architecture and governance docs.
2. Review `QUICKSTART.md` for usage flow.
3. Customize `config/` settings as needed.

## Getting help

- Run `npm run validate`
- Check `logs/` for error details
- Review `README.md` and `QUICKSTART.md`

---

Estimated setup time: 10-15 minutes.

Prerequisites: Node.js 18+, Azure subscription, Azure CLI.
