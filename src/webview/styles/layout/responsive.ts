/**
 * Responsive styles - Global breakpoint adjustments
 * 
 * Breakpoints:
 * - Ultra-narrow: < 150px (minimal mode)
 * - Narrow: 150px - 250px (Stream Deck mode - icons only)
 * - Medium: 250px - 500px (Standard sidebar)
 * - Wide: 500px - 1000px (Dashboard with grid)
 */

export const responsiveStyles = `
  /* === Ultra-Narrow (< 150px): Minimal survival mode === */
  @media (max-width: 150px) {
    :root {
      --padding-main: 2px;
      --padding-card: 4px;
    }
    
    /* Extreme compression */
    .header { padding: 2px; gap: 2px; }
    .header-title { display: none; }
    .header-badge { display: none; }
    
    .tab-bar { padding: 2px; }
    .tab-item { padding: 4px; min-width: 24px; }
    .tab-label, .tab-badge { display: none !important; }
    
    .hero { margin: 2px; padding: 4px; }
    .hero-value { font-size: 16px; }
    .hero-label { font-size: 8px; }
    .hero-footer { display: none; }
    .hero-progress { height: 4px; }
    
    .toolbar { padding: 2px; }
    .search-wrapper { display: none; }
    .filter-group { display: none; }
    
    .account { padding: 4px; gap: 4px; }
    .account-avatar { width: 20px; height: 20px; font-size: 8px; }
    .account-email { font-size: 9px; }
    .account-meta { display: none; }
    .account-actions { gap: 2px; }
    .account-btn { width: 24px; height: 24px; min-width: 24px; }
    
    .console-drawer { transform: translateY(100%); }
  }
  
  /* === Narrow (150px - 250px): Stream Deck mode === */
  @media (min-width: 151px) and (max-width: 250px) {
    :root {
      --padding-main: 4px;
      --padding-card: 6px;
      --padding-section: 8px;
    }
    
    /* Hide all text labels */
    .btn .btn-text,
    .tab-label,
    .filter-label,
    .header-badge,
    .strategy-sw-btn .sw-label {
      display: none !important;
    }
    
    /* Stack LLM buttons vertically */
    .btn-group {
      flex-direction: column;
    }
    .btn-group .btn {
      width: 100%;
      max-width: none;
    }
    
    /* Compact everything */
    .header { padding: var(--space-1) var(--space-2); }
    .header-title { font-size: 11px; max-width: 80px; }
    
    .toolbar { padding: var(--space-1); }
    .toolbar-row { flex-direction: column; gap: var(--space-1); }
    
    .hero { margin: var(--space-1); padding: var(--space-2); }
    .hero-footer { display: none; }
    
    .account { padding: var(--space-2); }
    .account-meta { font-size: 9px; }
    
    body { font-size: 11px; }
  }
  
  /* === Medium (250px - 500px): Standard sidebar === */
  @media (min-width: 251px) and (max-width: 500px) {
    :root {
      --padding-main: 8px;
      --padding-card: 10px;
      --padding-section: 12px;
    }
    
    /* Show labels on wider medium screens */
    @media (min-width: 350px) {
      .tab-label { display: inline; }
      .btn .btn-text { display: inline; }
    }
    
    /* Hero footer visible */
    .hero-footer { display: grid; }
  }
  
  /* === Wide (500px - 750px): Dashboard mode === */
  @media (min-width: 501px) and (max-width: 750px) {
    :root {
      --padding-main: 12px;
      --padding-card: 14px;
      --padding-section: 16px;
    }
    
    /* 2-column grid for accounts */
    .list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }
    
    .list-group {
      grid-column: 1 / -1;
    }
    
    .account {
      margin-bottom: 0;
    }
    
    /* Settings in 2 columns */
    .settings-card-body {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }
    
    .setting-row.full-width {
      grid-column: 1 / -1;
    }
    
    /* Constrain button widths */
    .btn:not(.btn-block) {
      max-width: 180px;
    }
  }
  
  /* === Extra Wide (750px+): Full dashboard === */
  @media (min-width: 751px) {
    :root {
      --padding-main: 16px;
      --padding-card: 16px;
      --padding-section: 20px;
    }
    
    /* 3-column grid for accounts */
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-4);
    }
    
    /* Stats in 4 columns */
    .stats-cards {
      grid-template-columns: repeat(4, 1fr);
    }
    
    /* Batch reg settings in 2 columns */
    .batch-reg-settings {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);
    }
    
    .batch-reg-field.full-width {
      grid-column: 1 / -1;
    }
    
    /* Wider modals */
    .modal {
      max-width: 520px;
    }
    
    /* Constrain button widths more */
    .btn:not(.btn-block) {
      max-width: 160px;
    }
  }
  
  /* === Touch Device Adjustments === */
  @media (hover: none) {
    /* Always show action buttons */
    .account-actions,
    .profile-actions,
    .profile-card-actions {
      opacity: 1 !important;
    }
    
    /* Larger touch targets */
    .btn {
      min-height: 40px;
    }
    
    .icon-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
    }
    
    .account-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
    }
    
    /* Disable hover transforms */
    .btn:hover,
    .account:hover,
    .settings-card-header:hover {
      transform: none;
    }
  }
  
  /* === High Contrast Mode === */
  @media (prefers-contrast: high) {
    :root {
      --border: rgba(255, 255, 255, 0.25);
      --border-strong: rgba(255, 255, 255, 0.5);
      --muted: #b0b0b0;
    }
    
    .btn {
      border: 1px solid currentColor;
    }
    
    .account {
      border-width: 2px;
    }
  }
  
  /* === Reduced Motion === */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  
  /* === Print Styles === */
  @media print {
    .console-drawer,
    .toast-container,
    .modal-overlay,
    .dialog-overlay {
      display: none !important;
    }
    
    body {
      background: white;
      color: black;
    }
  }
`;
