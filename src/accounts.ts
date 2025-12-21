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
import * as os from 'os';

// ============================================================================
// Machine ID Rotation (Anti-ban)
// ============================================================================
// AWS tracks machineId in telemetry and bans accounts if many use the same ID.
// We rotate machineId on each account switch to prevent this.

const MACHINE_ID_FILE = path.join(os.homedir(), '.kiro-extension', 'machine-id.txt');

/**
 * Generate a new random machineId (64-char hex like node-machine-id)
 */
export function generateMachineId(): string {
  const randomBytes = crypto.randomBytes(32);
  return randomBytes.toString('hex');
}

/**
 * Get current machineId from file
 */
export function getCurrentMachineId(): string | null {
  try {
    if (fs.existsSync(MACHINE_ID_FILE)) {
      return fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim();
    }
  } catch { }
  return null;
}

/**
 * Set machineId to file (used by patched Kiro)
 */
export function setMachineId(machineId: string): boolean {
  try {
    const dir = path.dirname(MACHINE_ID_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MACHINE_ID_FILE, machineId);
    return true;
  } catch (e) {
    console.error('[MachineId] Failed to write:', e);
    return false;
  }
}

/**
 * Rotate machineId - generate new one and save to file.
 * Call this on account switch to prevent AWS from linking accounts.
 */
export function rotateMachineId(): string {
  const newId = generateMachineId();
  setMachineId(newId);
  console.log(`[MachineId] Rotated to: ${newId.substring(0, 16)}...`);
  return newId;
}

/**
 * Get or create machineId for an account.
 * Each account can have its own machineId stored in token file.
 */
