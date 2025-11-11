# Azure Storage vs Cosmos DB - Cost-Effective Data Persistence

## Why Azure Storage is Perfect for FinOps Assessments

### 💰 Cost Comparison

| Service | Monthly Cost (estimate) | Best For |
|---------|------------------------|----------|
| **Azure Storage (Blob + Table)** | **$0.01 - $0.10** | FinOps reports, historical data |
| **Cosmos DB** | **$24 - $200+** | High-throughput, low-latency apps |

**Savings: ~99% less expensive!**

### 🎯 What Each Storage Type Does

#### 1. **Blob Storage** (For JSON Reports)
- **Cost**: ~$0.018 per GB/month (Cool tier)
- **Use**: Store complete assessment reports as JSON files
- **Benefits**:
  - Dead simple - just upload files
  - Can download and analyze offline
  - Easy to share (generate SAS URLs)
  - Perfect for audit trails

#### 2. **Table Storage** (For Time-Series Data)
- **Cost**: ~$0.045 per 10,000 transactions
- **Use**: Store daily cost summaries for trend analysis
- **Benefits**:
  - Query-able structured data
  - Super fast for time-series
  - Dirt cheap for millions of records
  - Perfect for charts and graphs

#### 3. **Local File System** (Free!)
- **Cost**: $0 (uses your disk)
- **Use**: Immediate access to reports
- **Benefits**:
  - No Azure costs
  - Works offline
  - Fast access
  - No network latency

## Configuration Options

### Option 1: Local Only (Default - $0/month)
```json
// config/default.json
{
  "storage": {
    "useStorage": false  // Don't use Azure Storage
  }
}
```

Reports saved to: `reports/` directory

### Option 2: Local + Azure Storage (Recommended - $0.01-0.10/month)
```json
// config/default.json
{
  "storage": {
    "accountName": "your-storage-account",
    "containerName": "finops-reports",
    "tableName": "FinOpsCostData",
    "useStorage": true
  }
}
```

```bash
# .env
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
```

**Benefits:**
- ✓ Reports saved locally AND in cloud
- ✓ Access from anywhere
- ✓ Historical trending in Table Storage
- ✓ Share reports via Azure Storage Explorer
- ✓ Backup/disaster recovery

## Setup Azure Storage (5 minutes)

### 1. Create Storage Account (if you don't have one)

```powershell
# Login
az login

# Create storage account (if needed)
az storage account create \
  --name finopsassessments \
  --resource-group YourResourceGroup \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Get the name
az storage account show \
  --name finopsassessments \
  --query "name" -o tsv
```

### 2. Grant Permissions

Your account needs these roles on the Storage Account:

```powershell
# Get your user ID
$userId = az ad signed-in-user show --query id -o tsv

# Grant Storage Blob Data Contributor
az role assignment create \
  --assignee $userId \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/YOUR_SUB_ID/resourceGroups/YOUR_RG/providers/Microsoft.Storage/storageAccounts/YOUR_STORAGE_ACCOUNT

# Grant Storage Table Data Contributor
az role assignment create \
  --assignee $userId \
  --role "Storage Table Data Contributor" \
  --scope /subscriptions/YOUR_SUB_ID/resourceGroups/YOUR_RG/providers/Microsoft.Storage/storageAccounts/YOUR_STORAGE_ACCOUNT
```

### 3. Configure Application

```powershell
# Edit .env
notepad .env
```

Add:
```bash
AZURE_STORAGE_ACCOUNT_NAME=finopsassessments
```

Update `config/default.json`:
```json
{
  "storage": {
    "accountName": "finopsassessments",
    "useStorage": true
  }
}
```

### 4. Test It

```powershell
npm start
```

Look for:
```
✓ Report saved to Azure Blob Storage: finops-assessment-2025-11-11-10-30-00.json
✓ Cost summary saved to Azure Table Storage
```

## What Gets Stored Where

### Blob Storage (Container: `finops-reports`)
```
finops-reports/
├── finops-assessment-2025-11-01-06-00-00.json
├── finops-assessment-2025-11-08-06-00-00.json
├── finops-assessment-2025-11-11-10-30-00.json
└── ...
```

Each file contains complete assessment:
- Historical costs
- Current costs
- Forecasts
- Trends
- Anomalies
- Resource inventory

### Table Storage (Table: `FinOpsCostData`)
```
PartitionKey (SubscriptionId) | RowKey (Date) | totalCost | monthToDate | resourceCount
abc-123...                    | 2025-11-01    | 12450.75  | 3250.25     | 127
abc-123...                    | 2025-11-08    | 12890.50  | 3450.00     | 132
abc-123...                    | 2025-11-11    | 13100.25  | 3680.75     | 135
```

