/**
 * AutoReg styles - Registration controls with flex-wrap
 */

export const autoRegStyles = `
  /* === AutoReg Controls === */
  .autoreg-controls {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2);
    margin: 0 var(--padding-main) var(--space-2);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    flex-wrap: wrap;
  }
  
  /* Running state */
  .autoreg-controls.running {
    border-color: var(--accent);
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.08) 0%, transparent 100%);
  }
  
  .autoreg-controls.running .btn {
    flex: 1;
    min-width: 60px;
  }
  
  /* Count input */
  .autoreg-count {
    width: 50px;
    height: 32px;
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-sm);
    font-family: inherit;
    font-weight: 600;
    text-align: center;
    background: var(--input-bg);
    color: var(--fg);
    border: 1px solid var(--input-border);
    border-radius: var(--radius-md);
    transition: all var(--transition);
    flex-shrink: 0;
  }
  
  .autoreg-count:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-dim);
  }
  
  .autoreg-count::-webkit-inner-spin-button,
  .autoreg-count::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  
  /* Start button */
  .btn-start {
    height: 32px;
    padding: 0 var(--space-3);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* === Strategy Switch === */
  .strategy-switch {
    display: flex;
    flex: 1;
    min-width: 100px;
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: 2px;
    gap: 2px;
  }
  
  .strategy-sw-btn {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 500;
    font-family: inherit;
    background: transparent;
    color: var(--muted);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    min-width: 0;
  }
  
  .strategy-sw-btn .sw-icon {
    font-size: var(--font-size-sm);
    flex-shrink: 0;
  }
  
  .strategy-sw-btn .sw-label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .strategy-sw-btn:hover:not(.active) {
    color: var(--fg);
  }
  
  .strategy-sw-btn.active {
    background: var(--accent);
    color: #fff;
    box-shadow: var(--shadow-sm);
  }

  /* === Narrow: stack vertically === */
  @media (max-width: 250px) {
    .autoreg-controls {
      padding: var(--space-1);
      margin: 0 var(--space-1) var(--space-1);
      gap: var(--space-1);
    }
    .strategy-switch {
      flex: 1 1 100%;
      order: 1;
    }
    .autoreg-count {
      width: 40px;
      height: 28px;
      font-size: var(--font-size-xs);
      order: 2;
    }
    .btn-start {
      flex: 1;
      height: 28px;
      order: 3;
    }
    .btn-start .btn-text { display: none; }
    .strategy-sw-btn .sw-label { display: none; }
    .strategy-sw-btn { padding: var(--space-2); }
  }
  
  /* === Medium: compact === */
  @media (min-width: 251px) and (max-width: 350px) {
    .strategy-sw-btn .sw-label { display: none; }
  }
`;
