/**
 * Kiro Account Switcher Extension
 * Main entry point - registers commands and providers
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getAccountService } from './services/AccountService';
import { getTokensDir } from './utils';
import { checkForUpdates } from './update-checker';
import { KiroAccountsProvider } from './providers';
import { ImapProfileProvider } from './providers/ImapProfileProvider';
import { checkPatchStatus } from './commands/autoreg';
import { getLogService } from './services/LogService';

let statusBarItem: vscode.StatusBarItem;
let accountsProvider: KiroAccountsProvider | undefined;
let imapProfileProvider: ImapProfileProvider;

const logService = getLogService();
const accountService = getAccountService();

let _consoleCaptured = false;

function _formatConsoleArgs(args: unknown[]): string {
  try {
    return args.map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'string') return a;
      try { return JSON.stringify(a); } catch { return String(a); }
    }).join(' ');
  } catch {
    return '[unformattable log args]';
  }
}

function captureConsoleToFile(): void {
  if (_consoleCaptured) return;
  _consoleCaptured = true;

  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  console.log = (...args: unknown[]) => {
    try { logService.add(_formatConsoleArgs(args)); } catch { }
    origLog.apply(console, args as any);
  };

  console.warn = (...args: unknown[]) => {
    try { logService.warn(_formatConsoleArgs(args)); } catch { }
    origWarn.apply(console, args as any);
  };

  console.error = (...args: unknown[]) => {
    try { logService.error(_formatConsoleArgs(args)); } catch { }
    origError.apply(console, args as any);
  };

  process.on('unhandledRejection', (reason) => {
    try { logService.error(`unhandledRejection: ${_formatConsoleArgs([reason])}`); } catch { }
  });

  process.on('uncaughtException', (err) => {
    try { logService.error(`uncaughtException: ${_formatConsoleArgs([err])}`); } catch { }
  });
}

function addLog(message: string): void {
  if (accountsProvider) accountsProvider.addLog(message);
  else logService.add(message);
}

export function activate(context: vscode.ExtensionContext) {
  captureConsoleToFile();
  console.log('Kiro Account Switcher activated');

  // Check for updates in background
  checkForUpdates(context);

  // Check if Kiro patch is still active (may have been overwritten by Kiro update)
  checkPatchOnStartup(context);

  // Initialize IMAP Profile Provider (singleton with settings sync)
  imapProfileProvider = ImapProfileProvider.getInstance(context);
  context.subscriptions.push({ dispose: () => imapProfileProvider.dispose() });

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'kiroAccountSwitcher.switchAccount';
  statusBarItem.tooltip = 'Switch Kiro account';
  context.subscriptions.push(statusBarItem);

  // Webview provider
  accountsProvider = new KiroAccountsProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('kiroAccountsPanel', accountsProvider),
    accountsProvider // Register for disposal to prevent memory leaks
  );

  // Listen for account changes from the service
  // When loadAccounts() is called, it fires onDidAccountsChange.
  // Pass reloadFromDisk=false to avoid re-reading files that were just loaded.
  accountService.onDidAccountsChange(() => {
    accountsProvider?.refresh(false);
    updateStatusBar();
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('kiroAccountSwitcher.switchAccount', () => quickSwitch()),
    vscode.commands.registerCommand('kiroAccountSwitcher.listAccounts', () => accountsProvider?.refresh()),
    vscode.commands.registerCommand('kiroAccountSwitcher.importToken', () => importToken()),
    vscode.commands.registerCommand('kiroAccountSwitcher.currentAccount', () => showCurrentAccount()),
    vscode.commands.registerCommand('kiroAccountSwitcher.signOut', () => signOut()),
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshAccounts', () => accountsProvider?.refresh()),
    vscode.commands.registerCommand('kiroAccountSwitcher.openSettings', () => openSettings()),
    vscode.commands.registerCommand('kiroAccountSwitcher.switchTo', (name: string) => doSwitch(name)),
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshToken', (name: string) => doRefresh(name)),
    vscode.commands.registerCommand('kiroAccountSwitcher.switchToNextAvailable', () => switchToNextAvailable()),
    vscode.commands.registerCommand('kiroAccountSwitcher.testImap', () => testImapFromSettings())
  );

  updateStatusBar();
  setupAutoSwitch(context);
}

export function deactivate() { }

// Quick switch via command palette
async function quickSwitch() {
  const accounts = accountService.getAccounts();
  if (accounts.length === 0) {
    accountsProvider?.addLog('⚠️ No accounts found');
    return;
  }

  const items = accounts.map(a => ({
    label: a.tokenData.accountName || a.filename,
    description: a.isActive ? '(active)' : a.isExpired ? '(expired)' : '',
    detail: a.tokenData.email || '',
    account: a
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select account to switch to'
  });

  if (selected) {
    await doSwitch(selected.account.filename);
  }
}

async function doSwitch(name: string) {
  await accountService.switchToAccount(name);
  // UI will be updated via onDidAccountsChange event
}

async function doRefresh(name: string) {
  await accountService.refreshAccountToken(name);
  // UI will be updated via onDidAccountsChange event
}

// Track failed switch attempts to prevent infinite loops
const failedSwitchAttempts = new Set<string>();
let lastSwitchAttemptTime = 0;
const SWITCH_DEBOUNCE_MS = 5000; // 5 seconds between switch attempts

/**
 * Switch to next available (non-banned, non-expired) account
 * Called automatically by patched Kiro when current account is banned
 */
