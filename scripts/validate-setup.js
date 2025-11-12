#!/usr/bin/env node

/**
 * Setup Script for Azure Cost Analyzer
 * Helps validate configuration and environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('='.repeat(60));
console.log('Azure Cost Analyzer - Setup Validator');
console.log('='.repeat(60));
console.log('');

let hasErrors = false;

// Check 1: Node.js version
console.log('✓ Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion < 16) {
    console.error('  ✗ Node.js version must be 16 or higher. Current:', nodeVersion);
    hasErrors = true;
} else {
    console.log(`  ✓ Node.js ${nodeVersion} - OK`);
}

// Check 2: .env file
console.log('\n✓ Checking .env file...');
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
    console.warn('  ⚠ .env file not found. Copy .env.example to .env and configure it.');
    console.warn('    Command: cp .env.example .env');
    hasErrors = true;
} else {
    console.log('  ✓ .env file exists');
    
    // Validate .env contents
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = ['AZURE_SUBSCRIPTION_ID', 'AZURE_TENANT_ID'];
    const missingVars = [];
    
    for (const varName of requiredVars) {
        const regex = new RegExp(`^${varName}=.+`, 'm');
        if (!regex.test(envContent) || envContent.includes(`${varName}=your_`)) {
            missingVars.push(varName);
        }
    }
    
    if (missingVars.length > 0) {
        console.warn(`  ⚠ Missing or unconfigured variables: ${missingVars.join(', ')}`);
        hasErrors = true;
    } else {
        console.log('  ✓ Required environment variables are set');
    }
}

// Check 3: Azure CLI
console.log('\n✓ Checking Azure CLI...');
try {
    const azVersion = execSync('az --version', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    console.log('  ✓ Azure CLI is installed');
    
    // Check if logged in
    try {
        const account = execSync('az account show', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        const accountInfo = JSON.parse(account);
        console.log(`  ✓ Logged in as: ${accountInfo.user.name}`);
        console.log(`  ✓ Subscription: ${accountInfo.name} (${accountInfo.id})`);
    } catch (e) {
        console.warn('  ⚠ Not logged into Azure CLI. Run: az login');
        hasErrors = true;
    }
} catch (e) {
    console.error('  ✗ Azure CLI not found. Install from: https://docs.microsoft.com/cli/azure/install-azure-cli');
    hasErrors = true;
}

// Check 4: node_modules
console.log('\n✓ Checking dependencies...');
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.warn('  ⚠ Dependencies not installed. Run: npm install');
    hasErrors = true;
} else {
    console.log('  ✓ node_modules exists');
    
    // Check key packages
    const requiredPackages = [
        '@azure/identity',
        '@azure/arm-costmanagement',
        '@azure/arm-resources',
        'winston',
        'date-fns'
    ];
    
    const missingPackages = requiredPackages.filter(pkg => {
        return !fs.existsSync(path.join(nodeModulesPath, pkg));
    });
    
    if (missingPackages.length > 0) {
        console.warn(`  ⚠ Missing packages: ${missingPackages.join(', ')}`);
        console.warn('    Run: npm install');
        hasErrors = true;
    } else {
        console.log('  ✓ Key packages installed');
    }
}

// Check 5: TypeScript compilation
console.log('\n✓ Checking TypeScript...');
const tsconfigPath = path.join(__dirname, '..', 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
    console.error('  ✗ tsconfig.json not found');
    hasErrors = true;
} else {
    console.log('  ✓ tsconfig.json exists');
}

// Check 6: Reports directory
console.log('\n✓ Checking output directories...');
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
    console.log('  ⓘ Creating reports directory...');
    fs.mkdirSync(reportsDir, { recursive: true });
    console.log('  ✓ Reports directory created');
} else {
    console.log('  ✓ Reports directory exists');
}

// Check 7: Logs directory
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    console.log('  ⓘ Creating logs directory...');
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('  ✓ Logs directory created');
} else {
    console.log('  ✓ Logs directory exists');
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
    console.log('⚠ Setup Incomplete - Please address the warnings above');
    console.log('='.repeat(60));
    console.log('\nQuick Fix Commands:');
    console.log('  1. npm install');
    console.log('  2. cp .env.example .env');
    console.log('  3. Edit .env with your Azure details');
    console.log('  4. az login');
    console.log('  5. npm start');
    process.exit(1);
} else {
    console.log('✓ Setup Complete - Ready to run!');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('  1. npm start          # Run the assessment');
    console.log('  2. Check reports/     # View generated JSON reports');
    console.log('  3. Check logs/        # Review application logs');
    console.log('\nFor help: See README.md and QUICKSTART.md');
    process.exit(0);
}
