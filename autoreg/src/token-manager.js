/**
 * Token Manager
 * Handles token storage and management
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import os from 'os';

// Token storage directory - use ~/.kiro-batch-login/tokens for cross-platform compatibility
const TOKENS_DIR = process.env.TOKENS_DIR || path.join(os.homedir(), '.kiro-batch-login', 'tokens');

/**
 * Ensure tokens directory exists
 */
function ensureTokensDir() {
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
  }
}

/**
 * Validate token data based on authMethod
 */
function validateTokenData(tokenData) {
  const errors = [];

  // Common required fields
  if (!tokenData.accessToken) errors.push('accessToken is required');
  if (!tokenData.expiresAt) errors.push('expiresAt is required');
  if (!tokenData.provider) errors.push('provider is required');
  if (!tokenData.authMethod) errors.push('authMethod is required');

  // AuthMethod-specific validation
  if (tokenData.authMethod === 'IdC') {
    if (!tokenData.region) errors.push('region is required for IdC tokens');
    if (!tokenData.clientIdHash) errors.push('clientIdHash is required for IdC tokens');
  } else if (tokenData.authMethod === 'social') {
    if (!tokenData.profileArn) errors.push('profileArn is required for social tokens');
  }

  return errors;
}

/**
 * Generate token filename
 */
function generateTokenFilename(tokenData) {
  const timestamp = Date.now();
  const provider = tokenData.provider || 'unknown';
  const authMethod = tokenData.authMethod || 'unknown';
  const accountName = tokenData.accountName || `account_${timestamp}`;

  // Sanitize account name for filename
  const sanitized = accountName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

  return `token-${provider}-${authMethod}-${sanitized}-${timestamp}.json`;
}

/**
 * Save token to file
 */
export async function saveToken(tokenData) {
  console.log(chalk.gray('[TokenManager] Saving token...'));
  console.log(chalk.gray(`[TokenManager] TOKENS_DIR: ${TOKENS_DIR}`));
  
  ensureTokensDir();

  // Validate token data
  const validationErrors = validateTokenData(tokenData);
  if (validationErrors.length > 0) {
    console.log(chalk.red(`[TokenManager] Validation failed: ${validationErrors.join(', ')}`));
    throw new Error(`Token validation failed: ${validationErrors.join(', ')}`);
  }

  const filename = generateTokenFilename(tokenData);
  const filepath = path.join(TOKENS_DIR, filename);

  // Prepare data to save with all required fields
  const dataToSave = {
    ...tokenData,
    savedAt: new Date().toISOString(),
    version: '1.0',
    authMethod: tokenData.authMethod,
    providerId: tokenData.provider
  };

  // Ensure provider-specific fields are preserved
  if (tokenData.authMethod === 'IdC') {
    dataToSave.clientIdHash = tokenData.clientIdHash;
    dataToSave.region = tokenData.region;
    if (tokenData._clientId) dataToSave._clientId = tokenData._clientId;
    if (tokenData._clientSecret) dataToSave._clientSecret = tokenData._clientSecret;
  } else if (tokenData.authMethod === 'social') {
    dataToSave.profileArn = tokenData.profileArn;
  }

  fs.writeFileSync(filepath, JSON.stringify(dataToSave, null, 2), 'utf8');

  return { filename, filepath };
}

/**
 * List all saved tokens
 */
export function listTokens() {
  ensureTokensDir();

  const files = fs.readdirSync(TOKENS_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const filepath = path.join(TOKENS_DIR, file);
      const stats = fs.statSync(filepath);

      try {
        const content = fs.readFileSync(filepath, 'utf8');
        const tokenData = JSON.parse(content);

        return {
          filename: file,
          filepath,
          tokenData,
          size: stats.size,
          modified: stats.mtime
        };
      } catch (error) {
        return {
          filename: file,
          filepath,
          error: 'Failed to parse token file',
          size: stats.size,
          modified: stats.mtime
        };
      }
    });

  return files;
}

/**
 * Read a specific token file
 */
export function readToken(filename) {
  const filepath = path.join(TOKENS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Token file not found: ${filename}`);
  }

  const content = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(content);
}

/**
 * Delete a token file
 */
export function deleteToken(filename) {
  const filepath = path.join(TOKENS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Token file not found: ${filename}`);
  }

  fs.unlinkSync(filepath);
  return { filename, filepath };
}

/**
 * Check if token is expired
 */
export function isTokenExpired(tokenData) {
  if (!tokenData.expiresAt) {
    return true;
  }

  const expiresAt = new Date(tokenData.expiresAt);
  const now = new Date();

  return expiresAt <= now;
}

/**
 * Get token expiration status
 */
