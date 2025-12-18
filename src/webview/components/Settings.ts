/**
 * Settings Overlay Component
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';
import { AutoRegSettings } from '../types';
import { Language } from '../i18n';

export interface SettingsProps {
  autoSwitchEnabled: boolean;
  settings?: AutoRegSettings;
  lang: Language;
  t: Translations;
  version: string;
  inline?: boolean; // Render without overlay wrapper (for tab navigation)
}

function renderSpoofingSection(settings: AutoRegSettings | undefined, t: Translations): string {
  return `
    <div class="spoof-section">
      <div class="spoof-header">
        <div class="spoof-title">
          <span class="spoof-icon">🛡️</span>
          <div>
            <div class="setting-label">${t.spoofing}</div>
            <div class="setting-desc">${t.spoofingDesc}</div>
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="spoofingToggle" ${settings?.spoofing !== false ? 'checked' : ''} onchange="toggleSpoofing(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="spoof-details" id="spoofDetails">
        <div class="spoof-modules">
          <div class="spoof-module">
            <span class="module-icon">🤖</span>
            <div class="module-info">
              <div class="module-name">${t.spoofAutomation}</div>
              <div class="module-desc">${t.spoofAutomationDesc}</div>
            </div>
          </div>
          <div class="spoof-module">
            <span class="module-icon">🎨</span>
            <div class="module-info">
              <div class="module-name">${t.spoofCanvas}</div>
              <div class="module-desc">${t.spoofCanvasDesc}</div>
            </div>
          </div>
          <div class="spoof-module">
            <span class="module-icon">🖥️</span>
            <div class="module-info">
              <div class="module-name">${t.spoofNavigator}</div>
              <div class="module-desc">${t.spoofNavigatorDesc}</div>
            </div>
          </div>
          <div class="spoof-module">
            <span class="module-icon">🔊</span>
            <div class="module-info">
              <div class="module-name">${t.spoofAudio}</div>
              <div class="module-desc">${t.spoofAudioDesc}</div>
            </div>
          </div>
          <div class="spoof-module">
            <span class="module-icon">🌐</span>
            <div class="module-info">
              <div class="module-name">${t.spoofWebrtc}</div>
              <div class="module-desc">${t.spoofWebrtcDesc}</div>
            </div>
          </div>
          <div class="spoof-module">
            <span class="module-icon">🖱️</span>
            <div class="module-info">
              <div class="module-name">${t.spoofBehavior}</div>
              <div class="module-desc">${t.spoofBehaviorDesc}</div>
            </div>
          </div>
        </div>
        <div class="spoof-warning">
          <span>⚠️</span>
          <span>${t.spoofWarning}</span>
        </div>
      </div>
    </div>
  `;
}

function renderImportExportSection(t: Translations): string {
  return `
    <div class="import-export-section">
      <div class="section-header">
        <span class="section-icon">📦</span>
        <span class="section-title">${t.exportAccounts}</span>
      </div>
      <div class="section-desc">${t.exportAccountsDesc}</div>
      <div class="import-export-actions">
        <button class="btn btn-primary" onclick="exportAllAccounts()">
          📤 ${t.exportAll}
        </button>
        <button class="btn btn-secondary" onclick="importAccounts()">
          📥 ${t.importAccounts}
        </button>
      </div>
    </div>
  `;
}

function renderDangerZone(t: Translations): string {
  return `
    <div class="danger-zone-section">
      <div class="danger-zone-header">
        <span class="danger-zone-icon">⚠️</span>
        <span class="danger-zone-title">${t.dangerZone}</span>
      </div>
      
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
  `;
}

export function renderSettings({ autoSwitchEnabled, settings, lang, t, version, inline = false }: SettingsProps): string {
  const langOptions = ['en', 'ru', 'zh', 'es', 'pt', 'ja', 'de', 'fr', 'ko', 'hi']
    .map(l => `<option value="${l}" ${l === lang ? 'selected' : ''}>${l.toUpperCase()}</option>`)
    .join('');

  const content = `
    <!-- Active Profile Card -->
    <div class="settings-card" id="activeProfileCard">
      <div class="settings-card-header">
        <span class="settings-card-icon">📧</span>
        <span class="settings-card-title">${t.activeProfile}</span>
        <button class="btn btn-secondary btn-sm" onclick="switchTab('profiles')">${t.change}</button>
      </div>
      <div class="active-profile-content" id="activeProfileContent">
        <div class="active-profile-empty">
          <span class="empty-text">${t.noProfileConfigured}</span>
          <button class="btn btn-primary btn-sm" onclick="switchTab('profiles')">${t.configure}</button>
        </div>
      </div>
    </div>

    <!-- Automation Card -->
    <div class="settings-card">
      <div class="settings-card-header">
        <span class="settings-card-icon">⚙️</span>
        <span class="settings-card-title">${t.automation || 'Automation'}</span>
      </div>
      <div class="settings-card-body">
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
            <div class="setting-label">${t.deviceFlow}</div>
            <div class="setting-desc">${t.deviceFlowDesc}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${settings?.deviceFlow ? 'checked' : ''} onchange="toggleSetting('deviceFlow', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- Interface Card -->
    <div class="settings-card">
      <div class="settings-card-header">
        <span class="settings-card-icon">🎨</span>
        <span class="settings-card-title">${t.interface || 'Interface'}</span>
      </div>
      <div class="settings-card-body">
        <div class="setting-row">
          <div>
            <div class="setting-label">${t.language}</div>
            <div class="setting-desc">${t.languageDesc}</div>
          </div>
          <select class="select" onchange="changeLanguage(this.value)">${langOptions}</select>
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
      </div>
    </div>

    ${renderSpoofingSection(settings, t)}
    ${renderImportExportSection(t)}
    ${renderDangerZone(t)}
    
    <div class="settings-footer">
      <span class="settings-version">v${version}</span>
      <a href="https://t.me/whitebite_devsoft" class="btn btn-secondary" style="text-decoration:none" title="Telegram">📢 TG</a>
      <button class="btn btn-secondary" onclick="checkUpdates()">${t.checkUpdates}</button>
    </div>
  `;

  return inline ? `<div class="settings-content">${content}</div>` : `
    <div class="overlay" id="settingsOverlay">
      <div class="overlay-content">
        <div class="overlay-header">
          <button class="overlay-back" onclick="closeSettings()">← ${t.back}</button>
          <span class="overlay-title">${t.settings}</span>
        </div>
        <div class="overlay-body">${content}</div>
      </div>
    </div>
  `;
}