Perfect for:
- Daily cost charts
- Month-over-month comparisons
- Trend analysis
- Budget alerts

## Accessing Your Data

### Azure Portal
1. Navigate to your Storage Account
2. **Blob containers** → `finops-reports` → Download JSON files
3. **Tables** → `FinOpsCostData` → Query historical data

### Azure Storage Explorer (Free Tool)
1. Download: https://azure.microsoft.com/features/storage-explorer/
2. Connect to your subscription
3. Browse/download/analyze reports

### PowerShell
```powershell
# List reports
az storage blob list \
  --account-name finopsassessments \
  --container-name finops-reports \
  --auth-mode login \
  --output table

# Download a report
az storage blob download \
  --account-name finopsassessments \
  --container-name finops-reports \
  --name finops-assessment-2025-11-11-10-30-00.json \
  --file report.json \
  --auth-mode login
```

### Programmatically (from the app)
```typescript
import { AzureStorageService } from './services/azureStorageService';

const storage = new AzureStorageService();

// List last 10 reports
const reports = await storage.listHistoricalReports(10);

// Get 30 days of cost data for trending
const data = await storage.getHistoricalCostData(subscriptionId, 30);
```

## Cost Breakdown Example

### Scenario: Run assessment daily for 1 year

**Storage Used:**
- Blob: 365 reports × 50 KB = 18.25 MB
- Table: 365 rows × 1 KB = 365 KB
- Total: ~19 MB

**Monthly Costs:**
- Blob Storage (Cool tier): $0.018/GB × 0.019 GB = **$0.0003**
- Table Storage: 365 write ops = **$0.0002**
- Total: **~$0.001/month = 1/10 of a penny!**

**Annual Cost: ~$0.01**

Compare to Cosmos DB: **$288/year minimum**

**Savings: $287.99/year = 99.996% cheaper!**

## Best Practices

### 1. Use Storage Tiers
```powershell
# Move old reports to Archive tier (even cheaper)
az storage blob set-tier \
  --account-name finopsassessments \
  --container-name finops-reports \
  --name finops-assessment-2025-01-*.json \
  --tier Archive
```

### 2. Set Lifecycle Policies
Auto-archive old reports:
```json
{
  "rules": [{
    "name": "archiveOldReports",
    "enabled": true,
    "type": "Lifecycle",
    "definition": {
      "filters": {
        "blobTypes": ["blockBlob"],
        "prefixMatch": ["finops-reports/"]
      },
      "actions": {
        "baseBlob": {
          "tierToCool": { "daysAfterModificationGreaterThan": 30 },
          "tierToArchive": { "daysAfterModificationGreaterThan": 90 }
        }
      }
    }
  }]
}
```

### 3. Enable Soft Delete (Free)
Protects against accidental deletion:
```powershell
az storage blob service-properties delete-policy update \
  --account-name finopsassessments \
  --enable true \
  --days-retained 30
```

### 4. Backup to Different Region (Optional)
For critical data, use GRS (Geo-Redundant Storage):
```powershell
az storage account update \
  --name finopsassessments \
  --sku Standard_GRS
```

Cost: ~$0.024/GB (still super cheap!)

## Migration from Cosmos DB (If You Already Have It)

```typescript
// Export from Cosmos DB
const cosmosItems = await cosmosContainer.items.readAll().fetchAll();

// Import to Storage
for (const item of cosmosItems) {
    await storage.saveAssessmentReport(item);
}
```

## Monitoring Costs

```powershell
# Check actual costs
az consumption usage list \
  --start-date 2025-11-01 \
  --end-date 2025-11-30 \
  --query "[?contains(instanceName, 'finopsassessments')]" \
  --output table
```

## When You SHOULD Use Cosmos DB

Only if you need:
- **Millisecond latency** (< 10ms reads)
- **High throughput** (> 10,000 ops/sec)
- **Global distribution** with multi-write
- **Complex queries** on large datasets
- **Real-time analytics**

For FinOps assessments: **Azure Storage is perfect!**

## Summary

| Requirement | Azure Storage | Cosmos DB |
|-------------|---------------|-----------|
| Store JSON reports | ✅ Excellent | ⚠️ Overkill |
| Time-series data | ✅ Table Storage | ⚠️ Expensive |
| Query historical data | ✅ Fast enough | ✅ Faster (but pricey) |
| Cost for FinOps use case | ✅ ~$0.01/month | ❌ ~$24+/month |
| Easy to use | ✅ Very simple | ⚠️ More complex |
| Works with existing account | ✅ Yes | ❌ Need new resource |

**Verdict: Azure Storage is the clear winner for FinOps assessments!**

---

**Bottom Line:** You can store **years** of FinOps assessment data in Azure Storage for less than the cost of **a single day** of Cosmos DB. 🎉
