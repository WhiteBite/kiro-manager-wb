/**
 * Webview HTML generation - v4.1 Modular Architecture
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
  
  // Calculate stats
  const validCount = accounts.filter(a => !a.isExpired).length;
  const expiredCount = accounts.filter(a => a.isExpired).length;
  const activeAccount = accounts.find(a => a.isActive);
  const totalUsage = accounts.reduce((sum, acc) => sum + (acc.usage?.currentUsage || 0), 0);
  
  // Parse status
  const { progress, statusText, isRunning } = parseAutoRegStatus(props.autoRegStatus);

  // Render components
  const settingsHtml = renderSettingsPanel({
    autoSwitchEnabled: props.autoSwitchEnabled,
    autoRegSettings: props.autoRegSettings,
    language: lang,
  });
  
  const usageHtml = renderUsageCard({ usage: props.kiroUsage, language: lang });
  const progressHtml = renderProgressPanel({ progress, statusText, language: lang });
  const accountsHtml = renderAccountList(accounts, lang);
  const consoleHtml = renderConsolePanel({ logs: props.consoleLogs, language: lang });
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
        <button class="icon-btn tooltip tooltip-left" data-tip="${t.compactViewTip}" onclick="toggleCompact()">${ICONS.menu}</button>
        <button class="icon-btn tooltip tooltip-left" data-tip="${t.settingsTip}" onclick="openSettings()">${ICONS.settings}</button>
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
      <div class="stat-total">${ICONS.chart} ${totalUsage.toLocaleString()} ${t.total}</div>
    </div>
    
    ${usageHtml}
    
    <!-- Action Buttons -->
    <div class="actions">
      <button class="btn btn-primary tooltip" data-tip="${t.autoRegTip}" onclick="startAutoReg()" ${isRunning ? 'disabled' : ''}>
        ${isRunning ? '<span class="spinner"></span>' : ICONS.bolt}
        ${isRunning ? t.running : t.autoReg}
      </button>
      <button class="btn btn-secondary tooltip" data-tip="${t.importTip}" onclick="importToken()">${ICONS.import} ${t.import}</button>
      <button class="btn btn-secondary btn-icon tooltip" data-tip="${t.refreshTip}" onclick="refresh()">${ICONS.refresh}</button>
      <button class="btn btn-secondary btn-icon tooltip" data-tip="${t.exportTip}" onclick="exportAccounts()">${ICONS.export}</button>
    </div>
    
    ${progressHtml}
    
    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button class="filter-tab active" onclick="filterAccounts('all')">${t.all}</button>
        <button class="filter-tab" onclick="filterAccounts('valid')">${t.validFilter}</button>
        <button class="filter-tab" onclick="filterAccounts('expired')">${t.expiredFilter}</button>
      </div>
      <select class="sort-select" onchange="sortAccounts(this.value)">
        <option value="email">${t.byEmail}</option>
        <option value="usage">${t.byUsage}</option>
        <option value="expiry">${t.byExpiry}</option>
      </select>
    </div>
    
    <!-- Account List -->
    <div class="list" id="accountList">${accountsHtml}</div>
    
    ${consoleHtml}
    
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


// Inline styles (can be loaded from CSS file in production)
function getStyles(): string {
  return `
    :root {
      --accent: #3fb68b; --accent-hover: #4ec9a0; --accent-dim: rgba(63, 182, 139, 0.12); --accent-glow: rgba(63, 182, 139, 0.4);
      --danger: #e55353; --danger-dim: rgba(229, 83, 83, 0.12); --warning: #d9a334;
      --muted: var(--vscode-descriptionForeground, #888); --bg-elevated: rgba(255,255,255,0.03);
      --border-subtle: rgba(128,128,128,0.12); --border-medium: rgba(128,128,128,0.2);
      --radius-sm: 4px; --radius-md: 6px; --radius-lg: 10px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.12); --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
      --transition-fast: 0.12s ease; --transition-normal: 0.2s ease;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif); font-size: 12px; line-height: 1.5; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); min-height: 100vh; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 4px; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%); border-bottom: 1px solid var(--border-subtle); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(8px); }
    .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; overflow: hidden; }
    .header-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    .header-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--accent-dim); color: var(--accent); font-weight: 700; }
    .header-actions { display: flex; gap: 4px; flex-shrink: 0; margin-left: 8px; }
    .icon-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .icon-btn:hover { background: var(--bg-elevated); border-color: var(--border-subtle); color: var(--vscode-foreground); }
    .icon-btn svg { pointer-events: none; }
    .update-banner { display: flex; align-items: center; gap: 12px; margin: 8px 14px; padding: 12px 16px; background: linear-gradient(135deg, rgba(217, 163, 52, 0.15) 0%, rgba(229, 83, 83, 0.1) 100%); border: 1px solid rgba(217, 163, 52, 0.4); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-normal); animation: updatePulse 2s ease-in-out infinite; }
    .update-banner:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(217, 163, 52, 0.3); border-color: var(--warning); }
    .update-banner-icon { font-size: 24px; animation: rocketBounce 1s ease-in-out infinite; }
    .update-banner-content { flex: 1; }
    .update-banner-title { font-size: 11px; font-weight: 700; color: var(--warning); }
    .update-banner-version { font-size: 13px; font-weight: 800; margin-top: 2px; }
    .update-banner-action { font-size: 11px; font-weight: 600; color: var(--warning); padding: 6px 12px; background: rgba(217, 163, 52, 0.2); border-radius: var(--radius-sm); transition: all var(--transition-fast); }
    .update-banner:hover .update-banner-action { background: var(--warning); color: #000; }
    @keyframes updatePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217, 163, 52, 0.4); } 50% { box-shadow: 0 0 0 4px rgba(217, 163, 52, 0.1); } }
    @keyframes rocketBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    .tooltip { position: relative; }
    .tooltip::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 6px); padding: 5px 10px; background: var(--vscode-editorWidget-background, #252526); color: var(--vscode-editorWidget-foreground, #ccc); font-size: 11px; font-weight: 500; border-radius: var(--radius-sm); white-space: nowrap; box-shadow: var(--shadow-md); border: 1px solid var(--border-medium); opacity: 0; pointer-events: none; transition: opacity var(--transition-fast); z-index: 1000; }
    .tooltip:hover::after { opacity: 1; }
    .tooltip-left::after { left: auto; right: 0; }
    .tooltip:not(.tooltip-left)::after { left: 50%; transform: translateX(-50%); }
    .stats-bar { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 10px 14px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-subtle); font-size: 11px; }
    .stat-item { display: flex; align-items: center; gap: 6px; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .stat-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); animation: glow 2s ease-in-out infinite; }
    .stat-dot.valid { background: #666; } .stat-dot.expired { background: var(--danger); }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 6px var(--accent-glow); } 50% { box-shadow: 0 0 12px var(--accent-glow); } }
    .stat-total { margin-left: auto; color: var(--muted); font-weight: 500; }
    .usage-card { margin: 12px 14px; padding: 14px 16px; background: linear-gradient(135deg, var(--accent-dim) 0%, rgba(63,182,139,0.04) 100%); border: 1px solid rgba(63,182,139,0.2); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-normal); position: relative; overflow: hidden; }
    .usage-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), transparent); }
    .usage-card:hover { border-color: rgba(63,182,139,0.4); transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .usage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .usage-title { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; }
    .usage-value { font-size: 18px; font-weight: 700; letter-spacing: -0.5px; }
    .usage-bar { height: 6px; background: rgba(128,128,128,0.15); border-radius: 3px; overflow: hidden; }
    .usage-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
    .usage-fill.low { background: linear-gradient(90deg, var(--accent), #4ec9a0); }
    .usage-fill.medium { background: linear-gradient(90deg, var(--warning), #e5b84a); }
    .usage-fill.high { background: linear-gradient(90deg, var(--danger), #f06b6b); }
    .usage-footer { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: var(--muted); font-weight: 500; }
    .actions { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; padding: 10px 14px; }
    .btn { padding: 9px 14px; font-size: 11px; font-weight: 600; font-family: inherit; border: none; border-radius: var(--radius-md); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all var(--transition-fast); white-space: nowrap; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%); color: #fff; box-shadow: 0 2px 8px rgba(63,182,139,0.3); }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(63,182,139,0.4); }
    .btn-secondary { background: var(--bg-elevated); color: var(--vscode-foreground); border: 1px solid var(--border-medium); }
    .btn-secondary:hover:not(:disabled) { background: rgba(128,128,128,0.1); }
    .btn-icon { padding: 9px 12px; } .btn svg { pointer-events: none; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid var(--border-subtle); gap: 8px; }
    .filter-tabs { display: flex; gap: 2px; background: var(--bg-elevated); padding: 2px; border-radius: var(--radius-sm); }
    .filter-tab { padding: 5px 10px; font-size: 10px; font-weight: 600; background: transparent; border: none; border-radius: 3px; cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .filter-tab:hover { color: var(--vscode-foreground); } .filter-tab.active { background: var(--accent-dim); color: var(--accent); }
    .sort-select { padding: 5px 8px; font-size: 10px; font-family: inherit; font-weight: 500; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; }
    .list { padding: 8px 10px 80px; } .list-empty { text-align: center; padding: 40px 20px; color: var(--muted); }
    .list-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; } .list-empty-text { font-size: 12px; margin-bottom: 16px; }
    .card { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 8px; transition: all var(--transition-normal); overflow: hidden; animation: fadeIn 0.3s ease forwards; }
    .card:hover { border-color: var(--border-medium); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
    .card.active { border-color: var(--accent); background: var(--accent-dim); }
    .card.expired { opacity: 0.7; border-color: var(--danger); background: var(--danger-dim); } .card.expired:hover { opacity: 0.85; }
    .card-main { display: flex; align-items: center; padding: 10px 12px; gap: 10px; cursor: pointer; }
    .card-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%); color: #fff; }
    .card.expired .card-avatar { background: linear-gradient(135deg, var(--danger) 0%, #f06b6b 100%); }
    .card-info { flex: 1; min-width: 0; }
    .card-email { font-size: 11px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-meta { display: flex; align-items: center; gap: 8px; margin-top: 3px; font-size: 10px; color: var(--muted); }
    .card-meta-item { display: flex; align-items: center; gap: 3px; }
    .card-status { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .card-status.active { background: var(--accent-dim); color: var(--accent); } .card-status.expired { background: var(--danger-dim); color: var(--danger); }
    .card-actions { display: flex; gap: 6px; opacity: 0.4; transition: opacity var(--transition-fast); } .card:hover .card-actions { opacity: 1; }
    .card-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .card-btn:hover { background: rgba(128,128,128,0.2); border-color: var(--border-medium); color: var(--vscode-foreground); transform: scale(1.1); }
    .card-btn.danger:hover { background: var(--danger-dim); border-color: var(--danger); color: var(--danger); }
    .card-btn.highlight { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); animation: pulse 2s infinite; }
    .card-btn.highlight:hover { background: var(--accent); color: var(--bg-primary); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
    .card-btn svg { width: 16px; height: 16px; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card:nth-child(1) { animation-delay: 0.02s; } .card:nth-child(2) { animation-delay: 0.04s; } .card:nth-child(3) { animation-delay: 0.06s; }
    .progress-panel { margin: 12px 14px; padding: 14px 16px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
    .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .progress-title { font-size: 11px; font-weight: 600; } .progress-step { font-size: 10px; color: var(--muted); }
    .progress-bar { height: 4px; background: rgba(128,128,128,0.15); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: 2px; transition: width 0.3s ease; }
    .progress-detail { font-size: 10px; color: var(--muted); }
    .settings-panel { display: none; padding: 14px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-subtle); } .settings-panel.visible { display: block; }
    .settings-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; color: var(--muted); }
    .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }
    .settings-label { font-size: 11px; font-weight: 500; } .settings-desc { font-size: 10px; color: var(--muted); margin-top: 2px; }
    .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; } .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: rgba(128,128,128,0.3); border-radius: 10px; transition: all var(--transition-fast); }
    .toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: all var(--transition-fast); }
    .toggle input:checked + .toggle-slider { background: var(--accent); } .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
    .settings-select { padding: 6px 10px; font-size: 11px; font-family: inherit; font-weight: 500; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; min-width: 100px; }
    .console-panel { margin: 12px 14px; background: var(--vscode-terminal-background, #1e1e1e); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .console-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-subtle); }
    .console-title { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
    .console-body { max-height: 150px; overflow-y: auto; padding: 8px 12px; font-family: var(--vscode-editor-font-family, 'Consolas', monospace); font-size: 11px; line-height: 1.6; }
    .console-line { white-space: pre-wrap; word-break: break-all; } .console-line.error { color: var(--danger); } .console-line.success { color: var(--accent); } .console-line.warning { color: var(--warning); }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: var(--vscode-sideBar-background); border-top: 1px solid var(--border-subtle); font-size: 10px; color: var(--muted); z-index: 100; }
    .footer-version { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--accent); background: var(--accent-dim); padding: 2px 8px; border-radius: 4px; } .footer-status { display: flex; align-items: center; gap: 4px; }
    .update-badge { color: #fff; background: var(--warning); padding: 2px 6px; border-radius: 3px; font-size: 9px; text-decoration: none; animation: pulse 1.5s infinite; } .update-badge:hover { background: var(--danger); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .footer-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: glow 2s ease-in-out infinite; }
    .dialog-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; } .dialog-overlay.visible { display: flex; }
    .dialog { background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 20px; max-width: 320px; box-shadow: var(--shadow-md); }
    .dialog-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; } .dialog-text { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
    .dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
    body.compact .card-main { padding: 6px 10px; } body.compact .card-avatar { width: 24px; height: 24px; font-size: 10px; } body.compact .card-meta { display: none; }
  `;
}