export function getAccountMachineId(tokenData: TokenData): string {
  // If account has stored machineId, use it
  if ((tokenData as any)._machineId) {
    return (tokenData as any)._machineId;
  }
  // Otherwise generate new one
  return generateMachineId();
}

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
          loading: false,
          // Load ban status from cache (persisted by markAccountAsBanned)
          isBanned: cached.isBanned,
          banReason: cached.banReason,
          suspended: cached.suspended
        };
      } else if (cached?.isBanned) {
        // Even if stale, preserve ban status - it's important!
        usage = {
          currentUsage: cached.currentUsage ?? -1,
          usageLimit: cached.usageLimit ?? 500,
          percentageUsed: cached.percentageUsed ?? 0,
          daysRemaining: cached.daysRemaining ?? -1,
          loading: false,
          isBanned: true,
          banReason: cached.banReason
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

  // ALWAYS preserve ban status even if stale!
  if (cached?.isBanned) {
    return {
      currentUsage: cached.currentUsage ?? -1,
      usageLimit: cached.usageLimit ?? 500,
      percentageUsed: cached.percentageUsed ?? 0,
      daysRemaining: cached.daysRemaining ?? -1,
      loading: false,
      isBanned: true,
      banReason: cached.banReason,
      suspended: cached.suspended
    };
  }

  if (cached && !cached.stale) {
    return {
      currentUsage: cached.currentUsage,
      usageLimit: cached.usageLimit,
      percentageUsed: cached.percentageUsed,
      daysRemaining: cached.daysRemaining,
      loading: false,
      isBanned: cached.isBanned,
      banReason: cached.banReason,
      suspended: cached.suspended
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

  // ALWAYS try to refresh before switching to verify account is not banned
  // This prevents switching to banned accounts
  const hasCredentials = !!(account.tokenData._clientId && account.tokenData._clientSecret && account.tokenData.refreshToken);

  if (hasCredentials) {
    const refreshResult = await refreshAccountToken(accountName, true);

    if (refreshResult.success) {
      // Refresh succeeded - reload token data and check ban via CodeWhisperer API
      account.tokenData = JSON.parse(fs.readFileSync(account.path, 'utf8'));

      // IMPORTANT: OIDC refresh doesn't detect bans! Check via CodeWhisperer API
      const banCheck = await checkAccountBanViaAPI(
        account.tokenData.accessToken!,
        account.tokenData.region || 'us-east-1'
      );

      if (banCheck.isBanned) {
        vscode.window.showErrorMessage(`⛔ Cannot switch to "${accountName}" - account is BANNED (detected via API)`);
        return fail({
          success: false,
          error: 'AccessDeniedException',
          errorMessage: banCheck.message || 'Account is banned (TEMPORARILY_SUSPENDED)',
          isBanned: true
        });
      }
    } else if (refreshResult.isBanned) {
      // Account is BANNED - do NOT switch to it!
      vscode.window.showErrorMessage(`⛔ Cannot switch to "${accountName}" - account is BANNED`);
      return fail({
        success: false,
        error: refreshResult.error,
        errorMessage: 'Account is banned',
        isBanned: true
      });
    } else if (refreshResult.error === 'InvalidGrantException') {
      // Refresh token expired - account unusable
      vscode.window.showErrorMessage(`🔄 Cannot switch to "${accountName}" - session expired`);
      return fail({
        success: false,
        error: refreshResult.error,
        errorMessage: refreshResult.errorMessage,
        isBanned: false
      });
    } else {
      // Other error (network, rate limit) - try to use existing token if not expired
      const trulyInvalid = isTokenTrulyInvalid(account.tokenData);
      if (trulyInvalid) {
        return fail({
          success: false,
          error: refreshResult.error,
          errorMessage: refreshResult.errorMessage,
          isBanned: refreshResult.isBanned
        });
      }
      // Token might still work - proceed with warning
      console.warn(`[switchToAccount] Refresh failed for ${accountName}, using existing token`);
    }
  }

  // ANTI-BAN: Rotate machineId before switching account
  // This prevents AWS from linking multiple accounts to the same machine
  const accountMachineId = getAccountMachineId(account.tokenData);
  setMachineId(accountMachineId);

  // Store machineId in token for consistency
  if (!(account.tokenData as any)._machineId) {
    (account.tokenData as any)._machineId = accountMachineId;
    fs.writeFileSync(account.path, JSON.stringify(account.tokenData, null, 2));
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

    // Write main token file
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

    // IMPORTANT: Also write client file so Kiro can refresh the token!
    // Kiro looks for {clientIdHash}.json to get clientId and clientSecret
    if (clientIdHash && tokenData._clientId && tokenData._clientSecret) {
      const clientFilePath = path.join(ssoDir, `${clientIdHash}.json`);

      // Calculate client expiration (90 days from now, like Kiro does)
      const clientExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

      const clientData = {
        clientId: tokenData._clientId,
        clientSecret: tokenData._clientSecret,
        expiresAt: tokenData._clientSecretExpiresAt || clientExpiresAt
      };

      fs.writeFileSync(clientFilePath, JSON.stringify(clientData, null, 2));
    }

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
      const msg = result.errorMessage || '';
      const isSessionError = msg.includes('unable to refresh') || msg.includes('session');

      if (result.isBanned) {
        vscode.window.showErrorMessage(`⛔ Account "${accountName}" is BANNED/BLOCKED`);
      } else if (result.isInvalidCredentials) {
        vscode.window.showErrorMessage(`🔑 Invalid credentials for "${accountName}" - client may be expired`);
      } else if (result.isRateLimited) {
        vscode.window.showWarningMessage(`⏳ Rate limited - try again later`);
      } else if (result.error === 'InvalidGrantException' || isSessionError) {
        // "We are unable to refresh your session" = refresh token expired/revoked
        vscode.window.showErrorMessage(`🔄 Session expired for "${accountName}" - account needs re-registration or is banned`);
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
  // "We couldn't process your request due to an account issue" - Kiro's ban message
  if (message?.includes("couldn't process your request")) return true;
  if (message?.includes('account issue')) return true;
  // "We are unable to refresh your session" often means account is banned
  if (message?.includes('unable to refresh') && error === 'InvalidGrantException') return true;
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

// ============================================================================
// CodeWhisperer API Ban Check
// ============================================================================
// Kiro detects bans when making requests to CodeWhisperer API, not during OIDC refresh.
// The API returns AccessDeniedException with reason "TEMPORARILY_SUSPENDED" for banned accounts.
// Endpoint: https://codewhisperer.{region}.amazonaws.com/getUsageLimits (GET with query params)

export interface BanCheckResult {
  isBanned: boolean;
  reason?: string;  // "TEMPORARILY_SUSPENDED", "FEATURE_NOT_SUPPORTED", etc.
  message?: string;
  error?: string;
  usageData?: {
    currentUsage: number;
    usageLimit: number;
    percentageUsed: number;
    resetDate?: string;
  };
}

/**
 * Check if account is banned by calling CodeWhisperer API (like Kiro does).
 * This is the REAL ban check - OIDC refresh doesn't detect bans!
 * 
 * @param accessToken - Valid OIDC access token
 * @param region - AWS region (us-east-1 or eu-central-1)
 * @returns BanCheckResult with ban status and optional usage data
 */
export function checkAccountBanViaAPI(
  accessToken: string,
  region: string = 'us-east-1'
): Promise<BanCheckResult> {
  return new Promise((resolve) => {
    // CORRECT endpoint: codewhisperer.{region}.amazonaws.com (NOT q.{region}.amazonaws.com!)
    const hostname = `codewhisperer.${region}.amazonaws.com`;
    // GET request with query parameters (not POST!)
    const apiPath = '/getUsageLimits?origin=AI_EDITOR&resourceType=AGENTIC_REQUEST';

    const req = https.request({
      hostname,
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'aws-toolkit-vscode/3.0.0',
        'Accept': 'application/json',
        'x-amzn-codewhisperer-optout': 'true'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (res.statusCode === 200) {
            // Success - account is NOT banned, extract usage data
            const limits = json.limits?.[0] || {};
            resolve({
              isBanned: false,
              usageData: {
                currentUsage: limits.currentUsage ?? -1,
                usageLimit: limits.usageLimit ?? 500,
                percentageUsed: limits.currentUsage && limits.usageLimit
                  ? Math.round((limits.currentUsage / limits.usageLimit) * 100)
                  : 0,
                resetDate: limits.nextDateReset
              }
            });
          } else if (res.statusCode === 403) {
            // Check for ban reasons
            const reason = json.reason || '';
            const message = json.message || json.Message || '';

            if (reason === 'TEMPORARILY_SUSPENDED') {
              // BANNED!
              console.error(`[BanCheck] Account is BANNED: ${message}`);
              resolve({
                isBanned: true,
                reason: 'TEMPORARILY_SUSPENDED',
                message: message || 'Account is temporarily suspended'
              });
            } else if (reason === 'FEATURE_NOT_SUPPORTED') {
              // Not banned, just feature not available
              resolve({
                isBanned: false,
                reason: 'FEATURE_NOT_SUPPORTED',
                message: 'Usage limits feature not supported for this account'
              });
            } else if (message.includes('invalid')) {
              // Token invalid - might be expired
              resolve({
                isBanned: false,
                error: 'InvalidToken',
                message: message
              });
            } else {
              // Other 403 - might be banned
              console.warn(`[BanCheck] 403 with reason: ${reason}, message: ${message}`);
              resolve({
                isBanned: reason.includes('SUSPENDED') || message.toLowerCase().includes('suspend'),
                reason,
                message,
                error: 'AccessDeniedException'
              });
            }
          } else {
            // Other error
            console.error(`[BanCheck] HTTP ${res.statusCode}: ${data}`);
            resolve({
              isBanned: false,
              error: `HTTP ${res.statusCode}`,
              message: json.message || json.Message || data
            });
          }
        } catch (parseError) {
          console.error(`[BanCheck] Parse error: ${parseError}`);
          resolve({
            isBanned: false,
            error: 'ParseError',
            message: data
          });
        }
      });
    });

    req.on('error', (err) => {
      console.error('[BanCheck] Network error:', err.message);
      resolve({
        isBanned: false,
        error: 'NetworkError',
        message: err.message
      });
    });

    // Timeout after 10 seconds
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        isBanned: false,
        error: 'Timeout',
        message: 'Request timed out'
      });
    });

    req.end();
  });
}

