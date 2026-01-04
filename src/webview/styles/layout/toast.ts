/**
 * Toast styles - Notification messages
 */

export const toastStyles = `
  /* === Toast Container === */
  .toast-container {
    position: fixed;
    bottom: 48px;
    left: 50%;
    transform: translateX(-50%);
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    pointer-events: none;
    max-width: calc(100% - var(--space-4));
  }
  
  /* === Toast Message === */
  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    font-size: var(--font-size-sm);
    pointer-events: auto;
    animation: toastSlideIn 0.3s ease;
    max-width: 320px;
  }
  
  @keyframes toastSlideIn {
    from { 
      opacity: 0; 
      transform: translateY(20px) scale(0.95); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0) scale(1); 
    }
  }
  
  .toast.toast-exit {
    animation: toastSlideOut 0.2s ease forwards;
  }
  
  @keyframes toastSlideOut {
    to { 
      opacity: 0; 
      transform: translateY(-10px) scale(0.95); 
    }
  }
  
  .toast-icon {
    font-size: var(--font-size-md);
    flex-shrink: 0;
  }
  
  .toast-message {
    flex: 1;
    min-width: 0;
    word-break: break-word;
  }
  
  .toast-close {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: all var(--transition);
    flex-shrink: 0;
  }
  
  .toast-close:hover {
    background: var(--bg-hover);
    color: var(--fg);
  }
  
  /* Toast Types */
  .toast.success {
    border-color: var(--accent);
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, var(--bg) 100%);
  }
  
  .toast.success .toast-icon {
    color: var(--accent);
  }
  
  .toast.error {
    border-color: var(--danger);
    background: linear-gradient(135deg, rgba(245, 101, 101, 0.1) 0%, var(--bg) 100%);
  }
  
  .toast.error .toast-icon {
    color: var(--danger);
  }
  
  .toast.warning {
    border-color: var(--warning);
    background: linear-gradient(135deg, rgba(236, 201, 75, 0.1) 0%, var(--bg) 100%);
  }
  
  .toast.warning .toast-icon {
    color: var(--warning);
  }
  
  .toast.info {
    border-color: #63b3ed;
    background: linear-gradient(135deg, rgba(99, 179, 237, 0.1) 0%, var(--bg) 100%);
  }
  
  .toast.info .toast-icon {
    color: #63b3ed;
  }
  
  /* === Narrow: full-width toasts === */
  @media (max-width: 250px) {
    .toast-container {
      left: var(--space-2);
      right: var(--space-2);
      transform: none;
      max-width: none;
    }
    .toast {
      max-width: none;
      padding: var(--space-2) var(--space-3);
      font-size: var(--font-size-xs);
    }
  }
`;
