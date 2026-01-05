/**
 * Header styles - Navigation bar with adaptive layout
 * Narrow: icons only, space-between
 * Wide: icons + text
 */

export const headerStyles = `
  /* === Header Container === */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--padding-main);
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    min-height: 40px;
    gap: var(--space-2);
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    flex: 1;
  }
  
  .header-title {
    font-size: var(--font-size-md);
    font-weight: 700;
    color: var(--fg);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .header-badge {
    font-size: var(--font-size-xs);
    font-weight: 600;
    padding: 2px var(--space-2);
    background: var(--accent-dim);
    color: var(--accent);
    border-radius: var(--radius-full);
    flex-shrink: 0;
  }
  
  /* === Patch Status Indicator === */
  .patch-indicator {
    display: none;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .patch-indicator.visible {
    display: inline-block;
  }
  
  .patch-indicator.patched {
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }
  
  .patch-indicator.needs-update {
    background: var(--warning);
    box-shadow: 0 0 6px var(--warning);
    animation: pulse 2s ease-in-out infinite;
  }
  
  .patch-indicator.not-patched {
    background: var(--muted);
    opacity: 0.5;
  }
  
  .patch-indicator.error {
    background: var(--danger);
    box-shadow: 0 0 6px var(--danger);
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }
  
  .header-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }
  
  /* === Narrow: hide text, show icons only === */
  @media (max-width: 250px) {
    .header {
      padding: var(--space-1) var(--space-2);
      min-height: 36px;
    }
    .header-title { 
      font-size: var(--font-size-sm);
      max-width: 60px;
    }
    .header-badge { display: none; }
    .header-actions .btn-text { display: none; }
  }
  
  /* === Medium: standard sidebar === */
  @media (min-width: 251px) and (max-width: 500px) {
    .header-title { max-width: 120px; }
  }
  
  /* === Wide: full layout === */
  @media (min-width: 501px) {
    .header {
      padding: var(--space-3) var(--space-4);
    }
    .header-title { 
      font-size: var(--font-size-lg);
      max-width: none;
    }
  }
`;
