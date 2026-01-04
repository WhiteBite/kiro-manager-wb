/**
 * Batch Registration styles - Card with progress and settings
 * Uses flex-wrap for form elements
 */

export const batchRegStyles = `
  /* === Batch Reg Card === */
  .batch-reg-card {
    margin: var(--space-2) var(--padding-main);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition);
  }
  
  .batch-reg-card:hover {
    border-color: var(--border-strong);
  }
  
  .batch-reg-card.running {
    border-color: var(--accent);
    box-shadow: var(--shadow-glow);
  }
  
  .batch-reg-card.collapsed .batch-reg-body {
    display: none;
  }
  
  .batch-reg-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    background: rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: background var(--transition);
  }
  
  .batch-reg-header:hover {
    background: rgba(0, 0, 0, 0.15);
  }
  
  .batch-reg-title {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    font-weight: 600;
  }
  
  .batch-reg-icon {
    font-size: var(--font-size-md);
  }
  
  .batch-reg-badge {
    font-size: 9px;
    padding: 2px var(--space-2);
    border-radius: var(--radius-full);
    font-weight: 600;
  }
  
  .batch-reg-badge.running {
    background: var(--accent-dim);
    color: var(--accent);
    animation: pulse 1.5s ease-in-out infinite;
  }
  
  .batch-reg-badge.complete {
    background: rgba(72, 187, 120, 0.2);
    color: var(--accent);
  }
  
  .batch-reg-toggle {
    font-size: var(--font-size-xs);
    color: var(--muted);
    transition: transform 0.2s ease;
  }
  
  .batch-reg-card.collapsed .batch-reg-toggle {
    transform: rotate(-90deg);
  }
  
  .batch-reg-body {
    padding: var(--space-4);
  }

  /* === Progress Status === */
  .batch-reg-status {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-4);
    background: rgba(0, 0, 0, 0.15);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }
  
  .batch-reg-progress-ring {
    position: relative;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
  
  .batch-reg-progress-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  
  .batch-reg-progress-ring .progress-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 3;
  }
  
  .batch-reg-progress-ring .progress-fill {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dasharray 0.5s ease;
  }
  
  .batch-reg-progress-ring .progress-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--fg);
  }
  
  .batch-reg-status-info {
    flex: 1;
    min-width: 120px;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .status-line {
    display: flex;
    justify-content: space-between;
    font-size: var(--font-size-sm);
  }
  
  .status-label {
    color: var(--muted);
  }
  
  .status-value {
    font-weight: 600;
    color: var(--fg);
  }
  
  .status-line.highlight .status-value {
    color: var(--accent);
    font-size: var(--font-size-md);
    font-weight: 800;
  }

  /* === Settings Form === */
  .batch-reg-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }
  
  .batch-reg-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .batch-reg-field > label {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  /* Count selector */
  .batch-reg-count-group {
    display: flex;
    align-items: center;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  
  .count-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--fg);
    font-size: var(--font-size-lg);
    font-weight: 300;
    cursor: pointer;
    transition: all var(--transition);
  }
  
  .count-btn:hover:not(:disabled) {
    background: var(--accent-dim);
    color: var(--accent);
  }
  
  .count-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  .count-input {
    flex: 1;
    height: 40px;
    border: none;
    background: transparent;
    color: var(--fg);
    font-size: var(--font-size-lg);
    font-weight: 600;
    text-align: center;
    font-family: inherit;
  }
  
  .count-input:focus {
    outline: none;
  }
  
  /* Interval pills */
  .batch-reg-interval-pills {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  
  .interval-pill {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-full);
    background: var(--input-bg);
    color: var(--muted);
    font-size: var(--font-size-xs);
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all var(--transition);
    flex: 1;
    min-width: 60px;
    text-align: center;
  }
  
  .interval-pill:hover {
    border-color: var(--accent);
    color: var(--fg);
  }
  
  .interval-pill.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  
  .batch-reg-hint {
    font-size: var(--font-size-xs);
    color: var(--muted);
  }
  
  /* Name mode */
  .batch-reg-name-mode {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .name-mode-option {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition);
  }
  
  .name-mode-option:hover {
    border-color: rgba(72, 187, 120, 0.4);
  }
  
  .name-mode-option.active {
    border-color: var(--accent);
    background: var(--accent-dim);
  }
  
  .name-mode-option input[type="radio"] {
    margin-top: 2px;
    accent-color: var(--accent);
  }
  
  .name-mode-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  
  .name-mode-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--fg);
  }
  
  .name-mode-desc {
    font-size: var(--font-size-xs);
    color: var(--muted);
  }
  
  .batch-reg-input {
    width: 100%;
    padding: var(--space-3);
    font-size: var(--font-size-sm);
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    margin-top: var(--space-2);
    transition: all var(--transition);
  }
  
  .batch-reg-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  
  /* Preview */
  .batch-reg-preview {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: rgba(72, 187, 120, 0.06);
    border-radius: var(--radius-md);
    flex-wrap: wrap;
  }
  
  .preview-label {
    font-size: var(--font-size-xs);
    color: var(--muted);
    font-weight: 600;
  }
  
  .preview-names {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
  
  .preview-name {
    font-size: var(--font-size-xs);
    color: var(--accent);
    padding: 2px var(--space-2);
    background: var(--bg);
    border-radius: var(--radius-sm);
  }

  /* === Narrow: compact layout === */
  @media (max-width: 250px) {
    .batch-reg-card {
      margin: var(--space-1);
    }
    .batch-reg-header {
      padding: var(--space-2);
    }
    .batch-reg-body {
      padding: var(--space-2);
    }
    .batch-reg-status {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-2);
    }
    .batch-reg-progress-ring {
      width: 48px;
      height: 48px;
      align-self: center;
    }
  }
`;
