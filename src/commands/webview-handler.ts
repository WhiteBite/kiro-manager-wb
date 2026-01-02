/**
 * Webview Message Handler
 * Handles all messages from the webview panel
 */

import * as vscode from 'vscode';
import { KiroAccountsProvider } from '../providers/AccountsProvider';
import { switchToAccount, refreshAccountToken, refreshAllAccounts, deleteAccount } from '../accounts';
import { runAutoReg, importSsoToken, resetMachineId, patchKiro, unpatchKiro, generateMachineId, getPatchStatus } from '../commands/autoreg';
import { WebviewCommand, isWebviewCommand } from '../webview/messages';

export async function handleWebviewMessage(provider: KiroAccountsProvider, msg: Record<string, unknown>) {
  const command = msg.command as string;

  switch (command) {
    case 'switch':
      await switchToAccount(msg.account as string);
      // Force refresh usage after account switch
      await provider.refreshUsageAfterSwitch();
      break;

    case 'refresh':
      // General refresh - reload account list
      provider.refresh();
      break;

    case 'delete':
      await deleteAccount(msg.account as string);
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
      await provider.loadUsageForAccount(msg.account as string);
      break;

    case 'loadAllUsage':
      await provider.loadAllUsage();
      break;

    case 'toggleSetting':
      await provider.toggleSetting(msg.setting as string);
      break;

    case 'updateSetting':
      await provider.updateSetting(msg.key as string, msg.value as boolean);
      break;

    case 'toggleAutoSwitch':
      const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
      await config.update('autoSwitch.enabled', msg.enabled as boolean, vscode.ConfigurationTarget.Global);
      break;

    case 'clearConsole':
      provider.clearLogs();
      break;

    case 'export':
    case 'exportAccounts':
      await provider.exportAccounts();
      break;

    case 'importAccounts':
      await provider.importAccounts();
      break;

    case 'copyPassword':
      await provider.copyPassword(msg.account as string);
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

    case 'switchAccount': {
      const switchResult = await switchToAccount(msg.email as string, true);
      if (switchResult.isBanned) {
        // Mark account as banned and update UI
        provider.markAccountAsBanned(msg.email as string, switchResult.errorMessage);
      } else if (switchResult.success) {
        // Force refresh usage after account switch
        await provider.refreshUsageAfterSwitch();
        // Check health of newly switched account
        setTimeout(() => provider.checkActiveAccountHealth(), 1000);
      }
      break;
    }

    case 'copyToken':
      await provider.copyToken(msg.email as string);
      break;

    case 'viewQuota':
      await provider.viewQuota(msg.email as string);
      break;

    case 'refreshToken':
      await provider.refreshSingleToken(msg.email as string);
      break;

    case 'deleteAccount':
      await deleteAccount(msg.email as string);
      provider.refresh();
      break;

    case 'startAutoReg':
      await runAutoReg(provider.context, provider, msg.count as number | undefined);
      break;

    case 'importToken':
      vscode.commands.executeCommand('kiroAccountSwitcher.importToken');
      provider.refresh();
      break;

    case 'setLanguage':
      provider.setLanguage(msg.language as 'en' | 'ru' | 'zh' | 'es' | 'pt' | 'ja' | 'de' | 'fr' | 'ko' | 'hi');
      break;

    case 'openUrl':
      vscode.env.openExternal(vscode.Uri.parse(msg.url as string));
      break;

    case 'checkForUpdates':
      await provider.checkForUpdatesManual();
      break;

    case 'copyLogs':
      if (msg.logs) {
        await vscode.env.clipboard.writeText(msg.logs as string);
        provider.addLog('📋 Logs copied to clipboard');
      }
      break;

    case 'importSsoToken':
      await importSsoToken(provider.context, provider, msg.token as string);
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

    case 'deleteBannedAccounts':
      await provider.deleteBannedAccounts();
      break;

    case 'refreshAllExpired':
      await provider.refreshAllExpiredTokens();
      break;

    // === IMAP Profiles ===

    case 'loadProfiles':
      await provider.loadProfiles();
      break;

    case 'getActiveProfile':
      await provider.getActiveProfile();
      break;

    case 'getProfile':
      await provider.getProfile(msg.profileId as string);
      break;

    case 'createProfile':
      await provider.createProfile(msg.profile as Record<string, unknown>);
      break;

    case 'updateProfile':
      await provider.updateProfile(msg.profile as Record<string, unknown>);
      break;

    case 'deleteProfile':
      await provider.deleteProfile(msg.profileId as string);
      break;

    case 'setActiveProfile':
      await provider.setActiveProfile(msg.profileId as string);
      break;

    case 'detectProvider':
      await provider.detectProvider(msg.email as string);
      break;

    case 'testImap':
      await provider.testImapConnection(msg as { server: string; user: string; password: string; port: number });
      break;

    case 'importEmailsFromFile':
      await provider.importEmailsFromFile();
      break;

    case 'openVsCodeSettings':
      vscode.commands.executeCommand('workbench.action.openSettings', 'kiroAccountSwitcher.imap');
      break;

    case 'resetMachineId':
      await resetMachineId(provider.context, provider);
      break;

    case 'patchKiro':
      await patchKiro(provider.context, provider, (msg.force as boolean) || false);
      break;

    case 'unpatchKiro':
      await unpatchKiro(provider.context, provider);
      break;

    case 'generateMachineId':
      await generateMachineId(provider.context, provider);
      break;

    case 'getPatchStatus':
      const status = await getPatchStatus(provider.context);
      provider.sendPatchStatus(status);
      break;

    // === Bulk Actions ===

    case 'refreshSelectedTokens':
      await provider.refreshSelectedTokens(msg.filenames as string[]);
      break;

    case 'deleteSelectedAccounts':
      await provider.deleteSelectedAccounts(msg.filenames as string[]);
      break;

    case 'exportSelectedAccounts':
      await provider.exportAccounts(msg.filenames as string[]);
      break;

    case 'checkAllAccountsHealth':
      await provider.checkAllAccountsHealth();
      break;

    // === LLM Server ===
    case 'getLLMSettings':
      await provider.getLLMSettings();
      break;

    case 'saveLLMSettings':
      await provider.saveLLMSettings(msg.settings as Record<string, any>);
      break;

    case 'startLLMServer':
      await provider.startLLMServer();
      break;

    case 'stopLLMServer':
      await provider.stopLLMServer();
      break;

    case 'restartLLMServer':
      await provider.restartLLMServer();
      break;

    case 'getLLMServerStatus':
      await provider.getLLMServerStatus();
      break;

    case 'getLLMModels':
      await provider.getLLMModels();
      break;

    // === Scheduled Registration ===
    case 'updateScheduledRegSetting':
      await provider.updateScheduledRegSetting(msg.key as string, msg.value as string | number | boolean);
      break;

    case 'startScheduledReg':
      await provider.startScheduledReg();
      break;

    case 'stopScheduledReg':
      await provider.stopScheduledReg();
      break;

    case 'resetScheduledReg':
      await provider.resetScheduledReg();
      break;
  }
}
