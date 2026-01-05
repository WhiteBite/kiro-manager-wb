/**
 * Tab styles - Navigation tabs with glowing active indicator
 * Narrow: icons only
 * Wide: icons + text
 */

export const tabsStyles = `
  /* === Tab Bar === */
  .tab-bar {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1) var(--padding-main);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
    -ms-overflow-style: none;
    flex-shrink: 0;
  }
  
  .tab-bar::-webkit-scrollbar { display: none; }
  
  .tab-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    color: var(--muted);
    font-size: var(--font-size-xs);
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background-color var(--transition),
                color var(--transition),
                box-shadow var(--transition),
                transform var(--transition-fast);
    white-space: nowrap;
    min-width: 0;
    position: relative;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .tab-item:focus { outline: none; }
  .tab-item:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  
  .tab-item:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }
  
  .tab-item.active {
    background: var(--accent-dim);
    color: var(--accent);
    font-weight: 600;
  }
  
  /* Active tab glow indicator - more prominent */
  .tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 10%;
    right: 10%;
    height: 3px;
    background: var(--accent);
    border-radius: 3px 3px 0 0;
    box-shadow: 0 0 12px var(--accent-glow), 0 0 4px var(--accent);
  }
  
  .tab-icon {
    font-size: var(--icon-sm);
    flex-shrink: 0;
  }
  
  .tab-icon svg {
    width: var(--icon-sm);
    height: var(--icon-sm);
  }
  
  .tab-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .tab-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.1);
    color: var(--muted);
    flex-shrink: 0;
  }
  
  .tab-item.active .tab-badge {
    background: var(--accent);
    color: #fff;
  }
  
  /* === Tab Content === */
  .tab-content {
    display: none;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    animation: fadeIn 0.2s ease-out;
  }
  
  .tab-content.active {
    display: flex;
    flex-direction: column;
  }
  
  /* === Narrow: icons only === */
  @media (max-width: 250px) {
    .tab-bar {
      padding: var(--space-1);
      gap: 2px;
    }
    .tab-item {
      padding: var(--space-2);
      min-width: 32px;
    }
    .tab-label { display: none; }
    .tab-badge { display: none; }
    .tab-icon { font-size: var(--icon-md); }
  }
  
  /* === Medium: compact labels === */
  @media (min-width: 251px) and (max-width: 400px) {
    .tab-label { display: none; }
    .tab-item { padding: var(--space-2); }
  }
  
  /* === Wide: full labels === */
  @media (min-width: 401px) {
    .tab-item {
      padding: var(--space-2) var(--space-4);
    }
  }
`;
