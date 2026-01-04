/**
 * Console/Logs styles - Sticky footer drawer
 * Collapse/expand with chevron
 */

export const logsStyles = `
  /* === Console Drawer === */
  .console-drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: #0d0d0d;
    border-top: 1px solid var(--border);
    z-index: var(--z-drawer);
    transform: translateY(calc(100% - 32px));
    transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
    min-height: 32px;
    max-height: 60vh;
  }
  
  .console-drawer.has-errors {
    border-top-color: var(--danger);
    box-shadow: 0 -4px 20px rgba(245, 101, 101, 0.2);
  }
  
  .console-drawer.has-warnings {
    border-top-color: var(--warning);
  }
  
  .console-drawer.open { 
    transform: translateY(0);
  }
  
  /* === Console Header === */
  .console-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
    border-bottom: 1px solid var(--border);
    user-select: none;
    min-height: 32px;
    transition: background var(--transition);
  }
  
  .console-header:hover { 
    background: rgba(255, 255, 255, 0.04); 
  }
  
  .console-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .console-header-right {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }
  
  .console-title-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .console-icon-indicator {
    font-size: 6px;
    color: var(--muted);
    opacity: 0.5;
    transition: all 0.3s ease;
  }
  
  .console-icon-indicator.has-errors {
    color: var(--danger);
    opacity: 1;
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .console-icon-indicator.has-warnings {
    color: var(--warning);
    opacity: 1;
  }
  
  .console-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--muted);
  }
  
  /* Hide "КОНСОЛЬ" text on narrow, show only badge */
  @media (max-width: 200px) {
    .console-title { display: none; }
  }
  
  .console-badge {
    font-size: 9px;
    padding: 1px 6px;
    background: var(--bg-elevated);
    color: var(--muted);
    border-radius: var(--radius-full);
    font-weight: 600;
    min-width: 16px;
    text-align: center;
  }
  
  .console-badge.error {
    background: var(--danger-dim);
    color: var(--danger);
  }
  
  .console-badge.warning {
    background: var(--warning-dim);
    color: var(--warning);
  }
  
  .console-toggle-icon {
    font-size: var(--font-size-xs);
    color: var(--muted);
    transition: transform 0.3s ease;
  }
  
  .console-drawer.open .console-toggle-icon { 
    transform: rotate(180deg); 
  }
  
  /* === Console Toolbar === */
  .console-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-1) var(--space-3);
    background: rgba(0, 0, 0, 0.3);
    border-bottom: 1px solid var(--border);
  }
  
  .console-filters {
    display: flex;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  
  .console-filters::-webkit-scrollbar { display: none; }
  
  .console-filter {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 500;
    font-family: inherit;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--muted);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
  }
  
  .console-filter:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--fg);
  }
  
  .console-filter.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: rgba(72, 187, 120, 0.3);
  }
  
  .filter-icon { 
    font-size: var(--font-size-xs);
    font-weight: bold;
    font-family: monospace;
  }
  
  .filter-icon.error { color: var(--danger); }
  .filter-icon.warning { color: var(--warning); }
  .filter-icon.success { color: var(--accent); }
  
  .filter-count {
    font-size: 9px;
    opacity: 0.7;
    font-weight: 600;
  }
  
  .console-actions {
    display: flex;
    gap: 2px;
  }
  
  .console-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    opacity: 0.5;
    transition: all var(--transition);
    font-size: var(--font-size-xs);
    color: var(--fg);
  }
  
  .console-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    opacity: 1;
  }
  
  /* === Console Body === */
  .console-body {
    max-height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--space-2) var(--space-3);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: var(--font-size-xs);
    line-height: 1.5;
  }
  
  /* === Console Line === */
  .console-line {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    border-left: 2px solid transparent;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    margin: 1px 0;
    animation: fadeIn 0.2s ease-out;
    transition: background var(--transition);
  }
  
  .console-line:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  
  .console-line.hidden { display: none; }
  
  .console-line.error { 
    border-left-color: var(--danger);
    background: rgba(245, 101, 101, 0.05);
    color: var(--danger);
  }
  
  .console-line.success { 
    border-left-color: var(--accent);
    color: var(--accent);
  }
  
  .console-line.warning { 
    border-left-color: var(--warning);
    background: rgba(236, 201, 75, 0.03);
    color: var(--warning);
  }
  
  .console-line.info { 
    color: var(--muted);
  }
  
  .console-icon {
    flex-shrink: 0;
    width: var(--space-3);
    text-align: center;
    font-size: var(--font-size-xs);
    font-weight: bold;
    font-family: monospace;
    opacity: 0.8;
  }
  
  .console-time {
    flex-shrink: 0;
    font-size: 9px;
    color: var(--muted);
    opacity: 0.5;
    font-family: monospace;
    min-width: 45px;
  }
  
  .console-msg {
    flex: 1;
    word-break: break-word;
    min-width: 0;
  }
  
  .console-count {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 5px;
    background: var(--bg-elevated);
    color: var(--muted);
    border-radius: var(--radius-full);
    margin-left: var(--space-1);
  }
  
  /* === Syntax Highlighting === */
  .console-msg .hl-path { color: #6a9fb5; }
  .console-msg .hl-url { color: #6a9fb5; text-decoration: underline dotted; }
  .console-msg .hl-number { color: #d19a66; }
  .console-msg .hl-string { color: #98c379; }
  .console-msg .hl-keyword { color: #c678dd; font-weight: 600; }
  .console-msg .hl-email { color: #61afef; }
`;
