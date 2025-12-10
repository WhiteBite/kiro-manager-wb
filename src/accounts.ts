/**
 * Account management - loading, switching, refreshing tokens
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import { TokenData, AccountInfo, AccountUsage } from './types';
import { getKiroAuthTokenPath, getTokensDir, loadUsageStats, saveUsageStats, getCachedAccountUsage, saveAccountUsage, KiroUsageData } from './utils';

export function incrementUsage(accountName: string): void {
  const stats = loadUsageStats();
  if (!stats[accountName]) {
    stats[accountName] = { count: 0 };
  }
  stats[accountName].count++;
  stats[accountName].lastUsed = new Date().toISOString();
  saveUsageStats(stats);
}

export function loadAccounts(): AccountInfo[] {
  const tokensDir = getTokensDir();
  const accounts: AccountInfo[] = [];
  const currentToken = getCurrentToken();
  const usageStats = loadUsageStats();

  if (!fs.existsSync(tokensDir)) {
    return accounts;
  }

  const files = fs.readdirSync(tokensDir).filter(f => f.startsWith('token-') && f.endsWith('.json'));

  for (const file of files) {
    try {
      const filepath = path.join(tokensDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const tokenData = JSON.parse(content) as TokenData;
      
      const isExpired = isTokenExpired(tokenData);
      const isActive = currentToken?.refreshToken === tokenData.refreshToken;
      const accountName = tokenData.accountName || file;
      const usageCount = usageStats[accountName]?.count || 0;
      const tokenLimit = usageStats[accountName]?.limit || 500;

      accounts.push({
        filename: file,
        path: filepath,
        tokenData,
        isActive,
        isExpired,
        expiresIn: getExpiresInText(tokenData),
        usageCount,
        tokenLimit,
        usage: undefined // Will be loaded async
      });
    } catch (error) {
      console.error(`Failed to load ${file}:`, error);
    }
  }

  accounts.sort((a, b) => {
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    return (a.tokenData.accountName || '').localeCompare(b.tokenData.accountName || '');
  });

  return accounts;
}

// Load usage for all accounts from cache
export async function loadAccountsWithUsage(): Promise<AccountInfo[]> {
  const accounts = loadAccounts();
  
  // Load cached usage for all accounts
  for (const acc of accounts) {
    const accountName = acc.tokenData.accountName || acc.filename;
    const cached = getCachedAccountUsage(accountName);
    if (cached) {
      acc.usage = {
        currentUsage: cached.currentUsage,
        usageLimit: cached.usageLimit,
        percentageUsed: cached.percentageUsed,
        daysRemaining: cached.daysRemaining
      };
    }
  }
  
  return accounts;
}

// Load usage for a single account from cache
export async function loadSingleAccountUsage(accountName: string): Promise<AccountUsage | null> {
  const cached = getCachedAccountUsage(accountName);
  if (cached) {
    return {
      currentUsage: cached.currentUsage,
      usageLimit: cached.usageLimit,
      percentageUsed: cached.percentageUsed,
      daysRemaining: cached.daysRemaining
    };
  }
  return null;
}

// Update usage cache for active account from Kiro DB
export function updateActiveAccountUsage(accountName: string, usage: KiroUsageData): void {
  saveAccountUsage(accountName, usage);
}

export function getCurrentToken(): TokenData | null {
  const tokenPath = getKiroAuthTokenPath();
  if (!fs.existsSync(tokenPath)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  } catch {
    return null;
  }
}

export function isTokenExpired(tokenData: TokenData): boolean {
  if (!tokenData.expiresAt) return true;
  return new Date(tokenData.expiresAt) <= new Date();
}

export function getExpiresInText(tokenData: TokenData): string {
  if (!tokenData.expiresAt) return '?';
  
  const expiresAt = new Date(tokenData.expiresAt);
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Exp';
  
  const diffMinutes = Math.floor(diffMs / 1000 / 60);
  if (diffMinutes < 60) return `${diffMinutes}m`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  
  return `${Math.floor(diffHours / 24)}d`;
}

function generateClientIdHash(clientId: string): string {
  return crypto.createHash('sha1').update(clientId).digest('hex');
}

export async function switchToAccount(accountName: string): Promise<boolean> {
  const accounts = loadAccounts();
  const account = accounts.find(a => 
    a.tokenData.accountName === accountName || 
    a.filename.includes(accountName)
  );

  if (!account) {
    vscode.window.showErrorMessage(`Account not found: ${accountName}`);
    return false;
  }

  if (account.isExpired) {
    const refreshed = await refreshAccountToken(accountName);
    if (!refreshed) {
      vscode.window.showErrorMessage(`Token expired: ${accountName}`);
      return false;
    }
    account.tokenData = JSON.parse(fs.readFileSync(account.path, 'utf8'));
  }

  const success = await writeKiroToken(account.tokenData);
  if (success) {
    incrementUsage(account.tokenData.accountName || account.filename);
  }
  return success;
}

async function writeKiroToken(tokenData: TokenData): Promise<boolean> {
  const kiroAuthPath = getKiroAuthTokenPath();
  const ssoDir = path.dirname(kiroAuthPath);

  try {
    if (!fs.existsSync(ssoDir)) {
      fs.mkdirSync(ssoDir, { recursive: true });
    }

    if (fs.existsSync(kiroAuthPath)) {
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      fs.copyFileSync(kiroAuthPath, path.join(ssoDir, `kiro-auth-token.backup.${ts}.json`));
    }

    const clientIdHash = tokenData.clientIdHash || 
      (tokenData._clientId ? generateClientIdHash(tokenData._clientId) : '');

    const kiroToken = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      clientIdHash,
      authMethod: tokenData.authMethod || 'IdC',
      provider: tokenData.provider || 'BuilderId',
      region: tokenData.region || 'us-east-1'
    };

    fs.writeFileSync(kiroAuthPath, JSON.stringify(kiroToken, null, 2));
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Switch failed: ${error}`);
    return false;
  }
}

export async function refreshAccountToken(accountName: string): Promise<boolean> {
  const accounts = loadAccounts();
  const account = accounts.find(a => 
    a.tokenData.accountName === accountName || 
    a.filename.includes(accountName)
  );

  if (!account) {
    vscode.window.showErrorMessage(`Not found: ${accountName}`);
    return false;
  }

  const tokenData = account.tokenData;
  
  if (!tokenData.refreshToken || !tokenData._clientId || !tokenData._clientSecret) {
    vscode.window.showErrorMessage('Missing credentials');
    return false;
  }

  try {
    const newTokens = await refreshOIDCToken(
      tokenData.refreshToken,
      tokenData._clientId,
      tokenData._clientSecret,
      tokenData.region || 'us-east-1'
    );

    if (!newTokens) return false;

    const updatedToken = {
      ...tokenData,
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken || tokenData.refreshToken,
      expiresAt: new Date(Date.now() + (newTokens.expiresIn || 3600) * 1000).toISOString(),
      expiresIn: newTokens.expiresIn
    };

    fs.writeFileSync(account.path, JSON.stringify(updatedToken, null, 2));
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Refresh failed: ${error}`);
    return false;
  }
}

function refreshOIDCToken(
  refreshToken: string, 
  clientId: string, 
  clientSecret: string, 
  region: string
): Promise<{accessToken: string; refreshToken?: string; expiresIn: number} | null> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ clientId, clientSecret, grantType: 'refresh_token', refreshToken });

    const req = https.request({
      hostname: `oidc.${region}.amazonaws.com`,
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({ accessToken: json.accessToken, refreshToken: json.refreshToken, expiresIn: json.expiresIn || 3600 });
          } catch { resolve(null); }
        } else {
          console.error('Refresh failed:', res.statusCode, data);
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

export async function refreshAllAccounts(): Promise<void> {
  const accounts = loadAccounts();
  for (const acc of accounts) {
    if (acc.tokenData._clientId && acc.tokenData._clientSecret) {
      await refreshAccountToken(acc.tokenData.accountName || acc.filename);
    }
  }
}

export async function deleteAccount(accountName: string): Promise<boolean> {
  const accounts = loadAccounts();
  const account = accounts.find(a => 
    a.tokenData.accountName === accountName || 
    a.filename.includes(accountName)
  );

  if (!account) {
    vscode.window.showErrorMessage(`Account not found: ${accountName}`);
    return false;
  }

  // Confirm deletion
  const confirm = await vscode.window.showWarningMessage(
    `Delete account "${accountName}"? This will remove the token file.`,
    { modal: true },
    'Delete'
  );

  if (confirm !== 'Delete') {
    return false;
  }

  try {
    // Delete token file
    if (fs.existsSync(account.path)) {
      fs.unlinkSync(account.path);
    }

    // Remove from usage stats
    const stats = loadUsageStats();
    if (stats[accountName]) {
      delete stats[accountName];
      saveUsageStats(stats);
    }

    vscode.window.showInformationMessage(`Account "${accountName}" deleted`);
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete: ${error}`);
    return false;
  }
}
