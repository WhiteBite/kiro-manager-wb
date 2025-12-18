/**
 * Kiro Accounts WebviewView Provider
 * Manages the sidebar panel for account management
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadAccounts, loadAccountsWithUsage, loadSingleAccountUsage, updateActiveAccountUsage, switchToAccount, refreshAccountToken, deleteAccount, markUsageStale } from '../accounts';
import { getTokensDir, getKiroUsageFromDB, KiroUsageData, isUsageStale, invalidateAccountUsage, clearUsageCache } from '../utils';
import { generateWebviewHtml } from '../webview';
import { getAvailableUpdate, forceCheckForUpdates } from '../update-checker';
import { AccountInfo, ImapProfile } from '../types';
import { Language } from '../webview/i18n';
import { autoregProcess } from '../process-manager';
import { getStateManager, StateManager, StateUpdate } from '../state/StateManager';
import { ImapProfileProvider } from './ImapProfileProvider';
import { getLogService, LogService } from '../services/LogService';
import { getUsageService, UsageService } from '../services/UsageService';
import { CONFIG } from '../constants';

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

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._version = context.extension.packageJSON.version || 'unknown';
    this._language = context.globalState.get<Language>('language', 'en');
    this._availableUpdate = getAvailableUpdate(context);
    this._stateManager = getStateManager();

    // Initialize services
    this._logService = getLogService();
    this._usageService = getUsageService();

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
        this._view.webview.postMessage({ type: 'updateAccounts', accounts: update.data.accounts });
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
    return this._accounts;
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
      vscode.window.showWarningMessage('Log file not found');
    }
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
    const accounts = loadAccounts();
    if (accounts.length === 0) {
      vscode.window.showWarningMessage('No accounts to export');
      return;
    }

    // Filter if specific accounts selected
    const toExport = selectedOnly.length > 0
      ? accounts.filter(a => selectedOnly.includes(a.tokenData.accountName || a.filename))
      : accounts;

    if (toExport.length === 0) {
      vscode.window.showWarningMessage('No accounts selected for export');
      return;
    }

    // Export full token data for transfer
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: toExport.map(a => ({
        filename: a.filename,
        tokenData: a.tokenData,
        // Include password from accounts.json if available
        password: this.getAccountPassword(a.tokenData.accountName || a.filename)
      }))
    };

    const content = JSON.stringify(exportData, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`kiro-accounts-export-${timestamp}.json`),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      fs.writeFileSync(uri.fsPath, content);
      vscode.window.showInformationMessage(`Exported ${toExport.length} accounts with tokens`);
      this.addLog(`✅ Exported ${toExport.length} accounts to ${uri.fsPath}`);
    }
  }

  // Import accounts from export file
  async importAccounts() {
    const uri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { 'JSON': ['json'] },
      openLabel: 'Import Accounts'
    });

    if (!uri || uri.length === 0) return;

    try {
      const content = fs.readFileSync(uri[0].fsPath, 'utf8');
      const data = JSON.parse(content);

      if (!data.accounts || !Array.isArray(data.accounts)) {
        vscode.window.showErrorMessage('Invalid export file format');
        return;
      }

      const tokensDir = getTokensDir();
      if (!fs.existsSync(tokensDir)) {
        fs.mkdirSync(tokensDir, { recursive: true });
      }

      let imported = 0;
      let skipped = 0;

      for (const acc of data.accounts) {
        if (!acc.tokenData) continue;

        // Generate new filename to avoid conflicts
        const accountName = acc.tokenData.accountName || 'imported';
        const timestamp = Date.now();
        const newFilename = `token-BuilderId-IdC-${accountName.replace(/[^a-zA-Z0-9_-]/g, '_')}-${timestamp}.json`;
        const targetPath = path.join(tokensDir, newFilename);

        // Check if account already exists
        const existing = loadAccounts().find(a =>
          a.tokenData.accountName === acc.tokenData.accountName ||
          a.tokenData.refreshToken === acc.tokenData.refreshToken
        );

        if (existing) {
          skipped++;
          continue;
        }

        // Save token file
        fs.writeFileSync(targetPath, JSON.stringify(acc.tokenData, null, 2));
        imported++;

        // Save password to accounts.json if available
        if (acc.password) {
          this.saveAccountPassword(acc.tokenData.accountName, acc.password, acc.tokenData.email);
        }
      }

      this.addLog(`✅ Imported ${imported} accounts, skipped ${skipped} duplicates`);
      vscode.window.showInformationMessage(`Imported ${imported} accounts${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}`);
      this.refresh();

    } catch (err) {
      vscode.window.showErrorMessage(`Import failed: ${err}`);
      this.addLog(`❌ Import failed: ${err}`);
    }
  }

  // Get password from accounts.json
  private getAccountPassword(accountName: string): string | undefined {
    const autoregDir = this.getAutoregDir();
    const accountsFile = path.join(autoregDir, 'accounts.json');

    if (fs.existsSync(accountsFile)) {
      try {
        const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
        const acc = accounts.find((a: any) =>
          a.email?.includes(accountName) || a.name?.includes(accountName)
        );
        return acc?.password;
      } catch { }
    }
    return undefined;
  }

  // Save password to accounts.json
  private saveAccountPassword(accountName: string, password: string, email?: string) {
    const autoregDir = this.getAutoregDir();
    if (!autoregDir) return;

    const accountsFile = path.join(autoregDir, 'accounts.json');
    let accounts: any[] = [];

    if (fs.existsSync(accountsFile)) {
      try {
        accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
      } catch { }
    }

    // Check if already exists
    const existing = accounts.find((a: any) => a.name === accountName || a.email === email);
    if (!existing) {
      accounts.push({
        email: email || accountName,
        password,
        name: accountName,
        created_at: new Date().toISOString(),
        status: 'imported'
      });
      fs.writeFileSync(accountsFile, JSON.stringify(accounts, null, 2));
    }
  }

  async copyPassword(accountName: string) {
    const autoregDir = this.getAutoregDir();
    const accountsFile = path.join(autoregDir, 'accounts.json');

    if (fs.existsSync(accountsFile)) {
      try {
        const accounts = JSON.parse(fs.readFileSync(accountsFile, 'utf8'));
        const acc = accounts.find((a: any) =>
          a.email?.includes(accountName) || a.name?.includes(accountName)
        );
        if (acc?.password) {
          await vscode.env.clipboard.writeText(acc.password);
          vscode.window.showInformationMessage('Password copied to clipboard');
          return;
        }
      } catch { }
    }
    vscode.window.showWarningMessage('Password not found for this account');
  }

  private getAutoregDir(): string {
    const homePath = path.join(os.homedir(), '.kiro-autoreg');
    return homePath;
  }

  // Delete all accounts with exhausted usage limits or suspended
  async deleteExhaustedAccounts() {
    const badAccounts = this._accounts.filter(
      a => a.usage && (
        // Exhausted (100% usage)
        (a.usage.currentUsage !== -1 && a.usage.percentageUsed >= 100) ||
        // Suspended by AWS
        a.usage.suspended === true
      )
    );

    if (badAccounts.length === 0) {
      vscode.window.showInformationMessage('No exhausted/suspended accounts to delete');
      return;
    }

    let deleted = 0;
    for (const acc of badAccounts) {
      const accountName = acc.tokenData.accountName || acc.filename;
      const reason = acc.usage?.suspended ? '🚫 suspended' : '📊 exhausted';
      try {
        // Delete token file directly (skip confirmation since we already confirmed)
        if (fs.existsSync(acc.path)) {
          fs.unlinkSync(acc.path);
          deleted++;
          this.addLog(`🗑 Deleted (${reason}): ${accountName}`);
        }
      } catch (err) {
        this.addLog(`✗ Failed to delete ${accountName}: ${err}`);
      }
    }

    vscode.window.showInformationMessage(`Deleted ${deleted} exhausted/suspended account(s)`);
    this.refresh();
  }

  // Delete all banned accounts
  async deleteBannedAccounts() {
    const bannedAccounts = this._accounts.filter(
      a => a.usage?.isBanned === true
    );

    if (bannedAccounts.length === 0) {
      vscode.window.showInformationMessage('No banned accounts to delete');
      return;
    }

    let deleted = 0;
    for (const acc of bannedAccounts) {
      const accountName = acc.tokenData.accountName || acc.filename;
      try {
        if (fs.existsSync(acc.path)) {
          fs.unlinkSync(acc.path);
          deleted++;
          this.addLog(`🗑 Deleted (⛔ banned): ${accountName}`);
        }
      } catch (err) {
        this.addLog(`✗ Failed to delete ${accountName}: ${err}`);
      }
    }

    vscode.window.showInformationMessage(`Deleted ${deleted} banned account(s)`);
    this.refresh();
  }

  // Refresh all expired tokens
  async refreshAllExpiredTokens() {
    // Find expired accounts (token expired but not exhausted/suspended)
    const expiredAccounts = this._accounts.filter(acc => {
      const usage = acc.usage;
      const isSuspended = usage?.suspended === true;
      const isExhausted = usage && usage.currentUsage !== -1 && usage.percentageUsed >= 100;
      // Only expired tokens, not exhausted or suspended
      return acc.isExpired && !isSuspended && !isExhausted;
    });

    if (expiredAccounts.length === 0) {
      vscode.window.showInformationMessage('No expired tokens to refresh');
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
          const result = await refreshAccountToken(acc.filename, true);
          if (result.success) {
            refreshed++;
            this.addLog(`✓ Refreshed: ${accountName}`);
          } else {
            failed++;
            if (result.isBanned) {
              this.markAccountAsBanned(acc.filename, result.errorMessage);
              this.addLog(`⛔ BANNED: ${accountName}`);
            } else {
              this.addLog(`✗ Failed to refresh: ${accountName} - ${result.errorMessage || result.error}`);
            }
          }
        } catch (err) {
          failed++;
          this.addLog(`✗ Error refreshing ${accountName}: ${err}`);
        }
      }
    });

    const message = `Refreshed ${refreshed} token(s)` + (failed > 0 ? `, ${failed} failed` : '');
    vscode.window.showInformationMessage(message);
    this.refresh();
  }

  // Webview provider implementation
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

  // Check health of currently active account silently
  // Uses CodeWhisperer API to detect bans (OIDC refresh doesn't detect bans!)
  async checkActiveAccountHealth() {
    const activeAccount = this._accounts.find(a => a.isActive);
    if (!activeAccount) return;

    // Use checkAccountBanStatus which checks via CodeWhisperer API
    const { checkAccountBanStatus } = await import('../accounts');
    const accountName = activeAccount.tokenData.accountName || activeAccount.filename;

    try {
      const status = await checkAccountBanStatus(accountName);

      if (status.isBanned) {
        this.markAccountAsBanned(activeAccount.filename, status.errorMessage);
        this.addLog(`⛔ Active account "${accountName}" is BANNED!`);
        vscode.window.showWarningMessage(`⛔ Active account "${accountName}" is banned. Consider switching to another account.`);
        this.refresh();
      } else if (!status.isHealthy && status.error) {
        this.addLog(`⚠️ Active account issue: ${status.errorMessage || status.error}`);
      }
    } catch (e) {
      // Silent fail - don't block startup
    }
  }

  async handleMessage(msg: any) {
    console.log('[Webview] Received message:', msg.command, msg);
    // Import handlers dynamically to avoid circular deps
    const { handleWebviewMessage } = await import('../commands/webview-handler');
    await handleWebviewMessage(this, msg);
  }

  async copyToken(filename: string) {
    const accounts = loadAccounts();
    const account = accounts.find(a => a.filename === filename || a.filename.includes(filename));
    if (account) {
      await vscode.env.clipboard.writeText(account.tokenData.accessToken || '');
      vscode.window.showInformationMessage('Token copied to clipboard');
    }
  }

  async viewQuota(filename: string) {
    const account = this._accounts.find(a => a.filename === filename || a.filename.includes(filename));
    if (account?.usage) {
      vscode.window.showInformationMessage(
        `${account.tokenData.accountName || filename}: ${account.usage.currentUsage}/${account.usage.usageLimit} (${account.usage.percentageUsed.toFixed(1)}%)`
      );
    } else {
      const accountName = account?.tokenData.accountName || filename;
      const cachedUsage = await loadSingleAccountUsage(accountName);
      if (cachedUsage) {
        vscode.window.showInformationMessage(
          `${accountName}: ${cachedUsage.currentUsage}/${cachedUsage.usageLimit} (${cachedUsage.percentageUsed.toFixed(1)}%)`
        );
      } else {
        vscode.window.showWarningMessage('No usage data available. Switch to this account and refresh to load usage.');
      }
    }
  }

  async refreshSingleToken(filename: string) {
    const accountName = filename.replace(/^token-BuilderId-IdC-/, '').replace(/-\d+\.json$/, '').replace(/_/g, ' ');
    vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Refreshing token for ${accountName}...`,
      cancellable: false
    }, async () => {
      const result = await refreshAccountToken(filename, true);
      if (result.success) {
        vscode.window.showInformationMessage(`Token refreshed: ${accountName}`);
        this.refresh();
      } else {
        // If banned, mark the account
        if (result.isBanned) {
          this.markAccountAsBanned(filename, result.errorMessage);
        }
        // Error message already shown by refreshAccountToken
      }
    });
  }

  // Mark account as banned in usage cache
  private markAccountAsBanned(filename: string, reason?: string) {
    const account = this._accounts.find(a => a.filename === filename);
    if (account) {
      const accName = account.tokenData.accountName || filename;
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
      saveAccountUsage(accName, {
        currentUsage: account.usage.currentUsage,
        usageLimit: account.usage.usageLimit,
        percentageUsed: account.usage.percentageUsed,
        daysRemaining: account.usage.daysRemaining,
        isBanned: true,
        banReason: reason
      });

      this.addLog(`⛔ Account marked as BANNED: ${accName}`);
      this.refresh();
    }
  }

  async toggleSetting(setting: string) {
    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');

    switch (setting) {
      case 'autoRefresh':
        const autoRefresh = config.get<boolean>('autoSwitch.enabled', false);
        await config.update('autoSwitch.enabled', !autoRefresh, vscode.ConfigurationTarget.Global);
        break;
      case 'headless':
        const headless = config.get<boolean>('autoreg.headless', false);
        await config.update('autoreg.headless', !headless, vscode.ConfigurationTarget.Global);
        break;
      case 'verbose':
        const verbose = config.get<boolean>('debug.verbose', false);
        await config.update('debug.verbose', !verbose, vscode.ConfigurationTarget.Global);
        break;
      case 'screenshots':
        const screenshots = config.get<boolean>('debug.screenshotsOnError', true);
        await config.update('debug.screenshotsOnError', !screenshots, vscode.ConfigurationTarget.Global);
        break;
    }

    this.refresh();
  }

  async updateSetting(key: string, value: boolean) {
    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');

    switch (key) {
      case 'headless':
        await config.update('autoreg.headless', value, vscode.ConfigurationTarget.Global);
        break;
      case 'verbose':
        await config.update('debug.verbose', value, vscode.ConfigurationTarget.Global);
        break;
      case 'screenshotsOnError':
        await config.update('debug.screenshotsOnError', value, vscode.ConfigurationTarget.Global);
        break;
      case 'spoofing':
        await config.update('autoreg.spoofing', value, vscode.ConfigurationTarget.Global);
        break;
      case 'deviceFlow':
        await config.update('autoreg.deviceFlow', value, vscode.ConfigurationTarget.Global);
        break;
    }
    // Don't call refresh() - it resets the view to main page
    // Settings are saved, UI state is already updated by the toggle
  }

  setLanguage(lang: Language) {
    this._language = lang;
    this._context.globalState.update('language', lang);
    this.refresh();
  }

  async checkForUpdatesManual() {
    const update = await forceCheckForUpdates(this._context);
    this._availableUpdate = update;
    if (update) {
      vscode.window.showInformationMessage(`New version ${update.version} available!`, 'Download').then(sel => {
        if (sel === 'Download') vscode.env.openExternal(vscode.Uri.parse(update.url));
      });
    } else {
      vscode.window.showInformationMessage('You have the latest version!');
    }
    this.refresh();
  }

  // Full refresh - reloads everything
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

  // Partial refresh - accounts only (fast)
  async refreshAccounts() {
    this._accounts = perf('loadAccounts', () => loadAccounts());
    this._stateManager.updateAccounts(this._accounts);
  }

  // Partial refresh - usage only (uses UsageService)
  async refreshUsage() {
    this._kiroUsage = await perfAsync('refreshUsage', () => this._usageService.refresh());

    if (this._kiroUsage) {
      const activeAccount = this._accounts.find(a => a.isActive);
      if (activeAccount) {
        const accountName = activeAccount.tokenData.accountName || activeAccount.filename;
        this._usageService.updateForAccount(accountName, this._kiroUsage);
      }
    }

    this._stateManager.updateUsage(this._kiroUsage);
  }

  // Refresh usage data after account switch - uses UsageService with retry logic
  async refreshUsageAfterSwitch() {
    if (!this._view) return;

    // Get old account name before refresh
    const oldActiveAccount = this._accounts.find(a => a.isActive);
    const oldAccountName = oldActiveAccount
      ? (oldActiveAccount.tokenData.accountName || oldActiveAccount.filename)
      : null;

    // Reset current usage display
    this._kiroUsage = null;
    this._stateManager.updateUsage(null);

    // Reload accounts to get new active state
    await this.refreshAccounts();

    // Get new account name
    const newActiveAccount = this._accounts.find(a => a.isActive);
    const newAccountName = newActiveAccount
      ? (newActiveAccount.tokenData.accountName || newActiveAccount.filename)
      : '';

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

      this._stateManager.updateUsage(this._kiroUsage);
    }

    this._availableUpdate = getAvailableUpdate(this._context);

    // Full re-render with updated data
    this._stateManager.updateFull({
      accounts: this._accounts,
      kiroUsage: this._kiroUsage,
      activeAccount: this._accounts.find(a => a.isActive) || null
    });
  }

  private _renderDebounceTimer: NodeJS.Timeout | null = null;
  private _renderDebounceMs: number = CONFIG.RENDER_DEBOUNCE_MS;

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
      deviceFlow: config.get<boolean>('autoreg.deviceFlow', false)
    };

    const html = perf('generateWebviewHtml', () => generateWebviewHtml({
      accounts: this._accounts,
      autoSwitchEnabled,
      autoRegStatus,
      kiroUsage: this._kiroUsage,
      autoRegSettings,
      consoleLogs: this.consoleLogs,
      version: this._version,
      language: this._language,
      availableUpdate: this._availableUpdate
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
      this._accounts = await loadAccountsWithUsage();
      this.renderWebview();
    } catch (err) {
      console.error('Failed to load all usage:', err);
    }
  }

  async loadUsageForAccount(accountName: string) {
    if (!this._view) return;

    try {
      const usage = await loadSingleAccountUsage(accountName);
      if (usage) {
        const acc = this._accounts.find(a =>
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

  // ============================================
  // IMAP Profiles Management
  // ============================================

  private _profileProvider?: ImapProfileProvider;

  private getProfileProvider(): ImapProfileProvider {
    if (!this._profileProvider) {
      this._profileProvider = ImapProfileProvider.getInstance(this._context);
    }
    return this._profileProvider;
  }

  async loadProfiles() {
    if (!this._view) return;

    const provider = this.getProfileProvider();
    const profiles = provider.getAll();
    const activeId = provider.getActive()?.id;

    this._view.webview.postMessage({
      type: 'profilesLoaded',
      profiles,
      activeProfileId: activeId
    });
  }

  async getActiveProfile() {
    if (!this._view) return;

    const provider = this.getProfileProvider();
    const profile = provider.getActive();

    this._view.webview.postMessage({
      type: 'activeProfileLoaded',
      profile: profile || null
    });
  }

  async getProfile(profileId: string) {
    if (!this._view) return;

    const provider = this.getProfileProvider();
    const profile = provider.getById(profileId);

    if (profile) {
      this._view.webview.postMessage({
        type: 'profileLoaded',
        profile
      });
    }
  }

  async createProfile(profileData: Partial<ImapProfile>) {
    this.addLog(`Creating profile: ${JSON.stringify(profileData)}`);
    const provider = this.getProfileProvider();

    try {
      const profile = await provider.create({
        name: profileData.name || 'New Profile',
        imap: profileData.imap || { server: '', user: '', password: '' },
        strategy: profileData.strategy || { type: 'single' },
        status: 'active'
      });

      this.addLog(`✓ Created profile: ${profile.name} (${profile.id})`);
      vscode.window.showInformationMessage(`Profile "${profile.name}" created`);
      await this.loadProfiles();
    } catch (err) {
      this.addLog(`✗ Failed to create profile: ${err}`);
      vscode.window.showErrorMessage(`Failed to create profile: ${err}`);
    }
  }

  async updateProfile(profileData: Partial<ImapProfile>) {
    if (!profileData.id) return;

    const provider = this.getProfileProvider();

    try {
      const profile = await provider.update(profileData.id, profileData);
      if (profile) {
        this.addLog(`✓ Updated profile: ${profile.name}`);
        vscode.window.showInformationMessage(`Profile "${profile.name}" updated`);
        await this.loadProfiles();
      }
    } catch (err) {
      this.addLog(`✗ Failed to update profile: ${err}`);
      vscode.window.showErrorMessage(`Failed to update profile: ${err}`);
    }
  }

  async deleteProfile(profileId: string) {
    const provider = this.getProfileProvider();
    const profile = provider.getById(profileId);

    if (!profile) return;

    try {
      await provider.delete(profileId);
      this.addLog(`✓ Deleted profile: ${profile.name}`);
      vscode.window.showInformationMessage(`Profile "${profile.name}" deleted`);
      await this.loadProfiles();
    } catch (err) {
      this.addLog(`✗ Failed to delete profile: ${err}`);
      vscode.window.showErrorMessage(`Failed to delete profile: ${err}`);
    }
  }

  async setActiveProfile(profileId: string) {
    const provider = this.getProfileProvider();

    try {
      await provider.setActive(profileId);
      const profile = provider.getById(profileId);
      if (profile) {
        this.addLog(`✓ Active profile: ${profile.name}`);
        // Update settings view with new active profile
        this._view?.webview.postMessage({
          type: 'activeProfileLoaded',
          profile
        });
      }
      await this.loadProfiles();
    } catch (err) {
      this.addLog(`✗ Failed to set active profile: ${err}`);
    }
  }

  async detectProvider(email: string) {
    if (!this._view || !email) return;

    const provider = this.getProfileProvider();
    const hint = provider.getProviderHint(email);
    const recommended = provider.getRecommendedStrategy(email);

    this._view.webview.postMessage({
      type: 'providerDetected',
      hint,
      recommendedStrategy: recommended
    });
  }

  async testImapConnection(params: { server: string; user: string; password: string; port: number }) {
    if (!this._view) return;

    this.addLog(`🔌 Testing IMAP: ${params.server}:${params.port} as ${params.user}...`);

    // Send testing status to UI
    this._view.webview.postMessage({
      type: 'imapTestResult',
      status: 'testing',
      message: 'Connecting...'
    });

    try {
      const { spawn } = require('child_process');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

      // Python one-liner to test IMAP
      const pythonCode = `
import imaplib
import json
import sys
try:
    server = sys.argv[1]
    port = int(sys.argv[2])
    user = sys.argv[3]
    password = sys.argv[4]
    imap = imaplib.IMAP4_SSL(server, port)
    imap.login(user, password)
    status, folders = imap.list()
    folder_count = len(folders) if folders else 0
    imap.logout()
    print(json.dumps({"success": True, "folders": folder_count}))
except Exception as e:
    print(json.dumps({"success": False, "error": str(e)}))
`;

      const proc = spawn(pythonCmd, ['-c', pythonCode, params.server, params.port.toString(), params.user, params.password]);

      let output = '';
      proc.stdout.on('data', (data: Buffer) => { output += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { output += data.toString(); });

      proc.on('close', (code: number) => {
        try {
          const result = JSON.parse(output.trim());
          if (result.success) {
            this.addLog(`✅ IMAP connected! Found ${result.folders} folders`);
            this._view?.webview.postMessage({
              type: 'imapTestResult',
              status: 'success',
              message: `Connected! ${result.folders} folders found`
            });
          } else {
            this.addLog(`❌ IMAP failed: ${result.error}`);
            this._view?.webview.postMessage({
              type: 'imapTestResult',
              status: 'error',
              message: result.error
            });
          }
        } catch {
          this.addLog(`❌ IMAP test error: ${output}`);
          this._view?.webview.postMessage({
            type: 'imapTestResult',
            status: 'error',
            message: output || 'Unknown error'
          });
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        proc.kill();
      }, 10000);

    } catch (err) {
      this.addLog(`❌ IMAP test error: ${err}`);
      this._view?.webview.postMessage({
        type: 'imapTestResult',
        status: 'error',
        message: String(err)
      });
    }
  }

  async importEmailsFromFile() {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { 'Text files': ['txt', 'csv'] },
      title: 'Select file with email list'
    });

    if (!uris || uris.length === 0) return;

    try {
      const content = fs.readFileSync(uris[0].fsPath, 'utf8');
      const emails = content
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e.includes('@'));

      if (emails.length > 0 && this._view) {
        this._view.webview.postMessage({
          type: 'emailsImported',
          emails
        });
        vscode.window.showInformationMessage(`Imported ${emails.length} emails`);
      } else {
        vscode.window.showWarningMessage('No valid emails found in file');
      }
    } catch (err) {
      vscode.window.showErrorMessage(`Failed to read file: ${err}`);
    }
  }

  sendPatchStatus(status: { isPatched: boolean; kiroVersion?: string; patchVersion?: string; currentMachineId?: string; error?: string }) {
    if (this._view) {
      this._view.webview.postMessage({
        type: 'patchStatus',
        ...status
      });
    }
  }

  // === Bulk Actions ===

  // Refresh tokens for selected accounts
  async refreshSelectedTokens(filenames: string[]) {
    if (!filenames || filenames.length === 0) {
      vscode.window.showWarningMessage('No accounts selected');
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
        const account = this._accounts.find(a =>
          a.filename === filename ||
          a.tokenData.accountName === filename ||
          a.filename.includes(filename)
        );

        if (!account) continue;

        const accountName = account.tokenData.accountName || account.filename;

        progress.report({
          message: `${i + 1}/${filenames.length}: ${accountName}`,
          increment: (100 / filenames.length)
        });

        try {
          const result = await refreshAccountToken(account.filename, true);
          if (result.success) {
            refreshed++;
            this.addLog(`✓ Refreshed: ${accountName}`);
          } else {
            failed++;
            if (result.isBanned) {
              banned++;
              this.markAccountAsBanned(account.filename, result.errorMessage);
              this.addLog(`⛔ BANNED: ${accountName}`);
            } else {
              this.addLog(`✗ Failed: ${accountName} - ${result.errorMessage || result.error}`);
            }
          }
        } catch (err) {
          failed++;
          this.addLog(`✗ Error: ${accountName} - ${err}`);
        }
      }
    });

    const message = `Refreshed ${refreshed}/${filenames.length}` +
      (failed > 0 ? `, ${failed} failed` : '') +
      (banned > 0 ? ` (${banned} banned)` : '');

    vscode.window.showInformationMessage(message);
    this.refresh();
  }

  // Delete selected accounts
  async deleteSelectedAccounts(filenames: string[]) {
    if (!filenames || filenames.length === 0) {
      vscode.window.showWarningMessage('No accounts selected');
      return;
    }

    let deleted = 0;
    for (const filename of filenames) {
      const account = this._accounts.find(a =>
        a.filename === filename ||
        a.tokenData.accountName === filename ||
        a.filename.includes(filename)
      );

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

    vscode.window.showInformationMessage(`Deleted ${deleted} account(s)`);
    this.refresh();
  }

  // Check health of all accounts (detect bans and issues)
  // Uses CodeWhisperer API to detect bans (OIDC refresh doesn't detect bans!)
  async checkAllAccountsHealth() {
    this.addLog(`🔍 Checking health of ${this._accounts.length} accounts...`);

    let healthy = 0;
    let banned = 0;
    let expired = 0;
    let noCredentials = 0;

    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: `Checking ${this._accounts.length} accounts...`,
      cancellable: true
    }, async (progress, token) => {
      // Use checkAccountBanStatus which checks via CodeWhisperer API (not just OIDC)
      const { checkAccountBanStatus } = await import('../accounts');

      for (let i = 0; i < this._accounts.length; i++) {
        if (token.isCancellationRequested) break;

        const acc = this._accounts[i];
        const accountName = acc.tokenData.accountName || acc.filename;

        progress.report({
          message: `${i + 1}/${this._accounts.length}: ${accountName}`,
          increment: (100 / this._accounts.length)
        });

        // checkAccountBanStatus does OIDC refresh + CodeWhisperer API check
        const status = await checkAccountBanStatus(accountName);

        if (status.isHealthy) {
          healthy++;
          // Clear any previous ban status
          if (acc.usage) {
            acc.usage.isBanned = false;
            acc.usage.banReason = undefined;
          }
        } else if (status.isBanned) {
          banned++;
          this.markAccountAsBanned(acc.filename, status.errorMessage);
          this.addLog(`⛔ BANNED: ${accountName}`);
        } else if (!status.hasCredentials) {
          noCredentials++;
        } else if (status.isExpired) {
          expired++;
          this.addLog(`⏰ Expired: ${accountName}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
    });

    const summary = `Health check: ${healthy} healthy, ${banned} banned, ${expired} expired, ${noCredentials} no credentials`;
    this.addLog(`✅ ${summary}`);
    vscode.window.showInformationMessage(summary);
    this.refresh();
  }
}
