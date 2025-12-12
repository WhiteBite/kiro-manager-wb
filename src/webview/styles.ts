/**
 * Webview Styles
 * All CSS styles for the sidebar panel
 */

export function getStyles(): string {
  return `
    :root {
      --accent: #3fb68b; --accent-hover: #4ec9a0; --accent-dim: rgba(63, 182, 139, 0.12); --accent-glow: rgba(63, 182, 139, 0.4);
      --danger: #e55353; --danger-dim: rgba(229, 83, 83, 0.12); --warning: #d9a334;
      --expired: #8a8a8a; --expired-dim: rgba(138, 138, 138, 0.15);
      --muted: var(--vscode-descriptionForeground, #888); --bg-elevated: rgba(255,255,255,0.03);
      --border-subtle: rgba(128,128,128,0.12); --border-medium: rgba(128,128,128,0.2);
      --radius-sm: 4px; --radius-md: 6px; --radius-lg: 10px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.12); --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
      --transition-fast: 0.12s ease; --transition-normal: 0.2s ease;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif); font-size: 12px; line-height: 1.5; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); min-height: 100vh; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 4px; }
    
    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%); border-bottom: 1px solid var(--border-subtle); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(8px); }
    .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; overflow: hidden; }
    .header-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    .header-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--accent-dim); color: var(--accent); font-weight: 700; }
    .header-actions { display: flex; gap: 4px; flex-shrink: 0; margin-left: 8px; }
    
    /* Icon Button */
    .icon-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .icon-btn:hover { background: var(--bg-elevated); border-color: var(--border-subtle); color: var(--vscode-foreground); }
    .icon-btn svg { pointer-events: none; }
    
    /* Update Banner */
    .update-banner { display: flex; align-items: center; gap: 12px; margin: 8px 14px; padding: 12px 16px; background: linear-gradient(135deg, rgba(217, 163, 52, 0.15) 0%, rgba(229, 83, 83, 0.1) 100%); border: 1px solid rgba(217, 163, 52, 0.4); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-normal); animation: updatePulse 2s ease-in-out infinite; }
    .update-banner:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(217, 163, 52, 0.3); border-color: var(--warning); }
    .update-banner-icon { font-size: 24px; animation: rocketBounce 1s ease-in-out infinite; }
    .update-banner-content { flex: 1; }
    .update-banner-title { font-size: 11px; font-weight: 700; color: var(--warning); }
    .update-banner-version { font-size: 13px; font-weight: 800; margin-top: 2px; }
    .update-banner-action { font-size: 11px; font-weight: 600; color: var(--warning); padding: 6px 12px; background: rgba(217, 163, 52, 0.2); border-radius: var(--radius-sm); transition: all var(--transition-fast); }
    .update-banner:hover .update-banner-action { background: var(--warning); color: #000; }
    @keyframes updatePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217, 163, 52, 0.4); } 50% { box-shadow: 0 0 0 4px rgba(217, 163, 52, 0.1); } }
    @keyframes rocketBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
    

    
    /* Tooltip - по умолчанию сверху */
    [title] { position: relative; }
    [title]:hover::after { 
      content: attr(title); 
      position: absolute; 
      bottom: 100%; 
      left: 50%; 
      transform: translateX(-50%); 
      padding: 4px 8px; 
      background: var(--vscode-editorWidget-background, #252526); 
      color: var(--vscode-editorWidget-foreground, #ccc); 
      font-size: 10px; 
      border-radius: 4px; 
      white-space: nowrap; 
      z-index: 1000; 
      pointer-events: none;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Header tooltips - показываются СНИЗУ и справа */
    .header [title]:hover::after { 
      bottom: auto; 
      top: 100%; 
      left: auto; 
      right: 0; 
      transform: none; 
      margin-top: 4px;
    }
    /* Card actions - сверху и справа */
    .card-actions [title]:hover::after { 
      left: auto; 
      right: 0; 
      transform: none;
      margin-bottom: 4px;
    }
    
    /* Stats Bar */
    .stats-bar { display: flex; flex-wrap: wrap; gap: 6px 12px; padding: 6px 12px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-subtle); font-size: 10px; }
    .stat-item { display: flex; align-items: center; gap: 6px; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .stat-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); animation: glow 2s ease-in-out infinite; }
    .stat-dot.valid { background: #666; } .stat-dot.expired { background: var(--danger); } .stat-dot.exhausted { background: var(--warning); }
    .stat-exhausted { cursor: pointer; padding: 2px 6px; border-radius: 4px; background: rgba(217, 163, 52, 0.1); transition: all var(--transition-fast); }
    .stat-exhausted:hover { background: rgba(217, 163, 52, 0.25); }
    .stat-delete { margin-left: 2px; opacity: 0.6; font-size: 9px; } .stat-exhausted:hover .stat-delete { opacity: 1; }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 6px var(--accent-glow); } 50% { box-shadow: 0 0 12px var(--accent-glow); } }
    .stat-total { margin-left: auto; color: var(--muted); font-weight: 500; }
    
    /* Usage Card */
    .usage-card { margin: 8px 12px; padding: 10px 12px; background: linear-gradient(135deg, var(--accent-dim) 0%, rgba(63,182,139,0.04) 100%); border: 1px solid rgba(63,182,139,0.2); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-normal); position: relative; overflow: hidden; }
    .usage-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), transparent); }
    .usage-card:hover { border-color: rgba(63,182,139,0.4); box-shadow: var(--shadow-sm); }
    .usage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .usage-title { display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; }
    .usage-value { font-size: 14px; font-weight: 700; letter-spacing: -0.5px; }
    .usage-bar { height: 4px; background: rgba(128,128,128,0.15); border-radius: 2px; overflow: hidden; }
    .usage-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
    .usage-fill.low { background: linear-gradient(90deg, var(--accent), #4ec9a0); }
    .usage-fill.medium { background: linear-gradient(90deg, var(--warning), #e5b84a); }
    .usage-fill.high { background: linear-gradient(90deg, var(--danger), #f06b6b); }
    .usage-footer { display: flex; justify-content: space-between; margin-top: 4px; font-size: 9px; color: var(--muted); font-weight: 500; }
    
    /* Buttons */
    .actions { display: flex; gap: 6px; padding: 8px 12px; }
    .btn { padding: 7px 10px; font-size: 10px; font-weight: 600; font-family: inherit; border: none; border-radius: var(--radius-md); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all var(--transition-fast); white-space: nowrap; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%); color: #fff; box-shadow: 0 2px 8px rgba(63,182,139,0.3); }
    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(63,182,139,0.4); }
    .btn-secondary { background: var(--bg-elevated); color: var(--vscode-foreground); border: 1px solid var(--border-medium); }
    .btn-secondary:hover:not(:disabled) { background: rgba(128,128,128,0.1); }
    .btn-icon { padding: 9px 12px; } .btn svg { pointer-events: none; }
    .btn-full { width: 100%; }
    .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* SSO Import */
    .sso-import-row { padding: 0 12px 6px; }
    .sso-import-panel { display: none; margin: 0 14px 12px; padding: 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .sso-import-panel.visible { display: block; }
    .sso-import-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 11px; font-weight: 600; }
    .sso-import-hint { font-size: 10px; color: var(--muted); margin-bottom: 10px; white-space: pre-line; line-height: 1.6; }
    .sso-input { width: 100%; height: 60px; padding: 8px; font-size: 10px; font-family: monospace; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); resize: none; margin-bottom: 10px; }
    .sso-input:focus { outline: none; border-color: var(--accent); }
    
    /* Filter Bar */
    .filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid var(--border-subtle); gap: 8px; }
    .filter-tabs { display: flex; gap: 2px; background: var(--bg-elevated); padding: 2px; border-radius: var(--radius-sm); }
    .filter-tab { padding: 5px 10px; font-size: 10px; font-weight: 600; background: transparent; border: none; border-radius: 3px; cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .filter-tab:hover { color: var(--vscode-foreground); } .filter-tab.active { background: var(--accent-dim); color: var(--accent); }
    .sort-select { padding: 5px 8px; font-size: 10px; font-family: inherit; font-weight: 500; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; }
    
    /* Account List */
    .list { padding: 6px 10px 60px; } .list-empty { text-align: center; padding: 30px 20px; color: var(--muted); }
    .list-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; } .list-empty-text { font-size: 12px; margin-bottom: 16px; }
    
    /* Account Card - Optimized for performance */
    .card { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); margin-bottom: 6px; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); position: relative; will-change: transform; contain: layout style paint; }
    .card:hover { border-color: var(--border-medium); box-shadow: var(--shadow-sm); }
    .card.active { border-color: var(--accent); background: var(--accent-dim); }
    .card.expired { opacity: 0.75; border-color: var(--expired); background: var(--expired-dim); } .card.expired:hover { opacity: 0.9; }
    .card.exhausted { opacity: 0.6; border-color: var(--danger); background: var(--danger-dim); } .card.exhausted:hover { opacity: 0.8; }
    .card-main { display: flex; align-items: center; padding: 8px 10px; gap: 8px; cursor: pointer; }
    .card-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; background: var(--accent); color: #fff; }
    .card.expired .card-avatar { background: #888; }
    .card.exhausted .card-avatar { background: var(--danger); }
    .card-info { flex: 1; min-width: 0; }
    .card-email { font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 9px; color: var(--muted); }
    .card-meta-item { display: flex; align-items: center; gap: 3px; }
    .card-status { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .card-status.active { background: var(--accent-dim); color: var(--accent); } .card-status.expired { background: var(--expired-dim); color: var(--expired); } .card-status.exhausted { background: var(--danger-dim); color: var(--danger); }
    .card-actions { display: flex; gap: 6px; opacity: 0; transition: opacity var(--transition-fast); } .card:hover .card-actions { opacity: 1; }
    .card-btn { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; color: var(--muted); transition: background var(--transition-fast), color var(--transition-fast); }
    .card-btn:hover { background: rgba(128,128,128,0.2); border-color: var(--border-medium); color: var(--vscode-foreground); }
    .card-btn.danger:hover { background: var(--danger-dim); border-color: var(--danger); color: var(--danger); }
    .card-btn.highlight { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
    .card-btn.highlight:hover { background: var(--accent); color: #fff; }
    .card-btn svg { width: 16px; height: 16px; }
    
    /* Virtual List */
    .virtual-list-viewport { overflow-y: auto; overflow-x: hidden; }
    .virtual-list-content { will-change: transform; }
    .virtual-list-spacer { pointer-events: none; }
    
    /* Progress Panel */
    .progress-panel { margin: 8px 12px; padding: 10px 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
    .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .progress-title { font-size: 10px; font-weight: 600; flex: 1; } .progress-step { font-size: 9px; color: var(--muted); }
    .progress-actions { display: flex; gap: 6px; }
    .progress-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; color: var(--muted); transition: all var(--transition-fast); }
    .progress-btn:hover { background: rgba(128,128,128,0.2); color: var(--vscode-foreground); transform: scale(1.1); }
    .progress-btn.danger:hover { background: var(--danger-dim); border-color: var(--danger); color: var(--danger); }
    .progress-btn.paused { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
    .progress-bar { height: 4px; background: rgba(128,128,128,0.15); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: 2px; transition: width 0.3s ease; }
    .progress-fill.paused { background: linear-gradient(90deg, var(--warning), #e5b84a); animation: none; }
    .progress-footer { display: flex; justify-content: space-between; align-items: center; }
    .progress-detail { font-size: 10px; color: var(--muted); }
    
    /* Settings Panel */
    .settings-panel { display: none; padding: 10px 12px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-subtle); } .settings-panel.visible { display: block; }
    .settings-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: var(--muted); }
    .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; }
    .settings-label { font-size: 10px; font-weight: 500; } .settings-desc { font-size: 9px; color: var(--muted); margin-top: 1px; }
    .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; } .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: rgba(128,128,128,0.3); border-radius: 10px; transition: all var(--transition-fast); }
    .toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: all var(--transition-fast); }
    .toggle input:checked + .toggle-slider { background: var(--accent); } .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
    .settings-select { padding: 6px 10px; font-size: 11px; font-family: inherit; font-weight: 500; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; min-width: 100px; }
    
    /* Console Panel */
    .console-panel { margin: 8px 12px; background: var(--vscode-terminal-background, #1e1e1e); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .console-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; background: rgba(0,0,0,0.2); border-bottom: 1px solid var(--border-subtle); }
    .console-title { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
    .console-body { max-height: 120px; overflow-y: auto; padding: 6px 10px; font-family: var(--vscode-editor-font-family, 'Consolas', monospace); font-size: 10px; line-height: 1.5; }
    .console-line { white-space: pre-wrap; word-break: break-all; } .console-line.error { color: var(--danger); } .console-line.success { color: var(--accent); } .console-line.warning { color: var(--warning); }
    
    /* Footer */
    .footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--vscode-sideBar-background); border-top: 1px solid var(--border-subtle); font-size: 9px; color: var(--muted); z-index: 100; }
    .footer-version { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--accent); background: var(--accent-dim); padding: 2px 8px; border-radius: 4px; } .footer-status { display: flex; align-items: center; gap: 4px; }
    .update-badge { color: #fff; background: var(--warning); padding: 2px 6px; border-radius: 3px; font-size: 9px; text-decoration: none; animation: pulse 1.5s infinite; } .update-badge:hover { background: var(--danger); }
    .footer-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: glow 2s ease-in-out infinite; }
    
    /* Dialog */
    .dialog-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; } .dialog-overlay.visible { display: flex; }
    .dialog { background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 20px; max-width: 320px; box-shadow: var(--shadow-md); }
    .dialog-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; } .dialog-text { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
    .dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
    
    /* Compact Mode */
    body.compact .card-main { padding: 6px 10px; } body.compact .card-avatar { width: 24px; height: 24px; font-size: 10px; } body.compact .card-meta { display: none; }
    
    /* Unknown Usage State */
    .card.unknown-usage .card-usage { color: var(--muted); }
    .usage-unknown { color: var(--muted); font-style: italic; cursor: help; }
    .usage-loading { color: var(--muted); animation: pulse 1s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    
    /* Stale Usage Indicator */
    .usage-card.stale { border-color: rgba(217, 163, 52, 0.4); background: linear-gradient(135deg, rgba(217, 163, 52, 0.1) 0%, rgba(217, 163, 52, 0.02) 100%); }
    .usage-card.stale .usage-title { color: var(--warning); }
    .stale-indicator { color: var(--warning); margin-left: 4px; cursor: help; animation: spin 2s linear infinite; display: inline-block; }
    
    /* Empty Usage Card */
    .usage-card.empty { background: var(--bg-elevated); border-color: var(--border-subtle); cursor: default; }
    .usage-card.empty .usage-title { color: var(--muted); }
    .usage-hint { font-size: 10px; color: var(--muted); margin-top: 4px; }
    
    /* Narrow sidebar adaptation */
    @media (max-width: 280px) {
      .header-title { font-size: 10px; }
      .stats-bar { flex-direction: column; gap: 4px; }
      .stat-total { margin-left: 0; }
      .actions { flex-wrap: wrap; }
      .btn { flex: 1; min-width: 60px; }
      .card-actions { opacity: 1; } /* Always show on narrow */
      .settings-row { flex-direction: column; align-items: flex-start; gap: 4px; }
      .settings-row .toggle { align-self: flex-end; }
    }
    
    /* Very narrow */
    @media (max-width: 220px) {
      .card-avatar { display: none; }
      .card-status { font-size: 8px; padding: 2px 4px; }
      .usage-value { font-size: 12px; }
    }
  `;
}
