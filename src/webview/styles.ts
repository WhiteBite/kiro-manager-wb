/**
 * Webview Styles
 * All CSS styles for the sidebar panel
 * 
 * Architecture:
 * - Modular styles are in ./styles/ folder
 * - This file combines them with legacy styles for backward compatibility
 */

import { getAllStyles } from './styles/index';

export function getStyles(): string {
  // Get modular styles first, then add legacy styles for backward compatibility
  const modularStyles = getAllStyles();

  // Legacy styles (kept for backward compatibility with existing UI)
  const legacyStyles = `
    :root {
      --accent: #3fb68b; --accent-hover: #4ec9a0; --accent-dim: rgba(63, 182, 139, 0.12); --accent-glow: rgba(63, 182, 139, 0.4);
      --danger: #e55353; --danger-dim: rgba(229, 83, 83, 0.12); --warning: #d9a334;
      --expired: #8a8a8a; --expired-dim: rgba(138, 138, 138, 0.15);
      --muted: #888888; --bg-elevated: rgba(255,255,255,0.03);
      --border-subtle: rgba(128,128,128,0.12); --border-medium: rgba(128,128,128,0.2);
      --radius-sm: 4px; --radius-md: 6px; --radius-lg: 10px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.12); --shadow-md: 0 4px 12px rgba(0,0,0,0.15);
      --transition-fast: 0.12s ease; --transition-normal: 0.2s ease;
      --glass-bg: rgba(255,255,255,0.02); --glass-border: rgba(255,255,255,0.08);
      --fg-color: #cccccc; --bg-color: #1e1e1e; --input-bg: #3c3c3c;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif); font-size: 12px; line-height: 1.5; color: var(--vscode-foreground, #cccccc); background: var(--vscode-sideBar-background, #1e1e1e); min-height: 100vh; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 8px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 4px; }
    
    /* Ripple Effect */
    .ripple { position: relative; overflow: hidden; }
    .ripple::after { content: ''; position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none; background-image: radial-gradient(circle, var(--accent) 10%, transparent 10.01%); background-repeat: no-repeat; background-position: 50%; transform: scale(10, 10); opacity: 0; transition: transform 0.4s, opacity 0.8s; }
    .ripple:active::after { transform: scale(0, 0); opacity: 0.3; transition: 0s; }
    
    /* Header */
    .header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%); border-bottom: 1px solid var(--border-subtle); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(8px); }
    .header-left { display: flex; align-items: center; gap: 10px; min-width: 0; overflow: hidden; }
    .header-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; }
    .header-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--accent-dim); color: var(--accent); font-weight: 700; }
    .header-actions { display: flex; gap: 4px; flex-shrink: 0; margin-left: 8px; }
    
    /* Icon Button */
    .icon-btn { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .icon-btn:hover { background: var(--bg-elevated); border-color: var(--border-subtle); color: var(--vscode-foreground, #cccccc); }
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
    

    
    /* Native tooltips - no custom CSS, let browser handle */
    
    /* Stats Bar */
    .stats-bar { display: flex; flex-wrap: wrap; gap: 6px 12px; padding: 6px 12px; background: var(--bg-elevated); border-bottom: 1px solid var(--border-subtle); font-size: 10px; }
    .stat-item { display: flex; align-items: center; gap: 6px; }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .stat-dot.active { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); animation: glow 2s ease-in-out infinite; }
    .stat-dot.valid { background: #666; } .stat-dot.expired { background: var(--danger); } .stat-dot.exhausted { background: var(--warning); }
    .stat-exhausted { cursor: pointer; padding: 2px 6px; border-radius: 4px; background: rgba(217, 163, 52, 0.1); transition: all var(--transition-fast); }
    .stat-exhausted:hover { background: rgba(217, 163, 52, 0.25); }
    .stat-exhausted.confirm-pending { background: var(--danger); color: #fff; animation: pulse-danger 0.5s ease-in-out infinite; }
    .stat-exhausted.confirm-pending .stat-dot { background: #fff; }
    @keyframes pulse-danger { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    .stat-delete { margin-left: 2px; opacity: 0.6; font-size: 9px; } .stat-exhausted:hover .stat-delete { opacity: 1; }
    @keyframes glow { 0%, 100% { box-shadow: 0 0 6px var(--accent-glow); } 50% { box-shadow: 0 0 12px var(--accent-glow); } }
    .stat-total { margin-left: auto; color: var(--muted); font-weight: 500; }
    
    /* Usage Card - Glassmorphism */
    .usage-card { margin: 8px 12px; padding: 10px 12px; background: linear-gradient(135deg, rgba(63,182,139,0.08) 0%, rgba(63,182,139,0.02) 100%); backdrop-filter: blur(12px); border: 1px solid rgba(63,182,139,0.2); border-radius: var(--radius-md); cursor: pointer; transition: all var(--transition-normal); position: relative; overflow: hidden; }
    .usage-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent), var(--accent-hover), transparent); }
    .usage-card:hover { border-color: rgba(63,182,139,0.4); box-shadow: 0 8px 32px rgba(63,182,139,0.15); transform: translateY(-2px); }
    .usage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .usage-title { display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.5px; }
    .usage-value { font-size: 14px; font-weight: 700; letter-spacing: -0.5px; }
    .usage-bar { height: 4px; background: rgba(128,128,128,0.15); border-radius: 2px; overflow: hidden; }
    .usage-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
    .usage-fill.low { background: linear-gradient(90deg, var(--accent), #4ec9a0); }
    .usage-fill.medium { background: linear-gradient(90deg, var(--warning), #e5b84a); }
    .usage-fill.high { background: linear-gradient(90deg, var(--danger), #f06b6b); }
    .usage-footer { display: flex; justify-content: space-between; margin-top: 4px; font-size: 9px; color: var(--muted); font-weight: 500; }
    
    /* Buttons - Enhanced */
    .actions { display: flex; gap: 6px; padding: 8px 12px; }
    .btn { padding: 7px 10px; font-size: 10px; font-weight: 600; font-family: inherit; border: none; border-radius: var(--radius-md); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; transition: all var(--transition-normal); white-space: nowrap; position: relative; overflow: hidden; }
    .btn::after { content: ''; position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none; background-image: radial-gradient(circle, #fff 10%, transparent 10.01%); background-repeat: no-repeat; background-position: 50%; transform: scale(10, 10); opacity: 0; transition: transform 0.5s, opacity 1s; }
    .btn:active::after { transform: scale(0, 0); opacity: 0.3; transition: 0s; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%); color: #fff; box-shadow: 0 2px 12px rgba(63,182,139,0.3); }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(63,182,139,0.4); }
    .btn-primary:active:not(:disabled) { transform: translateY(0); }
    .btn-secondary { background: var(--glass-bg); backdrop-filter: blur(8px); color: var(--vscode-foreground, #cccccc); border: 1px solid var(--glass-border); }
    .btn-secondary:hover:not(:disabled) { background: rgba(128,128,128,0.15); border-color: var(--border-medium); transform: translateY(-1px); }
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
    .sso-input { width: 100%; height: 60px; padding: 8px; font-size: 10px; font-family: monospace; background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-input-foreground, #cccccc); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); resize: none; margin-bottom: 10px; }
    .sso-input:focus { outline: none; border-color: var(--accent); }
    
    /* Search Bar */
    .search-bar { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); }
    .search-wrapper { position: relative; display: flex; align-items: center; }
    .search-input { width: 100%; padding: 8px 32px 8px 32px; font-size: 11px; font-family: inherit; background: var(--vscode-input-background, #3c3c3c); color: var(--vscode-foreground, #cccccc); border: 1px solid var(--border-medium); border-radius: var(--radius-md); transition: all var(--transition-normal); }
    .search-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(63,182,139,0.15); }
    .search-input::placeholder { color: var(--muted); }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; display: flex; align-items: center; }
    .search-icon svg { width: 12px; height: 12px; }
    .search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; display: none; align-items: center; justify-content: center; background: var(--bg-elevated); border: none; border-radius: 50%; cursor: pointer; color: var(--muted); font-size: 10px; transition: all var(--transition-fast); }
    .search-clear:hover { background: var(--danger-dim); color: var(--danger); }
    .search-wrapper:has(.search-input:not(:placeholder-shown)) .search-clear { display: flex; }
    
    /* Filter Bar */
    .filter-bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-bottom: 1px solid var(--border-subtle); gap: 8px; }
    .filter-tabs { display: flex; gap: 2px; background: var(--glass-bg); backdrop-filter: blur(8px); padding: 2px; border-radius: var(--radius-sm); border: 1px solid var(--glass-border); }
    .filter-tab { padding: 5px 10px; font-size: 10px; font-weight: 600; background: transparent; border: none; border-radius: 3px; cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .filter-tab:hover { color: var(--vscode-foreground, #cccccc); } .filter-tab.active { background: linear-gradient(135deg, var(--accent-dim) 0%, rgba(63,182,139,0.2) 100%); color: var(--accent); }
    .sort-select { padding: 5px 8px; font-size: 10px; font-family: inherit; font-weight: 500; background: var(--vscode-dropdown-background, #3c3c3c); color: var(--vscode-dropdown-foreground, #ccc); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; transition: all var(--transition-fast); -webkit-appearance: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L2 4h8z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; padding-right: 22px; }
    .sort-select:hover { border-color: var(--accent); }
    .sort-select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(63,182,139,0.15); }
    .sort-select option { background: var(--vscode-dropdown-background, #3c3c3c); color: var(--vscode-dropdown-foreground, #ccc); padding: 8px; }
    
    /* Account List */
    .list { padding: 6px 10px 180px; } .list-empty { text-align: center; padding: 30px 20px; color: var(--muted); }
    .list-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; } .list-empty-text { font-size: 12px; margin-bottom: 16px; }
    
    /* Account Card - Enhanced with animations */
    .card { background: var(--glass-bg); backdrop-filter: blur(8px); border: 1px solid var(--glass-border); border-radius: var(--radius-md); margin-bottom: 6px; transition: all var(--transition-normal); position: relative; will-change: transform, opacity; contain: layout style paint; animation: cardFadeIn 0.3s ease forwards; opacity: 0; }
    .card:nth-child(1) { animation-delay: 0s; } .card:nth-child(2) { animation-delay: 0.03s; } .card:nth-child(3) { animation-delay: 0.06s; } .card:nth-child(4) { animation-delay: 0.09s; } .card:nth-child(5) { animation-delay: 0.12s; }
    @keyframes cardFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .card:hover { border-color: rgba(63,182,139,0.3); box-shadow: 0 4px 20px rgba(63,182,139,0.1); background: linear-gradient(135deg, rgba(63,182,139,0.06) 0%, rgba(63,182,139,0.02) 100%); transform: translateY(-1px); }
    .card.active { border-color: var(--accent); background: linear-gradient(270deg, var(--accent-dim), rgba(78,201,160,0.18), var(--accent-dim)); background-size: 200% 200%; animation: cardFadeIn 0.3s ease forwards, gradientShift 4s ease infinite; }
    @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    .card.expired { opacity: 0.7; border-color: var(--expired); background: var(--expired-dim); } .card.expired:hover { opacity: 0.85; }
    .card.exhausted { opacity: 0.6; border-color: var(--danger); background: linear-gradient(135deg, var(--danger-dim) 0%, rgba(229,83,83,0.05) 100%); } .card.exhausted:hover { opacity: 0.8; }
    .card.suspended { opacity: 0.5; border-color: #8b0000; background: rgba(139, 0, 0, 0.15); text-decoration: line-through; } .card.suspended:hover { opacity: 0.7; }
    .card.suspended .card-avatar { background: #8b0000; }
    .card.banned { opacity: 0.5; border-color: #ff0000; background: linear-gradient(135deg, rgba(255, 0, 0, 0.15) 0%, rgba(139, 0, 0, 0.1) 100%); } .card.banned:hover { opacity: 0.7; }
    .card.banned .card-avatar { background: linear-gradient(135deg, #ff0000 0%, #8b0000 100%); }
    .card.banned .card-email { text-decoration: line-through; }
    .card.removing { animation: cardSlideOut 0.3s ease forwards; }
    @keyframes cardSlideOut { to { opacity: 0; transform: translateX(-100%); height: 0; margin: 0; padding: 0; border: 0; } }
    .card-main { display: flex; align-items: center; padding: 8px 10px; gap: 8px; cursor: pointer; position: relative; overflow: hidden; }
    .card-main::after { content: ''; position: absolute; width: 100%; height: 100%; top: 0; left: 0; pointer-events: none; background-image: radial-gradient(circle, var(--accent) 10%, transparent 10.01%); background-repeat: no-repeat; background-position: 50%; transform: scale(10, 10); opacity: 0; transition: transform 0.5s, opacity 1s; }
    .card-main:active::after { transform: scale(0, 0); opacity: 0.2; transition: 0s; }
    .card-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; text-transform: uppercase; flex-shrink: 0; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%); color: #fff; box-shadow: 0 2px 8px rgba(63,182,139,0.3); }
    .card.expired .card-avatar { background: linear-gradient(135deg, #666 0%, #888 100%); box-shadow: none; }
    .card.exhausted .card-avatar { background: linear-gradient(135deg, var(--danger) 0%, #f06b6b 100%); box-shadow: 0 2px 8px rgba(229,83,83,0.3); }
    .card-info { flex: 1; min-width: 0; }
    .card-email { font-size: 10px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 9px; color: var(--muted); }
    .card-meta-item { display: flex; align-items: center; gap: 3px; }
    /* Mini usage bar in card */
    .card-usage-bar { width: 40px; height: 3px; background: rgba(128,128,128,0.2); border-radius: 2px; overflow: hidden; margin-left: 4px; }
    .card-usage-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
    .card-usage-fill.low { background: linear-gradient(90deg, var(--accent), var(--accent-hover)); }
    .card-usage-fill.medium { background: linear-gradient(90deg, var(--warning), #e5b84a); }
    .card-usage-fill.high { background: linear-gradient(90deg, var(--danger), #f06b6b); }
    .card-status { display: flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
    .card-status.active { background: var(--accent-dim); color: var(--accent); } .card-status.expired { background: var(--expired-dim); color: var(--expired); } .card-status.exhausted { background: var(--danger-dim); color: var(--danger); } .card-status.suspended { background: rgba(139, 0, 0, 0.3); color: #ff4444; } .card-status.banned { background: rgba(255, 0, 0, 0.3); color: #ff0000; animation: banPulse 1.5s ease infinite; }
    @keyframes banPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(255,0,0,0.4); } 50% { box-shadow: 0 0 0 4px rgba(255,0,0,0.1); } }
    .ban-badge { margin-left: 4px; font-size: 10px; } .ban-reason { color: #ff4444; font-weight: 600; font-size: 8px; text-transform: uppercase; }
    .card-status.new { background: linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%); color: #a78bfa; animation: newBadgePulse 2s ease infinite; }
    @keyframes newBadgePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,0.4); } 50% { box-shadow: 0 0 0 4px rgba(167,139,250,0.1); } }
    .card-actions { display: flex; gap: 6px; opacity: 0; transition: opacity var(--transition-fast); } .card:hover .card-actions { opacity: 1; }
    .card-btn { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer; color: var(--muted); transition: all var(--transition-fast); }
    .card-btn:hover { background: rgba(128,128,128,0.2); border-color: var(--border-medium); color: var(--vscode-foreground, #cccccc); transform: scale(1.1); }
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
    .progress-btn:hover { background: rgba(128,128,128,0.2); color: var(--vscode-foreground, #cccccc); transform: scale(1.1); }
    .progress-btn.danger:hover { background: var(--danger-dim); border-color: var(--danger); color: var(--danger); }
    .progress-btn.paused { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
    .progress-bar { height: 4px; background: rgba(128,128,128,0.15); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hover)); border-radius: 2px; transition: width 0.3s ease; }
    .progress-fill.paused { background: linear-gradient(90deg, var(--warning), #e5b84a); animation: none; }
    .progress-footer { display: flex; justify-content: space-between; align-items: center; }
    .progress-detail { font-size: 10px; color: var(--muted); }
    
    /* Settings Panel - Glassmorphism */
    .settings-panel { display: none; padding: 10px 12px; background: var(--glass-bg); backdrop-filter: blur(12px); border-bottom: 1px solid var(--glass-border); animation: slideDown 0.2s ease; } .settings-panel.visible { display: block; }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .settings-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: var(--muted); }
    .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; }
    .settings-label { font-size: 10px; font-weight: 500; } .settings-desc { font-size: 9px; color: var(--muted); margin-top: 1px; }
    .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; } .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: rgba(128,128,128,0.3); border-radius: 10px; transition: all var(--transition-fast); }
    .toggle-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: all var(--transition-fast); }
    .toggle input:checked + .toggle-slider { background: var(--accent); } .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
    .settings-select { padding: 6px 10px; font-size: 11px; font-family: inherit; font-weight: 500; background: var(--vscode-dropdown-background, #3c3c3c); color: var(--vscode-dropdown-foreground, #cccccc); border: 1px solid var(--border-medium); border-radius: var(--radius-sm); cursor: pointer; min-width: 100px; }
    
    /* Floating Console - Fixed above footer */
    .console-floating { position: fixed; bottom: 32px; left: 0; right: 0; z-index: 99; background: var(--vscode-terminal-background, #1e1e1e); border-top: 1px solid var(--border-subtle); transition: transform 0.3s ease; }
    .console-floating.collapsed { transform: translateY(calc(100% - 28px)); }
    .console-floating.collapsed .console-toggle-icon { transform: rotate(180deg); }
    .console-toggle { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--border-subtle); user-select: none; }
    .console-toggle:hover { background: rgba(0,0,0,0.4); }
    .console-toggle-icon { font-size: 8px; color: var(--muted); transition: transform 0.3s ease; }
    .console-toggle-title { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
    .console-toggle-count { font-size: 9px; padding: 1px 6px; border-radius: 8px; background: var(--accent-dim); color: var(--accent); font-weight: 600; }
    .console-toggle-count.has-errors { background: var(--danger-dim); color: var(--danger); }
    .console-content { display: flex; flex-direction: column; max-height: 150px; }
    .console-actions { display: flex; gap: 4px; padding: 4px 8px; justify-content: flex-end; background: rgba(0,0,0,0.2); }
    .console-actions .icon-btn { width: 22px; height: 22px; font-size: 10px; }
    .console-body { flex: 1; overflow-y: auto; padding: 6px 10px; font-family: var(--vscode-editor-font-family, 'Consolas', monospace); font-size: 10px; line-height: 1.5; max-height: 120px; }
    .console-line { white-space: pre-wrap; word-break: break-all; } .console-line.error { color: var(--danger); } .console-line.success { color: var(--accent); } .console-line.warning { color: var(--warning); }
    
    /* Old console panel - hidden */
    .console-panel { display: none; }
    
    /* Footer */
    .footer { position: fixed; bottom: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: var(--vscode-sideBar-background, #1e1e1e); border-top: 1px solid var(--border-subtle); font-size: 9px; color: var(--muted); z-index: 100; }
    .footer-version { display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--accent); background: var(--accent-dim); padding: 2px 8px; border-radius: 4px; } .footer-status { display: flex; align-items: center; gap: 4px; }
    .update-badge { color: #fff; background: var(--warning); padding: 2px 6px; border-radius: 3px; font-size: 9px; text-decoration: none; animation: pulse 1.5s infinite; } .update-badge:hover { background: var(--danger); }
    .footer-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: glow 2s ease-in-out infinite; }
    
    /* Dialog */
    .dialog-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 1000; align-items: center; justify-content: center; animation: fadeIn 0.15s ease; } .dialog-overlay.visible { display: flex; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .dialog { background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--border-medium); border-radius: var(--radius-lg); padding: 20px; max-width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); animation: dialogSlideIn 0.2s ease; }
    @keyframes dialogSlideIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .dialog-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; } .dialog-text { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
    .dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .dialog .btn-danger { background: linear-gradient(135deg, var(--danger) 0%, #f06b6b 100%); color: #fff; }
    .dialog .btn-danger:hover { box-shadow: 0 4px 12px rgba(229,83,83,0.4); }
    
    /* Toast notifications */
    .toast-container { position: fixed; top: 50px; right: 12px; z-index: 1001; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
    .toast { padding: 10px 14px; background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--border-medium); border-radius: var(--radius-md); box-shadow: 0 4px 16px rgba(0,0,0,0.3); font-size: 11px; display: flex; align-items: center; gap: 8px; animation: toastSlideIn 0.3s ease; pointer-events: auto; max-width: 280px; }
    @keyframes toastSlideIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
    .toast.removing { animation: toastSlideOut 0.3s ease forwards; }
    @keyframes toastSlideOut { to { opacity: 0; transform: translateX(100%); } }
    .toast-icon { font-size: 14px; }
    .toast-message { flex: 1; }
    .toast-action { padding: 4px 8px; font-size: 10px; font-weight: 600; background: var(--accent-dim); color: var(--accent); border: none; border-radius: 4px; cursor: pointer; transition: all var(--transition-fast); }
    .toast-action:hover { background: var(--accent); color: #fff; }
    .toast.success { border-color: var(--accent); }
    .toast.error { border-color: var(--danger); }
    .toast.warning { border-color: var(--warning); }
    
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
    
    /* Loading Usage Card */
    .usage-card.loading { opacity: 0.7; pointer-events: none; }
    .usage-card.loading::before { animation: loadingPulse 1.5s ease-in-out infinite; }
    @keyframes loadingPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
    
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

    /* Spoofing Section */
    .spoof-section { margin-top: 16px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
    .spoof-header { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: linear-gradient(135deg, rgba(63, 182, 139, 0.08), transparent); }
    .spoof-title { display: flex; align-items: center; gap: 10px; }
    .spoof-icon { font-size: 18px; }
    .spoof-details { padding: 0 12px 12px; border-top: 1px solid var(--border-subtle); }
    .spoof-details.hidden { display: none; }
    .spoof-modules { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 10px; }
    .spoof-module { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--glass-bg); border-radius: var(--radius-sm); border: 1px solid var(--glass-border); }
    .module-icon { font-size: 14px; flex-shrink: 0; }
    .module-info { min-width: 0; }
    .module-name { font-size: 10px; font-weight: 600; }
    .module-desc { font-size: 9px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .spoof-warning { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 8px 10px; background: rgba(217, 163, 52, 0.1); border: 1px solid rgba(217, 163, 52, 0.3); border-radius: var(--radius-sm); font-size: 10px; color: var(--warning); }
    
  `;

  // Combine modular styles with legacy styles
  return modularStyles + legacyStyles;
}
