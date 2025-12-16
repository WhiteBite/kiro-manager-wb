/**
 * Layout styles - Hero, Toolbar, List, Overlays, Modals, Logs
 */

export const layout = `
  /* === Hero Dashboard === */
  .hero {
    margin: 10px 12px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(63,182,139,0.1) 0%, rgba(63,182,139,0.03) 100%);
    border: 1px solid rgba(63,182,139,0.25);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-normal);
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
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  .toolbar-buttons {
    display: flex;
    gap: 6px;
  }
  .toolbar-buttons .btn-primary { flex: 1; }

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
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-normal);
  }
  .account:hover {
    border-color: rgba(63,182,139,0.3);
    background: linear-gradient(135deg, rgba(63,182,139,0.06) 0%, transparent 100%);
    transform: translateY(-1px);
  }
  .account.active {
    border-color: var(--accent);
    background: linear-gradient(135deg, var(--accent-dim) 0%, transparent 100%);
  }
  .account.expired { opacity: 0.6; border-color: var(--muted); }
  .account.exhausted { opacity: 0.6; border-color: var(--danger); }
  .account.suspended { opacity: 0.5; border-color: #8b0000; }
  .account-avatar {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  .account-status {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--bg);
  }
  .account-status.active { background: var(--accent); }
  .account-status.ready { background: #666; }
  .account-status.expired { background: var(--muted); }
  .account-status.exhausted { background: var(--danger); }
  .account-status.suspended { background: #8b0000; }
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
`;
