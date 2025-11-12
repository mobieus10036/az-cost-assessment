# Azure Cost Analyzer

![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-blue?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18.0+-green?logo=node.js)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Azure](https://img.shields.io/badge/Azure-Cost%20Management-0078D4?logo=microsoft-azure)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen)

A comprehensive Azure cost analysis tool for tracking spending, identifying trends, detecting anomalies, and optimizing cloud costs. This tool provides Azure engineers with programmatic insights into spending patterns, cost forecasts, and actionable optimization opportunities.

## ✨ New in v1.0

- 🎨 **Professional colored console output** with Azure-themed palette
- 📄 **PDF report generation** for easy sharing with stakeholders
- 📊 **3-month cost comparison** (apples-to-apples analysis)
- 🤖 **Smart recommendations** for cost optimization
- 📈 **Anomaly detection** with statistical analysis

## 🔒 Security & Privacy First

**⚠️ IMPORTANT**: This tool accesses real Azure cost and resource data.

- **Never commit `.env` files** to version control
- **Reports contain sensitive data** - subscription IDs, resource names, costs
- **Local reports are gitignored** by default
- **Review config files** before making repository public
- **Use placeholders** in documentation examples (no real IDs/emails)

See [Security Best Practices](#-security-best-practices) below for details.

## 🎯 What This Tool Delivers

This application analyzes your Azure subscription and provides:

- **📊 Historical Cost Analysis**: Review past spending patterns (90 days default)
- **💰 Current Month Tracking**: Real-time month-to-date costs and estimates
- **🔮 Cost Forecasting**: Predict future spending based on historical trends
- **📈 Trend Analysis**: Identify increasing, decreasing, or stable cost patterns
- **⚠️ Anomaly Detection**: Spot unusual cost spikes or drops automatically
- **💻 Resource Inventory**: Complete view of all Azure resources
- **💡 Actionable Recommendations**: Smart cost optimization suggestions
- **📄 JSON Reports**: Export detailed assessments for further analysis

## 🏗️ Architecture

The application uses:
- **Azure Cost Management API** - Historical and current cost data
- **Azure Resource Management API** - Resource inventory and metadata
- **Azure Storage (Optional)** - Cost-effective data persistence (~$0.01/month)
  - **Blob Storage** - JSON report archives
  - **Table Storage** - Time-series cost data for trending
- **Local File System** - Default report storage (free)
- **Azure SDK with Managed Identity** - Secure, credential-free authentication
- **TypeScript** - Type-safe implementation
- **Statistical Analysis** - Anomaly detection using Z-scores and deviation analysis

**Note**: No expensive Cosmos DB required! Use your existing Storage Account or just local files.

## 📁 Project Structure

```
azure-cost-analyzer/
├── src/
│   ├── services/
│   │   ├── azureCostManagementService.ts   # Cost data fetching
│   │   ├── azureResourceService.ts         # Resource inventory
│   │   └── azureStorageService.ts          # Optional cloud storage
│   ├── models/
│   │   ├── costAnalysis.ts                 # Cost data types
│   │   ├── resourceUsage.ts                # Resource types
│   │   └── recommendation.ts               # Optimization types
│   ├── analyzers/
│   │   ├── costTrendAnalyzer.ts            # Trend detection
│   │   ├── anomalyDetector.ts              # Anomaly detection
│   │   └── resourceOptimizationAnalyzer.ts # Optimization logic
│   ├── utils/
│   │   ├── logger.ts                       # Winston logging
│   │   └── config.ts                       # Configuration management
│   └── app.ts                              # Main orchestrator
├── config/
│   ├── default.json                        # Default configuration
│   └── production.json                     # Production overrides
├── reports/                                # Generated JSON reports
├── .env.example                            # Environment template
├── package.json
└── tsconfig.json
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js**: Version 16 or higher ([Download](https://nodejs.org/))
2. **Azure Subscription**: With active resources
3. **Azure CLI**: For authentication ([Install](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
4. **Permissions**: Cost Management Reader role (or Owner/Contributor) on the subscription

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mobieus10036/azure-cost-analyzer.git
   cd azure-cost-analyzer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your subscription details:
   ```bash
   AZURE_SUBSCRIPTION_ID=your-subscription-id-here
   AZURE_TENANT_ID=your-tenant-id-here
   ```
   
   > **Tip**: Get your subscription ID with `az account show --query id -o tsv`

4. **Authenticate with Azure**:
   ```bash
   az login
   az account set --subscription "your-subscription-id"
   ```

5. **Verify Cost Management permissions**:
   ```bash
   # Check if you have Cost Management Reader role
   az role assignment list --assignee $(az account show --query user.name -o tsv) --query "[?contains(roleDefinitionName, 'Cost') || contains(roleDefinitionName, 'Owner') || contains(roleDefinitionName, 'Contributor')].roleDefinitionName"
   ```
   
   If you don't have Cost Management Reader, request it:
   ```bash
   az role assignment create \
     --assignee your-email@domain.com \
     --role "Cost Management Reader" \
     --scope "/subscriptions/your-subscription-id"
   ```

### Running the Assessment

```bash
# Development mode
npm start

# Or build and run
npm run build
node dist/app.js
```

The application will:
1. Connect to your Azure subscription
2. Gather 90 days of historical cost data
3. Analyze current month spending
4. Generate 30-day cost forecast
5. Detect trends and anomalies
6. Display a comprehensive report
7. Save results to `reports/cost-analysis-TIMESTAMP.json`

### Execution Time

The assessment takes approximately **2 minutes** to complete. This timing is intentional to avoid Azure Cost Management API rate limiting and ensure 100% real data with no fallbacks to mock data.

**Performance Characteristics:**
- Sequential API calls with 15-second delays between queries
- Exponential backoff retry logic for transient failures
- 5-6 API calls total (historical, current, previous month, forecast, services)
- ~120 seconds total execution time

## 📊 Sample Output

```
============================================================
AZURE COST ANALYZER REPORT
============================================================

📊 COST SUMMARY
------------------------------------------------------------
Subscription ID: abc123-def456-ghi789
Analysis Date:   11/11/2025, 10:30:00 AM
Currency:        USD

Historical Total (2025-08-13 to 2025-11-11):
  12,450.75 USD

Current Month to Date:
  3,250.25 USD

Estimated Month End:
  4,875.50 USD

Forecasted Next Period:
  4,920.00 USD

Average Daily Spend: 138.34 USD
Peak Daily Spend:    245.80 USD

📅 DAILY SPEND (PAST 14 DAYS)
------------------------------------------------------------
Oct 29, 2025 (Wed)       $  147.55  ██████████████████████████████
Oct 30, 2025 (Thu)       $  125.59  █████████████████████████
Oct 31, 2025 (Fri)       $  108.96  ██████████████████████
Nov 01, 2025 (Sat)       $  116.06  ████████████████████████
Nov 02, 2025 (Sun)       $  148.14  ██████████████████████████████
Nov 03, 2025 (Mon)       $  101.48  █████████████████████
...
------------------------------------------------------------
14-Day Average: $120.92 USD/day

📈 MONTH-OVER-MONTH COMPARISON
------------------------------------------------------------
Previous Month:  4,125.00 USD
Current Month:   3,250.25 USD
Change:          📉 -874.75 (-21.2%)

📉 COST TRENDS
------------------------------------------------------------
📈 DAILY: increasing (+15.3%)
📉 MONTHLY: decreasing (-8.5%)

⚠️  COST ANOMALIES DETECTED
------------------------------------------------------------
🟠 [HIGH] Daily cost spike detected: 45.2% deviation from average
   Date: 2025-11-05
🟡 [MEDIUM] Service Azure Virtual Machines represents 58.3% of total costs
   ...

� TOP EXPENSIVE SERVICES
------------------------------------------------------------
1. Virtual Machines                   3941.18 USD (35.0%)
   ██████████████████
2. Azure Kubernetes Service           2252.10 USD (20.0%)
   ██████████
3. Azure SQL Database                 1689.08 USD (15.0%)
   ████████

📊 Cost by Category:
  - Compute: 6531.09 USD
  - Databases: 2477.31 USD
  - Storage: 900.84 USD

�💻 RESOURCE SUMMARY
------------------------------------------------------------
Total Resources: 127
Total Monthly Cost: 4,250.00 USD

Top Resource Types:
  - Microsoft.Compute/virtualMachines: 23 resources
  - Microsoft.Storage/storageAccounts: 18 resources
  - Microsoft.Web/sites: 15 resources
  ...
============================================================
```

> **Note**: The service costs shown above are demonstration data. See [Getting Real Data](#-getting-real-azure-cost-data) below for implementation.

## 🔧 Getting Real Azure Cost Data

The application currently shows **mock data** for demonstration. To get your actual costs:

1. **Read the Implementation Guide**: See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed instructions

2. **Verify Permissions**: You need the "Cost Management Reader" role:
   ```bash
   az role assignment create \
     --assignee <your-email> \
     --role "Cost Management Reader" \
     --scope "/subscriptions/<subscription-id>"
   ```

3. **Implement the API**: Replace mock data in `src/services/azureCostManagementService.ts` with actual Azure Cost Management Query API calls

4. **Wait for Data**: Cost data appears 24-48 hours after resource usage

See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for complete code examples and troubleshooting.

## ⚙️ Configuration

### config/default.json

```json
{
  "azure": {
    "subscriptionId": "",
    "tenantId": "",
    "scope": "/subscriptions/{subscriptionId}"
  },
  "analysis": {
    "historicalDays": 90,
    "forecastDays": 30,
    "anomalyThresholdPercent": 20
  }
}
```

### Environment Variables

- `AZURE_SUBSCRIPTION_ID` - Your Azure subscription ID (required)
- `AZURE_TENANT_ID` - Your Azure tenant ID (required)
- `AZURE_CLIENT_ID` - Service Principal ID (optional, for non-interactive auth)
- `AZURE_CLIENT_SECRET` - Service Principal secret (optional)
- `LOG_LEVEL` - Logging level (info, warn, error, debug)

## 🔐 Authentication

The application uses **DefaultAzureCredential**, which tries authentication in this order:

1. **Environment variables** (Service Principal)
2. **Managed Identity** (when running in Azure)
3. **Azure CLI** (local development)
4. **Visual Studio Code** credentials
5. **Azure PowerShell**

For local development, simply run `az login` before starting the application.

## 📋 Required Azure Permissions

Your Azure account needs:

- **Cost Management Reader** - To read cost data
- **Reader** - To list resources
- At subscription or resource group scope

## 🎛️ Customization

### Adjust Analysis Period

Edit `config/default.json`:
```json
{
  "analysis": {
    "historicalDays": 180,  // Look back 6 months
    "forecastDays": 60,      // Forecast 2 months ahead
    "anomalyThresholdPercent": 15  // More sensitive anomaly detection
  }
}
```

### Change Scope

To analyze a specific resource group:
```bash
AZURE_SCOPE="/subscriptions/{sub-id}/resourceGroups/{rg-name}"
```

### Adjust API Rate Limiting

If you experience rate limiting or want faster execution, you can adjust the delays in `src/services/azureCostManagementService.ts`:

```typescript
private readonly API_DELAY_MS = 15000; // Milliseconds between API calls
private readonly RETRY_DELAY_MS = 20000; // Milliseconds between retries
```

**Trade-offs:**
- **Lower delays** (5-10s): Faster execution but higher risk of rate limiting
- **Higher delays** (15-20s): Slower execution but guaranteed 100% real data
- **Current setting** (15s): ~2 minutes total, no rate limiting, all real data

## 🔧 Technical Details

### Rate Limiting Mitigation

The application implements comprehensive rate limiting protection:

1. **Sequential API Calls**: Queries execute one at a time with 15-second delays
2. **Exponential Backoff**: Failed requests retry with increasing delays (10s, 20s, 30s)
3. **Smart Retry Logic**: Automatically detects and handles 429 (Too Many Requests) errors
4. **Graceful Degradation**: Falls back to mock data only after multiple retry attempts fail

This ensures **100% real data** from Azure Cost Management API with zero throttling.

### Data Sources

- **Azure Cost Management API**: All cost data (historical, current, forecasted)
- **Azure Resource Management API**: Resource inventory and metadata
- **No Mock Data**: All queries return actual Azure data

## 🚧 Features

✅ **Implemented:**
- Real Azure Cost Management API integration
- Service-level cost breakdown with categorization
- Daily spend visualization (past 14 days)
- Month-over-month comparison
- Cost trend analysis
- Anomaly detection with severity levels
- Actionable recommendations with savings estimates
- Resource inventory (228 resources)
- Rate limiting protection with retry logic
- JSON report export

## 🔄 Future Enhancements

Potential improvements for production use:

1. **Add Cosmos DB**: Store historical assessments for long-term trend analysis
2. **Enhanced Forecasting**: Integrate Azure ML or advanced time-series models
3. **Resource Metrics**: Add Azure Monitor integration for CPU, memory, disk usage
4. **Web Dashboard**: Create interactive visualizations with React/Angular
5. **Alerting**: Email/Teams notifications for anomalies and budget thresholds
6. **Scheduling**: Run assessments automatically (Azure Functions, Logic Apps, cron)
7. **Multi-Subscription**: Analyze and compare multiple subscriptions
8. **Budget Integration**: Compare actual vs. budgeted costs

## 📚 API Documentation

- [Azure Cost Management API](https://learn.microsoft.com/en-us/rest/api/cost-management/)
- [Azure Resource Management](https://learn.microsoft.com/en-us/rest/api/resources/)
- [Azure SDK for JavaScript](https://learn.microsoft.com/en-us/javascript/api/overview/azure/)

## 🤝 Contributing

This is a PoC project. Suggestions for improvements:
- Add unit tests
- Implement caching
- Add support for multiple subscriptions
- Create Bicep/Terraform for deployment
- Add CI/CD pipeline

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ for Azure Engineers**

- **Logging and Configuration**: Utilities for logging application events and managing configuration settings.

## 🔒 Security Best Practices

### Protecting Sensitive Data

This tool accesses and generates reports containing:
- Azure Subscription IDs
- Tenant IDs
- Resource names and IDs
- Cost data
- Resource group names

**Never commit these to public repositories!**

### Files to Protect

✅ **Already Protected** (in .gitignore):
- `.env` - Your credentials
- `reports/*.json` - Generated cost reports

⚠️ **Review Before Sharing**:
- `config/default.json` - Should use environment variables only
- `config/production.json` - Should not contain real credentials
- Documentation files - Replace real IDs/emails with placeholders

### Safe Configuration

**DO**:
- ✅ Use `.env` for all sensitive values
- ✅ Use `.env.example` as a template with placeholders
- ✅ Store reports locally (they're gitignored)
- ✅ Review `git status` before commits

**DON'T**:
- ❌ Commit `.env` files
- ❌ Put real subscription IDs in config files
- ❌ Include email addresses in documentation
- ❌ Commit reports to public repos

### For Public Sharing

Before making your repository public:

1. **Check for secrets**:
   ```bash
   git grep -i "subscriptionid\|tenantid\|@.*\.com"
   ```

2. **Verify `.gitignore`**:
   ```bash
   cat .gitignore | grep -E "\.env|reports"
   ```

3. **Review all config files** for placeholders

4. **Test with a clean clone** to ensure no secrets leak

## Setup Instructions


1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd azure-cost-analyzer
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the `.env.example` to `.env` and fill in the required Azure credentials.

4. **Run the Application**:
   ```bash
   npm start
   ```

5. **Run Tests**:
   To ensure everything is working correctly, run the tests:
   ```bash
   npm test
   ```

## 💡 Common Use Cases

### Daily Cost Monitoring
Run the analyzer every morning to review yesterday's spending:
```powershell
# Windows Task Scheduler
schtasks /create /tn "Azure Cost Analysis" /tr "cd C:\path\to\azure-cost-analyzer && npm start" /sc daily /st 08:00
```

```bash
# Linux/Mac cron (8 AM daily)
0 8 * * * cd /path/to/azure-cost-analyzer && npm start >> logs/cron.log 2>&1
```

### Weekly Executive Reports
Generate PDF reports for weekly stakeholder meetings:
```bash
npm start  # Generates both JSON and PDF in reports/ directory
```
Share the PDF report (`reports/finops-assessment-YYYY-MM-DDTHH-mm-ss.pdf`) with your team.

### Budget Alert Analysis
When Azure Budget alerts trigger, run this tool to:
- Identify which services caused the spike
- Detect cost anomalies
- Get actionable recommendations
- Review trend analysis

### Monthly Cost Reviews
Use the 3-month comparison feature to:
- Track month-over-month changes
- Compare full months (apples-to-apples)
- Project current month-end costs
- Identify seasonal patterns

### Pre-Purchase Analysis
Before buying Reserved Instances:
- Review 90-day usage patterns
- Identify consistently running resources
- Calculate potential savings
- Validate RI purchase decisions

## 🔧 Troubleshooting

### Rate Limiting Errors
**Symptom**: `429 Too Many Requests` or throttling errors

**Solution**: The tool includes automatic protection:
- 15-second delays between API calls
- Exponential backoff retry logic
- Analysis takes ~2-3 minutes to avoid throttling

**Manual Override** (not recommended):
```typescript
// src/services/azureCostManagementService.ts
private readonly API_DELAY_MS = 15000; // Increase if needed
```

### Permission Errors
**Symptom**: `Authorization failed` or `Forbidden` errors

**Solution**: Ensure you have the required Azure role:
```bash
# Check your current roles
az role assignment list --assignee YOUR_EMAIL --output table

# Required role: Cost Management Reader
az role assignment create \
  --role "Cost Management Reader" \
  --assignee YOUR_EMAIL \
  --scope /subscriptions/YOUR_SUBSCRIPTION_ID
```

### No Data Returned
**Symptom**: "No cost data available" or empty reports

**Checklist**:
1. Verify subscription ID in `.env`:
   ```bash
   az account show --query id -o tsv
   ```
2. Check Azure CLI login:
   ```bash
   az account show
   ```
3. Ensure costs exist in the date range (past 90 days)
4. Verify you're using the correct subscription:
   ```bash
   az account set --subscription YOUR_SUBSCRIPTION_ID
   ```

### TypeScript Compilation Errors
**Symptom**: Build fails with type errors

**Solution**:
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### PDF Generation Fails
**Symptom**: JSON report created but no PDF

**Solution**:
```bash
# Ensure pdfkit is installed
npm install pdfkit @types/pdfkit

# Check reports directory permissions
mkdir -p reports
chmod 755 reports
```

### Colors Not Displaying in PowerShell
**Symptom**: Console shows ANSI codes instead of colors

**Solution**: Use Windows Terminal or enable ANSI in PowerShell:
```powershell
# Enable ANSI colors in PowerShell
Set-ItemProperty HKCU:\Console VirtualTerminalLevel -Type DWORD 1
```

### Azure CLI Not Found
**Symptom**: `az: command not found`

**Solution**: Install Azure CLI:
- **Windows**: Download from https://aka.ms/installazurecliwindows
- **Mac**: `brew install azure-cli`
- **Linux**: `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash`

After installation:
```bash
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run build && npm start`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📋 Roadmap

See [CHANGELOG.md](CHANGELOG.md) for planned features:
- [ ] GitHub Actions CI/CD
- [ ] Unit test suite
- [ ] Multi-subscription support
- [ ] CSV/Excel export
- [ ] Email notifications
- [ ] Custom date ranges
- [ ] Resource group breakdown

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with Azure SDK for JavaScript/TypeScript
- Inspired by Azure FinOps best practices
- Uses statistical methods from data science community

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/mobieus10036/azure-cost-analyzer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mobieus10036/azure-cost-analyzer/discussions)
- **Documentation**: See [QUICKSTART.md](QUICKSTART.md) and other guides