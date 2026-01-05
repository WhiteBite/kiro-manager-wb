/**
 * Toolbar Component - Compact single-row layout with responsive "More" menu
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface ToolbarProps {
  isRunning: boolean;
  t: Translations;
}

export function renderToolbar({ isRunning, t }: ToolbarProps): string {
  return `
    <div class="toolbar compact">
      <div class="toolbar-row">
        <!-- Primary buttons - always visible -->
        <div class="toolbar-buttons toolbar-primary">
          <button class="btn btn-primary btn-icon" onclick="startQuickAutoReg()" title="${t.addAccount || 'Add Account'}">➕</button>
          <button class="btn btn-secondary btn-icon" onclick="toggleSelectionMode()" title="${t.selectMode}" id="selectModeBtn">☑️</button>
        </div>
        
        <!-- Secondary buttons - hidden on narrow screens, moved to dropdown -->
        <div class="toolbar-buttons toolbar-secondary">
          <button class="btn btn-secondary btn-icon" onclick="openSsoModal()" title="SSO Import">🌐</button>
          <button class="btn btn-secondary btn-icon" onclick="checkAllAccountsHealth()" title="${t.checkHealth || 'Check Health'}">🩺</button>
        </div>
        
        <!-- More dropdown - visible only on narrow screens -->
        <div class="toolbar-more-wrapper">
          <button class="btn btn-secondary btn-icon toolbar-more-btn" onclick="toggleToolbarMore()" title="${t.more || 'More'}">⋯</button>
          <div class="toolbar-more-menu" id="toolbarMoreMenu">
            <button class="toolbar-more-item" onclick="openSsoModal(); toggleToolbarMore();">
              <span class="more-icon">🌐</span>
              <span class="more-label">SSO Import</span>
            </button>
            <button class="toolbar-more-item" onclick="checkAllAccountsHealth(); toggleToolbarMore();">
              <span class="more-icon">🩺</span>
              <span class="more-label">${t.checkHealth || 'Check Health'}</span>
            </button>
            <div class="toolbar-more-divider"></div>
            <button class="toolbar-more-item" onclick="exportAllAccounts(); toggleToolbarMore();">
              <span class="more-icon">📤</span>
              <span class="more-label">${t.export || 'Export All'}</span>
            </button>
          </div>
        </div>
        
        <div class="search-wrapper">
          <span class="search-icon">${ICONS.search}</span>
          <input type="text" class="search-input" id="searchInput" placeholder="${t.searchPlaceholder}" oninput="searchAccounts(this.value)">
          <button class="search-clear" onclick="clearSearch()">×</button>
        </div>
        <select class="filter-select" id="tokenFilterSelect" onchange="filterByTokens(this.value)">
          <option value="all">${t.all || 'All'}</option>
          <option value="fresh">🟢 ${t.fresh || 'Fresh'}</option>
          <option value="partial">🟡 ${t.partial || 'Partial'}</option>
          <option value="trial">🔵 ${t.trial || 'Trial'}</option>
          <option value="empty">⚫ ${t.empty || 'Empty'}</option>
        </select>
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
