/**
 * Kiro Account Switcher Extension
 * Main entry point - registers commands and providers
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { loadAccounts, switchToAccount, refreshAccountToken, refreshAllAccounts } from './accounts';
import { getTokensDir } from './utils';
import { checkForUpdates } from './update-checker';
import { KiroAccountsProvider } from './providers';
import { ImapProfileProvider } from './providers/ImapProfileProvider';
import { checkPatchStatus } from './commands/autoreg';

let statusBarItem: vscode.StatusBarItem;
let accountsProvider: KiroAccountsProvider;
let imapProfileProvider: ImapProfileProvider;

export function activate(context: vscode.ExtensionContext) {
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

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('kiroAccountSwitcher.switchAccount', () => quickSwitch()),
    vscode.commands.registerCommand('kiroAccountSwitcher.listAccounts', () => accountsProvider.refresh()),
    vscode.commands.registerCommand('kiroAccountSwitcher.importToken', () => importToken()),
    vscode.commands.registerCommand('kiroAccountSwitcher.currentAccount', () => showCurrentAccount()),
    vscode.commands.registerCommand('kiroAccountSwitcher.signOut', () => signOut()),
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshAccounts', () => accountsProvider.refresh()),
    vscode.commands.registerCommand('kiroAccountSwitcher.openSettings', () => openSettings()),
    vscode.commands.registerCommand('kiroAccountSwitcher.switchTo', (name: string) => doSwitch(name)),
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshToken', (name: string) => doRefresh(name)),
    vscode.commands.registerCommand('kiroAccountSwitcher.switchToNextAvailable', () => switchToNextAvailable())
  );

  updateStatusBar();
  setupAutoSwitch(context);
}

export function deactivate() { }

// Quick switch via command palette
async function quickSwitch() {
  const accounts = loadAccounts();
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
  await switchToAccount(name);
  accountsProvider?.refresh();
  updateStatusBar();
}

async function doRefresh(name: string) {
  await refreshAccountToken(name);
  accountsProvider?.refresh();
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

  const accounts = loadAccounts();
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
    // Use returnDetails=true to get ban status
    const result = await switchToAccount(next.filename, true);

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
      accountsProvider?.refresh();
      updateStatusBar();
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
  const accounts = loadAccounts();
  const active = accounts.find(a => a.isActive);
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
  const accounts = loadAccounts();
  const active = accounts.find(a => a.isActive);

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
      const accounts = loadAccounts();
      const active = accounts.find(a => a.isActive);

      if (active && active.isExpired) {
        const validAccounts = accounts.filter(a => !a.isExpired && !a.isActive);
        if (validAccounts.length > 0) {
          await switchToAccount(validAccounts[0].filename);
          accountsProvider?.refresh();
          updateStatusBar();
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
      const action = await vscode.window.showWarningMessage(
        `Kiro patch needs update: ${status.updateReason}`,
        'Update Now',
        'Later'
      );

      if (action === 'Update Now') {
        // Hot-patch without closing Kiro - file is not locked on Windows
        await applyHotPatch(context);
      }
      return;
    }

    // If we have a custom machine ID file but patch is not applied, warn user
    if (status.currentMachineId && !status.isPatched && !status.error) {
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      const lastKiroVersion = config.get<string>('patch.lastKiroVersion', '');

      // Check if Kiro version changed
      if (status.kiroVersion && status.kiroVersion !== lastKiroVersion) {
        const action = await vscode.window.showWarningMessage(
          `Kiro was updated to ${status.kiroVersion}. The Machine ID patch needs to be re-applied.`,
          'Apply Patch',
          'Ignore'
        );

        if (action === 'Apply Patch') {
          await applyHotPatch(context);
        }

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
    const action = await vscode.window.showInformationMessage(
      'Patch applied! Restart Kiro to activate the changes.',
      'Restart Later'
    );
    // User decides when to restart - we don't force it
  } else {
    vscode.window.showErrorMessage(`Patch failed: ${result.error}`);
  }
}
