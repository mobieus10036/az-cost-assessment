# Azure Storage Setup Script for FinOps Assessment
# This script will help you configure Azure Storage for your FinOps assessments

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Azure Storage Setup for FinOps Assessment PoC" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if logged in
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
try {
    $account = az account show 2>$null | ConvertFrom-Json
    Write-Host "✓ Logged in as: $($account.user.name)" -ForegroundColor Green
    Write-Host "✓ Subscription: $($account.name)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ Not logged into Azure. Please run: az login" -ForegroundColor Red
    exit 1
}

# Save subscription info
$subscriptionId = $account.id
$tenantId = $account.tenantId

# List storage accounts
Write-Host "Finding your storage accounts..." -ForegroundColor Yellow
$storageAccountsJson = az storage account list 2>$null
$storageAccounts = $storageAccountsJson | ConvertFrom-Json

if ($storageAccounts.Count -eq 0) {
    Write-Host "✗ No storage accounts found in this subscription." -ForegroundColor Red
    Write-Host ""
    Write-Host "Would you like to create one? (It costs ~$0.01/month)" -ForegroundColor Yellow
    $createNew = Read-Host "Create new storage account? (y/n)"
    
    if ($createNew -eq 'y') {
        $storageAccountName = Read-Host "Enter a name (lowercase, no spaces, 3-24 chars)"
        $resourceGroup = Read-Host "Enter resource group name (or press Enter for 'finops-rg')"
        if ([string]::IsNullOrWhiteSpace($resourceGroup)) {
            $resourceGroup = "finops-rg"
        }
        $location = Read-Host "Enter location (or press Enter for 'eastus')"
        if ([string]::IsNullOrWhiteSpace($location)) {
            $location = "eastus"
        }
        
        Write-Host "Creating resource group..." -ForegroundColor Yellow
        az group create --name $resourceGroup --location $location | Out-Null
        
        Write-Host "Creating storage account..." -ForegroundColor Yellow
        az storage account create `
            --name $storageAccountName `
            --resource-group $resourceGroup `
            --location $location `
            --sku Standard_LRS `
            --kind StorageV2 | Out-Null
        
        Write-Host "✓ Storage account created: $storageAccountName" -ForegroundColor Green
    } else {
        Write-Host "Setup cancelled. You can run this script again when ready." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "Found $($storageAccounts.Count) storage account(s):" -ForegroundColor Green
    Write-Host ""
    
    for ($i = 0; $i -lt $storageAccounts.Count; $i++) {
        $sa = $storageAccounts[$i]
        Write-Host "  [$($i + 1)] $($sa.name)" -ForegroundColor Cyan
        Write-Host "      Resource Group: $($sa.resourceGroup)" -ForegroundColor Gray
        Write-Host "      Location: $($sa.location)" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($storageAccounts.Count -eq 1) {
        $selectedIndex = 0
        $storageAccountName = $storageAccounts[0].name
        $resourceGroup = $storageAccounts[0].resourceGroup
        Write-Host "Using: $storageAccountName" -ForegroundColor Green
    } else {
        $selection = Read-Host "Select storage account (1-$($storageAccounts.Count))"
        $selectedIndex = [int]$selection - 1
        $storageAccountName = $storageAccounts[$selectedIndex].name
        $resourceGroup = $storageAccounts[$selectedIndex].resourceGroup
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Configuring storage account: $storageAccountName" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Get user identity
$userEmail = $account.user.name
Write-Host "Granting permissions to: $userEmail" -ForegroundColor Yellow

# Grant Blob permissions
Write-Host "  • Storage Blob Data Contributor..." -ForegroundColor Yellow
$scope = "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.Storage/storageAccounts/$storageAccountName"
az role assignment create `
    --assignee $userEmail `
    --role "Storage Blob Data Contributor" `
    --scope $scope `
    2>$null | Out-Null
Write-Host "    ✓ Blob permissions granted" -ForegroundColor Green

# Grant Table permissions
Write-Host "  • Storage Table Data Contributor..." -ForegroundColor Yellow
az role assignment create `
    --assignee $userEmail `
    --role "Storage Table Data Contributor" `
    --scope $scope `
    2>$null | Out-Null
Write-Host "    ✓ Table permissions granted" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Updating Configuration Files" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Update .env file
$envPath = Join-Path $PSScriptRoot ".." ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
} else {
    $envExamplePath = Join-Path $PSScriptRoot ".." ".env.example"
    if (Test-Path $envExamplePath) {
        $envContent = Get-Content $envExamplePath -Raw
    } else {
        $envContent = ""
    }
}

# Update or add values
if ($envContent -match "AZURE_SUBSCRIPTION_ID=") {
    $envContent = $envContent -replace "AZURE_SUBSCRIPTION_ID=.*", "AZURE_SUBSCRIPTION_ID=$subscriptionId"
} else {
    $envContent += "`nAZURE_SUBSCRIPTION_ID=$subscriptionId"
}

if ($envContent -match "AZURE_TENANT_ID=") {
    $envContent = $envContent -replace "AZURE_TENANT_ID=.*", "AZURE_TENANT_ID=$tenantId"
} else {
    $envContent += "`nAZURE_TENANT_ID=$tenantId"
}

if ($envContent -match "AZURE_STORAGE_ACCOUNT_NAME=") {
    $envContent = $envContent -replace "AZURE_STORAGE_ACCOUNT_NAME=.*", "AZURE_STORAGE_ACCOUNT_NAME=$storageAccountName"
} else {
    $envContent += "`nAZURE_STORAGE_ACCOUNT_NAME=$storageAccountName"
}

$envContent | Set-Content $envPath -NoNewline
Write-Host "✓ Updated .env file" -ForegroundColor Green

# Update config/default.json
$configPath = Join-Path $PSScriptRoot ".." "config" "default.json"
$config = Get-Content $configPath -Raw | ConvertFrom-Json

$config.azure.subscriptionId = $subscriptionId
$config.azure.tenantId = $tenantId
$config.storage.accountName = $storageAccountName
$config.storage.useStorage = $true

$config | ConvertTo-Json -Depth 10 | Set-Content $configPath
Write-Host "✓ Updated config/default.json" -ForegroundColor Green

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Setup Complete! ✓" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Storage Account: $storageAccountName" -ForegroundColor White
Write-Host "  Container: finops-reports" -ForegroundColor White
Write-Host "  Table: FinOpsCostData" -ForegroundColor White
Write-Host "  Estimated Cost: ~`$0.01-0.10/month" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Install dependencies:  npm install" -ForegroundColor White
Write-Host "  2. Run the assessment:    npm start" -ForegroundColor White
Write-Host ""
Write-Host "Your reports will be saved to:" -ForegroundColor Yellow
Write-Host "  • Local: reports/ directory" -ForegroundColor White
Write-Host "  • Azure: $storageAccountName/finops-reports" -ForegroundColor White
Write-Host ""
Write-Host "To view your data in Azure:" -ForegroundColor Yellow
Write-Host "  • Portal: https://portal.azure.com/#@/resource/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.Storage/storageAccounts/$storageAccountName" -ForegroundColor White
Write-Host "  • Storage Explorer: Download from https://azure.microsoft.com/features/storage-explorer/" -ForegroundColor White
Write-Host ""
