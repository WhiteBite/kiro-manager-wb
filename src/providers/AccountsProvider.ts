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

export class KiroAccountsProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _kiroUsage: KiroUsageData | null = null;
  private _accounts: AccountInfo[] = [];
  private _version: string;
  private _language: Language = 'en';
  private _availableUpdate: { version: string; url: string } | null = null;
  private _stateManager: StateManager;
  private _unsubscribe?: () => void;

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

  // Export accounts
  async exportAccounts() {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
      vscode.window.showWarningMessage('No accounts to export');
      return;
    }

    const data = accounts.map(a => ({
      name: a.tokenData.accountName || a.filename,
      email: a.tokenData.email || '',
      expires: a.expiresIn,
      usage: a.usage?.currentUsage || 0
    }));

    const content = JSON.stringify(data, null, 2);
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('kiro-accounts.json'),
      filters: { 'JSON': ['json'] }
    });

    if (uri) {
      fs.writeFileSync(uri.fsPath, content);
      vscode.window.showInformationMessage(`Exported ${accounts.length} accounts`);
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
          const success = await refreshAccountToken(acc.filename);
          if (success) {
            refreshed++;
            this.addLog(`✓ Refreshed: ${accountName}`);
          } else {
            failed++;
            this.addLog(`✗ Failed to refresh: ${accountName}`);
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

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      await this.handleMessage(msg);
    });
  }

  async handleMessage(msg: any) {
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
      const success = await refreshAccountToken(filename);
      if (success) {
        vscode.window.showInformationMessage(`Token refreshed: ${accountName}`);
        this.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to refresh token: ${accountName}`);
      }
    });
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
    }

    this.refresh();
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
      spoofing: config.get<boolean>('autoreg.spoofing', true)
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
    const provider = this.getProfileProvider();

    try {
      const profile = await provider.create({
        name: profileData.name || 'New Profile',
        imap: profileData.imap || { server: '', user: '', password: '' },
        strategy: profileData.strategy || { type: 'single' },
        status: 'active'
      });

      this.addLog(`✓ Created profile: ${profile.name}`);
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

    // For now, just show a message - actual IMAP test would require Python
    this.addLog(`Testing IMAP: ${params.server}:${params.port} as ${params.user}...`);

    // TODO: Call Python script to test IMAP connection
    vscode.window.showInformationMessage(
      `IMAP test: ${params.server}:${params.port}`,
      'Connection test requires running auto-reg'
    );
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
}
