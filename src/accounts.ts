/**
 * Account management - loading, switching, refreshing tokens
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import { TokenData, AccountInfo, AccountUsage } from './types';
import { getKiroAuthTokenPath, getTokensDir, loadUsageStats, saveUsageStats, getCachedAccountUsage, saveAccountUsage, KiroUsageData, getAllCachedUsage, isUsageStale, invalidateAccountUsage } from './utils';

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
  const allUsage = getAllCachedUsage(); // Load all cached usage at once

  if (!fs.existsSync(tokensDir)) {
    return accounts;
  }

  const files = fs.readdirSync(tokensDir).filter(f => f.startsWith('token-') && f.endsWith('.json'));

  for (const file of files) {
    try {
      const filepath = path.join(tokensDir, file);
      const content = fs.readFileSync(filepath, 'utf8');
      const tokenData = JSON.parse(content) as TokenData;

      const isExpired = isTokenExpired(tokenData); // Basic check (no offset)
      const needsRefresh = tokenNeedsRefresh(tokenData); // Expires within 10 min
      const isActive = currentToken?.refreshToken === tokenData.refreshToken;
      const accountName = tokenData.accountName || file;
      const usageCount = usageStats[accountName]?.count || 0;
      const tokenLimit = usageStats[accountName]?.limit || 500;

      // Load cached usage or create default for new accounts
      const cached = allUsage[accountName];
      let usage: AccountUsage | undefined;

      if (cached && !cached.stale) {
        usage = {
          currentUsage: cached.currentUsage,
          usageLimit: cached.usageLimit,
          percentageUsed: cached.percentageUsed,
          daysRemaining: cached.daysRemaining,
          loading: false
        };
      } else {
        // For accounts without cached data, show as "unknown" (not loading)
        // This indicates data needs to be fetched when account becomes active
        usage = {
          currentUsage: -1, // -1 indicates unknown
          usageLimit: 500,
          percentageUsed: 0,
          daysRemaining: -1,
          loading: false
        };
      }

      accounts.push({
        filename: file,
        path: filepath,
        tokenData,
        isActive,
        isExpired,
        needsRefresh,
        expiresIn: getExpiresInText(tokenData),
        usageCount,
        tokenLimit,
        usage
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

// Load usage for all accounts from cache (now integrated into loadAccounts)
export async function loadAccountsWithUsage(): Promise<AccountInfo[]> {
  // loadAccounts now includes usage data by default
  return loadAccounts();
}

// Load usage for a single account from cache
export async function loadSingleAccountUsage(accountName: string): Promise<AccountUsage | null> {
  const cached = getCachedAccountUsage(accountName);
  if (cached && !cached.stale) {
    return {
      currentUsage: cached.currentUsage,
      usageLimit: cached.usageLimit,
      percentageUsed: cached.percentageUsed,
      daysRemaining: cached.daysRemaining,
      loading: false
    };
  }
  // Return unknown state instead of null
  return {
    currentUsage: -1,
    usageLimit: 500,
    percentageUsed: 0,
    daysRemaining: -1,
    loading: false
  };
}

// Invalidate usage for an account (call before switching)
export function markUsageStale(accountName: string): void {
  invalidateAccountUsage(accountName);
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

// Timing constants (from Kiro source, lines 156831-156833)
export const AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS = 3 * 60;   // 3 min - token considered invalid
export const REFRESH_BEFORE_EXPIRY_SECONDS = 10 * 60;           // 10 min - start refresh early
export const REFRESH_LOOP_INTERVAL_SECONDS = 60;                // 1 min - check interval

// Check if token is expired (with optional offset like Kiro)
export function isTokenExpired(tokenData: TokenData, offsetSeconds: number = 0): boolean {
  if (!tokenData.expiresAt) return true;
  const expiresAt = new Date(tokenData.expiresAt).getTime();
  const now = Date.now();
  return expiresAt <= now + (offsetSeconds * 1000);
}

// Check if token needs refresh (expires within 10 minutes - like Kiro)
export function tokenNeedsRefresh(tokenData: TokenData): boolean {
  return isTokenExpired(tokenData, REFRESH_BEFORE_EXPIRY_SECONDS);
}

// Check if token is truly invalid (expired + 3 min grace period passed)
export function isTokenTrulyInvalid(tokenData: TokenData): boolean {
  if (!tokenData.expiresAt) return true;
  const expiresAt = new Date(tokenData.expiresAt).getTime();
  const now = Date.now();
  // Token is truly invalid only if it expired MORE than 3 minutes ago
  return now > expiresAt + (AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS * 1000);
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

export interface SwitchAccountResult {
  success: boolean;
  error?: OIDCErrorType;
  errorMessage?: string;
  isBanned?: boolean;
}

export async function switchToAccount(accountName: string): Promise<boolean>;
export async function switchToAccount(accountName: string, returnDetails: true): Promise<SwitchAccountResult>;
export async function switchToAccount(accountName: string, returnDetails?: boolean): Promise<boolean | SwitchAccountResult> {
  const accounts = loadAccounts();
  const account = accounts.find(a =>
    a.tokenData.accountName === accountName ||
    a.filename.includes(accountName)
  );

  const fail = (result: SwitchAccountResult) => returnDetails ? result : false;
  const ok = () => returnDetails ? { success: true } : true;

  if (!account) {
    vscode.window.showErrorMessage(`Account not found: ${accountName}`);
    return fail({ success: false, errorMessage: 'Account not found' });
  }

  // Smart refresh logic (like Kiro):
  // 1. If token needs refresh (expires within 10 min) - try to refresh
  // 2. If refresh fails but token is not truly invalid (within 3 min grace) - still use it
  // 3. Only fail if token is truly invalid AND refresh failed

  const needsRefresh = tokenNeedsRefresh(account.tokenData);
  const trulyInvalid = isTokenTrulyInvalid(account.tokenData);

  if (needsRefresh) {
    // Try to refresh proactively
    const refreshResult = await refreshAccountToken(accountName, true);

    if (refreshResult.success) {
      // Refresh succeeded - reload token data
      account.tokenData = JSON.parse(fs.readFileSync(account.path, 'utf8'));
    } else if (trulyInvalid) {
      // Refresh failed AND token is truly invalid (past 3 min grace period)
      // Cannot proceed - return error
      return fail({
        success: false,
        error: refreshResult.error,
        errorMessage: refreshResult.errorMessage,
        isBanned: refreshResult.isBanned
      });
    } else {
      // Refresh failed BUT token might still work (within grace period)
      // Log warning but proceed with existing token
      console.warn(`[switchToAccount] Refresh failed for ${accountName}, but token may still be valid (grace period)`);
    }
  }

  const success = await writeKiroToken(account.tokenData);
  if (success) {
    incrementUsage(account.tokenData.accountName || account.filename);
  }
  return success ? ok() : fail({ success: false, errorMessage: 'Failed to write token' });
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

export interface RefreshAccountResult {
  success: boolean;
  error?: OIDCErrorType;
  errorMessage?: string;
  isBanned?: boolean;
  isInvalidCredentials?: boolean;
}

export async function refreshAccountToken(accountName: string): Promise<boolean>;
export async function refreshAccountToken(accountName: string, returnDetails: true): Promise<RefreshAccountResult>;
export async function refreshAccountToken(accountName: string, returnDetails?: boolean): Promise<boolean | RefreshAccountResult> {
  const accounts = loadAccounts();
  const account = accounts.find(a =>
    a.tokenData.accountName === accountName ||
    a.filename.includes(accountName)
  );

  const fail = (result: RefreshAccountResult) => returnDetails ? result : false;
  const ok = () => returnDetails ? { success: true } : true;

  if (!account) {
    vscode.window.showErrorMessage(`Not found: ${accountName}`);
    return fail({ success: false, error: 'UnknownError', errorMessage: 'Account not found' });
  }

  const tokenData = account.tokenData;

  if (!tokenData.refreshToken || !tokenData._clientId || !tokenData._clientSecret) {
    vscode.window.showErrorMessage('Missing credentials (no clientId/clientSecret)');
    return fail({ success: false, error: 'InvalidClientException', errorMessage: 'Missing credentials', isInvalidCredentials: true });
  }

  try {
    const result = await refreshOIDCToken(
      tokenData.refreshToken,
      tokenData._clientId,
      tokenData._clientSecret,
      tokenData.region || 'us-east-1'
    );

    if (!result.success) {
      // Show specific error messages based on error type
      if (result.isBanned) {
        vscode.window.showErrorMessage(`⛔ Account "${accountName}" is BANNED/BLOCKED`);
      } else if (result.isInvalidCredentials) {
        vscode.window.showErrorMessage(`🔑 Invalid credentials for "${accountName}" - client may be expired`);
      } else if (result.isRateLimited) {
        vscode.window.showWarningMessage(`⏳ Rate limited - try again later`);
      } else if (result.error === 'InvalidGrantException') {
        vscode.window.showErrorMessage(`🔄 Refresh token expired for "${accountName}" - need to re-login`);
      } else if (result.error === 'NetworkError') {
        vscode.window.showErrorMessage(`🌐 Network error - check internet connection`);
      } else {
        vscode.window.showErrorMessage(`Refresh failed: ${result.errorMessage || result.error}`);
      }

      return fail({
        success: false,
        error: result.error,
        errorMessage: result.errorMessage,
        isBanned: result.isBanned,
        isInvalidCredentials: result.isInvalidCredentials
      });
    }

    const updatedToken = {
      ...tokenData,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || tokenData.refreshToken,
      expiresAt: new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
      expiresIn: result.expiresIn
    };

    fs.writeFileSync(account.path, JSON.stringify(updatedToken, null, 2));
    return ok();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Refresh failed: ${msg}`);
    return fail({ success: false, error: 'UnknownError', errorMessage: msg });
  }
}

// SSO OIDC Error types (from Kiro source)
export interface OIDCError {
  error?: string;
  error_description?: string;
  message?: string;
}

export type OIDCErrorType =
  | 'InvalidGrantException'      // Refresh token invalid/expired
  | 'AccessDeniedException'      // Account blocked/banned
  | 'ExpiredTokenException'      // Token expired
  | 'InvalidClientException'     // Client credentials invalid
  | 'UnauthorizedClientException' // Client not authorized
  | 'InvalidRequestException'    // Malformed request
  | 'SlowDownException'          // Rate limited
  | 'AuthorizationPendingException' // Device auth pending
  | 'InternalServerException'    // AWS internal error
  | 'NetworkError'               // Network connectivity issue
  | 'UnknownError';              // Unknown error

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: OIDCErrorType;
  errorMessage?: string;
  isBanned?: boolean;           // Account is banned/blocked
  isInvalidCredentials?: boolean; // Client credentials are invalid
  isRateLimited?: boolean;      // Rate limited, should retry later
}

// Check if error indicates account is banned/blocked (like Kiro's isBlockedAccessError)
export function isBlockedAccessError(error: OIDCErrorType | undefined, message?: string): boolean {
  if (error === 'AccessDeniedException') return true;
  if (message?.includes('Kiro access not available')) return true;
  if (message?.includes('NewUserAccessPausedError')) return true;
  if (message?.includes('account is blocked')) return true;
  if (message?.includes('account is suspended')) return true;
  return false;
}

// Check if error indicates bad auth (like Kiro's isBadAuthIssue)
export function isBadAuthIssue(error: OIDCErrorType | undefined): boolean {
  const badAuthErrors: OIDCErrorType[] = [
    'InvalidGrantException',
    'ExpiredTokenException',
    'InvalidClientException',
    'UnauthorizedClientException'
  ];
  return error !== undefined && badAuthErrors.includes(error);
}

// Parse AWS OIDC error response
function parseOIDCError(statusCode: number, data: string): { error: OIDCErrorType; message: string } {
  try {
    const json = JSON.parse(data) as OIDCError;
    const errorType = json.error as OIDCErrorType || 'UnknownError';
    const message = json.error_description || json.message || data;
    return { error: errorType, message };
  } catch {
    // Non-JSON response
    if (statusCode === 400) return { error: 'InvalidRequestException', message: data };
    if (statusCode === 401) return { error: 'InvalidClientException', message: data };
    if (statusCode === 403) return { error: 'AccessDeniedException', message: data };
    if (statusCode === 429) return { error: 'SlowDownException', message: data };
    if (statusCode >= 500) return { error: 'InternalServerException', message: data };
    return { error: 'UnknownError', message: data };
  }
}

function refreshOIDCToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
  region: string
): Promise<RefreshResult> {
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
            resolve({
              success: true,
              accessToken: json.accessToken,
              refreshToken: json.refreshToken,
              expiresIn: json.expiresIn || 3600
            });
          } catch {
            resolve({ success: false, error: 'UnknownError', errorMessage: 'Failed to parse response' });
          }
        } else {
          const { error, message } = parseOIDCError(res.statusCode || 0, data);
          console.error(`[OIDC Refresh] ${error}: ${message}`);

          resolve({
            success: false,
            error,
            errorMessage: message,
            isBanned: isBlockedAccessError(error, message),
            isInvalidCredentials: error === 'InvalidClientException' || error === 'UnauthorizedClientException',
            isRateLimited: error === 'SlowDownException'
          });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[OIDC Refresh] Network error:', err.message);
      resolve({ success: false, error: 'NetworkError', errorMessage: err.message });
    });

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

export async function deleteAccount(accountName: string, skipConfirm: boolean = true): Promise<boolean> {
  const accounts = loadAccounts();

  // Better account matching - try multiple strategies
  const account = accounts.find(a =>
    a.filename === accountName ||
    a.tokenData.accountName === accountName ||
    a.tokenData.email === accountName ||
    a.filename.includes(accountName) ||
    (a.tokenData.email && accountName.includes(a.tokenData.email.split('@')[0]))
  );

  if (!account) {
    vscode.window.showErrorMessage(`Account not found: ${accountName}`);
    return false;
  }

  // Skip confirmation if already confirmed in webview
  if (!skipConfirm) {
    const confirm = await vscode.window.showWarningMessage(
      `Delete account "${accountName}"? This will remove the token file.`,
      { modal: true },
      'Delete'
    );
    if (confirm !== 'Delete') {
      return false;
    }
  }

  try {
    // Delete token file
    if (fs.existsSync(account.path)) {
      fs.unlinkSync(account.path);
    }

    // Remove from usage stats
    const stats = loadUsageStats();
    const accName = account.tokenData.accountName || account.tokenData.email || accountName;
    if (stats[accName]) {
      delete stats[accName];
      saveUsageStats(stats);
    }

    // Also try to clean up by email
    if (account.tokenData.email && stats[account.tokenData.email]) {
      delete stats[account.tokenData.email];
      saveUsageStats(stats);
    }

    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete: ${error}`);
    return false;
  }
}

// Check account health status by attempting a token refresh
export interface AccountHealthStatus {
  accountName: string;
  isHealthy: boolean;
  isBanned: boolean;
  isExpired: boolean;
  hasCredentials: boolean;
  error?: OIDCErrorType;
  errorMessage?: string;
}

export async function checkAccountHealth(accountName: string): Promise<AccountHealthStatus> {
  const accounts = loadAccounts();
  const account = accounts.find(a =>
    a.tokenData.accountName === accountName ||
    a.filename.includes(accountName)
  );

  if (!account) {
    return {
      accountName,
      isHealthy: false,
      isBanned: false,
      isExpired: false,
      hasCredentials: false,
      errorMessage: 'Account not found'
    };
  }

  const hasCredentials = !!(account.tokenData._clientId && account.tokenData._clientSecret && account.tokenData.refreshToken);

  if (!hasCredentials) {
    return {
      accountName,
      isHealthy: false,
      isBanned: false,
      isExpired: account.isExpired,
      hasCredentials: false,
      errorMessage: 'Missing credentials (clientId/clientSecret)'
    };
  }

  // Try to refresh to check if account is healthy
  const result = await refreshOIDCToken(
    account.tokenData.refreshToken!,
    account.tokenData._clientId!,
    account.tokenData._clientSecret!,
    account.tokenData.region || 'us-east-1'
  );

  if (result.success) {
    // Update token with new values
    const updatedToken = {
      ...account.tokenData,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken || account.tokenData.refreshToken,
      expiresAt: new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
      expiresIn: result.expiresIn
    };
    fs.writeFileSync(account.path, JSON.stringify(updatedToken, null, 2));

    return {
      accountName,
      isHealthy: true,
      isBanned: false,
      isExpired: false,
      hasCredentials: true
    };
  }

  return {
    accountName,
    isHealthy: false,
    isBanned: result.isBanned || false,
    isExpired: result.error === 'InvalidGrantException' || result.error === 'ExpiredTokenException',
    hasCredentials: true,
    error: result.error,
    errorMessage: result.errorMessage
  };
}

// Check health of all accounts
export async function checkAllAccountsHealth(): Promise<AccountHealthStatus[]> {
  const accounts = loadAccounts();
  const results: AccountHealthStatus[] = [];

  for (const acc of accounts) {
    const name = acc.tokenData.accountName || acc.filename;
    const status = await checkAccountHealth(name);
    results.push(status);
  }

  return results;
}
