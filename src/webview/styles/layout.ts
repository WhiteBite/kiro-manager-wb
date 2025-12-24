/**
 * Layout styles - Hero, Toolbar, List, Overlays, Modals, Logs
 */

export const layout = `
  /* === Header === */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg);
    flex-shrink: 0; /* Don't shrink */
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .header-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--fg);
  }
  .header-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: 10px;
  }
  .header-actions {
    display: flex;
    gap: 4px;
  }

  /* === Hero Dashboard === */
  .hero {
    margin: 10px 12px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(63,182,139,0.1) 0%, rgba(63,182,139,0.03) 100%);
    border: 1px solid rgba(63,182,139,0.25);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-normal);
    flex-shrink: 0; /* Don't shrink */
  }
  .hero:hover {
    border-color: rgba(63,182,139,0.4);
    box-shadow: 0 4px 20px rgba(63,182,139,0.15);
    transform: translateY(-1px);
  }
  .hero.empty {
    background: var(--glass-bg);
    border-color: var(--glass-border);
    cursor: pointer;
    text-align: center;
    padding: 20px;
  }
  .hero.empty .hero-hint {
    font-size: 11px;
    color: var(--muted);
    margin-top: 6px;
  }
  .hero.profile {
    background: linear-gradient(135deg, rgba(100,149,237,0.1) 0%, rgba(100,149,237,0.03) 100%);
    border-color: rgba(100,149,237,0.25);
  }
  .hero.profile:hover {
    border-color: rgba(100,149,237,0.4);
    box-shadow: 0 4px 20px rgba(100,149,237,0.15);
  }
  .hero.warning {
    background: linear-gradient(135deg, rgba(217,163,52,0.15) 0%, rgba(217,163,52,0.05) 100%);
    border-color: rgba(217,163,52,0.4);
  }
  .hero.critical {
    background: linear-gradient(135deg, rgba(229,83,83,0.15) 0%, rgba(229,83,83,0.05) 100%);
    border-color: rgba(229,83,83,0.4);
    animation: criticalPulse 2s ease-in-out infinite;
  }
  @keyframes criticalPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(229,83,83,0.3); }
    50% { box-shadow: 0 0 0 4px rgba(229,83,83,0.1); }
  }
  .hero-main {
    text-align: center;
    padding: 8px 0;
  }
  .hero-remaining {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .hero-remaining-value {
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -1px;
  }
  .hero-remaining-value.low { color: var(--accent); }
  .hero-remaining-value.medium { color: var(--warning); }
  .hero-remaining-value.high { color: var(--danger); }
  .hero-remaining-label {
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }
  .hero-profile-info {
    margin-bottom: 8px;
  }
  .hero-profile-email {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hero.progress {
    background: linear-gradient(135deg, rgba(63,182,139,0.08) 0%, transparent 100%);
    cursor: default;
  }
  .hero-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .hero-email {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 70%;
  }
  .hero-days {
    font-size: 10px;
    color: var(--muted);
    font-weight: 500;
  }
  .hero-step {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
  }
  .hero-progress {
    height: 6px;
    background: rgba(128,128,128,0.15);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .hero-progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .hero-progress-fill.low { background: linear-gradient(90deg, var(--accent), var(--accent-hover)); }
  .hero-progress-fill.medium { background: linear-gradient(90deg, var(--warning), #e5b84a); }
  .hero-progress-fill.high { background: linear-gradient(90deg, var(--danger), #f06b6b); }
  .hero-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
  }
  .hero-usage {
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  /* === Step Indicators (Registration Progress) === */
  .step-indicators {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin: 12px 0;
    padding: 8px 4px;
    background: rgba(0,0,0,0.2);
    border-radius: var(--radius-md);
  }
  .step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    min-width: 36px;
  }
  .step-icon {
    font-size: 14px;
    opacity: 0.4;
    transition: all 0.3s ease;
  }
  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
    opacity: 0.3;
    transition: all 0.3s ease;
  }
  .step-line {
    flex: 1;
    height: 2px;
    background: var(--muted);
    opacity: 0.2;
    min-width: 8px;
    max-width: 20px;
  }
  .step-indicator.done .step-icon { opacity: 1; }
  .step-indicator.done .step-dot { 
    background: var(--accent); 
    opacity: 1;
    box-shadow: 0 0 8px var(--accent-glow);
  }
  .step-indicator.active .step-icon { 
    opacity: 1; 
    animation: stepPulse 1s ease-in-out infinite;
  }
  .step-indicator.active .step-dot { 
    background: var(--accent); 
    opacity: 1;
    animation: stepGlow 1s ease-in-out infinite;
  }
  .step-indicator.error .step-icon { opacity: 1; }
  .step-indicator.error .step-dot { 
    background: var(--danger); 
    opacity: 1;
    animation: stepError 0.5s ease-in-out infinite;
  }
  @keyframes stepPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
  @keyframes stepGlow {
    0%, 100% { box-shadow: 0 0 4px var(--accent-glow); }
    50% { box-shadow: 0 0 12px var(--accent-glow); }
  }
  @keyframes stepError {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .hero-percent {
    font-weight: 700;
    color: var(--accent);
  }

  /* === Toolbar === */
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
  }
  .toolbar-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .toolbar-buttons {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .toolbar-buttons .btn {
    padding: 6px 8px;
    font-size: 12px;
  }
  .toolbar-buttons .btn-text {
    display: none;
  }
  @media (min-width: 400px) {
    .toolbar-buttons .btn-text { display: inline; }
    .toolbar-buttons .btn { padding: 6px 10px; font-size: 11px; }
  }

  /* === Search === */
  .search-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .search-input {
    width: 100%;
    padding: 6px 28px 6px 28px;
    font-size: 11px;
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
    box-shadow: 0 0 0 2px rgba(63,182,139,0.15);
  }
  .search-input::placeholder {
    color: var(--muted);
  }
  .search-icon {
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }
  .search-icon svg {
    width: 12px;
    height: 12px;
  }
  .search-clear {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 16px;
    height: 16px;
    display: none;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--muted);
    font-size: 10px;
    transition: all var(--transition);
  }
  .search-clear:hover {
    background: var(--danger-dim);
    color: var(--danger);
  }
  .search-wrapper:has(.search-input:not(:placeholder-shown)) .search-clear {
    display: flex;
  }

  /* === Token Filters === */
  .filter-group {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
  }
  .filter-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--muted);
    margin-right: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .filter-btn {
    padding: 4px 8px;
    font-size: 10px;
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
    background: var(--input-bg);
    border-color: var(--accent);
    color: var(--fg);
  }
  .filter-btn.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
  
  /* Responsive filters for narrow screens */
  @media (max-width: 350px) {
    .filter-label {
      width: 100%;
      margin-bottom: 2px;
    }
    .filter-btn {
      flex: 1;
      min-width: 0;
      padding: 4px 6px;
      font-size: 9px;
    }
  }

  /* === Account List === */
  .list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px 100px;
  }
  .list-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 4px;
    font-size: 10px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .list-group.danger { color: var(--danger); }
  .list-group.warning { color: var(--warning); }
  .list-group.banned { color: #ff0000; }
  .list-group.warning .list-group-action {
    background: rgba(217, 163, 52, 0.15);
    color: var(--warning);
  }
  .list-group.warning .list-group-action:hover {
    background: var(--warning);
    color: #000;
  }
  .list-group.banned .list-group-action {
    background: rgba(255, 0, 0, 0.15);
    color: #ff0000;
  }
  .list-group.banned .list-group-action:hover {
    background: #ff0000;
    color: #fff;
  }
  .list-group-count {
    padding: 2px 6px;
    background: var(--bg-elevated);
    border-radius: 8px;
    font-size: 9px;
  }
  .list-group-action {
    margin-left: auto;
    padding: 3px 8px;
    font-size: 9px;
    font-weight: 600;
    background: var(--danger-dim);
    color: var(--danger);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition);
  }
  .list-group-action:hover {
    background: var(--danger);
    color: #fff;
  }

  /* === Account Card === */
  .account {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    margin-bottom: 6px;
    background: var(--glass-bg);
    border: 2px solid var(--glass-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-normal);
  }
  .account:hover {
    border-color: rgba(63,182,139,0.5);
    background: linear-gradient(135deg, rgba(63,182,139,0.08) 0%, transparent 100%);
    transform: translateY(-1px);
  }
  /* ACTIVE - яркая зелёная рамка */
  .account.active {
    border-color: var(--accent);
    border-width: 2px;
    background: linear-gradient(135deg, rgba(63,182,139,0.15) 0%, rgba(63,182,139,0.05) 100%);
    box-shadow: 0 0 12px rgba(63,182,139,0.3);
  }
  /* READY - обычный серый */
  .account:not(.active):not(.expired):not(.exhausted):not(.suspended):not(.banned) {
    border-color: var(--border);
  }
  /* EXPIRED - жёлтая рамка */
  .account.expired { 
    border-color: var(--warning); 
    background: linear-gradient(135deg, rgba(217,163,52,0.1) 0%, transparent 100%);
  }
  /* EXHAUSTED - оранжевая рамка */
  .account.exhausted { 
    border-color: #ff6b35;
    background: linear-gradient(135deg, rgba(255,107,53,0.1) 0%, transparent 100%);
  }
  /* SUSPENDED - тёмно-красная */
  .account.suspended { 
    border-color: #8b0000;
    background: linear-gradient(135deg, rgba(139,0,0,0.15) 0%, transparent 100%);
  }
  /* BANNED - ЯРКАЯ КРАСНАЯ РАМКА + ПЕРЕЧЁРКНУТЫЙ */
  .account.banned {
    border-color: #ff0000 !important;
    border-width: 2px;
    background: linear-gradient(135deg, rgba(255,0,0,0.2) 0%, rgba(255,0,0,0.05) 100%) !important;
    opacity: 0.7;
    position: relative;
  }
  .account.banned::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: #ff0000;
    transform: rotate(-3deg);
  }
  .account.banned .account-email {
    text-decoration: line-through;
    color: #ff6666;
  }
  .account-avatar {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  /* Avatar colors by status */
  .account.expired .account-avatar { background: linear-gradient(135deg, #888 0%, #666 100%); }
  .account.exhausted .account-avatar { background: linear-gradient(135deg, #ff6b35 0%, #cc5500 100%); }
  .account.suspended .account-avatar { background: linear-gradient(135deg, #8b0000 0%, #5c0000 100%); }
  .account.banned .account-avatar { background: linear-gradient(135deg, #ff0000 0%, #aa0000 100%); }
  .account-status {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--bg);
  }
  .account-status.active { background: var(--accent); box-shadow: 0 0 6px var(--accent); }
  .account-status.ready { background: #888; }
  .account-status.expired { background: var(--warning); }
  .account-status.exhausted { background: #ff6b35; }
  .account-status.suspended { background: #8b0000; }
  .account-status.banned { background: #ff0000; box-shadow: 0 0 6px #ff0000; }
  .account-info { flex: 1; min-width: 0; }
  .account-email {
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .account-meta {
    display: flex;
    gap: 10px;
    margin-top: 3px;
    font-size: 10px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .account-meta span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .account-meta svg { width: 10px; height: 10px; }
  .account-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--transition);
  }
  .account:hover .account-actions { opacity: 1; }
  .account-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--muted);
    transition: all var(--transition);
  }
  .account-btn:hover {
    background: rgba(128,128,128,0.2);
    color: var(--fg);
  }
  .account-btn.danger:hover {
    background: var(--danger-dim);
    border-color: var(--danger);
    color: var(--danger);
  }
  /* Double-click delete confirmation state */
  .account-btn.danger.confirm-delete {
    background: var(--danger);
    border-color: var(--danger);
    color: white;
    animation: pulse-delete 0.5s ease-in-out infinite;
  }
  @keyframes pulse-delete {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 83, 80, 0.4); }
    50% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(239, 83, 80, 0); }
  }
  .account-btn svg { width: 12px; height: 12px; }

  /* === Account Checkbox (Selection Mode) === */
  .account-checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-right: 6px;
    cursor: pointer;
  }
  .account-checkbox input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
  }
  .account-checkbox .checkmark {
    width: 16px;
    height: 16px;
    border: 2px solid var(--muted);
    border-radius: 3px;
    background: transparent;
    transition: all var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .account-checkbox:hover .checkmark {
    border-color: var(--accent);
  }
  .account-checkbox input:checked ~ .checkmark {
    background: var(--accent);
    border-color: var(--accent);
  }
  .account-checkbox input:checked ~ .checkmark::after {
    content: '✓';
    color: #fff;
    font-size: 10px;
    font-weight: bold;
  }
  .account.selected {
    background: var(--accent-dim);
    border-color: var(--accent);
  }

  /* === Bulk Actions Bar === */
  .bulk-actions-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    margin-top: 8px;
    background: linear-gradient(135deg, var(--accent-dim) 0%, rgba(63,182,139,0.05) 100%);
    border-radius: var(--radius-md);
    padding: 8px 12px;
  }
  .bulk-actions-bar.hidden {
    display: none;
  }
  .bulk-info {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
  }
  .bulk-count {
    background: var(--accent);
    color: #fff;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    min-width: 18px;
    text-align: center;
  }
  .bulk-buttons {
    display: flex;
    gap: 4px;
    flex: 1;
  }
  .btn-sm {
    padding: 4px 8px;
    font-size: 10px;
  }
  #selectModeBtn.active {
    background: var(--accent-dim);
    border-color: var(--accent);
    color: var(--accent);
  }

  /* === Empty State === */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--muted);
  }
  .empty-state-icon {
    font-size: 40px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  .empty-state-text {
    font-size: 12px;
    margin-bottom: 16px;
  }

  /* === Overlay (Settings) === */
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: 100;
    display: none;
    flex-direction: column;
    animation: slideIn 0.25s ease;
  }
  .overlay.visible { display: flex; }
  @keyframes slideIn { 
    from { transform: translateX(100%); } 
    to { transform: translateX(0); } 
  }
  .overlay-header {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 42px;
    padding: 0 12px;
    background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .overlay-back {
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    background: transparent;
    border: none;
    color: var(--accent);
    cursor: pointer;
    transition: all var(--transition);
  }
  .overlay-back:hover { color: var(--accent-hover); }
  .overlay-title {
    font-size: 13px;
    font-weight: 600;
    flex: 1;
  }
  .overlay-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .overlay-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-elevated);
  }
  .overlay-version {
    font-size: 10px;
    color: var(--muted);
  }

  /* === Settings Rows === */
  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
  }
  .setting-row:last-child { border-bottom: none; }
  .setting-label {
    font-size: 12px;
    font-weight: 500;
  }
  .setting-desc {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
  }
  .btn-sm {
    padding: 6px 12px;
    font-size: 10px;
  }

  /* === Import/Export Section === */
  .import-export-section {
    margin-top: 20px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(63, 182, 139, 0.08) 0%, rgba(63, 182, 139, 0.02) 100%);
    border: 1px solid rgba(63, 182, 139, 0.25);
    border-radius: var(--radius-md);
  }
  .import-export-section .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .import-export-section .section-icon {
    font-size: 14px;
  }
  .import-export-section .section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
  }
  .import-export-section .section-desc {
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 12px;
  }
  .import-export-actions {
    display: flex;
    gap: 8px;
  }
  .import-export-actions .btn {
    flex: 1;
  }

  /* === Danger Zone Section === */
  .danger-zone-section {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px dashed rgba(239, 83, 80, 0.3);
  }
  .danger-zone-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }
  .danger-zone-icon {
    font-size: 14px;
  }
  .danger-zone-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--danger);
  }
  .danger-zone-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(239, 83, 80, 0.08) 0%, rgba(239, 83, 80, 0.02) 100%);
    border: 1px solid rgba(239, 83, 80, 0.25);
    border-radius: var(--radius-md);
    gap: 12px;
  }
  .danger-zone-card:hover {
    border-color: rgba(239, 83, 80, 0.4);
    background: linear-gradient(135deg, rgba(239, 83, 80, 0.12) 0%, rgba(239, 83, 80, 0.04) 100%);
  }
  .danger-zone-info {
    flex: 1;
    min-width: 0;
  }
  .danger-zone-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg);
    margin-bottom: 4px;
  }
  .danger-zone-desc {
    font-size: 10px;
    color: var(--muted);
    line-height: 1.4;
  }
  .danger-zone-hint {
    margin-top: 10px;
    font-size: 10px;
    color: var(--muted);
    padding-left: 4px;
  }
  .danger-zone-card + .danger-zone-card {
    margin-top: 10px;
  }
  .danger-zone-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }
  .patch-card {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .patch-card .danger-zone-info {
    width: 100%;
  }
  .patch-card .danger-zone-actions {
    justify-content: flex-start;
  }
  .patch-status-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }
  .patch-status {
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
  }
  .patch-status.success {
    color: var(--accent);
    background: var(--accent-dim);
  }
  .patch-status.warning {
    color: var(--warning);
    background: rgba(229, 192, 123, 0.15);
  }
  .patch-status.error {
    color: var(--danger);
    background: var(--danger-dim);
  }
  .machine-id-preview {
    font-size: 9px;
    font-family: monospace;
    color: var(--muted);
    background: var(--bg);
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    cursor: help;
  }
  .btn-warning {
    background: linear-gradient(135deg, var(--warning) 0%, #d4a84a 100%);
    color: #1a1a1a;
    border: none;
  }
  .btn-warning:hover {
    background: linear-gradient(135deg, #e5c87a 0%, var(--warning) 100%);
  }

  /* === Modal === */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: none;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s ease;
  }
  .modal-overlay.visible { display: flex; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 360px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: modalSlideIn 0.2s ease;
  }
  @keyframes modalSlideIn { 
    from { opacity: 0; transform: scale(0.95) translateY(-10px); } 
    to { opacity: 1; transform: scale(1) translateY(0); } 
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }
  .modal-title {
    font-size: 13px;
    font-weight: 600;
  }
  .modal-close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 18px;
    border-radius: var(--radius-sm);
    transition: all var(--transition);
  }
  .modal-close:hover {
    background: var(--danger-dim);
    color: var(--danger);
  }
  .modal-body { padding: 16px; }
  .modal-hint {
    font-size: 10px;
    color: var(--muted);
    white-space: pre-line;
    line-height: 1.6;
    margin-bottom: 12px;
  }
  .modal-textarea {
    width: 100%;
    height: 80px;
    padding: 10px;
    font-size: 11px;
    font-family: monospace;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    resize: none;
    margin-bottom: 12px;
  }
  .modal-textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  /* === Dialog === */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 300;
    display: none;
    align-items: center;
    justify-content: center;
  }
  .dialog-overlay.visible { display: flex; }
  .dialog {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .dialog-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .dialog-text {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 16px;
  }
  .dialog-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }

  /* === Logs Drawer === */
  .logs-drawer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
    z-index: 50;
    transform: translateY(calc(100% - 36px));
    transition: transform 0.3s ease;
  }
  .logs-drawer.open { transform: translateY(0); }
  .logs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    cursor: pointer;
    background: rgba(0,0,0,0.2);
    user-select: none;
  }
  .logs-header:hover { background: rgba(0,0,0,0.3); }
  .logs-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .logs-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
  }
  .logs-count {
    font-size: 9px;
    padding: 2px 6px;
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: 8px;
    font-weight: 600;
  }
  .logs-count.has-errors {
    background: var(--danger-dim);
    color: var(--danger);
  }
  .logs-toggle {
    font-size: 10px;
    color: var(--muted);
    transition: transform 0.3s ease;
  }
  .logs-drawer.open .logs-toggle { transform: rotate(180deg); }
  .logs-actions {
    display: flex;
    gap: 4px;
    padding: 4px 12px;
    justify-content: flex-end;
    background: rgba(0,0,0,0.1);
  }
  .logs-content {
    max-height: 150px;
    overflow-y: auto;
    padding: 8px 12px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 10px;
    line-height: 1.5;
  }
  .log-line {
    white-space: pre-wrap;
    word-break: break-all;
    padding: 1px 0;
  }
  .log-line.error { color: var(--danger); }
  .log-line.success { color: var(--accent); }
  .log-line.warning { color: var(--warning); }

  /* === Toast Container === */
  .toast-container {
    position: fixed;
    top: 50px;
    right: 12px;
    z-index: 400;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  }
  .toast {
    padding: 10px 14px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toastSlideIn 0.3s ease;
    pointer-events: auto;
    max-width: 280px;
  }
  @keyframes toastSlideIn { 
    from { opacity: 0; transform: translateX(100%); } 
    to { opacity: 1; transform: translateX(0); } 
  }
  .toast.removing { animation: toastSlideOut 0.3s ease forwards; }
  @keyframes toastSlideOut { to { opacity: 0; transform: translateX(100%); } }
  .toast-icon { font-size: 14px; }
  .toast-message { flex: 1; }
  .toast.success { border-color: var(--accent); }
  .toast.error { border-color: var(--danger); }
  .toast.warning { border-color: var(--warning); }

  /* === Skeleton Loading === */
  .skeleton { pointer-events: none; }
  .skeleton-pulse {
    background: linear-gradient(90deg, var(--bg-elevated) 25%, rgba(128,128,128,0.15) 50%, var(--bg-elevated) 75%);
    background-size: 200% 100%;
    animation: skeletonPulse 1.5s ease-in-out infinite;
  }
  @keyframes skeletonPulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  .skeleton-line { height: 12px; border-radius: 4px; margin: 4px 0; }
  .account.skeleton { opacity: 0.6; }
  .account.skeleton .account-avatar { background: var(--bg-elevated); }

  /* === Switching State === */
  .account.switching {
    opacity: 0.5;
    pointer-events: none;
    position: relative;
  }
  .account.switching::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 20px;
    margin: -10px 0 0 -10px;
    border: 2px solid var(--accent);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* === Banned Account Styles === */
  .account.banned {
    opacity: 0.5;
    border-color: #8b0000;
    background: linear-gradient(135deg, rgba(139,0,0,0.1) 0%, transparent 100%);
  }
  .account-status.banned { background: #8b0000; }
  .ban-badge { margin-left: 4px; font-size: 10px; }
  .ban-reason { color: #ff6b6b; font-size: 9px; font-weight: 600; }
  .list-group.banned { color: #ff6b6b; border-color: rgba(139,0,0,0.3); }

  /* === Tab Bar Navigation === */
  .tab-bar {
    display: flex;
    gap: 2px;
    padding: 4px 6px;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    scroll-snap-type: x mandatory;
    flex-shrink: 0; /* Don't shrink */
  }
  .tab-bar::-webkit-scrollbar {
    display: none;
  }
  .tab-item {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 6px 8px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--muted);
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    min-width: 36px;
    scroll-snap-align: start;
  }
  .tab-item:hover {
    background: rgba(128,128,128,0.1);
    color: var(--fg);
  }
  .tab-item.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: var(--accent);
  }
  .tab-icon {
    font-size: 12px;
    line-height: 1;
    flex-shrink: 0;
  }
  .tab-icon svg {
    width: 12px;
    height: 12px;
  }
  .tab-label {
    display: none;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60px;
  }
  /* Show labels when width >= 360px */
  @media (min-width: 360px) {
    .tab-label { display: inline; }
    .tab-item { padding: 6px 10px; font-size: 10px; }
  }
  /* Wider screens */
  @media (min-width: 450px) {
    .tab-item { padding: 8px 14px; gap: 5px; font-size: 11px; }
    .tab-icon { font-size: 13px; }
    .tab-label { max-width: none; }
  }
  @media (min-width: 550px) {
    .tab-item { padding: 8px 16px; gap: 6px; }
    .tab-icon { font-size: 14px; }
  }
  .tab-badge {
    font-size: 8px;
    padding: 1px 4px;
    border-radius: 8px;
    background: rgba(128,128,128,0.2);
    color: var(--muted);
    flex-shrink: 0;
  }
  .tab-item.active .tab-badge {
    background: var(--accent);
    color: #fff;
  }

  /* === Tab Content Panels === */
  .tab-content {
    display: none;
    position: relative;
    z-index: 1;
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }
  .tab-content.active {
    display: flex;
    flex-direction: column;
  }

  /* === Settings Tab (inline mode) === */
  .settings-content {
    padding: 16px 12px;
    overflow-y: auto;
    max-height: calc(100vh - 150px);
  }
  .settings-footer {
    padding: 12px 0;
    margin-top: 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .settings-version {
    font-size: 10px;
    color: var(--muted);
  }

  /* === Profiles Tab (inline mode) === */
  .profiles-tab {
    padding: 12px;
  }
  .profiles-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .profiles-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  .profiles-content {
    min-height: 100px;
  }
  .profiles-empty {
    text-align: center;
    padding: 30px 20px;
    color: var(--muted);
  }
  .profiles-empty .empty-icon {
    font-size: 32px;
    margin-bottom: 10px;
    opacity: 0.5;
  }
  .profiles-empty .empty-text {
    font-size: 12px;
    margin-bottom: 14px;
  }
  .profiles-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .profile-card {
    padding: 12px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    transition: all var(--transition);
  }
  .profile-card:hover {
    border-color: rgba(63,182,139,0.3);
  }
  .profile-card.active {
    border-color: var(--accent);
    background: var(--accent-dim);
  }
  .profile-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .profile-card-radio {
    cursor: pointer;
  }
  .radio-dot {
    width: 16px;
    height: 16px;
    border: 2px solid var(--muted);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition);
  }
  .radio-dot.checked {
    border-color: var(--accent);
    background: var(--accent);
  }
  .radio-dot.checked::after {
    content: '';
    width: 6px;
    height: 6px;
    background: #fff;
    border-radius: 50%;
  }
  .profile-card-info {
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }
  .profile-card-name {
    font-size: 12px;
    font-weight: 600;
  }
  .profile-card-email {
    font-size: 10px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-card-actions {
    display: flex;
    gap: 4px;
  }
  .profile-card-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    font-size: 10px;
    color: var(--muted);
  }
  .profile-strategy {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .profile-stats {
    color: var(--muted);
  }
  .profiles-add-btn {
    margin-top: 12px;
    width: 100%;
  }

  /* === Profile Editor Form (inline) === */
  .profile-editor-form {
    padding: 12px 0;
  }
  .profile-editor-form .editor-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }
  .profile-editor-form .editor-title {
    font-size: 14px;
    font-weight: 600;
  }
  .profile-editor-form .editor-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .profile-editor-form .editor-footer {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }
`;



