/**
 * Component styles - Buttons, inputs, cards
 */

export const components = `
  /* === Buttons === */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 14px;
    font-size: 11px;
    font-family: inherit;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-normal);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn svg { width: 14px; height: 14px; flex-shrink: 0; }
  
  .btn-primary {
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    color: #fff;
    box-shadow: 0 2px 12px rgba(63,182,139,0.3);
  }
  .btn-primary:hover:not(:disabled) { 
    transform: translateY(-2px); 
    box-shadow: 0 6px 20px rgba(63,182,139,0.4);
  }
  
  .btn-secondary {
    background: var(--glass-bg);
    backdrop-filter: blur(8px);
    color: var(--fg);
    border: 1px solid var(--glass-border);
  }
  .btn-secondary:hover:not(:disabled) { 
    background: rgba(128,128,128,0.15); 
    border-color: var(--border);
    transform: translateY(-1px);
  }
  
  .btn-danger { 
    background: linear-gradient(135deg, var(--danger) 0%, #f06b6b 100%); 
    color: #fff; 
  }
  
  .btn-icon { padding: 8px 10px; }

  /* === Icon Button === */
  .icon-btn {
    width: 28px; 
    height: 28px;
    display: flex; 
    align-items: center; 
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--muted);
    transition: all var(--transition);
  }
  .icon-btn:hover { 
    background: var(--bg-elevated); 
    border-color: var(--border); 
    color: var(--fg);
    transform: scale(1.05);
  }
  .icon-btn svg { width: 14px; height: 14px; }

  /* === Inputs === */
  .form-group { margin-bottom: 14px; }
  .form-group:last-child { margin-bottom: 0; }
  
  .form-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--fg);
  }
  
  .form-input {
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    outline: none;
    transition: all var(--transition);
  }
  .form-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(63,182,139,0.15);
  }
  .form-input::placeholder { color: var(--muted); }
  
  .form-hint {
    font-size: 10px;
    color: var(--muted);
    margin-top: 4px;
  }
  
  .form-row {
    display: flex;
    gap: 10px;
  }
  .form-row .flex-1 { flex: 1; }
  .form-row .flex-2 { flex: 2; }

  /* === Toggle === */
  .toggle {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
  }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(128,128,128,0.3);
    border-radius: 10px;
    transition: all var(--transition);
  }
  .toggle-slider::before {
    content: '';
    position: absolute;
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background: #fff;
    border-radius: 50%;
    transition: all var(--transition);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .toggle input:checked + .toggle-slider { background: var(--accent); }
  .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }

  /* === Spinner === */
  .spinner {
    width: 14px; 
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* === Select === */
  .select {
    padding: 6px 28px 6px 10px;
    font-size: 11px;
    font-family: inherit;
    font-weight: 500;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-sm);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    transition: all var(--transition);
  }
  .select:hover { border-color: var(--accent); }

  /* === Patch Indicator === */
  .patch-indicator {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    font-size: 10px;
    border-radius: 50%;
    cursor: pointer;
    transition: all var(--transition);
    opacity: 0;
  }
  .patch-indicator.visible { opacity: 1; }
  .patch-indicator.patched {
    background: var(--accent-dim);
    color: var(--accent);
  }
  .patch-indicator.patched::after { content: '🔧'; font-size: 9px; }
  .patch-indicator.not-patched {
    background: var(--warning-dim, rgba(229, 192, 123, 0.15));
    color: var(--warning);
  }
  .patch-indicator.not-patched::after { content: '⚠'; font-size: 9px; }
  .patch-indicator.error {
    background: var(--danger-dim);
    color: var(--danger);
  }
  .patch-indicator.error::after { content: '✗'; font-size: 9px; }
  .patch-indicator:hover {
    transform: scale(1.1);
  }
`;