/**
 * Full account health check including ban detection via CodeWhisperer API.
 * This is more thorough than checkAccountHealth() which only checks OIDC.
 * 
 * @param accountName - Account name or filename
 * @returns Extended health status with ban info from API
 */
export async function checkAccountBanStatus(accountName: string): Promise<AccountHealthStatus & { apiCheckDone: boolean }> {
  // First do basic health check (OIDC refresh)
  const basicHealth = await checkAccountHealth(accountName);

  if (!basicHealth.isHealthy || basicHealth.isBanned) {
    // Already unhealthy or banned via OIDC - no need for API check
    return { ...basicHealth, apiCheckDone: false };
  }

  // Account passed OIDC check - now check via CodeWhisperer API
  const accounts = loadAccounts();
  const account = accounts.find(a =>
    a.tokenData.accountName === accountName ||
    a.filename.includes(accountName)
  );

  if (!account?.tokenData.accessToken) {
    return { ...basicHealth, apiCheckDone: false };
  }

  const banCheck = await checkAccountBanViaAPI(
    account.tokenData.accessToken,
    account.tokenData.region || 'us-east-1'
  );

  if (banCheck.isBanned) {
    return {
      ...basicHealth,
      isHealthy: false,
      isBanned: true,
      error: 'AccessDeniedException',
      errorMessage: banCheck.message || 'Account is banned (TEMPORARILY_SUSPENDED)',
      apiCheckDone: true
    };
  }

  return { ...basicHealth, apiCheckDone: true };
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