async function switchToNextAvailable(): Promise<boolean> {
  // Debounce: prevent rapid repeated calls
  const now = Date.now();
  if (now - lastSwitchAttemptTime < SWITCH_DEBOUNCE_MS) {
    console.log('[AutoSwitch] Debounced - too soon since last attempt');
    return false;
  }
  lastSwitchAttemptTime = now;

  const accounts = accountService.getAccounts();
  const currentActive = accounts.find(a => a.isActive);

  // Find available accounts (not expired, not banned, not previously failed)
  const available = accounts.filter(a =>
    !a.isExpired &&
    !a.usage?.isBanned &&
    a.filename !== currentActive?.filename &&
    !failedSwitchAttempts.has(a.filename) // Skip accounts that failed before
  );

  if (available.length === 0) {
    // Clear failed attempts after showing error (allow retry later)
    failedSwitchAttempts.clear();
    accountsProvider?.addLog('❌ No available accounts to switch to. All accounts are banned or expired.');
    return false;
  }

  // Switch to first available
  const next = available[0];
  const accountName = next.tokenData.accountName || next.filename;

  accountsProvider?.addLog(`⚠️ Current account banned/suspended. Auto-switching to: ${accountName}`);

  try {
    const result = await accountService.switchToAccount(next.filename);

    // If switch failed (account was banned), mark it as failed
    if (!result.success && result.isBanned) {
      failedSwitchAttempts.add(next.filename);
      console.log(`[AutoSwitch] Marked ${next.filename} as banned, will skip in future attempts`);

      // Try next account recursively (with debounce protection)
      lastSwitchAttemptTime = 0; // Reset debounce for immediate retry
      return switchToNextAvailable();
    }

    // Success - clear failed attempts
    if (result.success) {
      failedSwitchAttempts.clear();
      // UI updated via event
      return true;
    }

    // Other failure - mark as failed but don't retry immediately
    failedSwitchAttempts.add(next.filename);
    return false;
  } catch (err) {
    console.error('[AutoSwitch] Switch failed:', err);
    failedSwitchAttempts.add(next.filename);
    return false;
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
    accountsProvider?.addLog('✅ Token imported successfully');
    accountsProvider?.refresh();
  } catch (error) {
    accountsProvider?.addLog('❌ Failed to import token');
    console.error('Import failed:', error);
  }
}

function showCurrentAccount() {
  const active = accountService.getActiveAccount();
  if (active) {
    accountsProvider?.addLog(`ℹ️ Current account: ${active.tokenData.accountName || active.filename}`);
  } else {
    accountsProvider?.addLog('ℹ️ No active account');
  }
}

async function signOut() {
  try {
    await vscode.commands.executeCommand('_signOutOfKiro');
    accountsProvider?.addLog('✅ Signed out');
  } catch (error) {
    console.error('Sign out failed:', error);
  }
}

function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', 'kiroAccountSwitcher');
}

function updateStatusBar() {
  const active = accountService.getActiveAccount();

  if (active) {
    const name = active.tokenData.accountName || active.filename;
    const shortName = name.length > 20 ? name.substring(0, 17) + '...' : name;
    statusBarItem.text = `$(account) ${shortName}`;
    statusBarItem.show();
  } else {
    statusBarItem.text = '$(account) No account';
    statusBarItem.show();
  }
}

function setupAutoSwitch(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const enabled = config.get<boolean>('autoSwitch.enabled', false);
  const intervalMinutes = config.get<number>('autoSwitch.intervalMinutes', 50);

  if (enabled) {
    const interval = setInterval(async () => {
      const active = accountService.getActiveAccount();

      if (active && active.isExpired) {
        const accounts = accountService.getAccounts();
        const validAccounts = accounts.filter(a => !a.isExpired && !a.isActive);
        if (validAccounts.length > 0) {
          await accountService.switchToAccount(validAccounts[0].filename);
          accountsProvider?.addLog(`✅ Auto-switched to ${validAccounts[0].tokenData.accountName}`);
        }
      }
    }, intervalMinutes * 60 * 1000);

    context.subscriptions.push({ dispose: () => clearInterval(interval) });
  }
}