export const autoRegStyles = `
  /* === Auto-Reg Controls === */
  .autoreg-controls {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  .autoreg-controls .form-group {
    flex: 1;
    margin-bottom: 0;
  }
  .autoreg-controls .form-group label {
    font-size: 10px;
    margin-bottom: 2px;
  }
  .autoreg-controls .form-control {
    height: 30px;
    min-height: 30px;
  }
  .autoreg-controls .btn {
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 12px;
  }
  .autoreg-controls.running .btn {
    flex: 1;
  }
`;


export const responsiveStyles = `
  /* === Responsive Design === */
  
  /* Very narrow screens (< 300px) */
  @media (max-width: 299px) {
    .header { padding: 0 6px; }
    .header-title { font-size: 12px; }
    .header-badge { font-size: 9px; padding: 2px 5px; }
    .hero { margin: 6px; padding: 8px; }
    .hero-remaining-value { font-size: 24px; }
    .account { padding: 6px; gap: 6px; }
    .account-avatar { width: 28px; height: 28px; font-size: 11px; }
    .account-email { font-size: 9px; }
    .account-meta { font-size: 8px; gap: 6px; }
    .account-actions { opacity: 1; }
    .account-btn { width: 22px; height: 22px; }
    .tab-item { padding: 5px 6px; min-width: 32px; }
    .tab-icon { font-size: 11px; }
    .list { padding: 4px 6px 70px; }
    .toolbar { padding: 4px 6px; }
    .toolbar-buttons .btn { padding: 5px 6px; }
    .spoof-modules { grid-template-columns: 1fr; }
    .stats-cards { grid-template-columns: 1fr; }
    .stat-value { font-size: 20px; }
  }
  
  /* Narrow screens (300-359px) */
  @media (min-width: 300px) and (max-width: 359px) {
    .header-title { font-size: 13px; }
    .hero { margin: 8px; padding: 10px; }
    .hero-remaining-value { font-size: 28px; }
    .account { padding: 8px; gap: 8px; }
    .account-avatar { width: 32px; height: 32px; font-size: 12px; }
    .account-actions { opacity: 1; gap: 2px; }
    .account-btn { width: 24px; height: 24px; }
    .tab-item { padding: 6px 8px; }
    .list { padding: 6px 8px 80px; }
    .spoof-modules { grid-template-columns: 1fr; }
  }
  
  /* Medium screens (360-449px) */
  @media (min-width: 360px) and (max-width: 449px) {
    .account-actions { opacity: 0; }
    .account:hover .account-actions { opacity: 1; }
    .spoof-modules { grid-template-columns: repeat(2, 1fr); }
  }
  
  /* Wider screens (450px+) */
  @media (min-width: 450px) {
    .hero { margin: 12px; padding: 16px; }
    .hero-remaining-value { font-size: 36px; }
    .account { padding: 12px 14px; }
    .account-avatar { width: 40px; height: 40px; font-size: 14px; }
    .list { padding: 10px 14px 100px; }
    .toolbar { padding: 8px 12px; }
  }
  
  /* Touch devices - always show actions */
  @media (hover: none) {
    .account-actions { opacity: 1; }
  }
`;

