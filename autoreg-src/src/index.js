#!/usr/bin/env node

/**
 * Kiro Batch Login CLI
 * Semi-automatic batch login tool using Kiro's built-in AWS SSO OIDC configuration
 *
 * Usage:
 *   node src/index.js login              - Start new authentication
 *   node src/index.js batch <count>      - Batch login multiple accounts
 *   node src/index.js list               - List all saved tokens
 *   node src/index.js show <filename>    - Show token details
 *   node src/index.js refresh <filename> - Refresh a token
 *   node src/index.js delete <filename>  - Delete a token
 */

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { executeAuthFlow, refreshToken } from './auth-flow.js';
import {
  listTokens,
  displayTokenList,
  displayTokenDetails,
  deleteToken,
  readToken
} from './token-manager.js';
import { getSupportedProviders } from './providers/provider-factory.js';

const program = new Command();

program
  .name('kiro-batch-login')
  .description('Batch semi-automatic login CLI using Kiro\'s built-in AWS SSO OIDC configuration')
  .version('1.0.0');

/**
 * Login command - Single authentication
 */
program
  .command('login')
  .description('Start a new authentication flow')
  .option('-r, --region <region>', 'AWS region (for IdC providers)', 'us-east-1')
  .option('-p, --provider <provider>', 'Provider type (BuilderId, Enterprise, Google, Github, Internal)', 'BuilderId')
  .option('-s, --start-url <url>', 'Start URL (for Enterprise provider)')
  .option('-a, --account <name>', 'Account name for identification')
  .action(async (options) => {
    try {
      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║              Kiro Batch Login - Authentication                 ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝\n'));

      // Prompt for missing options
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'provider',
          message: 'Select provider:',
          choices: [
            { name: 'Builder ID (AWS Builder ID)', value: 'BuilderId' },
            { name: 'Enterprise (AWS IAM Identity Center)', value: 'Enterprise' },
            { name: 'Google (Social Authentication)', value: 'Google' },
            { name: 'GitHub (Social Authentication)', value: 'Github' },
            { name: 'Internal (AWS Internal)', value: 'Internal' }
          ],
          default: options.provider,
          when: !options.provider
        },
        {
          type: 'input',
          name: 'startUrl',
          message: 'Enter Start URL (for Enterprise):',
          when: (answers) => (answers.provider || options.provider) === 'Enterprise' && !options.startUrl,
          validate: (input) => {
            if (!input || input.trim().length === 0) {
              return 'Start URL is required for Enterprise provider';
            }
            try {
              new URL(input);
              return true;
            } catch {
              return 'Please enter a valid URL';
            }
          }
        },
        {
          type: 'input',
          name: 'accountName',
          message: 'Enter account name (for identification):',
          when: !options.account,
          default: `account_${Date.now()}`
        },
        {
          type: 'list',
          name: 'region',
          message: 'Select AWS region:',
          choices: [
            'us-east-1',
            'us-west-2',
            'eu-west-1',
            'ap-southeast-1',
            'ap-northeast-1'
          ],
          default: options.region,
          when: !options.region
        }
      ]);

      const config = {
        region: options.region || answers.region,
        provider: options.provider || answers.provider,
        startUrl: options.startUrl || answers.startUrl,
        accountName: options.account || answers.accountName
      };

      await executeAuthFlow(config);
    } catch (error) {
      console.error(chalk.red(`\n✗ Login failed: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Batch login command - Multiple authentications
 */
program
  .command('batch')
  .description('Batch login multiple accounts')
  .argument('[count]', 'Number of accounts to login', '1')
  .option('-r, --region <region>', 'AWS region (for IdC providers)', 'us-east-1')
  .option('-p, --provider <provider>', 'Provider type (BuilderId, Enterprise, Google, Github, Internal)', 'BuilderId')
  .option('-s, --start-url <url>', 'Start URL (for Enterprise provider)')
  .action(async (count, options) => {
    try {
      const numAccounts = parseInt(count, 10);
      if (isNaN(numAccounts) || numAccounts < 1) {
        console.error(chalk.red('\n✗ Invalid count. Please provide a positive number.\n'));
        process.exit(1);
      }

      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║              Kiro Batch Login - Batch Mode                     ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝\n'));
      console.log(chalk.yellow(`Starting batch login for ${numAccounts} account(s)...\n`));

      const results = [];

      for (let i = 1; i <= numAccounts; i++) {
        console.log(chalk.cyan.bold(`\n${'='.repeat(70)}`));
        console.log(chalk.cyan.bold(`  Account ${i} of ${numAccounts}`));
        console.log(chalk.cyan.bold(`${'='.repeat(70)}\n`));

        try {
          const config = {
            region: options.region,
            provider: options.provider,
            startUrl: options.startUrl,
            accountName: `account_${i}_${Date.now()}`
          };

          const result = await executeAuthFlow(config);
          results.push({ success: true, account: i, ...result });

          console.log(chalk.green(`✓ Account ${i} authenticated successfully\n`));

          // Wait a bit before next authentication
          if (i < numAccounts) {
            console.log(chalk.yellow(`Waiting 3 seconds before next authentication...\n`));
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        } catch (error) {
          console.error(chalk.red(`✗ Account ${i} failed: ${error.message}\n`));
          results.push({ success: false, account: i, error: error.message });

          const { continueNext } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'continueNext',
              message: 'Continue with next account?',
              default: true
            }
          ]);

          if (!continueNext) {
            break;
          }
        }
      }

      // Summary
      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║                    Batch Login Summary                         ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝\n'));

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(chalk.green(`✓ Successful: ${successful}`));
      console.log(chalk.red(`✗ Failed: ${failed}`));
      console.log(chalk.gray(`Total: ${results.length}\n`));

      if (successful > 0) {
        console.log(chalk.cyan('Saved tokens:'));
        results.filter(r => r.success).forEach(r => {
          console.log(chalk.gray(`  - ${r.filename}`));
        });
        console.log();
      }
    } catch (error) {
      console.error(chalk.red(`\n✗ Batch login failed: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * List command - Show all saved tokens
 */
program
  .command('list')
  .description('List all saved tokens')
  .action(() => {
    try {
      displayTokenList();
    } catch (error) {
      console.error(chalk.red(`\n✗ Error listing tokens: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Show command - Display token details
 */
program
  .command('show')
  .description('Show detailed information about a token')
  .argument('<filename>', 'Token filename')
  .action((filename) => {
    try {
      displayTokenDetails(filename);
    } catch (error) {
      console.error(chalk.red(`\n✗ Error showing token: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Refresh command - Refresh an existing token
 */
program
  .command('refresh')
  .description('Refresh an existing token')
  .argument('<filename>', 'Token filename')
  .action(async (filename) => {
    try {
      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║                    Token Refresh                               ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝\n'));

      const tokenData = readToken(filename);
      await refreshToken(tokenData);
    } catch (error) {
      console.error(chalk.red(`\n✗ Error refreshing token: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Delete command - Delete a token file
 */
program
  .command('delete')
  .description('Delete a token file')
  .argument('<filename>', 'Token filename')
  .action(async (filename) => {
    try {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Are you sure you want to delete ${filename}?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.yellow('\nDeletion cancelled.\n'));
        return;
      }

      const { filepath } = deleteToken(filename);
      console.log(chalk.green(`\n✓ Token deleted: ${filepath}\n`));
    } catch (error) {
      console.error(chalk.red(`\n✗ Error deleting token: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Providers command - List all supported providers
 */
program
  .command('providers')
  .description('List all supported authentication providers')
  .action(() => {
    try {
      const providers = getSupportedProviders();
      console.log(chalk.cyan.bold('\n📋 Supported Authentication Providers:\n'));

      console.log(chalk.white.bold('IdC Providers (AWS SSO OIDC):'));
      console.log(chalk.gray('  • BuilderId - AWS Builder ID'));
      console.log(chalk.gray('  • Enterprise - AWS IAM Identity Center'));
      console.log(chalk.gray('  • Internal - AWS Internal\n'));

      console.log(chalk.white.bold('Social Providers (Kiro Auth Service):'));
      console.log(chalk.gray('  • Google - Google Authentication'));
      console.log(chalk.gray('  • Github - GitHub Authentication\n'));

      console.log(chalk.yellow('Usage examples:'));
      console.log(chalk.gray('  $ kiro-batch-login login --provider BuilderId'));
      console.log(chalk.gray('  $ kiro-batch-login login --provider Google'));
      console.log(chalk.gray('  $ kiro-batch-login login --provider Enterprise --start-url https://mycompany.awsapps.com/start\n'));
    } catch (error) {
      console.error(chalk.red(`\n✗ Error listing providers: ${error.message}\n`));
      process.exit(1);
    }
  });

/**
 * Interactive mode - No command specified
 */
program
  .action(async () => {
    try {
      console.log(chalk.cyan.bold('\n╔════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan.bold('║         Kiro Batch Login - Interactive Mode                    ║'));
      console.log(chalk.cyan.bold('╚════════════════════════════════════════════════════════════════╝\n'));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🔐 Login (Single account)', value: 'login' },
            { name: '🔐🔐 Batch Login (Multiple accounts)', value: 'batch' },
            { name: '📋 List saved tokens', value: 'list' },
            { name: '🔄 Refresh a token', value: 'refresh' },
            { name: '🗑️  Delete a token', value: 'delete' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      if (action === 'exit') {
        console.log(chalk.gray('\nGoodbye!\n'));
        return;
      }

      // Execute the selected action
      const args = ['node', 'src/index.js', action];
      program.parse(args);
    } catch (error) {
      console.error(chalk.red(`\n✗ Error: ${error.message}\n`));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);
