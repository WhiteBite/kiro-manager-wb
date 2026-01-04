/**
 * Settings styles - Accordion sections with vertical stack
 * Toggles aligned right, fixed size for touch
 */

export const settingsStyles = `
  /* === Settings Container === */
  .settings-content {
    padding: var(--padding-section);
    overflow-y: auto;
    flex: 1;
  }
  
  /* === Setting Row === */
  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) 0;
    border-bottom: 1px solid var(--border);
    gap: var(--space-3);
  }
  
  .setting-row:last-child { 
    border-bottom: none; 
  }
  
  .setting-info {
    flex: 1;
    min-width: 0;
  }
  
  .setting-label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--fg);
  }
  
  .setting-desc {
    font-size: var(--font-size-xs);
    color: var(--muted);
    margin-top: 2px;
  }

  /* === Settings Card (Accordion) === */
  .settings-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-3);
    overflow: hidden;
    transition: all var(--transition);
  }
  
  .settings-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
    width: 100%; /* Full width clickable */
    transition: background var(--transition);
  }
  
  .settings-card-header:hover {
    background: var(--bg-hover);
  }
  
  .settings-card-icon {
    font-size: var(--font-size-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--space-6);
    height: var(--space-6);
    background: var(--bg-hover);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }
  
  .settings-card-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
    flex: 1;
    color: var(--fg);
  }
  
  .settings-card-toggle {
    transition: transform 0.2s ease;
    color: var(--muted);
    font-size: var(--font-size-xs);
    flex-shrink: 0;
  }
  
  .settings-card.collapsed .settings-card-toggle {
    transform: rotate(-90deg);
  }
  
  .settings-card.collapsed .settings-card-body {
    display: none;
  }
  
  .settings-card-body {
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  /* === Import/Export Section === */
  .import-export-section {
    margin-top: var(--space-4);
    padding: var(--space-4);
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.06) 0%, transparent 100%);
    border: 1px solid rgba(72, 187, 120, 0.2);
    border-radius: var(--radius-lg);
  }
  
  .import-export-section .section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  
  .import-export-section .section-icon {
    font-size: var(--font-size-md);
  }
  
  .import-export-section .section-title {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }
  
  .import-export-section .section-desc {
    font-size: var(--font-size-xs);
    color: var(--muted);
    margin-bottom: var(--space-3);
  }
  
  .import-export-actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  
  .import-export-actions .btn {
    flex: 1;
    min-width: 100px;
  }

  /* === Danger Zone === */
  .danger-zone-section {
    margin-top: var(--space-6);
    padding-top: var(--space-4);
    border-top: 1px dashed rgba(245, 101, 101, 0.3);
  }
  
  .danger-zone-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  
  .danger-zone-icon {
    font-size: var(--font-size-md);
  }
  
  .danger-zone-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--danger);
  }
  
  .danger-zone-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    background: linear-gradient(135deg, rgba(245, 101, 101, 0.06) 0%, transparent 100%);
    border: 1px solid rgba(245, 101, 101, 0.2);
    border-radius: var(--radius-lg);
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  
  .danger-zone-card:hover {
    border-color: rgba(245, 101, 101, 0.4);
  }
  
  .danger-zone-info {
    flex: 1;
    min-width: 120px;
  }
  
  .danger-zone-label {
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--fg);
    margin-bottom: var(--space-1);
  }
  
  .danger-zone-desc {
    font-size: var(--font-size-xs);
    color: var(--muted);
    line-height: 1.4;
  }
  
  .danger-zone-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  
  .danger-zone-card + .danger-zone-card {
    margin-top: var(--space-3);
  }

  /* === Patch Status === */
  .patch-status-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    flex-wrap: wrap;
  }
  
  .patch-status {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
  }
  
  .patch-status.success {
    color: var(--accent);
    background: var(--accent-dim);
  }
  
  .patch-status.warning {
    color: var(--warning);
    background: var(--warning-dim);
  }
  
  .patch-status.error {
    color: var(--danger);
    background: var(--danger-dim);
  }

  /* === Settings Footer === */
  .settings-footer {
    padding: var(--space-3);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  
  .settings-version {
    font-size: var(--font-size-xs);
    color: var(--muted);
  }

  /* === Wide: multi-column settings === */
  @media (min-width: 600px) {
    .settings-card-body {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }
    .setting-row {
      grid-column: span 1;
    }
    .setting-row.full-width {
      grid-column: 1 / -1;
    }
  }
`;
