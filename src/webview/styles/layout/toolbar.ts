/**
 * Toolbar styles - Search, filters, bulk actions
 * Uses flex-wrap for adaptive layout
 */

export const toolbarStyles = `
  /* === Toolbar Container === */
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-2) var(--padding-main);
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    flex-shrink: 0;
  }
  
  .toolbar-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  
  .toolbar-buttons {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
  
  .toolbar-primary {
    display: flex;
    gap: 2px;
  }
  
  .toolbar-secondary {
    display: flex;
    gap: 2px;
  }
  
  /* Hide secondary buttons on narrow, show in dropdown */
  @media (max-width: 350px) {
    .toolbar-secondary {
      display: none;
    }
  }
  
  @media (min-width: 351px) {
    .toolbar-more-wrapper {
      display: none;
    }
  }

  /* === Search === */
  .search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 80px;
  }
  
  .search-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    padding-left: var(--space-8);
    font-size: var(--font-size-sm);
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    transition: all var(--transition);
  }
  
  .search-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  
  .search-input::placeholder {
    color: var(--muted);
  }
  
  .search-icon {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }
  
  .search-icon svg {
    width: var(--icon-sm);
    height: var(--icon-sm);
  }
  
  .search-clear {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    width: 20px;
    height: 20px;
    display: none;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--muted);
    font-size: var(--font-size-xs);
    transition: all var(--transition);
  }
  
  .search-clear:hover {
    background: var(--danger-dim);
    color: var(--danger);
  }
  
  .search-wrapper:has(.search-input:not(:placeholder-shown)) .search-clear {
    display: flex;
  }

  /* === Filters === */
  .filter-group {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  
  .filter-label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--muted);
    margin-right: var(--space-1);
    flex-shrink: 0;
  }
  
  .filter-btn {
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 500;
    font-family: inherit;
    background: var(--bg-elevated);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
  }
  
  .filter-btn:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
    color: var(--fg);
  }
  
  .filter-btn.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
  
  .filter-select {
    padding: var(--space-1) var(--space-5) var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23888' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--space-2) center;
    transition: all var(--transition);
  }
  
  .filter-select:hover {
    border-color: var(--accent);
  }

  /* === Bulk Actions === */
  .bulk-actions-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    background: linear-gradient(135deg, var(--accent-dim) 0%, rgba(72, 187, 120, 0.02) 100%);
    border-radius: var(--radius-md);
  }
  
  .bulk-actions-bar.hidden {
    display: none;
  }
  
  .bulk-info {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    color: var(--accent);
    font-weight: 600;
  }
  
  .bulk-count {
    background: var(--accent);
    color: #fff;
    padding: 2px 6px;
    border-radius: var(--radius-full);
    font-size: 10px;
    min-width: 18px;
    text-align: center;
  }
  
  .bulk-buttons {
    display: flex;
    gap: var(--space-1);
    flex: 1;
    flex-wrap: wrap;
  }

  /* === More Menu (Dropdown) === */
  .toolbar-more-wrapper {
    position: relative;
  }
  
  .toolbar-more-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
  }
  
  .toolbar-more-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 160px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-lg);
    z-index: var(--z-dropdown);
    display: none;
    flex-direction: column;
    padding: var(--space-1);
    animation: fadeIn 0.15s ease;
  }
  
  .toolbar-more-menu.visible {
    display: flex;
  }
  
  .toolbar-more-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    font-family: inherit;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    color: var(--fg);
    cursor: pointer;
    transition: all var(--transition);
    text-align: left;
    white-space: nowrap;
  }
  
  .toolbar-more-item:hover {
    background: var(--bg-hover);
  }
  
  .toolbar-more-item .more-icon {
    font-size: var(--font-size-md);
    width: 20px;
    text-align: center;
  }
  
  .toolbar-more-item .more-label {
    flex: 1;
  }
  
  .toolbar-more-divider {
    height: 1px;
    background: var(--border);
    margin: var(--space-1) 0;
  }

  /* === Narrow: compact toolbar === */
  @media (max-width: 250px) {
    .toolbar {
      padding: var(--space-1);
      gap: var(--space-1);
    }
    .toolbar-row { gap: var(--space-1); }
    .filter-label { display: none; }
    .filter-btn { 
      padding: var(--space-1);
      font-size: 9px;
    }
    .search-input {
      padding: var(--space-1) var(--space-2);
      padding-left: var(--space-6);
      font-size: var(--font-size-xs);
    }
  }
  
  /* === Wide: horizontal layout === */
  @media (min-width: 500px) {
    .toolbar {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
    }
    .toolbar-row {
      flex: 1;
    }
  }
`;
