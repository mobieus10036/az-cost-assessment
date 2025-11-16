import * as readline from 'readline';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface AzureAccount {
    id: string;
    name: string;
    tenantId: string;
    state: string;
}

export class InteractiveSetup {
    private rl: readline.Interface;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    private question(query: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(query, resolve);
        });
    }

    private async checkAzureCliInstalled(): Promise<boolean> {
        try {
            await execAsync('az --version');
            return true;
        } catch {
            return false;
        }
    }

    private async isAzureLoggedIn(): Promise<boolean> {
        try {
            const { stdout } = await execAsync('az account show');
            return stdout.trim().length > 0;
        } catch {
            return false;
        }
    }

    private async getCurrentAccount(): Promise<AzureAccount | null> {
        try {
            const { stdout } = await execAsync('az account show --output json');
            return JSON.parse(stdout);
        } catch {
            return null;
        }
    }

    private async listSubscriptions(): Promise<AzureAccount[]> {
        try {
            const { stdout } = await execAsync('az account list --output json');
            return JSON.parse(stdout);
        } catch {
            return [];
        }
    }

    private async loginToAzure(): Promise<boolean> {
        console.log('\n🔐 Opening Azure login in your browser...');
        console.log('Please complete the authentication in your browser.\n');

        try {
            await execAsync('az login');
            console.log('✅ Successfully logged in to Azure!\n');
            return true;
        } catch (error) {
            console.error('❌ Failed to login to Azure');
            return false;
        }
    }

    private async selectSubscription(subscriptions: AzureAccount[]): Promise<AzureAccount | null> {
        console.log('\n📋 Available Subscriptions:\n');
        
        subscriptions.forEach((sub, index) => {
            console.log(`${index + 1}. ${sub.name}`);
            console.log(`   ID: ${sub.id}`);
            console.log(`   State: ${sub.state}\n`);
        });

        const answer = await this.question('Select subscription number (or press Enter for default): ');
        
        if (!answer.trim()) {
            return subscriptions[0];
        }

        const selection = parseInt(answer.trim());
        if (selection > 0 && selection <= subscriptions.length) {
            return subscriptions[selection - 1];
        }

        console.log('Invalid selection, using first subscription.');
        return subscriptions[0];
    }

    private async saveEnvFile(subscription: AzureAccount): Promise<void> {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = `# Azure Configuration
AZURE_SUBSCRIPTION_ID=${subscription.id}
AZURE_TENANT_ID=${subscription.tenantId}

# Generated on ${new Date().toISOString()}
`;

        fs.writeFileSync(envPath, envContent, 'utf8');
        console.log(`\n✅ Configuration saved to .env file`);
    }

    public async run(): Promise<boolean> {
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║       Azure Cost Analyzer - Interactive Setup            ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        // Step 1: Check Azure CLI
        console.log('🔍 Checking prerequisites...\n');
        const hasAzureCli = await this.checkAzureCliInstalled();
        
        if (!hasAzureCli) {
            console.log('❌ Azure CLI is not installed.');
            console.log('📥 Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli\n');
            this.rl.close();
            return false;
        }

        console.log('✅ Azure CLI is installed\n');

        // Step 2: Check/Perform Azure Login
        const isLoggedIn = await this.isAzureLoggedIn();
        
        if (!isLoggedIn) {
            console.log('⚠️  Not logged in to Azure\n');
            const shouldLogin = await this.question('Would you like to login now? (Y/n): ');
            
            if (shouldLogin.toLowerCase() !== 'n') {
                const loginSuccess = await this.loginToAzure();
                if (!loginSuccess) {
                    console.log('\n❌ Setup cancelled - login required');
                    this.rl.close();
                    return false;
                }
            } else {
                console.log('\n❌ Setup cancelled - Azure login required');
                this.rl.close();
                return false;
            }
        } else {
            console.log('✅ Already logged in to Azure\n');
        }

        // Step 3: Get current account
        const currentAccount = await this.getCurrentAccount();
        if (currentAccount) {
            console.log(`📍 Current Subscription: ${currentAccount.name}`);
            console.log(`   ID: ${currentAccount.id}\n`);
            
            const useCurrentSub = await this.question('Use this subscription? (Y/n): ');
            
            if (useCurrentSub.toLowerCase() !== 'n') {
                await this.saveEnvFile(currentAccount);
                this.rl.close();
                return true;
            }
        }

        // Step 4: List and select subscription
        console.log('\n🔍 Fetching your subscriptions...\n');
        const subscriptions = await this.listSubscriptions();

        if (subscriptions.length === 0) {
            console.log('❌ No subscriptions found. Please check your Azure access.');
            this.rl.close();
            return false;
        }

        const selectedSubscription = await this.selectSubscription(subscriptions);
        
        if (!selectedSubscription) {
            console.log('❌ Setup cancelled - no subscription selected');
            this.rl.close();
            return false;
        }

        // Step 5: Set the subscription as active
        console.log(`\n⚙️  Setting active subscription to: ${selectedSubscription.name}`);
        try {
            await execAsync(`az account set --subscription "${selectedSubscription.id}"`);
            console.log('✅ Subscription set successfully');
        } catch (error) {
            console.log('⚠️  Warning: Could not set subscription as active (continuing anyway)');
        }

        // Step 6: Save configuration
        await this.saveEnvFile(selectedSubscription);

        console.log('\n╔═══════════════════════════════════════════════════════════╗');
        console.log('║                   Setup Complete! 🎉                      ║');
        console.log('╚═══════════════════════════════════════════════════════════╝\n');

        this.rl.close();
        return true;
    }
}

// Allow running this file directly for setup-only mode
if (require.main === module) {
    const setup = new InteractiveSetup();
    setup.run().then((success) => {
        process.exit(success ? 0 : 1);
    });
}
