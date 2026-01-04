/**
 * Hero styles - Balance/Status card with fluid container
 * Progress bar uses width: 100% of parent
 */

export const heroStyles = `
  /* === Hero Dashboard === */
  .hero {
    margin: var(--space-2) var(--padding-main);
    padding: var(--padding-card);
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(72, 187, 120, 0.02) 100%);
    border: 1px solid rgba(72, 187, 120, 0.25);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-normal);
    flex-shrink: 0;
  }
  
  .hero:hover {
    border-color: rgba(72, 187, 120, 0.4);
    box-shadow: var(--shadow-glow);
    transform: translateY(-1px);
  }
  
  .hero.empty {
    background: var(--glass-bg);
    border-color: var(--glass-border);
    text-align: center;
  }
  
  .hero.warning {
    background: linear-gradient(135deg, rgba(236, 201, 75, 0.12) 0%, rgba(236, 201, 75, 0.02) 100%);
    border-color: rgba(236, 201, 75, 0.4);
  }
  
  .hero.critical {
    background: linear-gradient(135deg, rgba(245, 101, 101, 0.12) 0%, rgba(245, 101, 101, 0.02) 100%);
    border-color: rgba(245, 101, 101, 0.4);
    animation: criticalPulse 2s ease-in-out infinite;
  }
  
  @keyframes criticalPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(245, 101, 101, 0.3); }
    50% { box-shadow: 0 0 0 4px rgba(245, 101, 101, 0.1); }
  }
  
  /* === Hero Main Value === */
  .hero-main {
    text-align: center;
    padding: var(--space-2) 0;
  }
  
  .hero-value {
    display: block;
    font-size: var(--font-size-hero);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -1px;
    color: var(--accent);
  }
  
  .hero-value.low { color: var(--accent); }
  .hero-value.medium { color: var(--warning); }
  .hero-value.high { color: var(--danger); }
  
  .hero-label {
    display: block;
    font-size: var(--font-size-xs);
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: var(--space-2);
  }
  
  /* === Progress Bar (100% width) === */
  .hero-progress {
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    margin-top: var(--space-3);
  }
  
  .hero-progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  
  .hero-progress-fill.low { 
    background: linear-gradient(90deg, var(--accent), var(--accent-hover)); 
  }
  .hero-progress-fill.medium { 
    background: linear-gradient(90deg, var(--warning), #f6e05e); 
  }
  .hero-progress-fill.high { 
    background: linear-gradient(90deg, var(--danger), #fc8181); 
  }
  
  /* === Hero Footer Stats - Two Column Layout === */
  .hero-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    font-size: var(--font-size-xs);
    color: var(--muted);
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  
  .hero-stat {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  
  .hero-stat-icon {
    font-size: var(--font-size-sm);
    opacity: 0.7;
  }
  
  .hero-stat-value {
    font-weight: 600;
    color: var(--fg);
  }
  
  .hero-stat-label {
    color: var(--muted);
    font-size: 10px;
  }
  
  .hero-percent {
    font-weight: 700;
    color: var(--accent);
  }
  
  /* === Step Indicators === */
  .step-indicators {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    margin: var(--space-3) 0;
    padding: var(--space-3) var(--space-2);
    background: var(--bg-elevated);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
  }
  
  .step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2);
    min-width: 32px;
  }
  
  .step-icon {
    font-size: var(--font-size-md);
    opacity: 0.4;
    transition: all 0.3s ease;
  }
  
  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--muted);
    opacity: 0.3;
    transition: all 0.3s ease;
  }
  
  .step-line {
    flex: 1;
    height: 2px;
    background: var(--muted);
    opacity: 0.2;
    min-width: 8px;
    max-width: 24px;
  }
  
  .step-indicator.done .step-icon { opacity: 1; }
  .step-indicator.done .step-dot { 
    background: var(--accent); 
    opacity: 1;
    box-shadow: 0 0 8px var(--accent-glow);
  }
  
  .step-indicator.active .step-icon { 
    opacity: 1; 
    animation: stepPulse 1s ease-in-out infinite;
  }
  .step-indicator.active .step-dot { 
    background: var(--accent); 
    opacity: 1;
    animation: glow 1s ease-in-out infinite;
  }
  
  .step-indicator.error .step-dot { 
    background: var(--danger); 
    opacity: 1;
  }
  
  @keyframes stepPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
  
  /* === Narrow: compact hero === */
  @media (max-width: 250px) {
    .hero {
      margin: var(--space-1);
      padding: var(--space-2);
    }
    .hero-value { font-size: clamp(20px, 12vw, 28px); }
    .hero-label { font-size: 9px; letter-spacing: 0.5px; }
    .hero-footer { display: none; }
    .step-indicators { display: none; }
  }
  
  /* === Wide: expanded hero === */
  @media (min-width: 501px) {
    .hero {
      margin: var(--space-3) var(--space-4);
      padding: var(--space-5);
    }
    .hero-value { font-size: clamp(32px, 6vw, 48px); }
    .hero-progress { height: 8px; }
  }
`;
