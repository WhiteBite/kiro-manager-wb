/**
 * Kiro Accounts WebviewView Provider
 * Manages the sidebar panel for account management
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadAccounts, loadAccountsWithUsage, loadSingleAccountUsage, updateActiveAccountUsage, switchToAccount, refreshAccountToken, deleteAccount } from '../accounts';
import { getTokensDir, getKiroUsageFromDB, KiroUsageData } from '../utils';
import { generateWebviewHtml } from '../webview';
import { getAvailableUpdate, forceCheckForUpdates } from '../update-checker';
import { AccountInfo } from '../types';
import { Language } from '../webview/i18n';
import { autoregProcess } from '../process-manager';

export class KiroAccountsProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _kiroUsage: KiroUsageData | null = null;
  private _accounts: AccountInfo[] = [];
  private _consoleLogs: string[] = [];
  private _version: string;
  private _language: Language = 'en';
  private _availableUpdate: { version: string; url: string } | null = null;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._version = context.extension.packageJSON.version || 'unknown';
    this._language = context.globalState.get<Language>('language', 'en');
    this._availableUpdate = getAvailableUpdate(context);
  }

  get context(): vscode.ExtensionContext {
    return this._context;
  }

  get accounts(): AccountInfo[] {
    return this._accounts;
  }

  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${message}`;
    this._consoleLogs.push(logLine);
    if (this._consoleLogs.length > 200) {
      this._consoleLogs = this._consoleLogs.slice(-200);
    }
    this._writeToLogFile(logLine);
    // Send incremental update instead of full refresh to avoid flickering
    this._sendLogUpdate(logLine);
  }

  private _sendLogUpdate(logLine: string) {
    if (this._view) {
      this._view.webview.postMessage({ type: 'appendLog', log: logLine });
    }
  }

  private _writeToLogFile(line: string) {
    try {
      const logFile = path.join(os.homedir(), '.kiro-batch-login', 'autoreg.log');
      const logDir = path.dirname(logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(logFile, line + '\n');
    } catch {}
  }

  clearLogs() {
    this._consoleLogs = [];
    try {
      const logFile = path.join(os.homedir(), '.kiro-batch-login', 'autoreg.log');
      fs.writeFileSync(logFile, '');
    } catch {}
    this.refresh();
  }

  async openLogFile() {
    const logFile = path.join(os.homedir(), '.kiro-batch-login', 'autoreg.log');
    if (fs.existsSync(logFile)) {
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
      } catch {}
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
      } catch {}
    }
    vscode.window.showWarningMessage('Password not found for this account');
  }

  private getAutoregDir(): string {
    const homePath = path.join(os.homedir(), '.kiro-autoreg');
    return homePath;
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

  async refresh() {
    if (this._view) {
      this._accounts = loadAccounts();
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      const autoSwitchEnabled = config.get<boolean>('autoSwitch.enabled', false);
      const autoRegStatus = this._context.globalState.get<string>('autoRegStatus', '');

      try {
        this._kiroUsage = await getKiroUsageFromDB();
        if (this._kiroUsage) {
          const activeAccount = this._accounts.find(a => a.isActive);
          if (activeAccount) {
            const accountName = activeAccount.tokenData.accountName || activeAccount.filename;
            updateActiveAccountUsage(accountName, this._kiroUsage);
          }
        }
      } catch (err) {
        this._kiroUsage = null;
      }

      this._availableUpdate = getAvailableUpdate(this._context);
      this.renderWebview();
      this.loadAllUsage();
    }
  }

  private renderWebview() {
    if (!this._view) return;

    const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
    const autoSwitchEnabled = config.get<boolean>('autoSwitch.enabled', false);
    const autoRegStatus = this._context.globalState.get<string>('autoRegStatus', '');
    const autoRegSettings = {
      headless: config.get<boolean>('autoreg.headless', false),
      verbose: config.get<boolean>('debug.verbose', false),
      screenshotsOnError: config.get<boolean>('debug.screenshotsOnError', true)
    };

    this._view.webview.html = generateWebviewHtml({
      accounts: this._accounts,
      autoSwitchEnabled,
      autoRegStatus,
      kiroUsage: this._kiroUsage,
      autoRegSettings,
      consoleLogs: this._consoleLogs,
      version: this._version,
      language: this._language,
      availableUpdate: this._availableUpdate
    });
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
}
