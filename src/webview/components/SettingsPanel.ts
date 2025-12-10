/**
 * Settings Panel Component
 */

import { AutoRegSettings } from '../types';

export interface SettingsPanelProps {
  autoSwitchEnabled: boolean;
  autoRegSettings?: AutoRegSettings;
}

function renderToggle(id: string, checked: boolean, onChange: string): string {
  return `
    <label class="toggle">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${onChange}">
      <span class="toggle-slider"></span>
    </label>
  `;
}

function renderSettingRow(label: string, desc: string, toggle: string): string {
  return `
    <div class="settings-row">
      <div>
        <div class="settings-label">${label}</div>
        <div class="settings-desc">${desc}</div>
      </div>
      ${toggle}
    </div>
  `;
}

export function renderSettingsPanel({ autoSwitchEnabled, autoRegSettings }: SettingsPanelProps): string {
  const settings = [
    {
      label: 'Auto-switch on expiry',
      desc: 'Automatically switch to next valid account',
      toggle: renderToggle('autoSwitch', autoSwitchEnabled, "toggleAutoSwitch(this.checked)"),
    },
    {
      label: 'Headless mode',
      desc: 'Run browser in background',
      toggle: renderToggle('headless', autoRegSettings?.headless !== false, "updateSetting('headless', this.checked)"),
    },
    {
      label: 'Verbose logging',
      desc: 'Show detailed logs',
      toggle: renderToggle('verbose', autoRegSettings?.verbose ?? false, "updateSetting('verbose', this.checked)"),
    },
    {
      label: 'Screenshots on error',
      desc: 'Save screenshots when errors occur',
      toggle: renderToggle('screenshots', autoRegSettings?.screenshotsOnError ?? true, "updateSetting('screenshotsOnError', this.checked)"),
    },
  ];

  return `
    <div class="settings-panel" id="settingsPanel">
      <div class="settings-title">Settings</div>
      ${settings.map(s => renderSettingRow(s.label, s.desc, s.toggle)).join('')}
    </div>
  `;
}