// Check if Kiro patch was overwritten (e.g., after Kiro update) or needs update
async function checkPatchOnStartup(context: vscode.ExtensionContext) {
  try {
    const status = await checkPatchStatus(context);

    // If patch needs update (version mismatch or Kiro updated)
    if (status.needsUpdate && status.updateReason) {
      addLog(`⚠️ Kiro patch needs update: ${status.updateReason}`);
      // Hot-patch without closing Kiro - file is not locked on Windows
      await applyHotPatch(context);
      return;
    }

    // If we have a custom machine ID file but patch is not applied, warn user
    if (status.currentMachineId && !status.isPatched && !status.error) {
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      const lastKiroVersion = config.get<string>('patch.lastKiroVersion', '');

      // Check if Kiro version changed
      if (status.kiroVersion && status.kiroVersion !== lastKiroVersion) {
        addLog(`⚠️ Kiro was updated to ${status.kiroVersion}. Re-applying Machine ID patch...`);
        await applyHotPatch(context);

        // Save current version
        await config.update('patch.lastKiroVersion', status.kiroVersion, vscode.ConfigurationTarget.Global);
      }
    } else if (status.isPatched && status.kiroVersion) {
      // Save version when patch is active
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      await config.update('patch.lastKiroVersion', status.kiroVersion, vscode.ConfigurationTarget.Global);
    }
  } catch (error) {
    console.error('Patch check failed:', error);
  }
}

// Apply patch without closing Kiro (hot-patch)
async function applyHotPatch(context: vscode.ExtensionContext) {
  const { patchKiroHot } = await import('./commands/autoreg');

  const result = await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'Applying Kiro patch...',
    cancellable: false
  }, async () => {
    return await patchKiroHot(context);
  });

  if (result.success) {
    addLog('✅ Patch applied! Restart Kiro to activate the changes.');
  } else {
    addLog(`❌ Patch failed: ${result.error}`);
  }
}

// Test IMAP connection from VS Code settings
async function testImapFromSettings() {
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const profiles = config.get<any[]>('imap.profiles', []);

  if (profiles.length === 0) {
    addLog('⚠️ No IMAP profiles configured in settings');
    return;
  }

  // Show quick pick to select profile
  const items = profiles.map(p => ({
    label: p.name || p.email || 'Unnamed Profile',
    description: p.email,
    profile: p
  }));

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select IMAP profile to test'
  });

  if (!selected) return;

  const profile = selected.profile;
  
  if (!profile.email || !profile.password || !profile.host) {
    addLog('❌ Profile is missing required fields (email, password, host)');
    return;
  }

  // Test IMAP connection
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Testing IMAP: ${profile.host}`,
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ message: 'Connecting...' });

      // Use Node.js built-in modules to test IMAP without Python
      const net = require('net');
      const tls = require('tls');

      await new Promise<void>((resolve, reject) => {
        const socket = tls.connect({
          host: profile.host,
          port: profile.port || 993,
          timeout: 10000
        });

        let buffer = '';
        let authenticated = false;

        socket.on('data', (data: Buffer) => {
          buffer += data.toString();
          const lines = buffer.split('\r\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            console.log('IMAP:', line);
            
            if (line.includes('* OK') && !authenticated) {
              // Server ready, try to login
              progress.report({ message: 'Authenticating...' });
              socket.write(`A001 LOGIN "${profile.email}" "${profile.password}"\r\n`);
            } else if (line.includes('A001 OK') && line.toLowerCase().includes('login')) {
              // Login successful
              authenticated = true;
              progress.report({ message: 'Getting folder list...' });
              socket.write('A002 LIST "" "*"\r\n');
            } else if (line.includes('A002 OK') && authenticated) {
              // List command completed
              socket.write('A003 LOGOUT\r\n');
              resolve();
            } else if (line.includes('A001 NO') || line.includes('A001 BAD')) {
              // Login failed
              reject(new Error('Authentication failed. Check your credentials.'));
            }
          }
        });

        socket.on('error', (err: Error) => {
          reject(new Error(`Connection failed: ${err.message}`));
        });

        socket.on('timeout', () => {
          reject(new Error('Connection timeout'));
        });

        socket.on('close', () => {
          if (!authenticated) {
            reject(new Error('Connection closed unexpectedly'));
          }
        });
      });

      addLog(`✅ IMAP test successful: ${profile.email}`);

    } catch (error: any) {
      let errorMsg = error.message || 'Unknown error';
      
      // Improve error messages
      if (errorMsg.includes('Authentication failed') && profile.host?.includes('gmail')) {
        errorMsg = 'Gmail requires App Password (not regular password). Go to Google Account → Security → App passwords';
      }

      addLog(`❌ IMAP test failed: ${errorMsg}`);
    }
  });
}
