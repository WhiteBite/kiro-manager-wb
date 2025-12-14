/**
 * Header Component
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface HeaderProps {
    validCount: number;
    totalCount: number;
    t: Translations;
}

export function renderHeader({ validCount, totalCount, t }: HeaderProps): string {
    return `
    <div class="header">
      <div class="header-left">
        <span class="header-title">KIRO</span>
        <span class="header-badge">${validCount}/${totalCount}</span>
        <span class="patch-indicator" id="patchIndicator" title="${t.kiroPatch}"></span>
      </div>
      <div class="header-actions">
        <button class="icon-btn" onclick="toggleLogs()" title="${t.console}">${ICONS.file}</button>
        <button class="icon-btn" onclick="openSettings()" title="${t.settingsTip}">${ICONS.settings}</button>
      </div>
    </div>
  `;
}
