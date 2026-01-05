/**
 * Account Service - Centralized state management for all accounts.
 * This singleton is the single source of truth for account data.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as https from 'https';
import * as os from 'os';
import { AccountInfo, TokenData, AccountUsage, UsageStats, RefreshResult, OIDCErrorType, SwitchAccountResult, OIDCError, BanCheckResult, AccountHealthStatus } from '../types';
import { getTokensDir, getKiroAuthTokenPath, loadUsageStats, saveUsageStats, getAllCachedUsage, invalidateAccountUsage } from '../utils';

// Constants moved from accounts.ts
const AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS = 3 * 60;
const REFRESH_BEFORE_EXPIRY_SECONDS = 10 * 60;
const MACHINE_ID_FILE = path.join(os.homedir(), '.kiro-manager-wb', 'machine-id.txt');

export class AccountService {
    private static _instance: AccountService;
    private _accounts: AccountInfo[] = [];

    private _onDidAccountsChange = new vscode.EventEmitter<void>();
    public readonly onDidAccountsChange = this._onDidAccountsChange.event;

    private constructor() {
        this.loadAccounts();
    }

    public static getInstance(): AccountService {
        if (!AccountService._instance) {
            AccountService._instance = new AccountService();
        }
        return AccountService._instance;
    }

    // =======================================================================
    // Public Getters
    // =======================================================================

    public getAccounts(): AccountInfo[] {
        return this._accounts;
    }

    public getActiveAccount(): AccountInfo | undefined {
        return this._accounts.find(a => a.isActive);
    }

    public getAccountByFilename(filename: string): AccountInfo | undefined {
        return this._accounts.find(a => a.filename === filename);
    }

    // =======================================================================
    // Public Actions
    // =======================================================================

    /**
     * Force a reload of all accounts from disk.
     */
    public loadAccounts(): void {
        const tokensDir = getTokensDir();
        const accounts: AccountInfo[] = [];
        const currentToken = this._getCurrentToken();
        const usageStats = loadUsageStats();
        const allUsage = getAllCachedUsage();

        if (fs.existsSync(tokensDir)) {
            const files = fs.readdirSync(tokensDir).filter(f => f.startsWith('token-') && f.endsWith('.json'));
            for (const file of files) {
                try {
                    const filepath = path.join(tokensDir, file);
                    const stats = fs.statSync(filepath);
                    const content = fs.readFileSync(filepath, 'utf8');
                    const tokenData = JSON.parse(content) as TokenData;
                    const isActive = currentToken?.refreshToken === tokenData.refreshToken;
                    const statsKey = this._getUsageStatsKey(tokenData, file, usageStats);
                    const candidates = this._getUsageCacheCandidates(tokenData, file);
                    const cached = candidates.map((k: string) => allUsage[k]).find(Boolean);

                    let usage: AccountUsage | undefined;
                    if (cached) {
                        // If cache is stale, we still want to preserve ban/suspend flags so UI doesn't
                        // show banned accounts as "normal" again.
                        const isStale = cached.stale === true;
                        usage = {
                            currentUsage: isStale ? -1 : (cached.currentUsage ?? -1),
                            usageLimit: cached.usageLimit ?? 500,
                            percentageUsed: isStale ? 0 : (cached.percentageUsed ?? 0),
                            daysRemaining: isStale ? -1 : (cached.daysRemaining ?? -1),
                            loading: false,
                            suspended: cached.suspended,
                            isBanned: cached.isBanned,
                            banReason: cached.banReason
                        };
                    }

                    accounts.push({
                        filename: file,
                        path: filepath,
                        tokenData,
                        isActive,
                        isExpired: this._isTokenExpired(tokenData),
                        needsRefresh: this._tokenNeedsRefresh(tokenData),
                        expiresIn: this._getExpiresInText(tokenData),
                        usageCount: usageStats[statsKey]?.count || 0,
                        tokenLimit: usageStats[statsKey]?.limit || 500,
                        usage,
                        createdAt: (stats.birthtime || stats.mtime).toISOString()
                    });
                } catch (error) {
                    console.error(`Failed to load ${file}:`, error);
                }
            }
        }

        accounts.sort((a, b) => {
            if (a.isActive) return -1;
            if (b.isActive) return 1;
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        this._accounts = accounts;
        this._onDidAccountsChange.fire();
    }

    public async switchToAccount(filename: string): Promise<SwitchAccountResult> {
        const account = this.getAccountByFilename(filename);
        if (!account) {
            return { success: false, errorMessage: 'Account not found' };
        }

        const refreshResult = await this.refreshAccountToken(filename);
        if (!refreshResult.success) {
            return { success: false, error: refreshResult.error, errorMessage: refreshResult.errorMessage, isBanned: refreshResult.isBanned };
        }

        const refreshedAccount = this.getAccountByFilename(filename); // Re-get account data after refresh
        if (!refreshedAccount) {
            return { success: false, errorMessage: 'Refreshed account not found' };
        }

        const success = await this._writeKiroToken(refreshedAccount.tokenData);
        if (success) {
            this._incrementUsage(filename);
        }
        
        this.loadAccounts(); // Reload all accounts to update active state
        return { success };
    }

    public async refreshAccountToken(filename: string): Promise<RefreshResult> {
        const account = this.getAccountByFilename(filename);
        if (!account) {
            return { success: false, error: 'UnknownError', errorMessage: 'Account not found' };
        }

        const { tokenData } = account;
        if (!tokenData.refreshToken || !tokenData._clientId || !tokenData._clientSecret) {
            return { success: false, error: 'InvalidClientException', errorMessage: 'Missing credentials', isInvalidCredentials: true };
        }

        const result = await this._refreshOIDCToken(tokenData.refreshToken, tokenData._clientId, tokenData._clientSecret, tokenData.region || 'us-east-1');

        if (result.success && result.accessToken) {
            const updatedToken = {
                ...tokenData,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken || tokenData.refreshToken,
                expiresAt: new Date(Date.now() + (result.expiresIn || 3600) * 1000).toISOString(),
                expiresIn: result.expiresIn
            };
            fs.writeFileSync(account.path, JSON.stringify(updatedToken, null, 2));
            this.loadAccounts();
        }

        return result;
    }

    public async checkAccountBanStatus(filename: string): Promise<AccountHealthStatus> {
        const account = this.getAccountByFilename(filename);
        if (!account) {
            return { isHealthy: false, errorMessage: 'Account not found' };
        }

        const refreshResult = await this.refreshAccountToken(filename);
        if (!refreshResult.success) {
            return {
                isHealthy: false,
                isBanned: refreshResult.isBanned,
                isExpired: refreshResult.error === 'InvalidGrantException',
                needsRefresh: true,
                error: refreshResult.error,
                errorMessage: refreshResult.errorMessage
            };
        }

        // After a successful refresh, the token data in memory is updated. Re-fetch it.
        const refreshedAccount = this.getAccountByFilename(filename);
        if (!refreshedAccount?.tokenData.accessToken) {
            return { isHealthy: false, error: 'UnknownError', errorMessage: 'Could not find refreshed token data.' };
        }

        const banCheck = await this._checkAccountBanViaAPI(refreshedAccount.tokenData.accessToken, refreshedAccount.tokenData.region || 'us-east-1');
        if (banCheck.isBanned) {
            return {
                isHealthy: false,
                isBanned: true,
                error: 'AccessDeniedException',
                errorMessage: banCheck.message || 'Account is banned (TEMPORARILY_SUSPENDED)',
            };
        }

                if (banCheck.usageData) {
            const { resetDate, ...rest } = banCheck.usageData;
            let daysRemaining = -1;
            if (resetDate) {
                const diffMs = new Date(resetDate).getTime() - Date.now();
                daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }
            return { isHealthy: true, usage: { ...rest, daysRemaining, loading: false } };
        }

        return { isHealthy: true };
    }

    public async deleteAccount(filename: string): Promise<boolean> {
        const account = this.getAccountByFilename(filename);
        if (!account) return false;

        try {
            fs.unlinkSync(account.path);
            const candidates = this._getUsageCacheCandidates(account.tokenData, account.filename);
            for (const key of candidates) {
                invalidateAccountUsage(key);
            }
            this.loadAccounts();
            return true;
        } catch (error) {
            console.error(`Failed to delete account ${filename}:`, error);
            return false;
        }
    }

    // =======================================================================
    // Private Helper Methods
    // =======================================================================

    private _incrementUsage(filename: string): void {
        const stats = loadUsageStats();
        const account = this.getAccountByFilename(filename);
        if (!account) return;

        const statsKey = this._getUsageStatsKey(account.tokenData, filename, stats);
        if (!stats[statsKey]) {
            stats[statsKey] = { count: 0 };
        }
        stats[statsKey].count++;
        stats[statsKey].lastUsed = new Date().toISOString();
        saveUsageStats(stats);
    }

    private _getCurrentToken(): TokenData | null {
        const tokenPath = getKiroAuthTokenPath();
        if (!fs.existsSync(tokenPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        } catch { return null; }
    }

    private _isTokenExpired(tokenData: TokenData, offsetSeconds: number = 0): boolean {
        if (!tokenData.expiresAt) return true;
        const expiresAt = new Date(tokenData.expiresAt).getTime();
        return expiresAt <= Date.now() + (offsetSeconds * 1000);
    }

    private _tokenNeedsRefresh(tokenData: TokenData): boolean {
        return this._isTokenExpired(tokenData, REFRESH_BEFORE_EXPIRY_SECONDS);
    }

    private _getExpiresInText(tokenData: TokenData): string {
        if (!tokenData.expiresAt) return '?';
        const diffMs = new Date(tokenData.expiresAt).getTime() - Date.now();
        if (diffMs <= 0) return 'Exp';
        const diffMinutes = Math.floor(diffMs / 60000);
        if (diffMinutes < 60) return `${diffMinutes}m`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h`;
        return `${Math.floor(diffHours / 24)}d`;
    }

    private _getUsageCacheCandidates(tokenData: TokenData, filename: string): string[] {
        const candidates = [filename, tokenData.accountName, tokenData.email].filter(Boolean) as string[];
        return Array.from(new Set(candidates));
    }

    private _getUsageStatsKey(tokenData: TokenData, filename: string, usageStats: Record<string, any>): string {
        const candidates = this._getUsageCacheCandidates(tokenData, filename);
        for (const key of candidates) {
            if (usageStats[key]) return key;
        }
        return filename;
    }

    private async _writeKiroToken(tokenData: TokenData): Promise<boolean> {
        const kiroAuthPath = getKiroAuthTokenPath();
        const ssoDir = path.dirname(kiroAuthPath);
        try {
            if (!fs.existsSync(ssoDir)) {
                fs.mkdirSync(ssoDir, { recursive: true });
            }
            const clientIdHash = tokenData.clientIdHash || (tokenData._clientId ? crypto.createHash('sha1').update(tokenData._clientId).digest('hex') : '');
            const kiroToken = { accessToken: tokenData.accessToken, refreshToken: tokenData.refreshToken, expiresAt: tokenData.expiresAt, clientIdHash, authMethod: tokenData.authMethod || 'IdC', provider: tokenData.provider || 'BuilderId', region: tokenData.region || 'us-east-1' };
            fs.writeFileSync(kiroAuthPath, JSON.stringify(kiroToken, null, 2));
            if (clientIdHash && tokenData._clientId && tokenData._clientSecret) {
                const clientFilePath = path.join(ssoDir, `${clientIdHash}.json`);
                const clientExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
                const clientData = { clientId: tokenData._clientId, clientSecret: tokenData._clientSecret, expiresAt: tokenData._clientSecretExpiresAt || clientExpiresAt };
                fs.writeFileSync(clientFilePath, JSON.stringify(clientData, null, 2));
            }
            return true;
        } catch (error) { return false; }
    }

    private _parseOIDCError(statusCode: number, data: string): { error: OIDCErrorType; message: string } {
        try {
            const json = JSON.parse(data) as OIDCError;
            const errorType = json.error as OIDCErrorType || 'UnknownError';
            const message = json.error_description || json.message || data;
            return { error: errorType, message };
        } catch {
            if (statusCode === 400) return { error: 'InvalidRequestException', message: data };
            if (statusCode === 401) return { error: 'InvalidClientException', message: data };
            if (statusCode === 403) return { error: 'AccessDeniedException', message: data };
            if (statusCode === 429) return { error: 'SlowDownException', message: data };
            if (statusCode >= 500) return { error: 'InternalServerException', message: data };
            return { error: 'UnknownError', message: data };
        }
    }

    private _checkAccountBanViaAPI(accessToken: string, region: string): Promise<BanCheckResult> {
        return new Promise((resolve) => {
            const hostname = `codewhisperer.${region}.amazonaws.com`;
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
                            const limits = json.limits?.[0] || {};
                            resolve({
                                isBanned: false,
                                usageData: {
                                    currentUsage: limits.currentUsage ?? -1,
                                    usageLimit: limits.usageLimit ?? 500,
                                    percentageUsed: limits.currentUsage && limits.usageLimit ? Math.round((limits.currentUsage / limits.usageLimit) * 100) : 0,
                                    resetDate: limits.nextDateReset
                                }
                            });
                        } else if (res.statusCode === 403) {
                            const reason = json.reason || '';
                            const message = json.message || json.Message || '';
                            resolve({
                                isBanned: reason === 'TEMPORARILY_SUSPENDED',
                                reason,
                                message: message || 'Access Denied',
                                error: 'AccessDeniedException'
                            });
                        } else {
                            resolve({ isBanned: false, error: `HTTP ${res.statusCode}`, message: json.message || data });
                        }
                    } catch (e) {
                        resolve({ isBanned: false, error: 'ParseError', message: data });
                    }
                });
            });

            req.on('error', (err) => resolve({ isBanned: false, error: 'NetworkError', message: err.message }));
            req.setTimeout(10000, () => { req.destroy(); resolve({ isBanned: false, error: 'Timeout', message: 'Request timed out' }); });
            req.end();
        });
    }

    private _isBlockedAccessError(error: OIDCErrorType | undefined, message?: string): boolean {
        // Do NOT treat every 403/AccessDenied as a "ban": OIDC can return AccessDenied for a number
        // of transient reasons (rate limiting, AWS-side issues, regional restrictions, etc.).
        // We only mark as banned when we have a clear "Kiro access not available" signal.
        if (message?.includes('Kiro access not available')) return true;
        return false;
    }

    private _refreshOIDCToken(refreshToken: string, clientId: string, clientSecret: string, region: string): Promise<RefreshResult> {
        return new Promise((resolve) => {
            const payload = JSON.stringify({ clientId, clientSecret, grantType: 'refresh_token', refreshToken });
            const req = https.request({ hostname: `oidc.${region}.amazonaws.com`, path: '/token', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const json = JSON.parse(data);
                            resolve({ success: true, accessToken: json.accessToken, refreshToken: json.refreshToken, expiresIn: json.expiresIn || 3600 });
                        } catch {
                            resolve({ success: false, error: 'UnknownError', errorMessage: 'Failed to parse response' });
                        }
                    } else {
                        const { error, message } = this._parseOIDCError(res.statusCode || 0, data);
                        resolve({ success: false, error, errorMessage: message, isBanned: this._isBlockedAccessError(error, message), isInvalidCredentials: error === 'InvalidClientException' || error === 'UnauthorizedClientException', isRateLimited: error === 'SlowDownException' });
                    }
                });
            });
            req.on('error', (err) => { resolve({ success: false, error: 'NetworkError', errorMessage: err.message }); });
            req.write(payload);
            req.end();
        });
    }
}

export function getAccountService(): AccountService {
    return AccountService.getInstance();
}
