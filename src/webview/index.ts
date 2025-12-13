/**
 * Webview HTML generation - v4.2 Modular Architecture
 */

import { AccountInfo } from '../types';
import { KiroUsageData } from '../utils';
import { ICONS } from './icons';
import { escapeHtml, getAccountEmail } from './helpers';
import { 
  renderAccountList, 
  renderUsageCard, 
  renderSettingsPanel, 
  renderConsolePanel,
  renderProgressPanel,
  RegProgress 
} from './components';
import { AutoRegSettings } from './types';
import { generateWebviewScript } from './scripts';
import { Language, getTranslations } from './i18n';
import { getStyles } from './styles';

// Re-export types
export { RegProgress, AutoRegSettings };

// Re-export Language from i18n
export type { Language } from './i18n';
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
}

function parseAutoRegStatus(status: string): { progress: RegProgress | null; statusText: string; isRunning: boolean } {
  let progress: RegProgress | null = null;
  let isRunning = false;
  
  if (status?.startsWith('{')) {
    try {
      progress = JSON.parse(status);
      isRunning = progress !== null && progress.step < progress.totalSteps;
    } catch {}
  }
  
  const statusText = status && !status.startsWith('{') ? status : '';
  isRunning = isRunning || statusText.includes('Installing') || statusText.includes('Initializing');
  
  return { progress, statusText, isRunning };
}

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
  // Handle both call signatures
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
        language,
      }
    : propsOrAccounts;

  const { accounts } = props;
  const EXTENSION_VERSION = props.version || 'dev';
  const lang = props.language || 'en';
  
  // Get translations from centralized i18n
  const t = getTranslations(lang);
  
  // Calculate stats (exclude unknown usage from total)
  const validCount = accounts.filter(a => !a.isExpired).length;
  const expiredCount = accounts.filter(a => a.isExpired).length;
  const suspendedCount = accounts.filter(a => a.usage?.suspended === true).length;
  const exhaustedCount = accounts.filter(a => a.usage && !a.usage.suspended && a.usage.currentUsage !== -1 && a.usage.percentageUsed >= 100).length;
  const badAccountsCount = exhaustedCount + suspendedCount; // Total accounts to delete
  const activeAccount = accounts.find(a => a.isActive);
  const totalUsage = accounts.reduce((sum, acc) => {
    const usage = acc.usage?.currentUsage;
    return sum + (usage && usage !== -1 ? usage : 0);
  }, 0);
  
  // Get active account name for usage card
  const activeAccountName = activeAccount?.tokenData?.accountName || activeAccount?.filename || '';
  
  // Parse status
  const { progress, statusText, isRunning } = parseAutoRegStatus(props.autoRegStatus);

  // Render components
  const settingsHtml = renderSettingsPanel({
    autoSwitchEnabled: props.autoSwitchEnabled,
    autoRegSettings: props.autoRegSettings,
    language: lang,
  });
  
  const usageHtml = renderUsageCard({ 
    usage: props.kiroUsage, 
    language: lang,
    accountName: activeAccountName,
    isStale: false // Will be set to true if data is outdated
  });
  const progressHtml = renderProgressPanel({ progress, statusText, language: lang });
  const accountsHtml = renderAccountList(accounts, lang);
  const script = generateWebviewScript(accounts.length);
  
  // Update banner
  const updateBannerHtml = props.availableUpdate ? `
    <div class="update-banner" onclick="openUpdateUrl('${props.availableUpdate.url}')">
      <div class="update-banner-icon">🚀</div>
      <div class="update-banner-content">
        <div class="update-banner-title">${lang === 'ru' ? 'Доступна новая версия!' : lang === 'zh' ? '新版本可用！' : 'New version available!'}</div>
        <div class="update-banner-version">v${props.availableUpdate.version}</div>
      </div>
      <div class="update-banner-action">${lang === 'ru' ? 'Скачать' : lang === 'zh' ? '下载' : 'Download'} →</div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${getStyles()}</style>
</head>
<body data-lang="${lang}">
  <div class="content" id="content">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <span class="header-title">${t.kiroAccounts}</span>
        <span class="header-badge">${accounts.length}</span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" onclick="toggleCompact()" title="${t.compactViewTip}">${ICONS.menu}</button>
        <button class="icon-btn" onclick="openSettings()" title="${t.settingsTip}">${ICONS.settings}</button>
      </div>
    </div>
    
    ${updateBannerHtml}
    
    ${settingsHtml}
    
    <!-- Stats Bar -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-dot ${activeAccount ? 'active' : 'valid'}"></span>
        <span>${activeAccount ? escapeHtml(getAccountEmail(activeAccount).split('@')[0]) : t.noActive}</span>
      </div>
      <div class="stat-item"><span class="stat-dot valid"></span><span>${validCount} ${t.valid}</span></div>
      ${expiredCount > 0 ? `<div class="stat-item"><span class="stat-dot expired"></span><span>${expiredCount} ${t.expired}</span></div>` : ''}
      ${badAccountsCount > 0 ? `<div class="stat-item stat-exhausted" onclick="confirmDeleteExhausted()" title="${lang === 'ru' ? 'Удалить исчерпанные/забаненные' : 'Delete exhausted/banned'}"><span class="stat-dot exhausted"></span><span>${badAccountsCount} ${lang === 'ru' ? (suspendedCount > 0 ? 'бан/лимит' : 'лимит') : (suspendedCount > 0 ? 'ban/limit' : 'limit')}</span><span class="stat-delete">🗑</span></div>` : ''}
      <div class="stat-total">${ICONS.chart} ${totalUsage.toLocaleString()} ${t.total}</div>
    </div>
    
    ${usageHtml}
    
    <!-- Action Buttons -->
    <div class="actions">
      <button class="btn btn-primary" onclick="startAutoReg()" ${isRunning ? 'disabled' : ''}>
        ${isRunning ? '<span class="spinner"></span>' : ICONS.bolt}
        ${isRunning ? t.running : t.autoReg}
      </button>
      <button class="btn btn-secondary" onclick="showSsoImport()" title="${lang === 'ru' ? 'Импорт из браузера' : 'Import from browser'}">
        🌐 ${lang === 'ru' ? 'SSO' : 'SSO'}
      </button>
      <button class="btn btn-secondary btn-icon" onclick="refresh()" title="${t.refreshTip}">${ICONS.refresh}</button>
    </div>
    
    <!-- SSO Import Panel -->
    <div class="sso-import-panel" id="ssoImportPanel">
      <div class="sso-import-header">
        <span>${lang === 'ru' ? 'Импорт из SSO Cookie' : 'SSO Cookie Import'}</span>
        <button class="icon-btn" onclick="hideSsoImport()">✕</button>
      </div>
      <div class="sso-import-body">
        <p class="sso-import-hint">${lang === 'ru' ? '1. Откройте view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Скопируйте x-amz-sso_authn' : '1. Open view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Copy x-amz-sso_authn'}</p>
        <textarea id="ssoTokenInput" class="sso-input" placeholder="${lang === 'ru' ? 'Вставьте cookie...' : 'Paste cookie...'}"></textarea>
        <button class="btn btn-primary btn-full" onclick="importSsoToken()">
          ${lang === 'ru' ? 'Импортировать' : 'Import'}
        </button>
      </div>
    </div>
    
    ${progressHtml}
    
    <!-- Search Bar -->
    <div class="search-bar">
      <div class="search-wrapper">
        <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" oninput="searchAccounts(this.value)">
        <span class="search-icon">${ICONS.search || '🔍'}</span>
        <button class="search-clear" onclick="clearSearch()">✕</button>
      </div>
    </div>
    
    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button class="filter-tab active" onclick="filterAccounts('all')">${t.all}</button>
        <button class="filter-tab" onclick="filterAccounts('valid')">${t.validFilter}</button>
        <button class="filter-tab" onclick="filterAccounts('expired')">${t.expiredFilter}</button>
      </div>
      <select class="sort-select" onchange="sortAccounts(this.value)">
        <option value="date">${t.byDate}</option>
        <option value="usage">${t.byUsage}</option>
        <option value="expiry">${t.byExpiry}</option>
      </select>
    </div>
    
    <!-- Account List -->
    <div class="list" id="accountList">${accountsHtml}</div>
    
    <!-- Floating Console (above footer) -->
    <div class="console-floating" id="consoleFloating">
      <div class="console-toggle" onclick="toggleConsole()">
        <span class="console-toggle-icon">▲</span>
        <span class="console-toggle-title">${t.console}</span>
        <span class="console-toggle-count" id="consoleCount">0</span>
      </div>
      <div class="console-content" id="consoleContent">
        <div class="console-actions">
          <button class="icon-btn" onclick="clearConsole()" title="${t.clearTip}">🗑</button>
          <button class="icon-btn" onclick="copyLogs()" title="${t.copyLogsTip}">📋</button>
        </div>
        <div class="console-body" id="consoleBody"></div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-version">
        <span>v${EXTENSION_VERSION}</span>
        ${props.availableUpdate ? `<a href="#" onclick="openUpdateUrl('${props.availableUpdate.url}')" class="update-badge" title="v${props.availableUpdate.version} available">⬆ Update</a>` : ''}
      </div>
      <div class="footer-status"><span class="footer-dot"></span><span>${t.connected}</span></div>
    </div>
    
    <!-- Dialog -->
    <div class="dialog-overlay" id="dialogOverlay">
      <div class="dialog">
        <div class="dialog-title" id="dialogTitle">${t.deleteTitle}</div>
        <div class="dialog-text" id="dialogText">${t.deleteConfirm}</div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="closeDialog()">${t.cancel}</button>
          <button class="btn btn-primary" onclick="dialogAction()">${t.confirm}</button>
        </div>
      </div>
    </div>
  </div>
  <script>${script}</script>
</body>
</html>`;
}
