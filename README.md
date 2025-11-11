# Azure FinOps Assessment PoC

A comprehensive proof of concept (PoC) for analyzing Azure services and their associated costs. This tool provides Azure engineers with programmatic insights into spending patterns, cost trends, forecasts, and optimization opportunities.

> ⚠️ **IMPORTANT NOTE**: This PoC currently uses **mock/demonstration data** for cost analysis. The services shown (Virtual Machines, Kubernetes, SQL Database, etc.) are sample data to demonstrate reporting capabilities. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for how to implement real Azure Cost Management API integration to get your actual subscription costs.

## 🎯 What This PoC Delivers

This application analyzes your Azure subscription and provides:

- **📊 Historical Cost Analysis**: Review past spending patterns (configurable days)
- **💰 Current Month Tracking**: Real-time month-to-date costs and estimates
- **🔮 Cost Forecasting**: Predict future spending based on historical trends
- **📈 Trend Analysis**: Identify increasing, decreasing, or stable cost patterns
- **⚠️ Anomaly Detection**: Spot unusual cost spikes or drops automatically
- **💻 Resource Inventory**: Complete view of all Azure resources and their costs
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
azure-finops-assessment-poc/
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

1. **Node.js**: Version 16 or higher
2. **Azure Subscription**: With appropriate permissions
3. **Azure CLI**: For authentication (or use Service Principal)

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd azure-finops-assessment-poc
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set:
   ```bash
   AZURE_SUBSCRIPTION_ID=your-subscription-id-here
   AZURE_TENANT_ID=your-tenant-id-here
   ```

4. **Authenticate with Azure**:
   ```bash
   az login
   az account set --subscription "your-subscription-id"
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
7. Save results to `reports/finops-assessment-TIMESTAMP.json`

## 📊 Sample Output

```
============================================================
AZURE FINOPS ASSESSMENT REPORT
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

## 🚧 Current Limitations (PoC)

- Uses mock data for demonstration (implement actual Azure API calls in production)
- Simple linear forecasting (can be enhanced with ML models)
- No authentication for Cosmos DB (optional feature)
- Limited resource metrics (can be extended with Azure Monitor)

## 🔄 Next Steps for Production

1. **Implement Real API Calls**: Replace mock data with actual Azure Cost Management API queries
2. **Add Cosmos DB**: Store historical assessments for trend analysis
3. **Enhanced Forecasting**: Integrate Azure ML or advanced time-series models
4. **Resource Metrics**: Add Azure Monitor integration for CPU, memory, etc.
5. **Recommendations Engine**: Build optimization suggestions based on usage patterns
6. **Web Dashboard**: Create interactive visualizations
7. **Alerting**: Email/Teams notifications for anomalies
8. **Scheduling**: Run assessments automatically (Azure Functions, cron)

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

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd azure-finops-assessment-poc
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

## Usage

This PoC can be used to analyze Azure services and their costs, providing insights that can help optimize resource usage and reduce unnecessary expenses. The application can be extended with additional features as needed.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any suggestions or improvements.