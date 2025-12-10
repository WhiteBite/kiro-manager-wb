/**
 * Kiro Account Switcher Extension v2.1
 * Compact sidebar panel for managing Kiro accounts
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadAccounts, loadAccountsWithUsage, loadSingleAccountUsage, updateActiveAccountUsage, switchToAccount, refreshAccountToken, refreshAllAccounts, getCurrentToken, deleteAccount } from './accounts';
import { getTokensDir, getKiroUsageFromDB, KiroUsageData } from './utils';
import { generateWebviewHtml } from './webview';

let statusBarItem: vscode.StatusBarItem;
let accountsProvider: KiroAccountsProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Kiro Account Switcher v2.1 activated');

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'kiroAccountSwitcher.switchAccount';
  statusBarItem.tooltip = 'Switch Kiro account';
  context.subscriptions.push(statusBarItem);

  accountsProvider = new KiroAccountsProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('kiroAccountsPanel', accountsProvider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('kiroAccountSwitcher.switchAccount', () => quickSwitch()),
    vscode.commands.registerCommand('kiroAccountSwitcher.listAccounts', () => accountsProvider.refresh()),
    vscode.commands.registerCommand('kiroAccountSwitcher.importToken', () => importToken()),
    vscode.commands.registerCommand('kiroAccountSwitcher.currentAccount', () => showCurrentAccount()),
    vscode.commands.registerCommand('kiroAccountSwitcher.signOut', () => signOut()),
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshAccounts', () => accountsProvider.refresh()),
    vscode.commands.registerCommand('kiroAccountSwitcher.openSettings', () => openSettings()),
    vscode.commands.registerCommand('kiroAccountSwitcher.switchTo', (name: string) => doSwitch(name)),
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshToken', (name: string) => doRefresh(name))
  );

  updateStatusBar();
  setupAutoSwitch(context);
}

async function doSwitch(name: string) {
  await switchToAccount(name);
  accountsProvider?.refresh();
  updateStatusBar();
}

async function doRefresh(name: string) {
  await refreshAccountToken(name);
  accountsProvider?.refresh();
}

class KiroAccountsProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;
  private _kiroUsage: KiroUsageData | null = null;
  private _accounts: import('./types').AccountInfo[] = [];
  private _consoleLogs: string[] = [];
  private _version: string;
  private _language: 'en' | 'ru' = 'en';

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    // Get version from package.json
    this._version = context.extension.packageJSON.version || 'unknown';
    // Load saved language preference
    this._language = context.globalState.get<'en' | 'ru'>('language', 'en');
  }
  
  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${message}`;
    this._consoleLogs.push(logLine);
    // Keep last 200 logs in memory
    if (this._consoleLogs.length > 200) {
      this._consoleLogs = this._consoleLogs.slice(-200);
    }
    // Also write to log file
    this._writeToLogFile(logLine);
    this.refresh();
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
    // Also clear log file
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
  
  private _autoRegProcess: any = null;
  
  stopAutoReg() {
    if (this._autoRegProcess) {
      try {
        this._autoRegProcess.kill();
        this.addLog('⏹ Auto-reg stopped by user');
        this.setStatus('⏹ Stopped');
      } catch (e) {
        this.addLog('⚠️ Failed to stop process');
      }
      this._autoRegProcess = null;
    }
  }
  
  setAutoRegProcess(proc: any) {
    this._autoRegProcess = proc;
  }
  
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
    // Try to get password from storage
    const autoregDir = getAutoregDir(this._context);
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

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    
    // Initial render on first load
    this.refresh();
    
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case 'switch':
          await doSwitch(msg.account);
          break;
        case 'refresh':
          await doRefresh(msg.account);
          break;
        case 'delete':
          await deleteAccount(msg.account);
          this.refresh();
          break;
        case 'settings':
          openSettings();
          break;
        case 'import':
          await importToken();
          this.refresh();
          break;
        case 'autoreg':
          await runAutoReg(this._context, this);
          break;
        case 'refreshAll':
          await refreshAllAccounts();
          this.refresh();
          break;
        case 'openDashboard':
          vscode.commands.executeCommand('kiro.accountDashboard.showDashboard');
          break;
        case 'loadUsage':
          await this.loadUsageForAccount(msg.account);
          break;
        case 'loadAllUsage':
          await this.loadAllUsage();
          break;
        case 'toggleSetting':
          await this.toggleSetting(msg.setting);
          break;
        case 'clearConsole':
          this.clearLogs();
          break;
        case 'export':
          await this.exportAccounts();
          break;
        case 'copyPassword':
          await this.copyPassword(msg.account);
          break;
        case 'stopAutoReg':
          this.stopAutoReg();
          break;
        case 'openLog':
          await this.openLogFile();
          break;
        // New handlers for card buttons
        case 'switchAccount':
          await doSwitch(msg.email);
          break;
        case 'copyToken':
          await this.copyToken(msg.email);
          break;
        case 'viewQuota':
          await this.viewQuota(msg.email);
          break;
        case 'deleteAccount':
          await deleteAccount(msg.email);
          this.refresh();
          break;
        case 'startAutoReg':
          await runAutoReg(this._context, this);
          break;
        case 'importToken':
          await importToken();
          this.refresh();
          break;
        case 'setLanguage':
          this._language = msg.language;
          this._context.globalState.update('language', msg.language);
          this.refresh();
          break;
      }
    });
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
    const accounts = loadAccounts();
    const account = accounts.find(a => a.filename === filename || a.filename.includes(filename));
    if (account?.usage) {
      vscode.window.showInformationMessage(
        `${account.tokenData.accountName || filename}: ${account.usage.currentUsage}/${account.usage.usageLimit} (${account.usage.percentageUsed.toFixed(1)}%)`
      );
    } else {
      vscode.window.showWarningMessage('No usage data available for this account');
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

    this.refresh();
  }

  async refresh() {
    if (this._view) {
      // First load accounts without usage (fast)
      this._accounts = loadAccounts();
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      const autoSwitchEnabled = config.get<boolean>('autoSwitch.enabled', false);
      const autoRegStatus = this._context.globalState.get<string>('autoRegStatus', '');
      
      // Try to get Kiro usage data for active account and save to cache
      try {
        this._kiroUsage = await getKiroUsageFromDB();
        console.log('Kiro usage data:', this._kiroUsage);
        
        // Save usage for active account to cache
        if (this._kiroUsage) {
          const activeAccount = this._accounts.find(a => a.isActive);
          if (activeAccount) {
            const accountName = activeAccount.tokenData.accountName || activeAccount.filename;
            updateActiveAccountUsage(accountName, this._kiroUsage);
            console.log(`Saved usage for ${accountName}`);
          }
        }
      } catch (err) {
        console.error('Failed to get Kiro usage:', err);
        this._kiroUsage = null;
      }
      
      // Get autoreg settings
      const autoRegSettings = {
        headless: config.get<boolean>('autoreg.headless', false),
        verbose: config.get<boolean>('debug.verbose', false),
        screenshotsOnError: config.get<boolean>('debug.screenshotsOnError', true)
      };
      
      // Render immediately with basic data
      this._view.webview.html = generateWebviewHtml(this._accounts, autoSwitchEnabled, autoRegStatus, undefined, this._kiroUsage, autoRegSettings, this._consoleLogs, this._version, this._language);
      
      // Then load usage for all accounts in background
      this.loadAllUsage();
    }
    updateStatusBar();
  }
  
  async loadAllUsage() {
    if (!this._view) return;
    
    try {
      this._accounts = await loadAccountsWithUsage();
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      const autoSwitchEnabled = config.get<boolean>('autoSwitch.enabled', false);
      const autoRegStatus = this._context.globalState.get<string>('autoRegStatus', '');
      
      const autoRegSettings = {
        headless: config.get<boolean>('autoreg.headless', false),
        verbose: config.get<boolean>('debug.verbose', false),
        screenshotsOnError: config.get<boolean>('debug.screenshotsOnError', true)
      };
      
      this._view.webview.html = generateWebviewHtml(this._accounts, autoSwitchEnabled, autoRegStatus, undefined, this._kiroUsage, autoRegSettings, this._consoleLogs, this._version, this._language);
    } catch (err) {
      console.error('Failed to load all usage:', err);
    }
  }
  
  async loadUsageForAccount(accountName: string) {
    if (!this._view) return;
    
    try {
      const usage = await loadSingleAccountUsage(accountName);
      if (usage) {
        // Update account in list
        const acc = this._accounts.find(a => 
          a.tokenData.accountName === accountName || 
          a.filename.includes(accountName)
        );
        if (acc) {
          acc.usage = usage;
          
          const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
          const autoSwitchEnabled = config.get<boolean>('autoSwitch.enabled', false);
          const autoRegStatus = this._context.globalState.get<string>('autoRegStatus', '');
          
          const autoRegSettings = {
            headless: config.get<boolean>('autoreg.headless', false),
            verbose: config.get<boolean>('debug.verbose', false),
            screenshotsOnError: config.get<boolean>('debug.screenshotsOnError', true)
          };
          
          this._view.webview.html = generateWebviewHtml(this._accounts, autoSwitchEnabled, autoRegStatus, undefined, this._kiroUsage, autoRegSettings, this._consoleLogs, this._version, this._language);
        }
      }
    } catch (err) {
      console.error(`Failed to load usage for ${accountName}:`, err);
    }
  }

  setStatus(status: string) {
    this._context.globalState.update('autoRegStatus', status);
    this.refresh();
  }
}

function updateStatusBar() {
  const accounts = loadAccounts();
  const active = accounts.find(a => a.isActive);
  statusBarItem.text = active ? `$(account) ${active.tokenData.accountName}` : '$(account) Kiro';
  statusBarItem.show();
}

async function quickSwitch() {
  const accounts = loadAccounts();
  if (accounts.length === 0) {
    vscode.window.showWarningMessage('No accounts. Import tokens first.');
    return;
  }

  const items = accounts.map(acc => ({
    label: `${acc.isActive ? '✓ ' : ''}${acc.tokenData.accountName || acc.filename}`,
    description: acc.expiresIn,
    account: acc
  }));

  const selected = await vscode.window.showQuickPick(items, { placeHolder: 'Select account' });
  if (selected) {
    await doSwitch(selected.account.tokenData.accountName || selected.account.filename);
  }
}

async function importToken() {
  const fileUri = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectMany: false,
    filters: { 'JSON': ['json'] },
    title: 'Import Token'
  });

  if (!fileUri?.[0]) return;

  try {
    const content = fs.readFileSync(fileUri[0].fsPath, 'utf8');
    const tokenData = JSON.parse(content);
    if (!tokenData.accessToken) throw new Error('Invalid token');

    const tokensDir = getTokensDir();
    const filename = path.basename(fileUri[0].fsPath);
    fs.copyFileSync(fileUri[0].fsPath, path.join(tokensDir, filename));
  } catch (error) {
    console.error('Import failed:', error);
  }
}

function showCurrentAccount() {
  const accounts = loadAccounts();
  const active = accounts.find(a => a.isActive);
  if (active) {
    console.log('Current account:', active.tokenData.accountName);
  }
}

async function signOut() {
  try {
    await vscode.commands.executeCommand('_signOutOfKiro');
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'kiroAccountSwitcher');
}

function getAutoregDir(context: vscode.ExtensionContext): string {
  // Priority: 1. Workspace, 2. Home dir, 3. Extension bundled (extract to home)
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const workspacePath = path.join(workspaceFolder, 'kiro-batch-login', 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-autoreg');
  const bundledPath = path.join(context.extensionPath, 'autoreg-bundled');
  
  // Check workspace first
  if (fs.existsSync(path.join(workspacePath, 'registration', 'register_auto.py'))) {
    return workspacePath;
  }
  
  // Check home dir
  if (fs.existsSync(path.join(homePath, 'registration', 'register_auto.py'))) {
    return homePath;
  }
  
  // Check bundled and extract
  if (fs.existsSync(bundledPath)) {
    console.log('Extracting bundled autoreg to:', homePath);
    
    // Recursive copy function
    const copyRecursive = (src: string, dst: string) => {
      if (!fs.existsSync(dst)) {
        fs.mkdirSync(dst, { recursive: true });
      }
      const items = fs.readdirSync(src);
      for (const item of items) {
        const srcPath = path.join(src, item);
        const dstPath = path.join(dst, item);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          copyRecursive(srcPath, dstPath);
        } else {
          fs.copyFileSync(srcPath, dstPath);
        }
      }
    };
    
    copyRecursive(bundledPath, homePath);
    console.log('Extracted files to:', homePath);
    return homePath;
  }
  
  return '';
}

// Detect python command (python3 on Linux/Mac, python on Windows)
function getPythonCommand(): string {
  const { spawnSync } = require('child_process');
  
  // Try python3 first (Linux/Mac)
  const py3 = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  if (py3.status === 0) return 'python3';
  
  // Fallback to python (Windows)
  const py = spawnSync('python', ['--version'], { encoding: 'utf8' });
  if (py.status === 0) return 'python';
  
  return 'python'; // Default
}

function getPipCommand(): string {
  const { spawnSync } = require('child_process');
  
  const pip3 = spawnSync('pip3', ['--version'], { encoding: 'utf8' });
  if (pip3.status === 0) return 'pip3';
  
  return 'pip';
}

async function installDependencies(autoregDir: string, provider: KiroAccountsProvider): Promise<boolean> {
  const { spawnSync } = require('child_process');
  const isWindows = process.platform === 'win32';
  
  // Install Python dependencies
  const requirementsPath = path.join(autoregDir, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    provider.addLog('Installing Python dependencies...');
    provider.setStatus('{"step":0,"totalSteps":8,"stepName":"Setup","detail":"Installing Python deps..."}');
    
    const pipCmd = getPipCommand();
    provider.addLog(`Using: ${pipCmd} install -r requirements.txt`);
    
    const pipResult = spawnSync(pipCmd, ['install', '-r', requirementsPath, '--user', '--quiet'], {
      cwd: autoregDir,
      encoding: 'utf8',
      timeout: 180000, // 3 minutes
      shell: isWindows
    });
    
    if (pipResult.status === 0) {
      provider.addLog('✓ Python dependencies installed');
    } else {
      const errMsg = pipResult.stderr || pipResult.error?.message || 'Unknown error';
      provider.addLog(`✗ pip install failed: ${errMsg}`);
      // Try without --user flag
      provider.addLog('Retrying without --user flag...');
      const pipRetry = spawnSync(pipCmd, ['install', '-r', requirementsPath, '--quiet'], {
        cwd: autoregDir,
        encoding: 'utf8',
        timeout: 180000,
        shell: isWindows
      });
      if (pipRetry.status !== 0) {
        provider.addLog(`✗ pip install failed again: ${pipRetry.stderr || pipRetry.error?.message}`);
        return false;
      }
      provider.addLog('✓ Python dependencies installed (system-wide)');
    }
  } else {
    provider.addLog('⚠️ requirements.txt not found');
  }
  
  // Install Node.js dependencies if package.json exists
  const packageJsonPath = path.join(autoregDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    provider.addLog('Installing Node.js dependencies...');
    provider.setStatus('{"step":0,"totalSteps":8,"stepName":"Setup","detail":"Installing Node deps..."}');
    
    // Check if npm is available
    const npmCheck = spawnSync('npm', ['--version'], { encoding: 'utf8', shell: isWindows });
    if (npmCheck.status !== 0) {
      provider.addLog('⚠️ npm not found, skipping Node.js deps');
    } else {
      provider.addLog(`npm version: ${npmCheck.stdout?.trim()}`);
      
      const npmResult = spawnSync('npm', ['install', '--silent'], {
        cwd: autoregDir,
        encoding: 'utf8',
        timeout: 180000, // 3 minutes
        shell: isWindows
      });
      
      if (npmResult.status === 0) {
        provider.addLog('✓ Node.js dependencies installed');
      } else {
        provider.addLog(`⚠️ npm install warning: ${npmResult.stderr || ''}`);
        // Don't fail - node deps might not be critical
      }
    }
  }
  
  return true;
}

async function runAutoReg(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
  const autoregDir = getAutoregDir(context);
  const finalPath = autoregDir ? path.join(autoregDir, 'registration', 'register_auto.py') : '';
  
  if (!finalPath || !fs.existsSync(finalPath)) {
    vscode.window.showWarningMessage('Auto-reg script not found. Place autoreg folder in workspace or ~/.kiro-autoreg/');
    return;
  }

  // Get settings from VS Code config
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const headless = config.get<boolean>('autoreg.headless', false);
  const verbose = config.get<boolean>('debug.verbose', false);
  
  // IMAP settings
  const imapServer = config.get<string>('imap.server', '');
  const imapUser = config.get<string>('imap.user', '');
  const imapPassword = config.get<string>('imap.password', '');
  const emailDomain = config.get<string>('autoreg.emailDomain', 'example.com');
  
  // Check IMAP settings
  if (!imapServer || !imapUser || !imapPassword) {
    const result = await vscode.window.showWarningMessage(
      'IMAP settings not configured. Configure now?',
      'Open Settings', 'Cancel'
    );
    if (result === 'Open Settings') {
      vscode.commands.executeCommand('workbench.action.openSettings', 'kiroAccountSwitcher.imap');
    }
    return;
  }
  
  // Check Python availability first
  const pythonCmd = getPythonCommand();
  provider.addLog(`Platform: ${process.platform}`);
  provider.addLog(`Python command: ${pythonCmd}`);
  
  // Verify Python works
  const { spawnSync } = require('child_process');
  const pyCheck = spawnSync(pythonCmd, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (pyCheck.status !== 0) {
    provider.addLog(`✗ Python not found: ${pyCheck.stderr || pyCheck.error}`);
    provider.setStatus('✗ Python not found. Install Python 3.10+');
    return;
  }
  provider.addLog(`✓ ${pyCheck.stdout?.trim() || 'Python OK'}`);
  
  // Check if dependencies need to be installed (first run check)
  const depsInstalledFlag = path.join(autoregDir, '.deps_installed');
  if (!fs.existsSync(depsInstalledFlag)) {
    provider.addLog('First run - installing dependencies...');
    provider.setStatus('{"step":0,"totalSteps":8,"stepName":"Setup","detail":"Installing dependencies..."}');
    const installed = await installDependencies(autoregDir, provider);
    if (installed) {
      fs.writeFileSync(depsInstalledFlag, new Date().toISOString());
      provider.addLog('✓ Dependencies installed');
    } else {
      provider.addLog('✗ Failed to install dependencies');
      provider.setStatus('✗ Failed to install dependencies. Check console.');
      return;
    }
  }

  provider.setStatus('{"step":1,"totalSteps":8,"stepName":"Starting","detail":"Initializing..."}');

  const { spawn } = require('child_process');
  
  // Build args based on settings
  const args = [finalPath];
  if (headless) {
    args.push('--headless');
  } else {
    args.push('--no-headless');
  }
  if (verbose) {
    args.push('--verbose');
  }
  args.push('--domain', emailDomain);
  
  // Pass IMAP settings via environment variables
  const env = {
    ...process.env,
    IMAP_SERVER: imapServer,
    IMAP_USER: imapUser,
    IMAP_PASSWORD: imapPassword,
    EMAIL_DOMAIN: emailDomain
  };
  
  provider.addLog(`Starting autoreg...`);
  provider.addLog(`Working dir: ${autoregDir}`);
  provider.addLog(`Python: ${pythonCmd}`);
  provider.addLog(`Args: ${args.join(' ')}`);
  
  // On Windows, use shell: true for proper command execution
  const isWindows = process.platform === 'win32';
  const proc = spawn(pythonCmd, args, { 
    cwd: autoregDir, 
    env,
    shell: isWindows
  });
  
  // Save process reference for stop functionality
  provider.setAutoRegProcess(proc);

  proc.stdout.on('data', (data: Buffer) => {
    const output = data.toString();
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('PROGRESS:')) {
        const json = line.substring(9);
        provider.setStatus(json);
        try {
          const p = JSON.parse(json);
          provider.addLog(`[${p.step}/${p.totalSteps}] ${p.stepName}: ${p.detail}`);
        } catch {}
      } else if (line.trim()) {
        provider.addLog(line.trim());
      }
    }
  });

  proc.stderr.on('data', async (data: Buffer) => {
    const error = data.toString().trim();
    provider.addLog(`✗ ${error}`);
    
    if (error.includes('ModuleNotFoundError') || error.includes('No module named')) {
      provider.addLog('Attempting to install missing dependencies...');
      provider.setStatus(`Installing dependencies...`);
      
      // Try to install dependencies
      const installed = await installDependencies(autoregDir, provider);
      if (installed) {
        provider.addLog('Dependencies installed. Please try Auto-Reg again.');
        provider.setStatus(`✓ Dependencies installed. Click Auto-Reg again.`);
        // Mark as installed
        const depsInstalledFlag = path.join(autoregDir, '.deps_installed');
        fs.writeFileSync(depsInstalledFlag, new Date().toISOString());
      } else {
        provider.setStatus(`✗ Failed to install. Run manually: pip install -r requirements.txt`);
      }
    } else if (error.includes('python') || error.includes('not found') || error.includes('not recognized')) {
      provider.setStatus(`✗ Python not found. Install Python 3.10+`);
    } else {
      provider.setStatus(`✗ Error: ${error.substring(0, 100)}`);
    }
  });
  
  proc.on('error', (err: Error) => {
    provider.addLog(`✗ Failed to start: ${err.message}`);
    provider.setStatus(`✗ Failed to start: ${err.message}`);
  });

  proc.on('close', (code: number) => {
    if (code === 0) {
      provider.addLog(`✓ Registration complete`);
      provider.setStatus('✓ Registration complete');
      // Wait for token file to be written before refreshing
      setTimeout(() => {
        provider.refresh();
        provider.addLog('🔄 Refreshed account list');
      }, 2000);
      setTimeout(() => provider.setStatus(''), 5000);
    } else {
      provider.addLog(`✗ Process exited with code ${code}`);
      provider.setStatus(`✗ Failed (code ${code})`);
      provider.refresh();
    }
  });
}

function setupAutoSwitch(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  if (!config.get<boolean>('autoSwitch.enabled', false)) return;

  const intervalMinutes = config.get<number>('autoSwitch.intervalMinutes', 50);

  const interval = setInterval(async () => {
    const current = getCurrentToken();
    if (!current) return;

    const minutesLeft = (new Date(current.expiresAt).getTime() - Date.now()) / 60000;
    if (minutesLeft <= intervalMinutes && minutesLeft > 0) {
      const accounts = loadAccounts();
      const active = accounts.find(a => a.isActive);
      if (active) {
        await refreshAccountToken(active.tokenData.accountName || active.filename);
        await switchToAccount(active.tokenData.accountName || active.filename);
        accountsProvider?.refresh();
      }
    }
  }, 60000);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
}

export function deactivate() {
  statusBarItem?.dispose();
}