export const settingsCardStyles = `
  /* === Settings Cards === */
  .settings-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: 12px;
    overflow: hidden;
  }
  .settings-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(0,0,0,0.15);
    border-bottom: 1px solid var(--border);
  }
  .settings-card-icon {
    font-size: 16px;
  }
  .settings-card-title {
    flex: 1;
    font-size: 12px;
    font-weight: 600;
  }
  .settings-card-body {
    padding: 4px 14px;
  }
  .settings-card .setting-row {
    padding: 10px 0;
  }
  .settings-card .setting-row:last-child {
    border-bottom: none;
  }
  
  /* Active Profile in Card */
  .settings-card .active-profile-content {
    padding: 12px 14px;
  }
  .settings-card .active-profile-empty {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .settings-card .active-profile-empty .empty-text {
    flex: 1;
    font-size: 11px;
    color: var(--muted);
  }
  .settings-card .active-profile-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .settings-card .active-profile-avatar {
    font-size: 24px;
  }
  .settings-card .active-profile-details {
    flex: 1;
    min-width: 0;
  }
  .settings-card .active-profile-name {
    font-size: 12px;
    font-weight: 600;
  }
  .settings-card .active-profile-email {
    font-size: 10px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .settings-card .active-profile-strategy {
    font-size: 10px;
    color: var(--muted);
    margin-top: 2px;
  }
  .settings-card .active-profile-stats {
    display: flex;
    gap: 12px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .settings-card .active-profile-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .settings-card .active-profile-stat-value {
    font-size: 14px;
    font-weight: 700;
  }
  .settings-card .active-profile-stat-value.success { color: var(--accent); }
  .settings-card .active-profile-stat-value.danger { color: var(--danger); }
  .settings-card .active-profile-stat-label {
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
  }

  /* Settings Card Footer */
  .settings-card-footer {
    padding: 12px 14px;
    background: rgba(0,0,0,0.1);
    border-top: 1px solid var(--border);
  }

  /* Form Groups for LLM Settings */
  .form-group {
    margin-bottom: 14px;
  }
  .form-group:last-child {
    margin-bottom: 0;
  }
  .form-group label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--fg);
    margin-bottom: 6px;
  }
  .form-control {
    width: 100%;
    padding: 8px 12px;
    font-size: 12px;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    transition: border-color var(--transition);
  }
  .form-control:focus {
    outline: none;
    border-color: var(--accent);
  }
  .form-control::placeholder {
    color: var(--muted);
  }
  .form-group .setting-desc {
    margin-top: 4px;
  }

  /* Spoof Section as Card */
  .spoof-section {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: 12px;
    overflow: hidden;
  }
  .spoof-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: rgba(0,0,0,0.15);
  }
  .spoof-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .spoof-icon {
    font-size: 16px;
  }
  .spoof-details {
    padding: 12px 14px;
    border-top: 1px solid var(--border);
  }
  .spoof-details.hidden {
    display: none;
  }
  .spoof-modules {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .spoof-module {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px;
    background: rgba(0,0,0,0.1);
    border-radius: var(--radius-sm);
  }
  .module-icon {
    font-size: 14px;
  }
  .module-name {
    font-size: 10px;
    font-weight: 600;
  }
  .module-desc {
    font-size: 9px;
    color: var(--muted);
    margin-top: 2px;
  }
  .spoof-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 10px;
    padding: 8px;
    background: rgba(217,163,52,0.1);
    border-radius: var(--radius-sm);
    font-size: 10px;
    color: var(--warning);
  }
`;


