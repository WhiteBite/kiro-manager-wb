/**
 * Settings Card styles - Form groups and spoof section
 */

export const settingsCardStyles = `
  /* === Settings Cards (Compact) === */
  .settings-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-3);
    overflow: hidden;
  }
  
  .settings-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: rgba(0, 0, 0, 0.15);
    border-bottom: 1px solid var(--border);
  }
  
  .settings-card-icon {
    font-size: var(--font-size-lg);
  }
  
  .settings-card-title {
    flex: 1;
    font-size: var(--font-size-sm);
    font-weight: 600;
  }
  
  .settings-card-body {
    padding: var(--space-1) var(--space-3);
  }
  
  .settings-card .setting-row {
    padding: var(--space-3) 0;
  }
  
  .settings-card .setting-row:last-child {
    border-bottom: none;
  }
  
  /* Active Profile in Card */
  .settings-card .active-profile-content {
    padding: var(--space-3);
  }
  
  .settings-card .active-profile-empty {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  
  .settings-card .active-profile-empty .empty-text {
    flex: 1;
    font-size: var(--font-size-xs);
    color: var(--muted);
  }
  
  .settings-card .active-profile-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  
  .settings-card .active-profile-avatar {
    font-size: var(--font-size-xl);
  }
  
  .settings-card .active-profile-details {
    flex: 1;
    min-width: 0;
  }
  
  .settings-card .active-profile-name {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }
  
  .settings-card .active-profile-email {
    font-size: var(--font-size-xs);
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .settings-card .active-profile-strategy {
    font-size: var(--font-size-xs);
    color: var(--muted);
    margin-top: 2px;
  }
  
  .settings-card .active-profile-stats {
    display: flex;
    gap: var(--space-3);
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  
  .settings-card .active-profile-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .settings-card .active-profile-stat-value {
    font-size: var(--font-size-md);
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
    padding: var(--space-3);
    background: rgba(0, 0, 0, 0.1);
    border-top: 1px solid var(--border);
  }

  /* === Form Groups === */
  .form-group {
    margin-bottom: var(--space-3);
  }
  
  .form-group:last-child {
    margin-bottom: 0;
  }
  
  .form-group label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--fg);
    margin-bottom: var(--space-2);
  }
  
  .form-control {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-sm);
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
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
    margin-top: var(--space-1);
  }

  /* === Spoof Section === */
  .spoof-section {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-3);
    overflow: hidden;
  }
  
  .spoof-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3);
    background: rgba(0, 0, 0, 0.15);
  }
  
  .spoof-title {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  
  .spoof-icon {
    font-size: var(--font-size-lg);
  }
  
  .spoof-details {
    padding: var(--space-3);
    border-top: 1px solid var(--border);
  }
  
  .spoof-details.hidden {
    display: none;
  }
  
  .spoof-modules {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }
  
  .spoof-module {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    padding: var(--space-2);
    background: rgba(0, 0, 0, 0.1);
    border-radius: var(--radius-md);
  }
  
  .module-icon {
    font-size: var(--font-size-md);
  }
  
  .module-name {
    font-size: var(--font-size-xs);
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
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-2);
    background: rgba(236, 201, 75, 0.1);
    border-radius: var(--radius-md);
    font-size: var(--font-size-xs);
    color: var(--warning);
  }

  /* === Narrow: single column spoof modules === */
  @media (max-width: 300px) {
    .spoof-modules {
      grid-template-columns: 1fr;
    }
  }

  /* === LLM Status Badge (in header) === */
  .llm-status-badge {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-left: auto;
    margin-right: var(--space-2);
  }
  
  .llm-status-badge .patch-status {
    font-size: 10px;
    padding: 2px 8px;
  }

  /* === LLM Server Controls === */
  .llm-controls {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .llm-status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
  }
  
  .llm-status-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .llm-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
  }
  
  .llm-status-dot.running {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent-glow);
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .llm-status-dot.stopped {
    background: var(--danger);
  }
  
  .llm-status-text {
    font-size: var(--font-size-sm);
    font-weight: 500;
  }
  
  /* LLM Button Group - equal width buttons */
  .llm-buttons {
    display: flex;
    gap: var(--space-2);
  }
  
  .llm-buttons .btn {
    flex: 1;
    min-width: 0;
    max-width: none;
  }
  
  /* Stack vertically on narrow */
  @media (max-width: 280px) {
    .llm-buttons {
      flex-direction: column;
    }
    .llm-buttons .btn {
      width: 100%;
    }
  }
`;
