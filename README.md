# AZ Cost Assessment 💸

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

**Rapid and actionable Azure cost assessment for modern enterprises.** Get comprehensive cost intelligence, anomaly detection, and optimization recommendations in minutes—not hours.

> 🚀 Part of the Mobieus Rapid Assessment Suite — Accelerate your Azure security and cost insights.

---

## ✨ Features

### 📊 Cost Intelligence
- **90-day historical analysis** — Full spending breakdown by service, resource, and resource group
- **Daily cost tracking** — Granular day-by-day spending with 14-day rolling view
- **Month-over-month comparison** — Track trends across 3 months with projections

### 🔮 Predictive Analytics  
- **30-day forecasting** — Trend-based cost predictions with confidence indicators
- **Moving averages** — 7-day and 30-day moving averages for trend smoothing
- **Projected month-end** — Estimate your bill before it arrives

### 🚨 Anomaly Detection
- **Statistical analysis** — Z-score based anomaly detection
- **Severity classification** — Critical, High, Medium, Low severity ratings
- **Actionable alerts** — Recommendations for each detected anomaly

### 💡 Smart Recommendations
- **Unattached disk detection** — Find and clean up orphaned storage
- **Stopped VM analysis** — Identify VMs that could be deleted or right-sized
- **Savings estimation** — Monthly and annual savings projections

### 📈 Reporting
- **Professional HTML reports** — Beautiful, shareable cost analysis documents
- **JSON export** — Programmatic access for automation and integrations
- **Console output** — Rich, colorized terminal display

---

## 🚀 Quickstart

```powershell
# Clone and install
git clone https://github.com/mobieus10036/az-cost-assessment.git
cd az-cost-assessment
npm install

# Run (interactive setup on first run)
npm start
```

The tool will automatically:
1. ✅ Check Azure CLI installation
2. 🔐 Prompt for Azure login if needed
3. 📋 Let you select your subscription
4. 💾 Save configuration for future runs
5. 📊 Generate comprehensive cost analysis

**See [QUICKSTART.md](QUICKSTART.md) for detailed walkthrough.**

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥18.0.0 | LTS recommended |
| npm | ≥9.0.0 | Comes with Node.js |
| Azure CLI | Latest | For authentication |
| Azure RBAC | Cost Management Reader | Required permissions |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](QUICKSTART.md) | Get running in under 2 minutes |
| [INSTALL.md](INSTALL.md) | Detailed installation guide |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution guidelines |
| [VALUE.md](VALUE.md) | Value proposition and use cases |
| [SECURITY.md](SECURITY.md) | Security policy |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

---

## 🏗️ Architecture

```
az-cost-assessment/
├── src/
│   ├── app.ts                 # Main application entry
│   ├── analyzers/             # Analysis engines
│   │   ├── anomalyDetector.ts
│   │   ├── costTrendAnalyzer.ts
│   │   ├── smartRecommendationAnalyzer.ts
│   │   └── vmCostAnalyzer.ts
│   ├── services/              # Azure API integrations
│   │   ├── azureCostManagementService.ts
│   │   ├── azureResourceService.ts
│   │   └── htmlReportGenerator.ts
│   ├── models/                # TypeScript interfaces
│   └── utils/                 # Helpers and configuration
├── config/                    # Environment configurations
├── reports/                   # Generated reports (gitignored)
└── tests/                     # Unit and integration tests
```

---

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
```

### Analysis Settings

Edit `config/default.json` to customize:

```json
{
  "analysis": {
    "historicalDays": 90,
    "forecastDays": 30,
    "anomalyThresholdPercent": 20,
    "anomalyMinSeverity": "medium"
  }
}
```

---

## 📊 Sample Output

```
============================================================
AZURE FINOPS ASSESSMENT REPORT
============================================================

📊 COST SUMMARY
------------------------------------------------------------
Historical Total (90 days):     $9,425.98 USD
Current Month to Date:          $972.25 USD
Estimated Month End:            $2,739.99 USD
Average Daily Spend:            $101.94 USD

💰 TOP EXPENSIVE SERVICES
------------------------------------------------------------
1. Virtual Machines              $3,338.83 (35.4%)
2. Storage                       $3,176.35 (33.7%)
3. Microsoft Defender            $895.67 (9.5%)

🚨 ANOMALIES DETECTED
------------------------------------------------------------
[HIGH] Unusual spike in Compute costs (+45% above baseline)

💡 SMART RECOMMENDATIONS
------------------------------------------------------------
Total Recommendations: 5
Potential Monthly Savings: $450.00 USD
Potential Annual Savings: $5,400.00 USD
```

---

## 🔒 Security

- **Never commit `.env`** — Contains your Azure credentials
- **Reports are gitignored** — Contain subscription-specific data
- **Use least privilege** — Only Cost Management Reader role needed
- **Review before sharing** — Check reports for sensitive resource names

See [SECURITY.md](SECURITY.md) for our security policy.

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Azure Cost Management API
- Azure SDK for JavaScript
- The FinOps community

---

**Made with ❤️ by the Mobieus team**