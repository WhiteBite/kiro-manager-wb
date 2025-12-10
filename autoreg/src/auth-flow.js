/**
 * Authentication Flow Manager
 * Orchestrates authentication flow using the provider factory system
 * Supports multiple authentication providers (IdC and Social)
 */

import chalk from 'chalk';
import { createAuthProvider } from './providers/provider-factory.js';
import { saveToken } from './token-manager.js';

/**
 * Execute complete authentication flow
 * Supports all provider types through the provider factory system
 *
 * @param {Object} options - Authentication options
 * @param {string} [options.region='us-east-1'] - AWS region for IdC providers
 * @param {string} [options.provider='BuilderId'] - Provider ID (BuilderId, Enterprise, Google, Github, etc.)
 * @param {string} [options.startUrl=null] - Start URL for IdC providers (required for Enterprise)
 * @param {string} [options.accountName=null] - Optional account name for token identification
 * @returns {Promise<Object>} Authentication result with token data and file info
 */
export async function executeAuthFlow({
  region = 'us-east-1',
  provider = 'BuilderId',
  startUrl = null,
  accountName = null
} = {}) {
  console.log(chalk.cyan.bold('\n🚀 Starting Authentication\n'));
  console.log(chalk.gray(`Provider: ${provider}`));
  console.log(chalk.gray(`Region: ${region}`));

  try {
    // Create appropriate provider using factory
    const authProvider = createAuthProvider(provider, {
      region,
      startUrl
    });

    console.log(chalk.gray(`Auth Method: ${authProvider.getAuthMethod()}\n`));

    // Execute login (provider handles all details)
    const authResult = await authProvider.login();

    // Prepare token data for saving
    const tokenData = {
      ...authResult,
      accountName,
      createdAt: new Date().toISOString()
    };

    // Save token
    console.log(chalk.gray('[AuthFlow] Calling saveToken...'));
    const { filename, filepath } = await saveToken(tokenData);
    console.log(chalk.gray(`[AuthFlow] Token saved: ${filename}`));

    console.log(chalk.green.bold('\n✅ Authentication successful!\n'));
    console.log(`Token saved to: ${filepath}`);

    return {
      success: true,
      tokenData,
      filename,
      filepath
    };
  } catch (error) {
    console.error(chalk.red(`\n✗ Authentication failed: ${error.message}\n`));
    throw error;
  }
}

/**
 * Refresh an existing token
 *
 * @param {Object} tokenData - Existing token data containing refresh token and metadata
 * @returns {Promise<Object>} Refresh result with updated token data and file info
 */
export async function refreshToken(tokenData) {
  console.log(chalk.cyan.bold('\n🔄 Refreshing access token...\n'));

  try {
    // Create provider from saved token data
    const authProvider = createAuthProvider(tokenData.providerId || tokenData.provider, {
      region: tokenData.region,
      startUrl: tokenData.startUrl
    });

    // Prepare metadata for refresh
    const metadata = {
      clientId: tokenData._clientId,
      clientSecret: tokenData._clientSecret,
      region: tokenData.region,
      clientIdHash: tokenData.clientIdHash,
      profileArn: tokenData.profileArn
    };

    // Execute refresh
    const authResult = await authProvider.refreshToken(tokenData.refreshToken, metadata);

    // Merge with existing token data
    const refreshedTokenData = {
      ...tokenData,
      ...authResult,
      refreshedAt: new Date().toISOString()
    };

    const { filename, filepath } = await saveToken(refreshedTokenData);

    console.log(chalk.green('✓ Token refreshed successfully'));
    console.log(chalk.gray(`Token saved to: ${filepath}\n`));

    return {
      success: true,
      tokenData: refreshedTokenData,
      filename,
      filepath
    };
  } catch (error) {
    console.error(chalk.red(`✗ Token refresh failed: ${error.message}\n`));
    throw error;
  }
}
