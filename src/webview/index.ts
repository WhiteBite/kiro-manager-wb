/**
 * Webview HTML generation - v5.0 Clean Dashboard
 */

import { AccountInfo } from '../types';
import { KiroUsageData } from '../utils';
import { ICONS } from './icons';
import { escapeHtml, getAccountEmail } from './helpers';
import { RegProgress } from './components';
import { AutoRegSettings } from './types';
import { generateWebviewScript } from './scripts';
import { Language, getTranslations } from './i18n';
import { getStyles } from './styles';

export { RegProgress, AutoRegSettings };
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

// Parse registration status
function parseStatus(status: string): { progress: RegProgress | null; isRunning: boolean } {
  if (!status?.startsWith('{')) return { progress: null, isRunning: false };
  try {
    const progress = JSON.parse(status) as RegProgress;
    return { progress, isRunning: progress.step < progress.totalSteps };
  } catch { return { progress: null, isRunning: false }; }
}

// Get usage bar color class
function getUsageClass(percent: number): string {
  if (percent < 80) return 'low';
  if (percent < 95) return 'medium';
  return 'high';
}

// Log line class
function getLogClass(log: string): string {
  if (log.includes('ERROR') || log.includes('FAIL') || log.includes('✗')) return 'error';
  if (log.includes('SUCCESS') || log.includes('✓') || log.includes('✅')) return 'success';
  if (log.includes('WARN') || log.includes('⚠')) return 'warning';
  return '';
}

// Render Hero Dashboard
function renderHero(
  activeAccount: AccountInfo | undefined,
  usage: KiroUsageData | null | undefined,
  progress: RegProgress | null,
  isRunning: boolean,
  t: ReturnType<typeof getTranslations>
): string {
  // Registration in progress - show progress
  if (isRunning && progress) {
    const percent = Math.round((progress.step / progress.totalSteps) * 100);
    return `
      <div class="hero progress">
        <div class="hero-header">
          <span class="hero-email">${escapeHtml(progress.stepName)}</span>
          <span class="hero-step">${progress.step}/${progress.totalSteps}</span>
        </div>
        <div class="hero-progress">
          <div class="hero-progress-fill low" style="width: ${percent}%"></div>
        </div>
        <div class="hero-stats">
          <span class="hero-usage">${escapeHtml(progress.detail || '')}</span>
          <span class="hero-percent">${percent}%</span>
        </div>
      </div>
    `;
  }

  // No active account
  if (!activeAccount) {
    return `
      <div class="hero empty">
        <div class="hero-email">${t.noActive}</div>
      </div>
    `;
  }

  const email = getAccountEmail(activeAccount);
  const current = usage?.currentUsage ?? 0;
  const limit = usage?.usageLimit ?? 500;
  const percent = usage?.percentageUsed ?? 0;
  const daysLeft = usage?.daysRemaining ?? '?';
  const usageClass = getUsageClass(percent);

  return `
    <div class="hero" onclick="refreshUsage()">
      <div class="hero-header">
        <span class="hero-email" title="${escapeHtml(email)}">${escapeHtml(email)}</span>
        <span class="hero-days">${daysLeft}${typeof daysLeft === 'number' ? 'd' : ''} ${t.daysLeft}</span>
      </div>
      <div class="hero-progress">
        <div class="hero-progress-fill ${usageClass}" style="width: ${Math.min(percent, 100)}%"></div>
      </div>
      <div class="hero-stats">
        <span class="hero-usage font-mono">${current.toLocaleString()} / ${limit}</span>
        <span class="hero-percent">${percent.toFixed(1)}%</span>
      </div>
    </div>
  `;
}

