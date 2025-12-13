/**
 * Webview Message Types
 * Type-safe communication between webview and extension
 */

import { AccountInfo, ImapProfile } from '../types';
import { KiroUsageData } from '../utils';

// ============================================
// Messages FROM Webview TO Extension
// ============================================

export type WebviewCommand =
    // Account actions
    | { command: 'switchAccount'; email: string }
    | { command: 'deleteAccount'; email: string }
    | { command: 'copyToken'; email: string }
    | { command: 'refreshToken'; email: string }
    | { command: 'viewQuota'; email: string }
    | { command: 'deleteExhaustedAccounts' }

    // Auto-reg
    | { command: 'startAutoReg' }
    | { command: 'stopAutoReg' }
    | { command: 'togglePauseAutoReg' }

    // Refresh
    | { command: 'refresh' }
    | { command: 'refreshUsage' }

    // Settings
    | { command: 'toggleAutoSwitch'; enabled: boolean }
    | { command: 'updateSetting'; key: string; value: boolean }
    | { command: 'setLanguage'; language: string }
    | { command: 'checkForUpdates' }
    | { command: 'openVsCodeSettings' }

    // Kiro Patch
    | { command: 'getPatchStatus' }
    | { command: 'patchKiro'; force?: boolean }
    | { command: 'unpatchKiro' }
    | { command: 'generateMachineId' }
    | { command: 'resetMachineId' }

    // Profiles
    | { command: 'loadProfiles' }
    | { command: 'getActiveProfile' }
    | { command: 'getProfile'; profileId: string }
    | { command: 'createProfile'; profile: Partial<ImapProfile> }
    | { command: 'updateProfile'; profile: Partial<ImapProfile> }
    | { command: 'deleteProfile'; profileId: string }
    | { command: 'setActiveProfile'; profileId: string }
    | { command: 'detectProvider'; email: string }
    | { command: 'testImap'; server: string; user: string; password: string; port: number }
    | { command: 'importEmailsFromFile' }

    // SSO
    | { command: 'importSsoToken'; token: string }

    // Console
    | { command: 'clearConsole' }
    | { command: 'copyLogs'; logs: string }

    // Other
    | { command: 'openUrl'; url: string }
    | { command: 'exportAccounts' };

// ============================================
// Messages FROM Extension TO Webview
// ============================================

export type ExtensionMessage =
    // Logs
    | { type: 'appendLog'; log: string }

    // Status
    | { type: 'updateStatus'; status: string }
    | { type: 'toast'; message: string; toastType?: 'success' | 'error' | 'warning' }

    // Data updates
    | { type: 'updateUsage'; usage: KiroUsageData | null }
    | { type: 'updateAccounts'; accounts: AccountInfo[] }

    // Profiles
    | { type: 'profilesLoaded'; profiles: ImapProfile[]; activeProfileId?: string }
    | { type: 'activeProfileLoaded'; profile: ImapProfile | null }
    | { type: 'profileLoaded'; profile: ImapProfile }
    | { type: 'providerDetected'; hint: ProviderHint | null; recommendedStrategy: string | null }
    | { type: 'emailsImported'; emails: string[] }

    // Patch status
    | { type: 'patchStatus'; isPatched: boolean; kiroVersion?: string; patchVersion?: string; currentMachineId?: string; error?: string };

// ============================================
// Helper Types
// ============================================

export interface ProviderHint {
    name: string;
    imapServer: string;
    imapPort: number;
    supportsAlias: boolean;
}

// Type guard for webview commands
export function isWebviewCommand(msg: unknown): msg is WebviewCommand {
    return typeof msg === 'object' && msg !== null && 'command' in msg;
}

// Type guard for extension messages
export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
    return typeof msg === 'object' && msg !== null && 'type' in msg;
}
