/**
 * Strategy styles - Selection cards with risk indicators
 */

export const strategyStyles = `
  /* === Strategy Selection === */
  .strategy-option {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-4);
    border: 2px solid var(--glass-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-normal);
    margin-bottom: var(--space-3);
    position: relative;
  }
  
  .strategy-option:hover {
    border-color: var(--accent);
    background: var(--glass-bg);
  }
  
  .strategy-option.selected {
    border-color: var(--accent);
    background: rgba(72, 187, 120, 0.05);
  }
  
  .strategy-option.strategy-safe.selected {
    border-color: #48bb78;
    background: rgba(72, 187, 120, 0.08);
  }
  
  .strategy-option.strategy-risky.selected {
    border-color: #ed8936;
    background: rgba(237, 137, 54, 0.08);
  }
  
  .strategy-option input[type="radio"] {
    margin-top: 2px;
    cursor: pointer;
    accent-color: var(--accent);
  }
  
  /* Strategy Icon */
  .strategy-icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .strategy-icon-safe {
    background: rgba(72, 187, 120, 0.15);
    border: 1px solid rgba(72, 187, 120, 0.3);
  }
  
  .strategy-icon-risky {
    background: rgba(237, 137, 54, 0.15);
    border: 1px solid rgba(237, 137, 54, 0.3);
  }
  
  .strategy-icon {
    font-size: var(--font-size-xl);
  }
  
  .strategy-content {
    flex: 1;
    min-width: 0;
  }
  
  .strategy-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    flex-wrap: wrap;
  }
  
  .strategy-desc {
    font-size: var(--font-size-sm);
    color: var(--muted);
    margin-bottom: var(--space-3);
    line-height: 1.4;
  }
  
  .strategy-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  /* === Strategy Features === */
  .strategy-features {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    margin-bottom: var(--space-3);
  }
  
  .strategy-feature {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--font-size-xs);
  }
  
  .strategy-feature .feature-icon {
    width: var(--space-3);
    height: var(--space-3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: bold;
  }
  
  .strategy-feature.feature-pro .feature-icon {
    background: rgba(72, 187, 120, 0.2);
    color: #48bb78;
  }
  
  .strategy-feature.feature-pro {
    color: #48bb78;
  }
  
  .strategy-feature.feature-con .feature-icon {
    background: rgba(237, 137, 54, 0.2);
    color: #ed8936;
  }
  
  .strategy-feature.feature-con {
    color: #ed8936;
  }

  /* === Risk Bar === */
  .strategy-risk-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--glass-border);
  }
  
  .risk-label {
    font-size: var(--font-size-xs);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  
  .risk-meter {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }
  
  .risk-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  
  .risk-fill.risk-low {
    background: linear-gradient(90deg, #48bb78, #68d391);
  }
  
  .risk-fill.risk-medium {
    background: linear-gradient(90deg, #ed8936, #f6ad55);
  }
  
  .risk-fill.risk-high {
    background: linear-gradient(90deg, #ed8936, #f56565);
  }
  
  .risk-value {
    font-size: var(--font-size-xs);
    font-weight: 600;
    min-width: 45px;
    text-align: right;
  }
  
  .risk-low-text { color: #48bb78; }
  .risk-medium-text { color: #ed8936; }
  .risk-high-text { color: #f56565; }

  /* === Badge === */
  .badge {
    display: inline-block;
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: 500;
    white-space: nowrap;
  }
  
  .badge-success {
    background: rgba(72, 187, 120, 0.2);
    color: #48bb78;
  }
  
  .badge-warning {
    background: rgba(237, 137, 54, 0.2);
    color: #ed8936;
  }
  
  .badge-danger {
    background: rgba(245, 101, 101, 0.2);
    color: #f56565;
  }
  
  .badge-info {
    background: rgba(99, 179, 237, 0.2);
    color: #63b3ed;
  }

  /* === Narrow: compact strategy cards === */
  @media (max-width: 250px) {
    .strategy-option {
      flex-direction: column;
      padding: var(--space-3);
    }
    .strategy-icon-wrapper {
      width: 36px;
      height: 36px;
    }
    .strategy-icon {
      font-size: var(--font-size-md);
    }
    .strategy-features {
      display: none;
    }
  }
`;
