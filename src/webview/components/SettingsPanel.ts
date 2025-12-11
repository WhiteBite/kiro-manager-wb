/**
 * Settings Panel Component
 */

import { AutoRegSettings } from '../types';
import { Language, getLanguageOptions, getTranslations } from '../i18n';

export interface SettingsPanelProps {
  autoSwitchEnabled: boolean;
  autoRegSettings?: AutoRegSettings;
  language?: Language;
}

function renderToggle(id: string, checked: boolean, onChange: string): string {
  return `
    <label class="toggle">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''} onchange="${onChange}">
      <span class="toggle-slider"></span>
    </label>
  `;
}

function renderSettingRow(label: string, desc: string, control: string): string {
  return `
    <div class="settings-row">
      <div>
        <div class="settings-label">${label}</div>
        <div class="settings-desc">${desc}</div>
      </div>
      ${control}
    </div>
  `;
}

function renderLanguageSelect(currentLang: Language = 'en'): string {
  const options = getLanguageOptions();
  return `
    <select class="settings-select" onchange="changeLanguage(this.value)">
      ${options.map(opt => `<option value="${opt.value}" ${opt.value === currentLang ? 'selected' : ''}>${opt.label}</option>`).join('')}
    </select>
  `;
}

export function renderSettingsPanel({ autoSwitchEnabled, autoRegSettings, language = 'en' }: SettingsPanelProps): string {
  const t = getTranslations(language);

  const settings = [
    {
      label: t.autoSwitch,
      desc: t.autoSwitchDesc,
      control: renderToggle('autoSwitch', autoSwitchEnabled, "toggleAutoSwitch(this.checked)"),
    },
    {
      label: t.headless,
      desc: t.headlessDesc,
      control: renderToggle('headless', autoRegSettings?.headless !== false, "updateSetting('headless', this.checked)"),
    },
    {
      label: t.verbose,
      desc: t.verboseDesc,
      control: renderToggle('verbose', autoRegSettings?.verbose ?? false, "updateSetting('verbose', this.checked)"),
    },
    {
      label: t.screenshots,
      desc: t.screenshotsDesc,
      control: renderToggle('screenshots', autoRegSettings?.screenshotsOnError ?? true, "updateSetting('screenshotsOnError', this.checked)"),
    },
    {
      label: t.language,
      desc: t.languageDesc,
      control: renderLanguageSelect(language),
    },
  ];

  const checkUpdateLabel = language === 'ru' ? 'Проверить обновления' : language === 'zh' ? '检查更新' : 'Check for updates';

  return `
    <div class="settings-panel" id="settingsPanel">
      <div class="settings-title">${t.settingsTitle}</div>
      ${settings.map(s => renderSettingRow(s.label, s.desc, s.control)).join('')}
      <div class="settings-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
        <button class="btn btn-secondary" onclick="checkForUpdates()" style="width: 100%;">🔄 ${checkUpdateLabel}</button>
      </div>
    </div>
  `;
}
