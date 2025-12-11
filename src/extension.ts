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

let statusBarItem: vscode.StatusBarItem;
let accountsProvider: KiroAccountsProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('Kiro Account Switcher activated');

  // Check for updates in background
  checkForUpdates(context);

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'kiroAccountSwitcher.switchAccount';
  statusBarItem.tooltip = 'Switch Kiro account';
  context.subscriptions.push(statusBarItem);

  // Webview provider
  accountsProvider = new KiroAccountsProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('kiroAccountsPanel', accountsProvider)
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
    vscode.commands.registerCommand('kiroAccountSwitcher.refreshToken', (name: string) => doRefresh(name))
  );

  updateStatusBar();
  setupAutoSwitch(context);
}

export function deactivate() {}

// Quick switch via command palette
async function quickSwitch() {
  const accounts = loadAccounts();
  if (accounts.length === 0) {
    vscode.window.showWarningMessage('No accounts found');
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
    vscode.window.showInformationMessage('Token imported successfully');
    accountsProvider?.refresh();
  } catch (error) {
    vscode.window.showErrorMessage('Failed to import token');
    console.error('Import failed:', error);
  }
}

function showCurrentAccount() {
  const accounts = loadAccounts();
  const active = accounts.find(a => a.isActive);
  if (active) {
    vscode.window.showInformationMessage(`Current account: ${active.tokenData.accountName || active.filename}`);
  } else {
    vscode.window.showInformationMessage('No active account');
  }
}

async function signOut() {
  try {
    await vscode.commands.executeCommand('_signOutOfKiro');
    vscode.window.showInformationMessage('Signed out');
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
          vscode.window.showInformationMessage(`Auto-switched to ${validAccounts[0].tokenData.accountName}`);
        }
      }
    }, intervalMinutes * 60 * 1000);

    context.subscriptions.push({ dispose: () => clearInterval(interval) });
  }
}
