/**
 * IMAP Profiles styles
 */

export const profiles = `
  /* === Profile Section === */
  .profiles-section {
    padding: 12px;
  }
  .profiles-section-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--muted);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .profiles-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .profiles-empty {
    text-align: center;
    padding: 30px 20px;
    color: var(--muted);
  }
  .profiles-empty .empty-icon {
    font-size: 36px;
    margin-bottom: 10px;
    opacity: 0.5;
  }
  .profiles-empty .empty-text {
    margin-bottom: 16px;
    font-size: 12px;
  }
  .profiles-add {
    margin-top: 10px;
    width: 100%;
  }

  /* === Profile Card === */
  .imap-profile {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .imap-profile:hover {
    border-color: rgba(63,182,139,0.3);
    background: linear-gradient(135deg, rgba(63,182,139,0.06) 0%, transparent 100%);
    transform: translateY(-1px);
  }
  .imap-profile.active {
    border-color: var(--accent);
    background: linear-gradient(135deg, var(--accent-dim) 0%, transparent 100%);
  }
  .imap-profile.exhausted {
    opacity: 0.6;
    border-color: var(--danger);
  }
  .imap-profile.error {
    border-color: var(--danger);
  }
  .imap-profile.paused {
    opacity: 0.7;
    border-color: var(--warning);
  }

  .profile-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .profile-avatar {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .profile-strategy-icon {
    font-size: 16px;
  }
  .profile-status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--bg);
  }
  .profile-info {
    flex: 1;
    min-width: 0;
  }
  .profile-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .profile-name {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-provider {
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 8px;
    background: var(--bg-elevated);
    color: var(--muted);
    font-weight: 500;
  }
  .profile-email {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--transition);
  }
  .imap-profile:hover .profile-actions {
    opacity: 1;
  }
  .profile-btn {
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
  .profile-btn:hover {
    background: rgba(128,128,128,0.2);
    color: var(--fg);
  }
  .profile-btn.danger:hover {
    background: var(--danger-dim);
    border-color: var(--danger);
    color: var(--danger);
  }
  .profile-btn svg {
    width: 14px;
    height: 14px;
  }

  .profile-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .profile-strategy {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .profile-pool-stats {
    font-size: 10px;
    padding: 2px 6px;
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: 8px;
  }
  .profile-stats {
    display: flex;
    gap: 12px;
  }
  .profile-stats .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .profile-stats .stat-value {
    font-size: 12px;
    font-weight: 700;
    font-family: var(--vscode-editor-font-family, monospace);
  }
  .profile-stats .stat-label {
    font-size: 9px;
    color: var(--muted);
  }
  .profile-error {
    margin-top: 8px;
    padding: 6px 8px;
    background: var(--danger-dim);
    border-radius: var(--radius-sm);
    font-size: 10px;
    color: var(--danger);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* === Profile Editor === */
  .profile-editor {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: 200;
    display: none;
    flex-direction: column;
    animation: slideIn 0.25s ease;
  }
  .profile-editor.visible,
  .profile-editor[style*="display: flex"] {
    display: flex;
  }
  .editor-header {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 42px;
    padding: 0 12px;
    background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .editor-title {
    font-size: 13px;
    font-weight: 600;
  }
  .editor-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }
  .editor-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    background: var(--bg-elevated);
  }

  /* === Form Section === */
  .form-section {
    margin-bottom: 20px;
    padding: 14px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
  }
  .form-section-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .form-section-desc {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 12px;
  }

  /* === Strategy Selector === */
  .strategy-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .strategy-option {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .strategy-option:hover {
    border-color: rgba(63,182,139,0.3);
    background: rgba(63,182,139,0.05);
  }
  .strategy-option.selected {
    border-color: var(--accent);
    background: var(--accent-dim);
  }
  .strategy-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--glass-bg);
    border-radius: var(--radius-sm);
  }
  .strategy-content {
    flex: 1;
  }
  .strategy-label {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 2px;
    color: var(--accent);
  }
  .strategy-desc {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.4;
  }
  .strategy-example {
    font-size: 10px;
    color: var(--accent);
    font-family: var(--vscode-editor-font-family, monospace);
    margin-top: 4px;
    padding: 3px 6px;
    background: var(--accent-dim);
    border-radius: var(--radius-sm);
    display: inline-block;
  }
  .config-hint {
    font-size: 11px;
    color: var(--muted);
    padding: 10px 12px;
    background: var(--bg-elevated);
    border-radius: var(--radius-sm);
    margin-bottom: 12px;
    line-height: 1.5;
  }
  .strategy-check {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    opacity: 0;
    transition: opacity var(--transition);
  }
  .strategy-option.selected .strategy-check {
    opacity: 1;
  }
  .strategy-check svg {
    width: 16px;
    height: 16px;
  }
  .strategy-config {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }

  /* === Email Pool Editor === */
  .email-pool-editor {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  .pool-list {
    max-height: 200px;
    overflow-y: auto;
  }
  .pool-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    font-size: 11px;
  }
  .pool-item:last-child {
    border-bottom: none;
  }
  .pool-item.used {
    opacity: 0.5;
    background: rgba(63,182,139,0.05);
  }
  .pool-item.failed {
    background: var(--danger-dim);
  }
  .pool-status {
    font-size: 12px;
  }
  .pool-email {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pool-remove {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition);
  }
  .pool-remove:hover {
    background: var(--danger-dim);
    color: var(--danger);
  }
  .pool-remove:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  .pool-add {
    display: flex;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid var(--border);
  }
  .pool-add .form-input {
    flex: 1;
  }
  .pool-add .btn {
    padding: 8px 12px;
  }
  .pool-actions {
    display: flex;
    gap: 6px;
    padding: 8px;
    border-top: 1px solid var(--border);
    background: var(--glass-bg);
  }
  .pool-actions .btn {
    flex: 1;
    font-size: 10px;
  }

  /* === Password Input === */
  .password-input-wrapper {
    position: relative;
  }
  .password-input-wrapper .form-input {
    padding-right: 36px;
  }
  .password-toggle {
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition);
  }
  .password-toggle:hover {
    background: var(--bg-elevated);
    color: var(--fg);
  }
  .password-toggle svg {
    width: 14px;
    height: 14px;
  }

  /* === Settings Section === */
  .setting-section {
    margin-bottom: 16px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(63,182,139,0.08) 0%, transparent 100%);
    border: 1px solid rgba(63,182,139,0.2);
    border-radius: var(--radius-md);
  }
  .setting-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .setting-section-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .setting-section-desc {
    font-size: 11px;
    color: var(--muted);
  }
  /* === Active Profile Card === */
  .active-profile-card {
    margin-bottom: 16px;
    padding: 14px;
    background: linear-gradient(135deg, rgba(63,182,139,0.1) 0%, rgba(63,182,139,0.03) 100%);
    border: 1px solid rgba(63,182,139,0.25);
    border-radius: var(--radius-lg);
  }
  .active-profile-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .active-profile-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--accent);
  }
  .btn-sm {
    padding: 5px 10px;
    font-size: 10px;
  }
  .active-profile-content {
    min-height: 60px;
  }
  .active-profile-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 10px;
    text-align: center;
  }
  .active-profile-empty .empty-icon {
    font-size: 24px;
    opacity: 0.5;
  }
  .active-profile-empty .empty-text {
    font-size: 11px;
    color: var(--muted);
  }
  .active-profile-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .active-profile-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .active-profile-details {
    flex: 1;
    min-width: 0;
  }
  .active-profile-name {
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .active-profile-email {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 6px;
  }
  .active-profile-strategy {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 10px;
  }
  .active-profile-strategy .strategy-icon {
    font-size: 12px;
  }
  .active-profile-strategy .strategy-name {
    font-weight: 600;
    color: var(--accent);
  }
  .active-profile-strategy .strategy-desc {
    color: var(--muted);
    margin-left: 4px;
  }
  .active-profile-stats {
    display: flex;
    gap: 16px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(63,182,139,0.15);
  }
  .active-profile-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .active-profile-stat-value {
    font-size: 14px;
    font-weight: 700;
    font-family: var(--vscode-editor-font-family, monospace);
  }
  .active-profile-stat-value.success { color: var(--accent); }
  .active-profile-stat-value.danger { color: var(--danger); }
  .active-profile-stat-label {
    font-size: 9px;
    color: var(--muted);
    text-transform: uppercase;
  }

  /* === Profile Card (new style) === */
  .profile-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 12px;
    transition: all 0.2s ease;
  }
  .profile-card:hover {
    border-color: rgba(63,182,139,0.3);
    background: linear-gradient(135deg, rgba(63,182,139,0.06) 0%, transparent 100%);
  }
  .profile-card.active {
    border-color: var(--accent);
    background: linear-gradient(135deg, var(--accent-dim) 0%, transparent 100%);
  }
  .profile-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .profile-card-radio {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .radio-dot {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--border);
    transition: all 0.2s ease;
  }
  .radio-dot.checked {
    border-color: var(--accent);
    background: var(--accent);
    box-shadow: inset 0 0 0 3px var(--bg);
  }
  .profile-card-info {
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }
  .profile-card-name {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-card-email {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .profile-card-actions {
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--transition);
  }
  .profile-card:hover .profile-card-actions {
    opacity: 1;
  }
  .profile-card-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    font-family: var(--vscode-editor-font-family, monospace);
  }
  .profiles-add-btn {
    margin-top: 12px;
    width: 100%;
  }

  /* === Form Elements === */
  .form-group {
    margin-bottom: 12px;
  }
  .form-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .form-input {
    width: 100%;
    padding: 8px 10px;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--fg);
    font-size: 12px;
    transition: all var(--transition);
  }
  .form-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-dim);
  }
  .form-input::placeholder {
    color: var(--muted);
    opacity: 0.6;
  }
  .form-row {
    display: flex;
    gap: 10px;
  }
  .form-row .form-group {
    flex: 1;
  }
  .form-row .form-group.flex-1 {
    flex: 1;
  }
  .form-row .form-group.flex-2 {
    flex: 2;
  }
  .form-hint {
    font-size: 10px;
    color: var(--muted);
    margin-top: 4px;
    display: none;
  }
  .form-hint .provider-name {
    color: var(--accent);
    font-weight: 600;
  }

  /* === Profiles Panel Overlay === */
  .profiles-panel {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: 150;
    display: none;
    flex-direction: column;
    animation: slideIn 0.25s ease;
  }
  .profiles-panel.visible {
    display: flex;
  }
  @keyframes slideIn { 
    from { transform: translateX(100%); } 
    to { transform: translateX(0); } 
  }
  .profiles-panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 42px;
    padding: 0 12px;
    background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .profiles-panel-title {
    font-size: 13px;
    font-weight: 600;
    flex: 1;
  }
  .profiles-panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
`;