// Render Account Row
function renderAccount(acc: AccountInfo, index: number, t: ReturnType<typeof getTranslations>): string {
  const email = getAccountEmail(acc);
  const avatar = email.charAt(0).toUpperCase();
  const usage = acc.usage;
  const hasUsage = usage !== undefined;
  const isUnknown = hasUsage && usage!.currentUsage === -1;
  const isSuspended = hasUsage && usage!.suspended === true;
  const isExhausted = hasUsage && !isUnknown && !isSuspended && usage!.percentageUsed >= 100;

  const classes = [
    'account',
    acc.isActive ? 'active' : '',
    acc.isExpired ? 'expired' : '',
    isExhausted ? 'exhausted' : '',
    isSuspended ? 'suspended' : '',
  ].filter(Boolean).join(' ');

  const statusClass = acc.isActive ? 'active' :
    isSuspended ? 'suspended' :
      isExhausted ? 'exhausted' :
        acc.isExpired ? 'expired' : 'ready';

  const usageText = isUnknown ? '?' : hasUsage ? usage!.currentUsage.toLocaleString() : '—';
  const expiryText = acc.expiresIn || '—';

  return `
    <div class="${classes}" data-index="${index}" onclick="switchAccount('${escapeHtml(acc.filename)}')">
      <div class="account-avatar">
        ${avatar}
        <span class="account-status ${statusClass}"></span>
      </div>
      <div class="account-info">
        <div class="account-email">${escapeHtml(email)}</div>
        <div class="account-meta">
          <span>${ICONS.chart} ${usageText}</span>
          <span>${ICONS.clock} ${expiryText}</span>
        </div>
      </div>
      <div class="account-actions">
        <button class="account-btn" title="${t.copyTokenTip}" onclick="event.stopPropagation(); copyToken('${escapeHtml(acc.filename)}')">${ICONS.copy}</button>
        <button class="account-btn ${acc.isExpired ? 'highlight' : ''}" title="${t.refreshTokenTip}" onclick="event.stopPropagation(); refreshToken('${escapeHtml(acc.filename)}')">${ICONS.refresh}</button>
        <button class="account-btn danger" title="${t.deleteTip}" onclick="event.stopPropagation(); confirmDelete('${escapeHtml(acc.filename)}')">${ICONS.trash}</button>
      </div>
    </div>
  `;
}