export function getTokenStatus(tokenData) {
  if (!tokenData.expiresAt) {
    return { status: 'unknown', message: 'No expiration info' };
  }

  const expiresAt = new Date(tokenData.expiresAt);
  const now = new Date();
  const diffMs = expiresAt - now;
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  if (diffMs <= 0) {
    return { status: 'expired', message: 'Expired', color: 'red' };
  } else if (diffMinutes < 5) {
    return { status: 'expiring', message: `Expires in ${diffMinutes} minutes`, color: 'yellow' };
  } else {
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 1) {
      return { status: 'valid', message: `Expires in ${diffMinutes} minutes`, color: 'green' };
    } else {
      return { status: 'valid', message: `Expires in ${diffHours} hours`, color: 'green' };
    }
  }
}

/**
 * Display token list in formatted table
 */
export function displayTokenList() {
  const tokens = listTokens();

  if (tokens.length === 0) {
    console.log(chalk.yellow('\nNo tokens found.\n'));
    return;
  }

  console.log(chalk.cyan.bold(`\n📋 Saved Tokens (${tokens.length} total)\n`));

  tokens.forEach((token, index) => {
    if (token.error) {
      console.log(chalk.red(`${index + 1}. ${token.filename} - ${token.error}`));
      return;
    }

    const status = getTokenStatus(token.tokenData);
    const statusColor = status.color === 'red' ? chalk.red :
                       status.color === 'yellow' ? chalk.yellow :
                       chalk.green;

    console.log(chalk.white.bold(`${index + 1}. ${token.filename}`));
    console.log(chalk.gray(`   Provider: ${token.tokenData.provider || 'Unknown'}`));
    console.log(chalk.gray(`   Auth Method: ${token.tokenData.authMethod || 'Unknown'}`));
    console.log(chalk.gray(`   Region: ${token.tokenData.region || 'N/A'}`));
    if (token.tokenData.accountName) {
      console.log(chalk.gray(`   Account: ${token.tokenData.accountName}`));
    }
    console.log(chalk.gray(`   Created: ${token.tokenData.createdAt || 'Unknown'}`));
    console.log(statusColor(`   Status: ${status.message}`));
    console.log();
  });
}

/**
 * Display detailed token information
 */
export function displayTokenDetails(filename) {
  try {
    const tokenData = readToken(filename);
    const status = getTokenStatus(tokenData);
    const statusColor = status.color === 'red' ? chalk.red :
                       status.color === 'yellow' ? chalk.yellow :
                       chalk.green;

    console.log(chalk.cyan.bold(`\n📄 Token Details: ${filename}\n`));
    console.log(chalk.white('Provider Information:'));
    console.log(chalk.gray(`  Provider: ${tokenData.provider || 'Unknown'}`));
    console.log(chalk.gray(`  Auth Method: ${tokenData.authMethod || 'Unknown'}`));
    console.log(chalk.gray(`  Region: ${tokenData.region || 'N/A'}`));
    if (tokenData.startUrl) {
      console.log(chalk.gray(`  Start URL: ${tokenData.startUrl}`));
    }
    if (tokenData.accountName) {
      console.log(chalk.gray(`  Account: ${tokenData.accountName}`));
    }
    if (tokenData.profileArn) {
      console.log(chalk.gray(`  Profile ARN: ${tokenData.profileArn}`));
    }
    if (tokenData.clientIdHash) {
      console.log(chalk.gray(`  Client ID Hash: ${tokenData.clientIdHash}`));
    }
    console.log();

    console.log(chalk.white('Token Information:'));
    console.log(chalk.gray(`  Token Type: ${tokenData.tokenType || 'Unknown'}`));
    console.log(chalk.gray(`  Access Token: ${tokenData.accessToken ? tokenData.accessToken.substring(0, 30) + '...' : 'N/A'}`));
    console.log(chalk.gray(`  Refresh Token: ${tokenData.refreshToken ? 'Available' : 'N/A'}`));
    console.log(chalk.gray(`  ID Token: ${tokenData.idToken ? 'Available' : 'N/A'}`));
    console.log();

    console.log(chalk.white('Expiration:'));
    console.log(chalk.gray(`  Created At: ${tokenData.createdAt || 'Unknown'}`));
    console.log(chalk.gray(`  Expires At: ${tokenData.expiresAt || 'Unknown'}`));
    console.log(chalk.gray(`  Expires In: ${tokenData.expiresIn || 'Unknown'} seconds`));
    console.log(statusColor(`  Status: ${status.message}`));
    console.log();

    if (tokenData.clientId) {
      console.log(chalk.white('Client Information:'));
      console.log(chalk.gray(`  Client ID: ${tokenData.clientId.substring(0, 30)}...`));
      console.log(chalk.gray(`  Client Secret Expires: ${tokenData.clientSecretExpiresAt || 'Unknown'}`));
      console.log();
    }
  } catch (error) {
    console.error(chalk.red(`\n✗ Error reading token: ${error.message}\n`));
  }
}
