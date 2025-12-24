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
      <div class="toolbar-row">
        <div class="toolbar-buttons">
          <button class="btn btn-secondary btn-icon" onclick="openSsoModal()" title="SSO Import">🌐</button>
          <button class="btn btn-secondary btn-icon" onclick="checkAllAccountsHealth()" title="${t.checkHealth || 'Check Health'}">🩺</button>
          <button class="btn btn-secondary btn-icon" onclick="toggleSelectionMode()" title="${t.selectMode}" id="selectModeBtn">☑️</button>
        </div>
        <div class="search-wrapper">
          <span class="search-icon">${ICONS.search}</span>
          <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" oninput="searchAccounts(this.value)">
          <button class="search-clear" onclick="clearSearch()">×</button>
        </div>
      </div>
      <div class="toolbar-row">
        <div class="filter-group">
          <span class="filter-label">${ICONS.filter} ${t.filterByTokens || 'Filter'}:</span>
          <button class="filter-btn active" data-filter="all" onclick="filterByTokens('all')">${t.all || 'All'}</button>
          <button class="filter-btn" data-filter="fresh" onclick="filterByTokens('fresh')">🟢 ${t.fresh || 'Fresh'} (500)</button>
          <button class="filter-btn" data-filter="partial" onclick="filterByTokens('partial')">🟡 ${t.partial || 'Partial'} (1-499)</button>
          <button class="filter-btn" data-filter="trial" onclick="filterByTokens('trial')">🔵 ${t.trial || 'Trial'} (50)</button>
          <button class="filter-btn" data-filter="empty" onclick="filterByTokens('empty')">⚫ ${t.empty || 'Empty'} (0)</button>
        </div>
      </div>
      <div class="bulk-actions-bar hidden" id="bulkActionsBar">
        <div class="bulk-info">
          <span class="bulk-count" id="bulkCount">0</span> ${t.selected}
        </div>
        <div class="bulk-buttons">
          <button class="btn btn-secondary btn-sm" onclick="selectAllAccounts()" title="Select All">☑️</button>
          <button class="btn btn-secondary btn-sm" onclick="deselectAllAccounts()" title="Deselect All">☐</button>
          <button class="btn btn-secondary btn-sm" onclick="exportSelectedAccounts()" title="Export">📤</button>
          <button class="btn btn-secondary btn-sm" onclick="refreshSelectedTokens()" title="Refresh">🔄</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSelectedAccounts()" title="Delete">🗑️</button>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="toggleSelectionMode()">✕</button>
      </div>
    </div>
  `;
}
