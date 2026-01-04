/**
 * Component styles - Buttons, inputs, toggles, cards
 * Fully responsive with touch-friendly sizes
 */

export const components = `
  /* === Buttons === */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    min-height: var(--button-min-height);
    font-size: var(--font-size-sm);
    font-family: inherit;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }
  
  .btn:disabled { 
    opacity: 0.5; 
    cursor: not-allowed; 
    pointer-events: none;
  }
  
  .btn:hover:not(:disabled) { 
    transform: translateY(-1px); 
  }
  
  .btn:active:not(:disabled) { 
    transform: translateY(0) scale(0.98); 
  }
  
  .btn svg { 
    width: var(--icon-sm); 
    height: var(--icon-sm); 
    flex-shrink: 0; 
  }
  
  /* Button text - hide on narrow screens */
  .btn .btn-text {
    display: inline;
  }
  
  /* Ultra-narrow: icon-only buttons */
  @media (max-width: 200px) {
    .btn .btn-text { display: none; }
    .btn { 
      padding: var(--space-2); 
      min-width: var(--button-min-height);
      max-width: var(--button-min-height);
    }
  }
  
  @media (max-width: 250px) {
    .btn .btn-text { display: none; }
    .btn { padding: var(--space-2); min-width: var(--button-min-height); }
  }
  
  /* Wide view: constrain button width */
  @media (min-width: 500px) {
    .btn:not(.btn-block) {
      max-width: 200px;
    }
  }
  
  .btn-primary {
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(72, 187, 120, 0.3);
  }
  .btn-primary:hover:not(:disabled) { 
    box-shadow: 0 4px 16px rgba(72, 187, 120, 0.4);
  }
  
  .btn-secondary {
    background: var(--glass-bg);
    color: var(--fg);
    border: 1px solid var(--glass-border);
    backdrop-filter: var(--glass-blur);
  }
  .btn-secondary:hover:not(:disabled) { 
    background: var(--bg-hover);
    border-color: var(--border-strong);
  }
  
  .btn-danger { 
    background: linear-gradient(135deg, var(--danger) 0%, #fc8181 100%);
    color: #fff;
    box-shadow: 0 2px 8px rgba(245, 101, 101, 0.3);
  }
  .btn-danger:hover:not(:disabled) { 
    box-shadow: 0 4px 16px rgba(245, 101, 101, 0.4);
  }
  
  .btn-warning {
    background: linear-gradient(135deg, var(--warning) 0%, #f6e05e 100%);
    color: #1a1a1a;
    box-shadow: 0 2px 8px rgba(236, 201, 75, 0.3);
  }
  .btn-warning:hover:not(:disabled) {
    box-shadow: 0 4px 16px rgba(236, 201, 75, 0.4);
  }
  
  .btn-ghost {
    background: transparent;
    color: var(--muted);
    border: 1px solid transparent;
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--fg);
  }
  
  .btn-sm {
    padding: var(--space-1) var(--space-2);
    min-height: 28px;
    font-size: var(--font-size-xs);
  }
  
  .btn-lg {
    padding: var(--space-3) var(--space-5);
    min-height: 40px;
    font-size: var(--font-size-md);
  }
  
  .btn-block {
    width: 100%;
  }
  
  .btn-full {
    width: 100%;
  }
  
  /* Icon-only button variant */
  .btn.btn-icon {
    padding: var(--space-2);
    min-width: var(--button-min-height);
    width: var(--button-min-height);
    max-width: var(--button-min-height);
  }
  
  .btn.btn-icon svg {
    width: var(--icon-sm);
    height: var(--icon-sm);
  }

  /* === Icon Button === */
  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--button-min-height);
    height: var(--button-min-height);
    min-width: var(--button-min-height);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;
    color: var(--muted);
    transition: all var(--transition);
  }
  
  .icon-btn:hover { 
    background: var(--bg-hover);
    border-color: var(--border);
    color: var(--fg);
  }
  
  .icon-btn:active { 
    transform: scale(0.95);
  }
  
  .icon-btn svg { 
    width: var(--icon-sm);
    height: var(--icon-sm);
  }
  
  .icon-btn.active {
    background: var(--accent-dim);
    color: var(--accent);
    border-color: var(--accent);
  }

  /* === Inputs === */
  .form-group { 
    margin-bottom: var(--space-3);
    width: 100%;
  }
  .form-group:last-child { margin-bottom: 0; }
  
  .form-label {
    display: block;
    font-size: var(--font-size-xs);
    font-weight: 600;
    margin-bottom: var(--space-1);
    color: var(--fg);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .form-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    min-height: var(--input-min-height);
    font-size: var(--font-size-sm);
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    outline: none;
    transition: all var(--transition);
  }
  
  .form-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  
  .form-input::placeholder { 
    color: var(--muted); 
  }
  
  .form-hint {
    font-size: var(--font-size-xs);
    color: var(--muted);
    margin-top: var(--space-1);
  }
  
  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  
  .form-row > * {
    flex: 1;
    min-width: 80px;
  }

  /* === Toggle (fixed size for touch) === */
  .toggle {
    position: relative;
    display: inline-block;
    width: var(--toggle-width);
    height: var(--toggle-height);
    flex-shrink: 0;
  }
  
  .toggle input { 
    opacity: 0; 
    width: 0; 
    height: 0; 
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: rgba(255, 255, 255, 0.15);
    border-radius: var(--toggle-height);
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
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .toggle input:checked + .toggle-slider { 
    background: var(--accent); 
  }
  
  .toggle input:checked + .toggle-slider::before { 
    transform: translateX(16px); 
  }

  /* === Select === */
  .select {
    width: 100%;
    padding: var(--space-2) var(--space-6) var(--space-2) var(--space-3);
    min-height: var(--input-min-height);
    font-size: var(--font-size-sm);
    font-family: inherit;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--space-3) center;
    transition: all var(--transition);
  }
  
  .select:hover { 
    border-color: var(--accent); 
  }
  
  .select:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  /* === Number Input === */
  .input-number {
    width: 70px;
    padding: var(--space-2);
    min-height: var(--input-min-height);
    font-size: var(--font-size-sm);
    font-family: inherit;
    font-weight: 600;
    text-align: center;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    transition: all var(--transition);
  }
  
  .input-number:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }

  /* === Card === */
  .card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--padding-card);
    transition: all var(--transition);
  }
  
  .card:hover {
    border-color: var(--border-strong);
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--space-3);
  }
  
  .card-title {
    font-size: var(--font-size-md);
    font-weight: 600;
  }

  /* === Badge === */
  .badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 600;
    border-radius: var(--radius-full);
    white-space: nowrap;
  }
  
  .badge-success {
    background: var(--accent-dim);
    color: var(--accent);
  }
  
  .badge-warning {
    background: var(--warning-dim);
    color: var(--warning);
  }
  
  .badge-danger {
    background: var(--danger-dim);
    color: var(--danger);
  }

  /* === Spinner === */
  .spinner {
    width: var(--icon-sm);
    height: var(--icon-sm);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  @keyframes spin { 
    to { transform: rotate(360deg); } 
  }

  /* === Tooltip === */
  .tooltip {
    position: relative;
  }
  
  .tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: var(--space-2) var(--space-3);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
    color: #fff;
    background: #2a2a2a;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s ease, visibility 0s linear 0.2s;
    z-index: var(--z-toast);
  }
  
  .tooltip:hover::after {
    opacity: 1;
    visibility: visible;
    transition-delay: 0.3s, 0.3s;
  }
  
  /* Tooltip for icon-only buttons */
  .icon-btn[data-tooltip]::after,
  .account-btn[data-tooltip]::after {
    font-size: 10px;
    padding: 4px 8px;
  }

  /* === Button Group (equal width) === */
  .btn-group {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  
  .btn-group .btn {
    flex: 1;
    min-width: 80px;
  }
  
  /* Stack vertically on narrow */
  @media (max-width: 200px) {
    .btn-group {
      flex-direction: column;
    }
    .btn-group .btn {
      width: 100%;
      max-width: none;
    }
  }

  /* === Focus States === */
  .form-input:focus,
  .form-control:focus,
  .select:focus,
  .input-number:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-dim);
  }
  
  .btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
`;
