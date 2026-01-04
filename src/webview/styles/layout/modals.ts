/**
 * Modal styles - Overlay, Dialog, Modal
 * Centered with backdrop blur
 */

export const modalsStyles = `
  /* === Overlay (Full Screen) === */
  .overlay {
    position: fixed;
    inset: 0;
    background: var(--bg);
    z-index: var(--z-overlay);
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
    gap: var(--space-3);
    padding: var(--space-3) var(--padding-main);
    background: linear-gradient(180deg, var(--bg-elevated) 0%, transparent 100%);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  
  .overlay-back {
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    font-weight: 600;
    font-family: inherit;
    background: transparent;
    border: none;
    color: var(--accent);
    cursor: pointer;
    transition: all var(--transition);
  }
  
  .overlay-back:hover { 
    color: var(--accent-hover); 
  }
  
  .overlay-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    flex: 1;
  }
  
  .overlay-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--padding-section);
  }
  
  .overlay-footer {
    padding: var(--space-3) var(--padding-main);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-elevated);
    flex-shrink: 0;
  }
  
  .overlay-version {
    font-size: var(--font-size-xs);
    color: var(--muted);
  }

  /* === Modal === */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: var(--z-modal);
    display: none;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
    animation: fadeIn 0.15s ease;
  }
  
  .modal-overlay.visible { display: flex; }
  
  .modal {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 400px;
    max-height: 90vh;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
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
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border);
  }
  
  .modal-title {
    font-size: var(--font-size-md);
    font-weight: 600;
  }
  
  .modal-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: var(--font-size-lg);
    border-radius: var(--radius-sm);
    transition: all var(--transition);
  }
  
  .modal-close:hover {
    background: var(--danger-dim);
    color: var(--danger);
  }
  
  .modal-body { 
    padding: var(--space-4);
    overflow-y: auto;
    max-height: 60vh;
  }
  
  .modal-hint {
    font-size: var(--font-size-xs);
    color: var(--muted);
    line-height: 1.6;
    margin-bottom: var(--space-3);
  }
  
  .modal-textarea {
    width: 100%;
    min-height: 80px;
    padding: var(--space-3);
    font-size: var(--font-size-xs);
    font-family: 'JetBrains Mono', monospace;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    resize: vertical;
    margin-bottom: var(--space-3);
  }
  
  .modal-textarea:focus {
    outline: none;
    border-color: var(--accent);
  }
  
  .modal-footer {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
    padding: var(--space-3) var(--space-4);
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  /* === Dialog (Confirmation) === */
  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: var(--z-dialog);
    display: none;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  }
  
  .dialog-overlay.visible { display: flex; }
  
  .dialog {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    width: 100%;
    max-width: 320px;
    box-shadow: var(--shadow-lg);
    animation: modalSlideIn 0.2s ease;
  }
  
  .dialog-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin-bottom: var(--space-2);
  }
  
  .dialog-text {
    font-size: var(--font-size-sm);
    color: var(--muted);
    margin-bottom: var(--space-4);
    line-height: 1.5;
  }
  
  .dialog-actions {
    display: flex;
    gap: var(--space-2);
    justify-content: flex-end;
  }

  /* === Narrow: full-width modals === */
  @media (max-width: 250px) {
    .modal, .dialog {
      max-width: none;
      border-radius: 0;
      max-height: 100vh;
    }
    .modal-body {
      max-height: calc(100vh - 120px);
    }
  }
`;
