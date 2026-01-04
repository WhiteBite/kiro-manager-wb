/**
 * Stats styles - Dashboard with adaptive grid
 */

export const statsStyles = `
  /* === Stats Dashboard === */
  .stats-dashboard {
    padding: var(--padding-section);
  }
  
  .stats-header {
    margin-bottom: var(--space-4);
  }
  
  .stats-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    margin: 0;
  }
  
  /* === Stats Cards Grid === */
  .stats-cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }
  
  .stat-card {
    padding: var(--space-3);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    text-align: center;
    transition: all var(--transition);
  }
  
  .stat-card:hover {
    border-color: var(--border-strong);
  }
  
  .stat-card.success { border-color: rgba(72, 187, 120, 0.3); }
  .stat-card.danger { border-color: rgba(245, 101, 101, 0.3); }
  .stat-card.warning { border-color: rgba(236, 201, 75, 0.3); }
  
  .stat-value {
    font-size: var(--font-size-xl);
    font-weight: 700;
    line-height: 1;
  }
  
  .stat-card.success .stat-value { color: var(--accent); }
  .stat-card.danger .stat-value { color: var(--danger); }
  .stat-card.warning .stat-value { color: var(--warning); }
  
  .stat-label {
    font-size: var(--font-size-xs);
    color: var(--muted);
    text-transform: uppercase;
    margin-top: var(--space-1);
  }

  /* === Stats Sections === */
  .stats-section {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    margin-bottom: var(--space-3);
  }
  
  .stats-section-title {
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    margin-bottom: var(--space-3);
  }

  /* === Usage Overview === */
  .usage-overview {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  
  .usage-bar-container {
    flex: 1;
    min-width: 100px;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  
  .usage-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-hover));
    border-radius: var(--radius-sm);
    transition: width 0.3s ease;
  }
  
  .usage-numbers {
    font-size: var(--font-size-sm);
    font-weight: 600;
    white-space: nowrap;
  }
  
  .usage-current { color: var(--accent); }
  .usage-separator { color: var(--muted); margin: 0 2px; }
  .usage-limit { color: var(--muted); }
  
  .usage-avg {
    font-size: var(--font-size-xs);
    color: var(--muted);
    margin-top: var(--space-2);
    width: 100%;
  }
  
  .usage-avg strong { color: var(--fg); }

  /* === Mini Chart === */
  .mini-chart {
    display: flex;
    align-items: flex-end;
    gap: var(--space-1);
    height: 60px;
    padding: var(--space-1) 0;
  }
  
  .chart-bar {
    flex: 1;
    background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dim) 100%);
    border-radius: 2px 2px 0 0;
    min-height: var(--space-1);
    transition: height 0.3s ease;
  }
  
  .chart-bar:hover {
    background: var(--accent);
  }
  
  .chart-labels {
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: var(--muted);
    margin-top: var(--space-1);
  }

  /* === Health Bars === */
  .health-bars {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  
  .health-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .health-label {
    font-size: var(--font-size-xs);
    width: 60px;
    white-space: nowrap;
    flex-shrink: 0;
  }
  
  .health-bar {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .health-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  
  .health-fill.success { background: var(--accent); }
  .health-fill.danger { background: var(--danger); }
  .health-fill.warning { background: var(--warning); }
  
  .health-percent {
    font-size: var(--font-size-xs);
    font-weight: 600;
    width: 32px;
    text-align: right;
    flex-shrink: 0;
  }

  /* === Wide: 4-column grid === */
  @media (min-width: 500px) {
    .stats-cards {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  
  /* === Narrow: single column === */
  @media (max-width: 250px) {
    .stats-cards {
      grid-template-columns: 1fr;
    }
    .stat-card {
      padding: var(--space-2);
    }
    .stat-value {
      font-size: var(--font-size-lg);
    }
  }
`;
