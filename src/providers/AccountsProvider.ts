/**
 * Kiro Accounts WebviewView Provider
 * Manages the sidebar panel for account management
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getAccountService, AccountService } from '../services/AccountService';
import { getTokensDir, getKiroUsageFromDB, KiroUsageData, isUsageStale, invalidateAccountUsage, clearUsageCache } from '../utils';
import { generateWebviewHtml } from '../webview/index';
import { getTranslations } from '../webview/i18n';
import { renderAccountList } from '../webview/components/AccountList';
import { getAvailableUpdate, forceCheckForUpdates } from '../update-checker';
import { AccountInfo, ImapProfile } from '../types';
import { Language } from '../webview/i18n';
import { autoregProcess, llmServerProcess } from '../process-manager';
import { getAutoregDir, runAutoReg } from '../commands/autoreg';
import type { PatchStatusResult } from '../commands/autoreg';
import { getStateManager, StateManager, StateUpdate } from '../state/StateManager';
import { ImapProfileProvider } from './ImapProfileProvider';
import { getLogService, LogService } from '../services/LogService';
import { getUsageService, UsageService } from '../services/UsageService';
import { CONFIG } from '../constants';
import type { ProviderHint } from '../webview/messages';

// Simple performance measurement
function perf<T>(name: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  if (duration > CONFIG.PERF_LOG_THRESHOLD_MS) {
    console.log(`[PERF] ${name}: ${duration.toFixed(1)}ms`);
  }
  return result;
}

async function perfAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  if (duration > CONFIG.PERF_LOG_THRESHOLD_MS) {
    console.log(`[PERF] ${name}: ${duration.toFixed(1)}ms`);
  }
  return result;
}

export class KiroAccountsProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _kiroUsage: KiroUsageData | null = null;
  private _accounts: AccountInfo[] = [];
  private _version: string;
  private _language: Language = 'en';
  private _availableUpdate: { version: string; url: string } | null = null;
  private _stateManager: StateManager;
  private _unsubscribe?: () => void;
  private _disposables: vscode.Disposable[] = [];

  // Services
  private _logService: LogService;
  private _usageService: UsageService;
  private _accountService: AccountService;
  private _profileProvider?: ImapProfileProvider;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._version = context.extension.packageJSON.version || 'unknown';
    this._language = context.globalState.get<Language>('language', 'en');
    this._availableUpdate = getAvailableUpdate(context);
    this._stateManager = getStateManager();

    // Initialize services
    this._logService = getLogService();
    this._usageService = getUsageService();
    this._accountService = getAccountService();

    // Subscribe to state changes for incremental updates
    this._unsubscribe = this._stateManager.subscribe((update) => {
      this._handleStateUpdate(update);
    });
  }

  /**
   * Dispose of resources to prevent memory leaks
   */
  dispose(): void {
    // Unsubscribe from state manager
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = undefined;
    }

    // Dispose all registered disposables
    this._disposables.forEach(d => d.dispose());
    this._disposables = [];

    // Clear view reference
    this._view = undefined;
  }

  // Handle state updates - send incremental updates to webview
  private _handleStateUpdate(update: StateUpdate): void {
    if (!this._view) return;

    switch (update.type) {
      case 'usage':
        this._view.webview.postMessage({ type: 'updateUsage', usage: update.data.kiroUsage });
        break;
      case 'accounts':
        {
          const accounts = (update.data.accounts || []) as AccountInfo[];
          const t = getTranslations(this._language);
          const bannedAccounts = accounts.filter(a => a.usage?.isBanned);
          const visibleAccounts = accounts.filter(a => !a.usage?.isBanned);
          const validCount = visibleAccounts.filter(a => !a.isExpired).length;
          const totalCount = visibleAccounts.length;

          const html = renderAccountList({ accounts: visibleAccounts, t });
          this._view.webview.postMessage({
            type: 'updateAccounts',
            html,
            validCount,
            totalCount,
            bannedCount: bannedAccounts.length
          });
        }
        break;
      case 'status':
        this._view.webview.postMessage({ type: 'updateStatus', status: update.data.autoRegStatus });
        break;
      case 'full':
        this.renderWebview();
        break;
    }
  }

  get context(): vscode.ExtensionContext {
    return this._context;
  }

  get accounts(): AccountInfo[] {
    return this._accountService.getAccounts();
  }

  addLog(message: string): string {
    const logLine = this._logService.add(message);
    this._sendLogUpdate(logLine);
    return logLine;
  }

  private _sendLogUpdate(logLine: string) {
    if (this._view) {
      this._view.webview.postMessage({ type: 'appendLog', log: logLine });
    }
  }

  clearLogs() {
    this._logService.clear();
    this.refresh();
  }

  get consoleLogs(): string[] {
    return this._logService.getAll();
  }

  async openLogFile() {
    const logFile = this._logService.getLogFilePath();
    if (this._logService.logFileExists()) {
      const doc = await vscode.workspace.openTextDocument(logFile);
      await vscode.window.showTextDocument(doc);
    } else {
      this.addLog('⚠️ Log file not found');
    }
  }

  sendPatchStatus(status: PatchStatusResult): void {
    this._view?.webview.postMessage({
      type: 'patchStatus',
      ...status
    });
  }

  async toggleSetting(setting: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
    const current = config.get<boolean>(setting as any);
    await config.update(setting, !current, vscode.ConfigurationTarget.Global);
    this.refresh();
  }

  async updateSetting(key: string, value: boolean): Promise<void> {
    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
    this.refresh();
  }

  async importAccounts(): Promise<void> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: { 'JSON': ['json'] },
      title: 'Import Accounts'
    });

    if (!fileUri?.[0]) return;

    try {
      const content = fs.readFileSync(fileUri[0].fsPath, 'utf8');
      const parsed = JSON.parse(content) as { version?: number; accounts?: unknown[] };

      const accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      if (accounts.length === 0) {
        this.addLog('⚠️ No accounts found in import file');
        return;
      }

      const tokensDir = getTokensDir();
      const now = Date.now();

      for (let i = 0; i < accounts.length; i++) {
        const tokenData = accounts[i] as Record<string, unknown>;
        const name = (tokenData.accountName as string) || (tokenData.email as string) || `account_${i + 1}`;
        const safe = name.replace(/[^a-zA-Z0-9._-]+/g, '_');
        const filename = `imported_${now}_${i + 1}_${safe}.json`;
        const outPath = path.join(tokensDir, filename);
        fs.writeFileSync(outPath, JSON.stringify(tokenData, null, 2));
      }

      this.addLog(`✅ Imported ${accounts.length} account(s)`);
      // Reload service state from disk (will emit onDidAccountsChange)
      this._accountService.loadAccounts();
    } catch (err) {
      this.addLog(`❌ Import failed: ${err}`);
    }
  }

  private _getSecretKeyForAccount(accountId: string): string {
    return `kiroAccountPassword:${accountId}`;
  }

  private async _getAccountPassword(accountId: string): Promise<string | undefined> {
    return this._context.secrets.get(this._getSecretKeyForAccount(accountId));
  }

  private async _saveAccountPassword(accountId: string, password: string): Promise<void> {
    await this._context.secrets.store(this._getSecretKeyForAccount(accountId), password);
  }

  async copyPassword(accountId: string): Promise<void> {
    const pwd = await this._getAccountPassword(accountId);
    if (!pwd) {
      this.addLog('⚠️ No password saved for this account');
      return;
    }
    await vscode.env.clipboard.writeText(pwd);
    this.addLog('🔑 Password copied to clipboard');
  }

  async copyToken(identifier: string): Promise<void> {
    const account = this._accountService.getAccountByFilename(identifier)
      || this._accountService.getAccounts().find(a => a.tokenData.email === identifier || a.tokenData.accountName === identifier);

    if (!account?.tokenData?.accessToken) {
      this.addLog('⚠️ Token not found');
      return;
    }

    await vscode.env.clipboard.writeText(account.tokenData.accessToken);
    this.addLog('🎫 Token copied to clipboard');
  }

  async viewQuota(identifier: string): Promise<void> {
    const account = identifier
      ? (this._accountService.getAccountByFilename(identifier)
        || this._accountService.getAccounts().find(a => a.tokenData.email === identifier || a.tokenData.accountName === identifier))
      : this._accountService.getActiveAccount();

    if (!account) {
      this.addLog('⚠️ Account not found');
      return;
    }

    const usage = await this._usageService.getUsage(account.filename);
    if (!usage) {
      this.addLog('ℹ️ No usage data available');
      return;
    }

    this.addLog(`📊 Usage: ${usage.currentUsage}/${usage.usageLimit} (${usage.percentageUsed}%)`);
  }

  async refreshSingleToken(identifier: string): Promise<void> {
    const account = this._accountService.getAccountByFilename(identifier)
      || this._accountService.getAccounts().find(a => a.tokenData.email === identifier || a.tokenData.accountName === identifier);

    if (!account) {
      this.addLog('⚠️ Account not found');
      return;
    }

    const accountName = account.tokenData.accountName || account.filename;
    this.addLog(`🔄 Refreshing token: ${accountName}`);

    const result = await this._accountService.refreshAccountToken(account.filename);
    if (result.isBanned) {
      this.markAccountAsBanned(account.filename, result.errorMessage);
      this.addLog(`⛔ BANNED (OIDC): ${accountName}`);
      this.refresh();
      return;
    }

    if (!result.success) {
      this.addLog(`✗ Refresh failed: ${accountName} - ${result.errorMessage || result.error}`);
      return;
    }

    this.addLog(`✓ Token refreshed: ${accountName}`);
    this.refresh();
  }

  async refreshAllTokens(): Promise<void> {
    const candidates = this._accountService.getAccounts().filter((a: AccountInfo) => !a.usage?.isBanned);
    await this.refreshSelectedTokens(candidates.map(a => a.filename));
  }

  setLanguage(language: Language): void {
    this._language = language;
    this._context.globalState.update('language', language);
    this.refresh();
  }

  async checkForUpdatesManual(): Promise<void> {
    this._availableUpdate = await forceCheckForUpdates(this._context);
    this.refresh();
  }

  async deleteExhaustedAccounts(): Promise<void> {
    const accounts = this._accountService.getAccounts().filter(a => {
      const usage = a.usage;
      return usage && usage.currentUsage !== -1 && usage.percentageUsed >= 100;
    });

    for (const acc of accounts) {
      await this._accountService.deleteAccount(acc.filename);
    }

    this.addLog(`🗑 Deleted ${accounts.length} exhausted account(s)`);
    this.refresh();
  }

  async deleteBannedAccounts(): Promise<void> {
    const accounts = this._accountService.getAccounts().filter(a => a.usage?.isBanned);

    for (const acc of accounts) {
      await this._accountService.deleteAccount(acc.filename);
    }

    this.addLog(`🗑 Deleted ${accounts.length} banned account(s)`);
    this.refresh();
  }

  setStatus(status: string) {
    this._context.globalState.update('autoRegStatus', status);
    // Send incremental update instead of full refresh to avoid flickering
    this._sendStatusUpdate(status);
  }

  private _sendStatusUpdate(status: string) {
    if (this._view) {
      this._view.webview.postMessage({ type: 'updateStatus', status });
    }
  }

  // Auto-reg process management
  stopAutoReg() {
    if (autoregProcess.isRunning) {
      this.addLog('🛑 Stopping auto-reg...');
      autoregProcess.stop();
    } else {
      this.addLog('⚠️ No process running, clearing status...');
    }
    // Always clear status when stop is clicked (handles stuck UI)
    this.setStatus('');
    this.refresh();
  }

  togglePauseAutoReg() {
    if (autoregProcess.isRunning) {
      const wasPaused = autoregProcess.state === 'paused';
      autoregProcess.togglePause();
      this.updateProgressPaused(!wasPaused);
    } else {
      this.addLog('⚠️ No process running');
    }
  }

  private updateProgressPaused(paused: boolean) {
    const status = this._context.globalState.get<string>('autoRegStatus', '');
    if (status?.startsWith('{')) {
      try {
        const progress = JSON.parse(status);
        if (paused) {
          progress.detail = '⏸ Paused - ' + progress.detail;
        } else {
          progress.detail = progress.detail.replace(/^⏸ Paused - /, '');
        }
        this._context.globalState.update('autoRegStatus', JSON.stringify(progress));
      } catch { }
    }
  }

  // Export accounts (full tokens for transfer)
  async exportAccounts(selectedOnly: string[] = []) {
    const accounts = this._accountService.getAccounts();
    if (accounts.length === 0) {
      this.addLog('⚠️ No accounts to export');
      return;
    }

    // Filter if specific accounts selected
    const toExport = selectedOnly.length > 0
      ? accounts.filter((a: AccountInfo) => selectedOnly.includes(a.tokenData.accountName || a.filename))
      : accounts;

    if (toExport.length === 0) {
      this.addLog('⚠️ No accounts selected for export');
      return;
    }

    // Export full token data for transfer
    const exportData = {
      version: 1,
      accounts: toExport.map((acc: AccountInfo) => acc.tokenData)
    };

    // Save to file
    const exportFile = path.join(os.homedir(), 'kiro-accounts-export.json');
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));

    this.addLog(`✅ Exported ${toExport.length} accounts to ${exportFile}`);
  }

  async loadProfiles(): Promise<void> {
    const provider = this.getProfileProvider();
    await provider.load();
    const profiles = provider.getAll();
    const active = provider.getActive();

    this._view?.webview.postMessage({
      type: 'profilesLoaded',
      profiles,
      activeProfileId: active?.id
    });
  }

  async getActiveProfile(): Promise<void> {
    const provider = this.getProfileProvider();
    const profile = provider.getActive() || null;
    this._view?.webview.postMessage({ type: 'activeProfileLoaded', profile });
  }

  async getProfile(profileId: string): Promise<void> {
    const provider = this.getProfileProvider();
    const profile = provider.getById(profileId);
    if (!profile) {
      this.addLog('⚠️ Profile not found');
      return;
    }
    this._view?.webview.postMessage({ type: 'profileLoaded', profile });
  }

  async createProfile(profile: Record<string, unknown>): Promise<void> {
    const provider = this.getProfileProvider();
    await provider.create(profile as any);
    await this.loadProfiles();
    await this.getActiveProfile();
  }

  async updateProfile(profile: Record<string, unknown>): Promise<void> {
    const provider = this.getProfileProvider();
    const id = profile.id as string | undefined;
    if (!id) {
      this.addLog('⚠️ Profile id is required');
      return;
    }
    await provider.update(id, profile as any);
    await this.loadProfiles();
    await this.getProfile(id);
  }

  async deleteProfile(profileId: string): Promise<void> {
    const provider = this.getProfileProvider();
    await provider.delete(profileId);
    await this.loadProfiles();
    await this.getActiveProfile();
  }

  async setActiveProfile(profileId: string): Promise<void> {
    const provider = this.getProfileProvider();
    await provider.setActive(profileId);
    await this.loadProfiles();
    await this.getActiveProfile();
  }

  async detectProvider(email: string): Promise<void> {
    const provider = this.getProfileProvider();
    const hint = provider.getProviderHint(email) as ProviderHint | undefined;
    const recommendedStrategy = provider.getRecommendedStrategy(email);

    this._view?.webview.postMessage({
      type: 'providerDetected',
      hint: hint || null,
      recommendedStrategy: recommendedStrategy || null
    });
  }

  async testImapConnection(msg: { server: string; user: string; password: string; port: number }): Promise<void> {
    this._view?.webview.postMessage({ type: 'imapTestResult', status: 'testing', message: 'Testing...' });

    try {
      const tls = require('tls');

      await new Promise<void>((resolve, reject) => {
        const socket = tls.connect({
          host: msg.server,
          port: msg.port || 993,
          timeout: 10000
        });

        let buffer = '';
        let stage: 'greeting' | 'login' | 'list' = 'greeting';

        socket.on('data', (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\r\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (stage === 'greeting' && line.includes('* OK')) {
              stage = 'login';
              socket.write(`A001 LOGIN "${msg.user}" "${msg.password}"\r\n`);
            } else if (stage === 'login' && line.includes('A001 OK')) {
              stage = 'list';
              socket.write('A002 LIST "" "*"\r\n');
            } else if (stage === 'list' && line.includes('A002 OK')) {
              socket.write('A003 LOGOUT\r\n');
              socket.end();
              resolve();
            } else if (line.includes('A001 NO') || line.includes('A001 BAD')) {
              reject(new Error('Authentication failed. Check your credentials.'));
            }
          }
        });

        socket.on('error', (err: Error) => reject(err));
        socket.on('timeout', () => reject(new Error('Connection timeout')));
      });

      this._view?.webview.postMessage({
        type: 'imapTestResult',
        status: 'success',
        message: 'IMAP connected successfully'
      });
    } catch (err: any) {
      this._view?.webview.postMessage({
        type: 'imapTestResult',
        status: 'error',
        message: err?.message || String(err)
      });
    }
  }

  async importEmailsFromFile(): Promise<void> {
    const fileUri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectMany: false,
      filters: { 'Text': ['txt', 'csv'] },
      title: 'Import Emails'
    });

    if (!fileUri?.[0]) return;

    try {
      const content = fs.readFileSync(fileUri[0].fsPath, 'utf8');
      const emails = content
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      this._view?.webview.postMessage({
        type: 'emailsImported',
        emails
      });
    } catch (err) {
      this.addLog(`❌ Failed to import emails: ${err}`);
    }
  }

  async refreshAllExpiredTokens() {
    // Find expired accounts (token expired but not exhausted/suspended/banned)
    const expiredAccounts = this._accountService.getAccounts().filter((acc: AccountInfo) => {
      const usage = acc.usage;
      const isBanned = usage?.isBanned === true;
      const isSuspended = usage?.suspended === true;
      const isExhausted = usage && usage.currentUsage !== -1 && usage.percentageUsed >= 100;
      // Only expired tokens, not banned/exhausted/suspended
      return acc.isExpired && !isBanned && !isSuspended && !isExhausted;
    });

    if (expiredAccounts.length === 0) {
      this.addLog('ℹ️ No expired tokens to refresh');
      return;
    }

    this.addLog(`🔄 Refreshing ${expiredAccounts.length} expired token(s)...`);

    let refreshed = 0;
    let failed = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Refreshing ${expiredAccounts.length} expired tokens...`,
      cancellable: false
    }, async (progress) => {
      for (let i = 0; i < expiredAccounts.length; i++) {
        const acc = expiredAccounts[i];
        const accountName = acc.tokenData.accountName || acc.filename;

        progress.report({
          message: `${i + 1}/${expiredAccounts.length}: ${accountName}`,
          increment: (100 / expiredAccounts.length)
        });

        try {
          const result = await this._accountService.refreshAccountToken(acc.filename);

          if (result.isBanned) {
            failed++;
            this.markAccountAsBanned(acc.filename, result.errorMessage);
            this.addLog(`⛔ BANNED (OIDC): ${accountName}`);
            continue;
          }

          if (!result.success) {
            failed++;
            this.addLog(`✗ Failed: ${accountName} - ${result.errorMessage || result.error}`);
            continue;
          }

          // OIDC succeeded - check via CodeWhisperer API
          const freshAcc = this._accountService.getAccountByFilename(acc.filename);

          if (freshAcc?.tokenData.accessToken) {
            const banCheck = await this._accountService.checkAccountBanStatus(freshAcc.filename);
            if (banCheck.isBanned) {
              failed++;
              this.markAccountAsBanned(acc.filename, banCheck.errorMessage);
              this.addLog(`⛔ BANNED (API): ${accountName}`);
              continue;
            }
          }

          refreshed++;
          this.addLog(`✓ Healthy: ${accountName}`);
        } catch (err) {
          failed++;
          this.addLog(`✗ Error: ${accountName} - ${err}`);
        }
      }
    });

    const message = `✅ Refreshed ${refreshed} token(s)` + (failed > 0 ? `, ${failed} failed` : '');
    this.addLog(message);
    this.refresh();
  }

  // Mark account as banned in usage cache
  markAccountAsBanned(identifier: string, reason?: string) {
    // Find account by filename, accountName, or email
    const account = this._accountService.getAccounts().find((a: AccountInfo) =>
      a.filename === identifier ||
      a.tokenData.accountName === identifier ||
      a.tokenData.email === identifier
    );

    if (!account) {
      console.error(`[BAN] Account not found: ${identifier}`);
      this.addLog(`⚠️ Cannot mark as banned - account not found: ${identifier}`);
      return;
    }

    const accName = account.tokenData.accountName || account.tokenData.email || identifier;
    const cacheKey = account.filename;

    // Update usage with banned flag
    if (account.usage) {
      account.usage.isBanned = true;
      account.usage.banReason = reason;
    } else {
      account.usage = {
        currentUsage: -1,
        usageLimit: 500,
        percentageUsed: 0,
        daysRemaining: -1,
        isBanned: true,
        banReason: reason
      };
    }

    // PERSIST ban status to disk so it survives refresh/restart
    const { saveAccountUsage } = require('../utils');
    const usageData = {
      currentUsage: account.usage.currentUsage,
      usageLimit: account.usage.usageLimit,
      percentageUsed: account.usage.percentageUsed,
      daysRemaining: account.usage.daysRemaining,
      isBanned: true,
      banReason: reason
    };

    console.log(`[BAN] Saving ban status for ${accName}:`, usageData);
    saveAccountUsage(cacheKey, usageData);

    this.addLog(`⛔ Account marked as BANNED: ${accName}`);

    // Force immediate UI update
    this.renderWebview();
  }

  // ... (rest of the code remains the same)

  private _renderDebounceTimer: NodeJS.Timeout | null = null;
  private _renderDebounceMs: number = CONFIG.RENDER_DEBOUNCE_MS;

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    this.refresh();

    // Auto-check health of active account on startup (with delay to not block UI)
    setTimeout(() => this.checkActiveAccountHealth(), 2000);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      await this.handleMessage(msg);
    });
  }

  async refresh() {
    if (this._view) {
        const start = performance.now();

        await this.refreshAccounts();
        await this.refreshUsage();
        this._availableUpdate = getAvailableUpdate(this._context);
        this.renderWebview();

        const duration = performance.now() - start;
        if (duration > 100) {
            console.log(`[PERF] Full refresh: ${duration.toFixed(1)}ms`);
        }
    }
  }

  private async refreshAccounts(): Promise<void> {
    // IMPORTANT: do not call loadAccounts() here.
    // loadAccounts() emits onDidAccountsChange, which triggers provider.refresh() from extension.ts.
    // Calling loadAccounts() during refresh creates an infinite recursion and crashes the extension host.
    this._accounts = this._accountService.getAccounts();
    this._stateManager.updateAccounts(this._accounts);
  }

  private async refreshUsage(): Promise<void> {
    this._kiroUsage = await perfAsync('refreshUsage', () => this._usageService.refresh());

    const activeAccount = this._accountService.getActiveAccount();
    if (activeAccount && this._kiroUsage) {
      this._usageService.applyToAccount(activeAccount, this._kiroUsage);
    }

    this._stateManager.updateUsage(this._kiroUsage);
  }

  async checkActiveAccountHealth(): Promise<void> {
    const activeAccount = this._accountService.getActiveAccount();
    if (!activeAccount) return;

    try {
      const status = await this._accountService.checkAccountBanStatus(activeAccount.filename);

      if (status.isBanned) {
        this.markAccountAsBanned(activeAccount.filename, status.errorMessage);
        this.refresh();
      }
    } catch {
      // Best-effort only
    }
  }

  private async handleMessage(msg: Record<string, unknown>): Promise<void> {
    const { handleWebviewMessage } = await import('../commands/webview-handler');
    await handleWebviewMessage(this, msg);
  }

  private getProfileProvider(): ImapProfileProvider {
    if (!this._profileProvider) {
      this._profileProvider = ImapProfileProvider.getInstance(this._context);
    }
    return this._profileProvider;
  }

  private renderWebview() {
    if (!this._view) return;

    // Debounce renders to avoid flickering
    if (this._renderDebounceTimer) {
      clearTimeout(this._renderDebounceTimer);
    }

    this._renderDebounceTimer = setTimeout(() => {
      this._doRenderWebview();
    }, this._renderDebounceMs);
  }

  private _doRenderWebview() {
    if (!this._view) return;
    const start = performance.now();

    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
    const autoSwitchEnabled = config.get<boolean>('autoSwitch.enabled', false);
    const autoRegStatus = this._context.globalState.get<string>('autoRegStatus', '');
    const autoRegSettings = {
      headless: config.get<boolean>('autoreg.headless', false),
      verbose: config.get<boolean>('debug.verbose', false),
      screenshotsOnError: config.get<boolean>('debug.screenshotsOnError', true),
      spoofing: config.get<boolean>('autoreg.spoofing', true),
      deviceFlow: config.get<boolean>('autoreg.deviceFlow', false),
      autoSwitchThreshold: config.get<number>('autoSwitch.usageThreshold', 50),
      strategy: config.get<'webview' | 'automated'>('autoreg.strategy', 'automated'),
      deferQuotaCheck: config.get<boolean>('autoreg.deferQuotaCheck', true)
    };

    // Get active IMAP profile for Hero display
    const profileProvider = this.getProfileProvider();
    const activeProfile = profileProvider?.getActive() || null;

    // Get scheduled registration settings
    const scheduledRegSettings = this.getScheduledRegSettings();

    const html = perf('generateWebviewHtml', () => generateWebviewHtml({
      accounts: this._accounts,
      autoSwitchEnabled,
      autoRegStatus,
      kiroUsage: this._kiroUsage,
      autoRegSettings,
      consoleLogs: this.consoleLogs,
      version: this._version,
      language: this._language,
      availableUpdate: this._availableUpdate,
      activeProfile,
      scheduledRegSettings
    }));

    this._view.webview.html = html;

    const duration = performance.now() - start;
    if (duration > CONFIG.PERF_LOG_THRESHOLD_MS) {
      console.log(`[PERF] renderWebview total: ${duration.toFixed(1)}ms (${this._accounts.length} accounts)`);
    }
  }

  async loadAllUsage() {
    if (!this._view) return;

    try {
      this._accountService.loadAccounts();
      this._accounts = this._accountService.getAccounts();
      this.renderWebview();
    } catch (err) {
      console.error('Failed to load all usage:', err);
    }
  }

  async loadUsageForAccount(accountName: string) {
    if (!this._view) return;

    try {
      const usage = await this._usageService.getUsage(accountName);
      if (usage) {
        const acc = this._accountService.getAccounts().find((a: AccountInfo) =>
          a.tokenData.accountName === accountName ||
          a.filename.includes(accountName)
        );
        if (acc) {
          acc.usage = usage;
          this.renderWebview();
        }
      }
    } catch (err) {
      console.error(`Failed to load usage for ${accountName}:`, err);
    }
  }

  // ... (rest of the code remains the same)

  // Refresh usage data after account switch - uses UsageService with retry logic
  async refreshUsageAfterSwitch() {
    if (!this._view) return;

    // Get old account name before refresh
    const activeAccount = this._accountService.getActiveAccount();
    const oldAccountName = activeAccount ? activeAccount.filename : null;

    // Reset current usage display
    this._kiroUsage = null;
    this._stateManager.updateUsage(null);

    // Reload accounts to get new active state (but do not push update yet)
    this._accountService.loadAccounts();
    this._accounts = this._accountService.getAccounts();

    // Get new account name
    const newActiveAccount = this._accountService.getActiveAccount();
    const newAccountName = newActiveAccount ? newActiveAccount.filename : '';

    // Use UsageService for refresh with retry
    const usage = await this._usageService.refreshAfterSwitch(
      oldAccountName,
      newAccountName,
      {
        maxRetries: CONFIG.USAGE_REFRESH_MAX_RETRIES,
        retryDelays: [...CONFIG.USAGE_REFRESH_DELAYS],
        onRetry: (attempt, max) => {
          console.log(`Usage not ready, retrying (${attempt}/${max})...`);
        }
      }
    );

    if (usage) {
      this._kiroUsage = usage;

      // Update the account's usage in memory
      if (newActiveAccount) {
        this._usageService.applyToAccount(newActiveAccount, usage);
      }

      // Push updated accounts list so active card shows correct remaining
      this._stateManager.updateAccounts(this._accounts);
      this._stateManager.updateUsage(this._kiroUsage);
    } else {
      // Still push accounts so active highlight changes without full rerender
      this._stateManager.updateAccounts(this._accounts);
    }

    this._availableUpdate = getAvailableUpdate(this._context);

    // Avoid full re-render - it causes visible UI freezes in VS Code webview
  }

  // ... (rest of the code remains the same)

  // Refresh tokens for selected accounts
  async refreshSelectedTokens(filenames: string[]) {
    if (!filenames || filenames.length === 0) {
      this.addLog('⚠️ No accounts selected');
      return;
    }

    this.addLog(`🔄 Refreshing ${filenames.length} selected token(s)...`);

    let refreshed = 0;
    let failed = 0;
    let banned = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Refreshing ${filenames.length} tokens...`,
      cancellable: false
    }, async (progress) => {
      for (let i = 0; i < filenames.length; i++) {
        const filename = filenames[i];
        const account = this._accountService.getAccountByFilename(filename);

        if (!account) continue;

        const accountName = account.tokenData.accountName || account.filename;

        progress.report({
          message: `${i + 1}/${filenames.length}: ${accountName}`,
          increment: (100 / filenames.length)
        });

        try {
          const result = await this._accountService.refreshAccountToken(account.filename);

          if (result.isBanned) {
            failed++;
            banned++;
            this.markAccountAsBanned(account.filename, result.errorMessage);
            this.addLog(`⛔ BANNED (OIDC): ${accountName}`);
            continue;
          }

          if (!result.success) {
            failed++;
            this.addLog(`✗ Failed: ${accountName} - ${result.errorMessage || result.error}`);
            continue;
          }

          // OIDC succeeded - check via CodeWhisperer API
          const freshAcc = this._accountService.getAccountByFilename(account.filename);

          if (freshAcc?.tokenData.accessToken) {
            const banCheck = await this._accountService.checkAccountBanStatus(freshAcc.filename);
            if (banCheck.isBanned) {
              failed++;
              banned++;
              this.markAccountAsBanned(account.filename, banCheck.errorMessage);
              this.addLog(`⛔ BANNED (API): ${accountName}`);
              continue;
            }
          }

          refreshed++;
          this.addLog(`✓ Healthy: ${accountName}`);
        } catch (err) {
          failed++;
          this.addLog(`✗ Error: ${accountName} - ${err}`);
        }
      }
    });

    const message = `✅ Checked ${filenames.length}: ${refreshed} healthy` +
      (banned > 0 ? `, ${banned} banned` : '') +
      (failed - banned > 0 ? `, ${failed - banned} failed` : '');

    this.addLog(message);
    this.refresh();
  }

  // Delete selected accounts
  async deleteSelectedAccounts(filenames: string[]) {
    if (!filenames || filenames.length === 0) {
      this.addLog('⚠️ No accounts selected');
      return;
    }

    let deleted = 0;
    for (const filename of filenames) {
      const account = this._accountService.getAccountByFilename(filename);

      if (account && fs.existsSync(account.path)) {
        try {
          fs.unlinkSync(account.path);
          deleted++;
          const accountName = account.tokenData.accountName || account.filename;
          this.addLog(`🗑 Deleted: ${accountName}`);
        } catch (err) {
          this.addLog(`✗ Failed to delete: ${filename} - ${err}`);
        }
      }
    }

    this.addLog(`✅ Deleted ${deleted} account(s)`);

  }

  // Check health of all accounts (detect bans and issues)
  // Uses CodeWhisperer API to detect bans (OIDC refresh doesn't detect bans!)

  async checkAllAccountsHealthWithProgress() {
    // Filter out banned and exhausted accounts - no point checking them
    const accountsToCheck = this._accountService.getAccounts().filter((acc: AccountInfo) => {
      const usage = acc.usage;
      const isBanned = usage?.isBanned === true;
      const isExhausted = usage && usage.currentUsage !== -1 && usage.percentageUsed >= 100;
      return !isBanned && !isExhausted;
    });

    if (accountsToCheck.length === 0) {
      this.addLog('ℹ️ No accounts to check (all banned or exhausted)');
      return;
    }

    this.addLog(`🔍 Checking health of ${accountsToCheck.length} accounts...`);

    let healthy = 0;
    let banned = 0;
    let expired = 0;
    let noCredentials = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Checking ${accountsToCheck.length} accounts...`,
      cancellable: true
    }, async (progress, token) => {

      for (let i = 0; i < accountsToCheck.length; i++) {
        if (token.isCancellationRequested) break;

        const acc = accountsToCheck[i];
        const accountName = acc.tokenData.accountName || acc.filename;

        progress.report({
          message: `${i + 1}/${accountsToCheck.length}: ${accountName}`,
          increment: (100 / accountsToCheck.length)
        });

        // checkAccountBanStatus does OIDC refresh + CodeWhisperer API check
        const status = await this._accountService.checkAccountBanStatus(acc.filename);

        if (status.isHealthy) {
          healthy++;
          // Clear any previous ban status (both in memory AND on disk)
          if (acc.usage?.isBanned) {
            acc.usage.isBanned = false;
            acc.usage.banReason = undefined;
            // PERSIST cleared ban status to disk
            const { saveAccountUsage } = require('../utils');
            saveAccountUsage(acc.filename, {
              ...acc.usage,
              isBanned: false,
              banReason: undefined
            });
            this.addLog(`✓ Ban cleared: ${accountName}`);
          }

          // Update usage after health check
          if (status.usage) {
            const { saveAccountUsage } = require('../utils');
            saveAccountUsage(acc.filename, status.usage);
            this.addLog(`📊 Updated usage: ${accountName} - ${status.usage.currentUsage}/${status.usage.usageLimit}`);
          }
        } else if (status.isBanned) {
          banned++;
          this.markAccountAsBanned(acc.filename, status.errorMessage);
          this.addLog(`⛔ BANNED: ${accountName}`);
        } else if (status.isExpired) {
          expired++;
          this.addLog(`⏰ Expired: ${accountName}`);
        } else if (status.error === 'InvalidClientException') {
          noCredentials++;
        } else if (status.isExpired) {
          expired++;
          this.addLog(`⏰ Expired: ${accountName}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
    });

    const summary = `✅ Health check: ${healthy} healthy, ${banned} banned, ${expired} expired, ${noCredentials} no credentials`;
    this.addLog(summary);
    this.refresh();
  }

  // === LLM Server Methods (stubs for future implementation) ===

  async getLLMSettings(): Promise<void> {
    // TODO: Implement LLM settings retrieval
    this._view?.webview.postMessage({
      type: 'llmSettings',
      settings: {
        enabled: false,
        port: 8421,
        host: '127.0.0.1'
      }
    });
  }

  async saveLLMSettings(settings: Record<string, unknown>): Promise<void> {
    // TODO: Implement LLM settings save
    this.addLog(`LLM settings saved: ${JSON.stringify(settings)}`);
  }

  async startLLMServer(): Promise<void> {
    if (llmServerProcess.isRunning) {
      this.addLog('⚠️ LLM server is already running');
      return;
    }

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const autoregPath = getAutoregDir(this._context);

    if (!autoregPath) {
      this.addLog('❌ Cannot find autoreg directory');
      return;
    }

    this.addLog(`🚀 Starting LLM server from ${autoregPath}...`);

    // Remove old listeners to prevent duplicates
    llmServerProcess.removeAllListeners();

    llmServerProcess.on('stdout', (data: string) => {
      const lines = data.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        this.addLog(`[LLM] ${line}`);
      }
    });

    llmServerProcess.on('stderr', (data: string) => {
      const lines = data.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        this.addLog(`[LLM] ${line}`);
      }
    });

    llmServerProcess.on('close', (code: number) => {
      this.addLog(`■ LLM server stopped (code: ${code})`);
      this._updateLLMServerStatus(false);
    });

    llmServerProcess.on('error', (err: Error) => {
      this.addLog(`❌ LLM server error: ${err.message}`);
      this._updateLLMServerStatus(false);
    });

    try {
      // Run llm.llm_server module from autoreg directory
      // PYTHONPATH should point to autoreg dir so imports like 'from llm import ...' work
      llmServerProcess.start(pythonCmd, ['-m', 'llm.llm_server'], {
        cwd: autoregPath,
        env: { ...process.env, PYTHONPATH: autoregPath }
      });

      // Wait a bit and check if server started
      setTimeout(() => {
        this._checkLLMServerHealth();
      }, 3000);
    } catch (e) {
      this.addLog(`❌ Failed to start LLM server: ${e}`);
    }
  }

  async stopLLMServer(): Promise<void> {
    if (!llmServerProcess.isRunning) {
      this.addLog('⚠️ LLM server is not running');
      this._updateLLMServerStatus(false);
      return;
    }

    this.addLog('🛑 Stopping LLM server...');

    try {
      // Try graceful shutdown via API first
      const http = require('http');
      const req = http.request({
        hostname: '127.0.0.1',
        port: 8421,
        path: '/shutdown',
        method: 'POST',
        timeout: 2000
      }, () => {
        this.addLog('✓ LLM server shutdown requested');
        this._updateLLMServerStatus(false);
      });

      req.on('error', () => {
        // API not responding, force kill
        llmServerProcess.stop();
        this._updateLLMServerStatus(false);
      });

      req.end();

      // Give it time to shutdown gracefully, then force update status
      setTimeout(async () => {
        if (llmServerProcess.isRunning) {
          await llmServerProcess.stop();
        }
        this._updateLLMServerStatus(false);
      }, 1500);
    } catch (e) {
      await llmServerProcess.stop();
      this._updateLLMServerStatus(false);
    }
  }

  async restartLLMServer(): Promise<void> {
    this.addLog('🔄 Restarting LLM server...');
    await this.stopLLMServer();

    // Wait for process to fully stop
    setTimeout(() => {
      this.startLLMServer();
    }, 2000);
  }

  async getLLMServerStatus(): Promise<void> {
    await this._checkLLMServerHealth();
  }

  private async _checkLLMServerHealth(): Promise<void> {
    const http = require('http');

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8421,
      path: '/health',
      method: 'GET',
      timeout: 3000
    }, (res: { statusCode: number; on: (event: string, cb: (data: Buffer | string) => void) => void }) => {
      let data = '';
      res.on('data', (chunk: Buffer | string) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          this._updateLLMServerStatus(true);
        } else {
          this._updateLLMServerStatus(false);
        }
      });
    });

    req.on('error', () => {
      this._updateLLMServerStatus(false);
    });

    req.on('timeout', () => {
      req.destroy();
      this._updateLLMServerStatus(false);
    });

    req.end();
  }

  private _updateLLMServerStatus(running: boolean): void {
    this._view?.webview.postMessage({
      type: 'llmServerStatus',
      status: {
        status: running ? 'Running' : 'Stopped',
        running,
        port: 8421
      }
    });
  }

  async getLLMModels(): Promise<void> {
    const http = require('http');

    const req = http.request({
      hostname: '127.0.0.1',
      port: 8421,
      path: '/v1/models',
      method: 'GET',
      timeout: 3000
    }, (res: { statusCode: number; on: (event: string, cb: (data: Buffer | string) => void) => void }) => {
      let data = '';
      res.on('data', (chunk: Buffer | string) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            this._view?.webview.postMessage({
              type: 'llmModels',
              models: response.data || []
            });
          } catch {
            this._sendDefaultModels();
          }
        } else {
          this._sendDefaultModels();
        }
      });
    });

    req.on('error', () => {
      this._sendDefaultModels();
    });

    req.on('timeout', () => {
      req.destroy();
      this._sendDefaultModels();
    });

    req.end();
  }

  private _sendDefaultModels(): void {
    const defaultModels = [
      { id: 'claude-sonnet-4-20250514', description: 'claude-sonnet-4-20250514 (1.3x)' },
      { id: 'claude-sonnet-4.5', description: 'claude-sonnet-4.5 (1.3x)' },
      { id: 'claude-opus-4.5', description: 'claude-opus-4.5 (2.2x)' },
      { id: 'claude-haiku-4.5', description: 'claude-haiku-4.5 (0.4x)' },
      { id: 'auto', description: 'auto (1x)' }
    ];
    this._view?.webview.postMessage({
      type: 'llmModels',
      models: defaultModels
    });
  }

  // === Batch Registration ===

  private _scheduledRegTimer: NodeJS.Timeout | null = null;
  private _scheduledRegSettings = {
    enabled: false,
    loginTemplate: 'Account_{N}', // Legacy, kept for compatibility
    currentNumber: 1, // Legacy
    interval: 5, // Default 5 min between registrations
    maxAccounts: 5, // Default 5 accounts
    registeredCount: 0,
    isRunning: false,
    nextRunAt: undefined as string | undefined,
    // New fields
    useCustomName: false, // false = random realistic names
    customNamePrefix: '' // prefix for custom names
  };

  // Realistic name lists for random generation
  private static readonly FIRST_NAMES = [
    'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Parker', 'Blake',
    'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth',
    'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy'
  ];

  private static readonly LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
    'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green',
    'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips'
  ];

  private _generateRandomName(): string {
    const first = KiroAccountsProvider.FIRST_NAMES[Math.floor(Math.random() * KiroAccountsProvider.FIRST_NAMES.length)];
    const last = KiroAccountsProvider.LAST_NAMES[Math.floor(Math.random() * KiroAccountsProvider.LAST_NAMES.length)];
    return `${first} ${last}`;
  }

  async updateScheduledRegSetting(key: string, value: string | number | boolean): Promise<void> {
    const settings = this._scheduledRegSettings as Record<string, unknown>;

    switch (key) {
      case 'enabled':
        settings.enabled = value as boolean;
        break;
      case 'loginTemplate':
        settings.loginTemplate = value as string;
        break;
      case 'currentNumber':
        settings.currentNumber = value as number;
        break;
      case 'interval':
        settings.interval = value as number;
        break;
      case 'maxAccounts':
        settings.maxAccounts = value as number;
        break;
      case 'useCustomName':
        settings.useCustomName = value as boolean;
        break;
      case 'customNamePrefix':
        settings.customNamePrefix = value as string;
        break;
    }

    // Save to global state immediately
    await this._context.globalState.update('scheduledRegSettings', settings);
    this.addLog(`[BatchReg] Updated ${key} = ${value}`);

    // Send update to webview
    this._sendScheduledRegState();
  }

  async startScheduledReg(): Promise<void> {
    const settings = this._scheduledRegSettings;

    // Auto-enable when starting
    settings.enabled = true;

    // Reset counter on each start - no need to track across sessions
    settings.registeredCount = 0;

    settings.isRunning = true;
    this._sendScheduledRegState();
    this.addLog(`🚀 Запуск пакетной регистрации: ${settings.maxAccounts} аккаунтов`);

    // Run first registration immediately
    await this._runScheduledRegistration();

    // If interval > 0, schedule next runs
    if (settings.interval > 0 && settings.registeredCount < settings.maxAccounts) {
      this._scheduleNextRun();
    }
  }

  async stopScheduledReg(): Promise<void> {
    const settings = this._scheduledRegSettings;
    settings.isRunning = false;
    settings.nextRunAt = undefined;

    if (this._scheduledRegTimer) {
      clearTimeout(this._scheduledRegTimer);
      this._scheduledRegTimer = null;
    }

    // Also stop any running autoreg
    this.stopAutoReg();

    this.addLog('🛑 Scheduled registration stopped');
    this._sendScheduledRegState();
  }

  async resetScheduledReg(): Promise<void> {
    const settings = this._scheduledRegSettings;
    settings.registeredCount = 0;
    // Don't reset currentNumber - user may want to continue from where they left off
    // settings.currentNumber = 1;  // Only reset if user explicitly changes it
    settings.isRunning = false;
    settings.nextRunAt = undefined;

    if (this._scheduledRegTimer) {
      clearTimeout(this._scheduledRegTimer);
      this._scheduledRegTimer = null;
    }

    await this._context.globalState.update('scheduledRegSettings', settings);
    this.addLog('↺ Batch registration progress reset');
    this._sendScheduledRegState();
  }

  private async _runScheduledRegistration(): Promise<void> {
    const settings = this._scheduledRegSettings;

    if (!settings.isRunning || settings.registeredCount >= settings.maxAccounts) {
      settings.isRunning = false;
      await this._context.globalState.update('scheduledRegSettings', settings);
      this._sendScheduledRegState();
      return;
    }

    // Generate login name based on mode
    let loginName: string;
    if (settings.useCustomName && settings.customNamePrefix) {
      // Custom template/prefix
      // If the user provided a template with {N}, substitute it.
      // Otherwise default to N_prefix (e.g. 1_qq@whitebite)
      if (settings.customNamePrefix.includes('{N}')) {
        loginName = settings.customNamePrefix.replace(/\{N\}/g, String(settings.currentNumber));
      } else {
        loginName = `${settings.currentNumber}_${settings.customNamePrefix}`;
      }
    } else {
      // Random realistic name
      loginName = this._generateRandomName();
    }

    this.addLog(`📝 Registering account: ${loginName} (${settings.registeredCount + 1}/${settings.maxAccounts})`);

    try {
      // Set environment variable for login name
      process.env.KIRO_LOGIN_NAME = loginName;

      // Run registration and wait for it to complete
      const success = await runAutoReg(this._context, this, 1);

      if (success) {
        // Increment counters ONLY on success
        settings.currentNumber++;
        settings.registeredCount++;
        
        // Save immediately after each successful registration
        await this._context.globalState.update('scheduledRegSettings', settings);
        this.addLog(`✓ Registered ${settings.registeredCount}/${settings.maxAccounts}`);
      } else {
        this.addLog(`❌ Registration failed for: ${loginName}`);
        // If it failed, we don't increment, so it will retry the same account next time
      }

    } catch (err) {
      this.addLog(`❌ Registration error: ${err}`);
    } finally {
      delete process.env.KIRO_LOGIN_NAME;
    }

    // Schedule next if still running and not complete
    if (settings.isRunning && settings.registeredCount < settings.maxAccounts && settings.interval > 0) {
      this._scheduleNextRun();
    } else if (settings.registeredCount >= settings.maxAccounts) {
      settings.isRunning = false;
      await this._context.globalState.update('scheduledRegSettings', settings);
      this.addLog('✓ Scheduled registration complete!');
    }

    this._sendScheduledRegState();
  }

  private _scheduleNextRun(): void {
    const settings = this._scheduledRegSettings;
    const intervalMs = settings.interval * 60 * 1000;

    settings.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    this._sendScheduledRegState();

    this._scheduledRegTimer = setTimeout(async () => {
      await this._runScheduledRegistration();
    }, intervalMs);

    this.addLog(`⏰ Next registration in ${settings.interval} minutes`);
  }

  private _sendScheduledRegState(): void {
    this._view?.webview.postMessage({
      type: 'scheduledRegState',
      state: this._scheduledRegSettings
    });
  }

  getScheduledRegSettings() {
    // Load from global state on init
    const saved = this._context.globalState.get<typeof this._scheduledRegSettings>('scheduledRegSettings');
    if (saved) {
      this._scheduledRegSettings = { ...this._scheduledRegSettings, ...saved };
      // Reset isRunning on load - timer doesn't survive Kiro restart
      if (this._scheduledRegSettings.isRunning) {
        this._scheduledRegSettings.isRunning = false;
        this._scheduledRegSettings.nextRunAt = undefined;
        // Save the reset state
        this._context.globalState.update('scheduledRegSettings', this._scheduledRegSettings);
      }
    }
    return this._scheduledRegSettings;
  }
}