export const statsStyles = `
  /* === Stats Dashboard === */
  .stats-dashboard {
    padding: 12px;
  }
  .stats-header {
    margin-bottom: 16px;
  }
  .stats-title {
    font-size: 14px;
    font-weight: 600;
    margin: 0;
  }
  
  /* Stats Cards Grid */
  .stats-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 16px;
  }
  .stat-card {
    padding: 12px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    text-align: center;
  }
  .stat-card.success { border-color: rgba(63,182,139,0.3); }
  .stat-card.danger { border-color: rgba(229,83,83,0.3); }
  .stat-card.warning { border-color: rgba(217,163,52,0.3); }
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
  }
  .stat-card.success .stat-value { color: var(--accent); }
  .stat-card.danger .stat-value { color: var(--danger); }
  .stat-card.warning .stat-value { color: var(--warning); }
  .stat-label {
    font-size: 10px;
    color: var(--muted);
    text-transform: uppercase;
    margin-top: 4px;
  }

  /* Stats Sections */
  .stats-section {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 12px;
    margin-bottom: 12px;
  }
  .stats-section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  /* Usage Overview */
  .usage-overview {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .usage-bar-container {
    flex: 1;
    height: 8px;
    background: rgba(128,128,128,0.2);
    border-radius: 4px;
    overflow: hidden;
  }
  .usage-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-hover));
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  .usage-numbers {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
  }
  .usage-current { color: var(--accent); }
  .usage-separator { color: var(--muted); margin: 0 2px; }
  .usage-limit { color: var(--muted); }
  .usage-avg {
    font-size: 10px;
    color: var(--muted);
    margin-top: 8px;
  }
  .usage-avg strong { color: var(--fg); }

  /* Mini Chart */
  .mini-chart {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 60px;
    padding: 4px 0;
  }
  .chart-bar {
    flex: 1;
    background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dim) 100%);
    border-radius: 2px 2px 0 0;
    min-height: 4px;
    transition: height 0.3s ease;
  }
  .chart-bar:hover {
    background: var(--accent);
  }
  .chart-labels {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    margin-top: 4px;
  }

  /* Health Bars */
  .health-bars {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .health-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .health-label {
    font-size: 10px;
    width: 60px;
    white-space: nowrap;
  }
  .health-bar {
    flex: 1;
    height: 6px;
    background: rgba(128,128,128,0.2);
    border-radius: 3px;
    overflow: hidden;
  }
  .health-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  .health-fill.success { background: var(--accent); }
  .health-fill.danger { background: var(--danger); }
  .health-fill.warning { background: var(--warning); }
  .health-percent {
    font-size: 10px;
    font-weight: 600;
    width: 32px;
    text-align: right;
  }


  /* === Strategy Selection === */
  .strategy-option {
    display: flex;
    gap: 12px;
    padding: 12px;
    border: 2px solid var(--glass-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-normal);
    margin-bottom: 12px;
  }
  .strategy-option:hover {
    border-color: var(--accent);
    background: var(--glass-bg);
  }
  .strategy-option.selected {
    border-color: var(--accent);
    background: rgba(63, 182, 139, 0.05);
  }
  .strategy-option input[type="radio"] {
    margin-top: 2px;
    cursor: pointer;
  }
  .strategy-content {
    flex: 1;
  }
  .strategy-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .strategy-desc {
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .strategy-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .strategy-risk {
    font-size: 11px;
    color: var(--muted);
  }

  /* === Badge === */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
  }
  .badge-success {
    background: rgba(76, 175, 80, 0.2);
    color: #4CAF50;
  }
  .badge-warning {
    background: rgba(255, 152, 0, 0.2);
    color: #FF9800;
  }
  .badge-danger {
    background: rgba(244, 67, 54, 0.2);
    color: #f44336;
  }
  .badge-info {
    background: rgba(33, 150, 243, 0.2);
    color: #2196F3;
  }
`;
