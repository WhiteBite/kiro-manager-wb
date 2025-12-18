/**
 * Webview HTML Generator - v5.1 Clean Architecture
 * 
 * Main entry point that composes UI from components.
 */

import { AccountInfo } from '../types';
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

// Re-exports
export { RegProgress, AutoRegSettings };
export type { Language } from './i18n';
export { getTranslations } from './i18n';

export interface ImapProfile {
  id: string;
  name: string;
  imap?: {
    server?: string;
    user?: string;
    port?: number;
  };
  strategy?: {
    type: 'single' | 'catch_all' | 'pool';
    emails?: Array<{ email: string; status?: string }>;
  };
  stats?: {
    registered: number;
    failed: number;
  };
}

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
  const activeAccount = accounts.find(a => a.isActive);
  const { progress, isRunning } = parseStatus(props.autoRegStatus);
  const validCount = accounts.filter(a => !a.isExpired).length;

  const script = generateWebviewScript(accounts.length, t);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getStyles()}</style>
</head>
<body data-lang="${lang}">
  <div class="app">
    ${renderHeader({ validCount, totalCount: accounts.length, t })}
    ${renderUpdateBanner(props.availableUpdate, t)}
    ${renderTabBar({ activeTab: 'accounts', t, accountsCount: accounts.length })}
    
    <!-- Accounts Tab -->
    <div class="tab-content active" id="tab-accounts">
      ${renderHero({ activeAccount, activeProfile: props.activeProfile, usage: props.kiroUsage, progress, isRunning, t })}
      ${renderToolbar({ isRunning, t })}
      <div class="list" id="accountList">
        ${renderAccountList({ accounts, t })}
      </div>
    </div>

    <!-- Profiles Tab -->
    <div class="tab-content" id="tab-profiles">
      ${renderProfileEditor({ t, inline: true })}
    </div>

    <!-- Settings Tab -->
    <div class="tab-content" id="tab-settings">
      ${renderSettings({ autoSwitchEnabled: props.autoSwitchEnabled, settings: props.autoRegSettings, lang, t, version: ver, inline: true })}
    </div>

    ${renderLogs({ logs: props.consoleLogs, t })}
    ${renderModals({ t })}
  </div>
  <script>${script}</script>
</body>
</html>`;
}
