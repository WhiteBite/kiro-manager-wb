/**
 * Toolbar Component
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface ToolbarProps {
    isRunning: boolean;
    t: Translations;
}

export function renderToolbar({ isRunning, t }: ToolbarProps): string {
    const actionButtons = isRunning
        ? `
      <button class="btn btn-primary" disabled>
        <span class="spinner"></span> ${t.running}
      </button>
      <button class="btn btn-secondary btn-icon" onclick="togglePauseAutoReg()" title="Pause">⏸</button>
      <button class="btn btn-danger btn-icon" onclick="stopAutoReg()" title="Stop">⏹</button>
    `
        : `
      <button class="btn btn-primary" onclick="startAutoReg()">
        ${ICONS.bolt} ${t.autoReg}
      </button>
    `;

    return `
    <div class="toolbar">
      <div class="toolbar-buttons">
        ${actionButtons}
        <button class="btn btn-secondary" onclick="openSsoModal()" title="SSO Import">🌐</button>
        <button class="btn btn-secondary btn-icon" onclick="refresh()" title="${t.refreshTip}">${ICONS.refresh}</button>
      </div>
      <div class="search-wrapper">
        <span class="search-icon">${ICONS.search}</span>
        <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" oninput="searchAccounts(this.value)">
        <button class="search-clear" onclick="clearSearch()">×</button>
      </div>
    </div>
  `;
}