// Render grouped account list
function renderAccountList(accounts: AccountInfo[], lang: Language, t: ReturnType<typeof getTranslations>): string {
  if (accounts.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">${t.noAccounts}</div>
        <button class="btn btn-primary" onclick="startAutoReg()">${ICONS.bolt} ${t.createFirst}</button>
      </div>
    `;
  }

  // Group accounts
  const active: AccountInfo[] = [];
  const ready: AccountInfo[] = [];
  const bad: AccountInfo[] = []; // expired, exhausted, suspended

  accounts.forEach(acc => {
    const usage = acc.usage;
    const isSuspended = usage?.suspended === true;
    const isExhausted = usage && usage.currentUsage !== -1 && usage.percentageUsed >= 100;

    if (acc.isExpired || isExhausted || isSuspended) {
      bad.push(acc);
    } else if (acc.isActive) {
      active.push(acc);
    } else {
      ready.push(acc);
    }
  });

  let html = '';
  let globalIndex = 0;

  // Active accounts
  if (active.length > 0) {
    html += `<div class="list-group"><span>${t.activeGroup}</span><span class="list-group-count">${active.length}</span></div>`;
    active.forEach(acc => { html += renderAccount(acc, globalIndex++, t); });
  }

  // Ready accounts
  if (ready.length > 0) {
    html += `<div class="list-group"><span>${t.readyGroup}</span><span class="list-group-count">${ready.length}</span></div>`;
    ready.forEach(acc => { html += renderAccount(acc, globalIndex++, t); });
  }

  // Bad accounts (expired/exhausted/suspended)
  if (bad.length > 0) {
    html += `
      <div class="list-group danger">
        <span>${t.badGroup}</span>
        <button class="list-group-action" onclick="confirmDeleteExhausted()">${t.deleteAll}</button>
        <span class="list-group-count">${bad.length}</span>
      </div>
    `;
    bad.forEach(acc => { html += renderAccount(acc, globalIndex++, t); });
  }

  return html;
}

// Render Settings Overlay
function renderSettings(
  autoSwitchEnabled: boolean,
  settings: AutoRegSettings | undefined,
  lang: Language,
  t: ReturnType<typeof getTranslations>,
  version: string
): string {
  const langOptions = ['en', 'ru', 'zh', 'es', 'pt', 'ja', 'de', 'fr', 'ko', 'hi']
    .map(l => `<option value="${l}" ${l === lang ? 'selected' : ''}>${l.toUpperCase()}</option>`)
    .join('');

  // Strategy labels
  const strategyLabels: Record<string, { icon: string; name: string; desc: string }> = {
    single: {
      icon: '📧',
      name: t.strategySingleName,
      desc: t.strategySingleShort
    },
    plus_alias: {
      icon: '➕',
      name: t.strategyPlusAliasName,
      desc: t.strategyPlusAliasShort
    },
    catch_all: {
      icon: '🌐',
      name: t.strategyCatchAllName,
      desc: t.strategyCatchAllShort
    },
    pool: {
      icon: '📋',
      name: t.strategyPoolName,
      desc: t.strategyPoolShort
    }
  };

  return `
    <div class="overlay" id="settingsOverlay">
      <div class="overlay-header">
        <button class="overlay-back" onclick="closeSettings()">← ${t.back}</button>
        <span class="overlay-title">${t.settingsTitle}</span>
      </div>
      <div class="overlay-content">
        <!-- Active Profile Card -->
        <div class="active-profile-card" id="activeProfileCard">
          <div class="active-profile-header">
            <span class="active-profile-label">${t.activeProfile}</span>
            <button class="btn btn-secondary btn-sm" onclick="openProfilesPanel()">${t.change}</button>
          </div>
          <div class="active-profile-content" id="activeProfileContent">
            <div class="active-profile-empty">
              <span class="empty-icon">📧</span>
              <span class="empty-text">${t.noProfileConfigured}</span>
              <button class="btn btn-primary btn-sm" onclick="openProfilesPanel()">${t.configure}</button>
            </div>
          </div>
        </div>

        <div class="setting-row">
          <div>
            <div class="setting-label">${t.autoSwitch}</div>
            <div class="setting-desc">${t.autoSwitchDesc}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${autoSwitchEnabled ? 'checked' : ''} onchange="toggleAutoSwitch(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">${t.headless}</div>
            <div class="setting-desc">${t.headlessDesc}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings?.headless ? 'checked' : ''} onchange="toggleSetting('headless', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">${t.verbose}</div>
            <div class="setting-desc">${t.verboseDesc}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings?.verbose ? 'checked' : ''} onchange="toggleSetting('verbose', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">${t.screenshots}</div>
            <div class="setting-desc">${t.screenshotsDesc}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings?.screenshotsOnError ? 'checked' : ''} onchange="toggleSetting('screenshotsOnError', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div>
            <div class="setting-label">${t.language}</div>
            <div class="setting-desc">${t.languageDesc}</div>
          </div>
          <select class="select" onchange="changeLanguage(this.value)">${langOptions}</select>
        </div>

        <!-- Danger Zone -->
        <div class="danger-zone-section">
          <div class="danger-zone-header">
            <span class="danger-zone-icon">⚠️</span>
            <span class="danger-zone-title">${t.dangerZone}</span>
          </div>
          
          <!-- Kiro Patching -->
          <div class="danger-zone-card patch-card">
            <div class="danger-zone-info">
              <div class="danger-zone-label">${t.kiroPatch}</div>
              <div class="danger-zone-desc">${t.kiroPatchDesc}</div>
              <div class="patch-status-row">
                <span id="patchStatusText" class="patch-status">${t.patchStatusLoading}</span>
                <span id="currentMachineId" class="machine-id-preview"></span>
              </div>
            </div>
            <div class="danger-zone-actions">
              <button id="patchKiroBtn" class="btn btn-warning" onclick="confirmPatchKiro()" title="${t.patchKiroTitle}">
                🔧 ${t.patch}
              </button>
              <button id="unpatchKiroBtn" class="btn btn-secondary" onclick="confirmUnpatchKiro()" style="display:none" title="${t.removePatchTitle}">
                ↩️ ${t.removePatch}
              </button>
              <button id="generateIdBtn" class="btn btn-secondary" onclick="generateNewMachineId()" title="${t.newMachineId}">
                🎲 ${t.newMachineId}
              </button>
            </div>
          </div>
          
          <!-- Reset Telemetry -->
          <div class="danger-zone-card">
            <div class="danger-zone-info">
              <div class="danger-zone-label">${t.resetMachineId}</div>
              <div class="danger-zone-desc">${t.resetMachineIdDesc}</div>
            </div>
            <button class="btn btn-danger" onclick="confirmResetMachineId()" title="${t.resetMachineIdTip}">
              🔄 ${t.reset}
            </button>
          </div>
          <div class="danger-zone-hint">
            💡 ${t.restartAfterReset}
          </div>
        </div>
      </div>
      <div class="overlay-footer">
        <span class="overlay-version">v${version}</span>
        <a href="https://t.me/whitebite_devsoft" class="btn btn-secondary" style="text-decoration:none" title="Telegram">📢 TG</a>
        <button class="btn btn-secondary" onclick="checkUpdates()">${t.checkUpdates}</button>
      </div>
    </div>
  `;
}

// Render Logs Drawer
function renderLogs(logs: string[] | undefined, t: ReturnType<typeof getTranslations>): string {
  const hasErrors = logs?.some(l => l.includes('ERROR') || l.includes('FAIL') || l.includes('✗')) ?? false;
  const logLines = (logs || []).slice(-100).map(log =>
    `<div class="log-line ${getLogClass(log)}">${escapeHtml(log)}</div>`
  ).join('');

  return `
    <div class="logs-drawer" id="logsDrawer">
      <div class="logs-header" onclick="toggleLogs()">
        <div class="logs-header-left">
          <span class="logs-title">${t.console}</span>
          <span class="logs-count${hasErrors ? ' has-errors' : ''}" id="logsCount">${logs?.length || 0}</span>
        </div>
        <span class="logs-toggle">▲</span>
      </div>
      <div class="logs-actions">
        <button class="icon-btn" onclick="clearConsole()" title="${t.clearTip}">🗑</button>
        <button class="icon-btn" onclick="copyLogs()" title="${t.copyLogsTip}">📋</button>
      </div>
      <div class="logs-content" id="logsContent">${logLines}</div>
    </div>
  `;
}

// Render SSO Modal
function renderSsoModal(t: ReturnType<typeof getTranslations>): string {
  return `
    <div class="modal-overlay" id="ssoModal" onclick="if(event.target === this) closeSsoModal()">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${t.ssoImport}</span>
          <button class="modal-close" onclick="closeSsoModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-hint">${t.ssoHint}</div>
          <textarea class="modal-textarea" id="ssoTokenInput" placeholder="${t.pasteCookie}"></textarea>
          <button class="btn btn-primary" style="width:100%" onclick="importSsoToken()">${t.import}</button>
        </div>
      </div>
    </div>
  `;
}

// Main HTML generator
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
  const props: WebviewProps = Array.isArray(propsOrAccounts)
    ? { accounts: propsOrAccounts, autoSwitchEnabled: autoSwitchEnabled ?? false, autoRegStatus: autoRegStatus ?? '', regProgress, kiroUsage, autoRegSettings, consoleLogs, version, language }
    : propsOrAccounts;

  const { accounts } = props;
  const lang = props.language || 'en';
  const t = getTranslations(lang);
  const ver = props.version || 'dev';
  const activeAccount = accounts.find(a => a.isActive);
  const { progress, isRunning } = parseStatus(props.autoRegStatus);
  const validCount = accounts.filter(a => !a.isExpired).length;

  const script = generateWebviewScript(accounts.length, t);

  // Update banner
  const updateBanner = props.availableUpdate ? `
    <div class="update-banner" onclick="openUpdateUrl('${props.availableUpdate.url}')">
      <span class="update-banner-icon">🚀</span>
      <div class="update-banner-content">
        <div class="update-banner-title">${t.newVersion}</div>
        <div class="update-banner-version">v${props.availableUpdate.version}</div>
      </div>
      <span class="update-banner-action">${t.download} →</span>
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
  <div class="app">
    <!-- Header -->
    <div class="header">
      <div class="header-left">
        <span class="header-title">KIRO</span>
        <span class="header-badge">${validCount}/${accounts.length}</span>
        <span class="patch-indicator" id="patchIndicator" title="${t.kiroPatch}"></span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" onclick="toggleLogs()" title="${t.console}">${ICONS.file}</button>
        <button class="icon-btn" onclick="openSettings()" title="${t.settingsTip}">${ICONS.settings}</button>
      </div>
    </div>

    ${updateBanner}

    <!-- Hero Dashboard -->
    ${renderHero(activeAccount, props.kiroUsage, progress, isRunning, t)}

    <!-- Action Toolbar -->
    <div class="toolbar">
      <div class="toolbar-buttons">
        ${isRunning ? `
          <button class="btn btn-primary" disabled>
            <span class="spinner"></span> ${t.running}
          </button>
          <button class="btn btn-secondary btn-icon" onclick="togglePauseAutoReg()" title="Pause">⏸</button>
          <button class="btn btn-danger btn-icon" onclick="stopAutoReg()" title="Stop">⏹</button>
        ` : `
          <button class="btn btn-primary" onclick="startAutoReg()">
            ${ICONS.bolt} ${t.autoReg}
          </button>
        `}
        <button class="btn btn-secondary" onclick="openSsoModal()" title="SSO Import">🌐</button>
        <button class="btn btn-secondary btn-icon" onclick="refresh()" title="${t.refreshTip}">${ICONS.refresh}</button>
      </div>
      <div class="search-wrapper">
        <span class="search-icon">${ICONS.search}</span>
        <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" oninput="searchAccounts(this.value)">
        <button class="search-clear" onclick="clearSearch()">×</button>
      </div>
    </div>

    <!-- Account List -->
    <div class="list" id="accountList">
      ${renderAccountList(accounts, lang, t)}
    </div>

    <!-- Logs Drawer -->
    ${renderLogs(props.consoleLogs, t)}

    <!-- Settings Overlay -->
    ${renderSettings(props.autoSwitchEnabled, props.autoRegSettings, lang, t, ver)}

    <!-- SSO Modal -->
    ${renderSsoModal(t)}

    <!-- Delete Dialog -->
    <div class="dialog-overlay" id="dialogOverlay" onclick="if(event.target === this) closeDialog()">
      <div class="dialog">
        <div class="dialog-title" id="dialogTitle">${t.deleteTitle}</div>
        <div class="dialog-text" id="dialogText">${t.deleteConfirm}</div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="closeDialog()">${t.cancel}</button>
          <button class="btn btn-danger" onclick="dialogAction()">${t.delete}</button>
        </div>
      </div>
    </div>

    <!-- Toast Container -->
    <div class="toast-container" id="toastContainer"></div>

    <!-- IMAP Profiles Panel -->
    <div class="profiles-panel" id="profilesPanel">
      <div class="profiles-panel-header">
        <button class="overlay-back" onclick="closeProfilesPanel()">← ${t.back}</button>
        <span class="profiles-panel-title">${t.emailProfiles}</span>
      </div>
      <div class="profiles-panel-content" id="profilesContent">
        <div class="profiles-empty">
          <div class="empty-icon">📧</div>
          <div class="empty-text">${t.noProfiles}</div>
          <button class="btn btn-primary" onclick="createProfile()">
            ${ICONS.plus} ${t.addProfile}
          </button>
        </div>
      </div>
    </div>

    <!-- Profile Editor -->
    <div class="profile-editor" id="profileEditor">
      <div class="editor-header">
        <button class="overlay-back" onclick="closeProfileEditor()">← ${t.back}</button>
        <span class="editor-title">${t.newProfile}</span>
      </div>
      <div class="editor-content">
        <div class="form-group">
          <label class="form-label">${t.profileName}</label>
          <input type="text" class="form-input" id="profileName" placeholder="${t.profileNamePlaceholder}">
        </div>
        
        <div class="form-section">
          <div class="form-section-title">IMAP</div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="imapUser" placeholder="your@email.com" oninput="onEmailInput(this.value)">
            <div class="form-hint" id="providerHint"></div>
          </div>
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">${t.server}</label>
              <input type="text" class="form-input" id="imapServer" placeholder="imap.gmail.com">
            </div>
            <div class="form-group flex-1">
              <label class="form-label">${t.port}</label>
              <input type="number" class="form-input" id="imapPort" value="993">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">${t.password}</label>
            <div class="password-input-wrapper">
              <input type="password" class="form-input" id="imapPassword" placeholder="••••••••">
              <button class="password-toggle" onclick="togglePasswordVisibility('imapPassword')">${ICONS.eye || '👁'}</button>
            </div>
          </div>
          <button class="btn btn-secondary" onclick="testImapConnection()">🔌 ${t.testConnection}</button>
        </div>
        
        <div class="form-section">
          <div class="form-section-title">${t.emailStrategy}</div>
          <div class="form-section-desc">${t.emailStrategyDesc}</div>
          
          <div class="strategy-selector">
            <div class="strategy-option selected" data-strategy="single" onclick="selectStrategy('single')">
              <div class="strategy-icon">📧</div>
              <div class="strategy-content">
                <div class="strategy-label">${t.strategySingleName}</div>
                <div class="strategy-desc">${t.strategySingleDesc}</div>
                <div class="strategy-example">${t.example}: ${t.strategySingleExample}</div>
              </div>
              <div class="strategy-check">✓</div>
            </div>
            <div class="strategy-option" data-strategy="plus_alias" onclick="selectStrategy('plus_alias')">
              <div class="strategy-icon">➕</div>
              <div class="strategy-content">
                <div class="strategy-label">${t.strategyPlusAliasName}</div>
                <div class="strategy-desc">${t.strategyPlusAliasDesc}</div>
                <div class="strategy-example">${t.example}: ${t.strategyPlusAliasExample}</div>
              </div>
              <div class="strategy-check">✓</div>
            </div>
            <div class="strategy-option" data-strategy="catch_all" onclick="selectStrategy('catch_all')">
              <div class="strategy-icon">🌐</div>
              <div class="strategy-content">
                <div class="strategy-label">${t.strategyCatchAllName}</div>
                <div class="strategy-desc">${t.strategyCatchAllDesc}</div>
                <div class="strategy-example">${t.example}: ${t.strategyCatchAllExample}</div>
              </div>
              <div class="strategy-check">✓</div>
            </div>
            <div class="strategy-option" data-strategy="pool" onclick="selectStrategy('pool')">
              <div class="strategy-icon">📋</div>
              <div class="strategy-content">
                <div class="strategy-label">${t.strategyPoolName}</div>
                <div class="strategy-desc">${t.strategyPoolDesc}</div>
              </div>
              <div class="strategy-check">✓</div>
            </div>
          </div>
          
          <div class="strategy-config" id="catchAllConfig" style="display: none;">
            <div class="config-hint">${t.strategyCatchAllHint}</div>
            <div class="form-group">
              <label class="form-label">${t.strategyCatchAllDomain}</label>
              <input type="text" class="form-input" id="catchAllDomain" placeholder="your-domain.com">
            </div>
          </div>
          
          <div class="strategy-config" id="poolConfig" style="display: none;">
            <div class="config-hint">${t.strategyPoolHint}</div>
            <div class="email-pool-editor">
              <div class="pool-list" id="poolList"></div>
              <div class="pool-add">
                <input type="email" class="form-input" id="newPoolEmail" placeholder="${t.strategyPoolAdd}" onkeypress="if(event.key==='Enter') addEmailToPool()">
                <button class="btn btn-secondary" onclick="addEmailToPool()">${ICONS.plus}</button>
              </div>
              <div class="pool-actions">
                <button class="btn btn-secondary" onclick="importEmailsFromFile()">📁 ${t.strategyPoolFromFile}</button>
                <button class="btn btn-secondary" onclick="pasteEmails()">📋 ${t.strategyPoolPaste}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeProfileEditor()">${t.cancel}</button>
        <button class="btn btn-primary" onclick="saveProfile()">${t.save}</button>
      </div>
    </div>
  </div>
  <script>${script}</script>
</body>
</html>`;
}
