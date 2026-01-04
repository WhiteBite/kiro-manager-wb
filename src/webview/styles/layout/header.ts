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
