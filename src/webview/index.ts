/**
 * Webview HTML Generator - v5.1 Clean Architecture
 * 
 * Main entry point that composes UI from components.
 */

import { AccountInfo, ImapProfile } from '../types';
import { KiroUsageData } from '../utils';
import { AutoRegSettings, RegProgress } from './types';
import { generateWebviewScript } from './scripts';
import { Language, getTranslations } from './i18n';
import { getStyles } from './styles';

// Components
import { renderHeader } from './components/Header';
import { renderHero } from './components/Hero';
import { renderToolbar } from './components/Toolbar';
import { renderAccountList } from './components/AccountList';
import { renderSettings } from './components/Settings';
import { renderLogs } from './components/Logs';
import { renderModals } from './components/Modals';
import { renderProfileEditor } from './components/ProfileEditor';
import { renderTabBar } from './components/TabBar';
import { renderAutoRegControls } from './components/AutoRegControls';
import { renderScheduledReg, ScheduledRegSettings } from './components/ScheduledReg';
import { renderLLMSettings } from './components/LLMSettings';

// Re-exports
export { RegProgress, AutoRegSettings };
export type { Language } from './i18n';
export type { ImapProfile } from '../types';
export { getTranslations } from './i18n';

export interface WebviewProps {
  accounts: AccountInfo[];
  autoSwitchEnabled: boolean;
  autoRegStatus: string;
  regProgress?: RegProgress;
  kiroUsage?: KiroUsageData | null;
  autoRegSettings?: AutoRegSettings;
  consoleLogs?: string[];
  version?: string;
  language?: Language;
  availableUpdate?: { version: string; url: string } | null;
  activeProfile?: ImapProfile | null;
  scheduledRegSettings?: ScheduledRegSettings;
}

// Parse registration status
function parseStatus(status: string): { progress: RegProgress | null; isRunning: boolean } {
  if (!status?.startsWith('{')) return { progress: null, isRunning: false };
  try {
    const progress = JSON.parse(status) as RegProgress;
    return { progress, isRunning: progress.step < progress.totalSteps };
  } catch {
    return { progress: null, isRunning: false };
  }
}

// Render update banner
function renderUpdateBanner(update: { version: string; url: string } | null | undefined, t: ReturnType<typeof getTranslations>): string {
  if (!update) return '';
  return `
    <div class="update-banner" onclick="openUpdateUrl('${update.url}')">
      <span class="update-banner-icon">🚀</span>
      <div class="update-banner-content">
        <div class="update-banner-title">${t.newVersion}</div>
        <div class="update-banner-version">v${update.version}</div>
      </div>
      <span class="update-banner-action">${t.download} →</span>
    </div>
  `;
}

// Main HTML generator - overloaded signatures for backward compatibility
export function generateWebviewHtml(props: WebviewProps): string;
export function generateWebviewHtml(
  accounts: AccountInfo[],
  autoSwitchEnabled: boolean,
  autoRegStatus: string,
  regProgress?: RegProgress,
  kiroUsage?: KiroUsageData | null,
  autoRegSettings?: AutoRegSettings,
  consoleLogs?: string[],
  version?: string,
  language?: Language
): string;

export function generateWebviewHtml(
  propsOrAccounts: WebviewProps | AccountInfo[],
  autoSwitchEnabled?: boolean,
  autoRegStatus?: string,
  regProgress?: RegProgress,
  kiroUsage?: KiroUsageData | null,
  autoRegSettings?: AutoRegSettings,
  consoleLogs?: string[],
  version?: string,
  language?: Language
): string {
  // Normalize props
  const props: WebviewProps = Array.isArray(propsOrAccounts)
    ? {
      accounts: propsOrAccounts,
      autoSwitchEnabled: autoSwitchEnabled ?? false,
      autoRegStatus: autoRegStatus ?? '',
      regProgress,
      kiroUsage,
      autoRegSettings,
      consoleLogs,
      version,
      language
    }
    : propsOrAccounts;

  const { accounts } = props;
  const lang = props.language || 'en';
  const t = getTranslations(lang);
  const ver = props.version || 'dev';
  const bannedAccounts = accounts.filter(a => a.usage?.isBanned);

  // Sort accounts: newest first (by createdAt or file modification time)
  const sortedAccounts = accounts
    .filter(a => !a.usage?.isBanned)
    .sort((a, b) => {
      // Active account always first
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;

      // Then by creation date (newest first)
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const visibleAccounts = sortedAccounts;
  const activeAccount = visibleAccounts.find(a => a.isActive);
  const { progress, isRunning } = parseStatus(props.autoRegStatus);
  const validCount = visibleAccounts.filter(a => !a.isExpired).length;

  const script = generateWebviewScript(visibleAccounts.length, bannedAccounts.length, t);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getStyles()}</style>
</head>
<body data-lang="${lang}">
  <div class="app">
    ${renderHeader({ validCount, totalCount: visibleAccounts.length, t })}
    ${renderUpdateBanner(props.availableUpdate, t)}
    ${renderTabBar({ activeTab: 'accounts', t, accountsCount: visibleAccounts.length, bannedCount: bannedAccounts.length })}
    
    <!-- Accounts Tab -->
    <div class="tab-content active" id="tab-accounts" role="tabpanel" aria-labelledby="tab-accounts-btn">
      ${renderHero({ activeAccount, activeProfile: props.activeProfile, usage: props.kiroUsage, progress, isRunning, t })}
      ${renderToolbar({ isRunning, t })}
      <div class="list" id="accountList">
        ${renderAccountList({ accounts: visibleAccounts, t })}
      </div>
    </div>

    <!-- Registration Tab -->
      <div class="tab-content" id="tab-registration" role="tabpanel" aria-labelledby="tab-registration-btn">
        ${renderAutoRegControls({ isRunning, t, strategy: props.autoRegSettings?.strategy || 'automated' })}
        ${renderScheduledReg({
          settings: props.scheduledRegSettings || {
            enabled: false,
            loginTemplate: 'Account_{N}',
            currentNumber: 1,
            interval: 5,
            maxAccounts: 5,
            registeredCount: 0,
            isRunning: false,
            useCustomName: false,
            customNamePrefix: ''
          },
          t,
          collapsed: false
        })}
      </div>

      <!-- LLM Tab -->
      <div class="tab-content" id="tab-llm" role="tabpanel" aria-labelledby="tab-llm-btn">
        ${renderLLMSettings({ t })}
      </div>

    <!-- Profiles Tab -->
    <div class="tab-content" id="tab-profiles" role="tabpanel" aria-labelledby="tab-profiles-btn">
      ${renderProfileEditor({ t, inline: true })}
    </div>

    <!-- Banned Tab (conditionally shown via TabBar) -->
    <div class="tab-content" id="tab-banned" role="tabpanel" aria-labelledby="tab-banned-btn">
      <div class="list" id="bannedList">
        ${renderAccountList({ accounts: bannedAccounts, t, variant: 'banned' })}
      </div>
    </div>

    <!-- Settings Tab (includes Stats and LLM) -->
    <div class="tab-content" id="tab-settings" role="tabpanel" aria-labelledby="tab-settings-btn">
      ${renderSettings({ autoSwitchEnabled: props.autoSwitchEnabled, settings: props.autoRegSettings, lang, t, version: ver, inline: true, accounts })}
    </div>

        ${renderLogs({ logs: props.consoleLogs, t })}
    ${renderModals({ t })}
  </div>
  <script>${script}</script>
</body>
</html>`;
}
