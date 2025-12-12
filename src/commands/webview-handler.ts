/**
 * Webview Message Handler
 * Handles all messages from the webview panel
 */

import * as vscode from 'vscode';
import { KiroAccountsProvider } from '../providers/AccountsProvider';
import { switchToAccount, refreshAccountToken, refreshAllAccounts, deleteAccount } from '../accounts';
import { runAutoReg, importSsoToken } from '../commands/autoreg';

export async function handleWebviewMessage(provider: KiroAccountsProvider, msg: any) {
  switch (msg.command) {
    case 'switch':
      await switchToAccount(msg.account);
      // Force refresh usage after account switch
      await provider.refreshUsageAfterSwitch();
      break;

    case 'refresh':
      // General refresh - reload account list
      provider.refresh();
      break;

    case 'delete':
      await deleteAccount(msg.account);
      provider.refresh();
      break;

    case 'settings':
      vscode.commands.executeCommand('workbench.action.openSettings', 'kiroAccountSwitcher');
      break;

    case 'import':
      vscode.commands.executeCommand('kiroAccountSwitcher.importToken');
      provider.refresh();
      break;

    case 'autoreg':
      await runAutoReg(provider.context, provider);
      break;

    case 'refreshAll':
      await refreshAllAccounts();
      provider.refresh();
      break;

    case 'openDashboard':
      vscode.commands.executeCommand('kiro.accountDashboard.showDashboard');
      break;

    case 'loadUsage':
      await provider.loadUsageForAccount(msg.account);
      break;

    case 'loadAllUsage':
      await provider.loadAllUsage();
      break;

    case 'toggleSetting':
      await provider.toggleSetting(msg.setting);
      break;

    case 'updateSetting':
      await provider.updateSetting(msg.key, msg.value);
      break;

    case 'clearConsole':
      provider.clearLogs();
      break;

    case 'export':
      await provider.exportAccounts();
      break;

    case 'copyPassword':
      await provider.copyPassword(msg.account);
      break;

    case 'stopAutoReg':
      provider.stopAutoReg();
      break;

    case 'togglePauseAutoReg':
      provider.togglePauseAutoReg();
      break;

    case 'openLog':
      await provider.openLogFile();
      break;

    case 'switchAccount':
      await switchToAccount(msg.email);
      // Force refresh usage after account switch
      await provider.refreshUsageAfterSwitch();
      break;

    case 'copyToken':
      await provider.copyToken(msg.email);
      break;

    case 'viewQuota':
      await provider.viewQuota(msg.email);
      break;

    case 'refreshToken':
      await provider.refreshSingleToken(msg.email);
      break;

    case 'deleteAccount':
      await deleteAccount(msg.email);
      provider.refresh();
      break;

    case 'startAutoReg':
      await runAutoReg(provider.context, provider);
      break;

    case 'importToken':
      vscode.commands.executeCommand('kiroAccountSwitcher.importToken');
      provider.refresh();
      break;

    case 'setLanguage':
      provider.setLanguage(msg.language);
      break;

    case 'openUrl':
      vscode.env.openExternal(vscode.Uri.parse(msg.url));
      break;

    case 'checkForUpdates':
      await provider.checkForUpdatesManual();
      break;

    case 'copyLogs':
      if (msg.logs) {
        await vscode.env.clipboard.writeText(msg.logs);
        vscode.window.showInformationMessage('Logs copied to clipboard');
      }
      break;

    case 'importSsoToken':
      await importSsoToken(provider.context, provider, msg.token);
      break;

    case 'refreshUsage':
      // Manual refresh of usage data
      await provider.refreshUsageAfterSwitch();
      break;

    case 'showUsageDetails':
      // Show detailed usage info
      await provider.viewQuota('');
      break;

    case 'deleteExhaustedAccounts':
      await provider.deleteExhaustedAccounts();
      break;
  }
}
