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
  return `
    <div class="toolbar">
      <div class="toolbar-buttons">
        <button class="btn btn-secondary" onclick="openSsoModal()" title="SSO Import">🌐</button>
        <button class="btn btn-secondary btn-icon" onclick="checkAllAccountsHealth()" title="${t.checkHealth || 'Check Health'}">🩺</button>
        <button class="btn btn-secondary btn-icon" onclick="toggleSelectionMode()" title="${t.selectMode}" id="selectModeBtn">☑️</button>
      </div>
      <div class="search-wrapper">
        <span class="search-icon">${ICONS.search}</span>
        <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" oninput="searchAccounts(this.value)">
        <button class="search-clear" onclick="clearSearch()">×</button>
      </div>
      <div class="bulk-actions-bar hidden" id="bulkActionsBar">
        <div class="bulk-info">
          <span class="bulk-count" id="bulkCount">0</span> ${t.selected}
        </div>
        <div class="bulk-buttons">
          <button class="btn btn-secondary btn-sm" onclick="selectAllAccounts()">☑️</button>
          <button class="btn btn-secondary btn-sm" onclick="deselectAllAccounts()">☐</button>
          <button class="btn btn-secondary btn-sm" onclick="exportSelectedAccounts()">📤</button>
          <button class="btn btn-secondary btn-sm" onclick="refreshSelectedTokens()">🔄</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSelectedAccounts()">🗑️</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="toggleSelectionMode()">✕</button>
      </div>
    </div>
  `;
}
