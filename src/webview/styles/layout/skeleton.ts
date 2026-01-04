/**
 * Skeleton styles - Loading states with shimmer effect
 */

export const skeletonStyles = `
  /* === Skeleton Base === */
  .skeleton { 
    pointer-events: none; 
  }
  
  .skeleton-pulse {
    background: linear-gradient(
      90deg, 
      var(--bg-elevated) 25%, 
      rgba(255, 255, 255, 0.08) 50%, 
      var(--bg-elevated) 75%
    );
    background-size: 200% 100%;
    animation: skeletonPulse 1.5s ease-in-out infinite;
  }
  
  @keyframes skeletonPulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  
  /* === Skeleton Variants === */
  .skeleton-line { 
    height: var(--space-3);
    border-radius: var(--radius-sm);
    margin: var(--space-1) 0;
    background: var(--bg-elevated);
  }
  
  .skeleton-line.skeleton-pulse {
    background: linear-gradient(
      90deg, 
      var(--bg-elevated) 25%, 
      rgba(255, 255, 255, 0.08) 50%, 
      var(--bg-elevated) 75%
    );
    background-size: 200% 100%;
  }
  
  .skeleton-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-elevated);
  }
  
  .skeleton-text {
    height: 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-elevated);
  }
  
  .skeleton-text.short { width: 40%; }
  .skeleton-text.medium { width: 60%; }
  .skeleton-text.long { width: 80%; }
  .skeleton-text.full { width: 100%; }
  
  .skeleton-card {
    padding: var(--space-3);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    margin-bottom: var(--space-2);
  }
  
  /* === Account Skeleton === */
  .account.skeleton { 
    opacity: 0.6; 
  }
  
  .account.skeleton .account-avatar { 
    background: var(--bg-elevated);
    animation: skeletonPulse 1.5s ease-in-out infinite;
    background-size: 200% 100%;
    background-image: linear-gradient(
      90deg, 
      var(--bg-elevated) 25%, 
      rgba(255, 255, 255, 0.08) 50%, 
      var(--bg-elevated) 75%
    );
  }
  
  .account.skeleton .account-email,
  .account.skeleton .account-meta {
    background: var(--bg-elevated);
    color: transparent;
    border-radius: var(--radius-sm);
    animation: skeletonPulse 1.5s ease-in-out infinite;
    background-size: 200% 100%;
    background-image: linear-gradient(
      90deg, 
      var(--bg-elevated) 25%, 
      rgba(255, 255, 255, 0.08) 50%, 
      var(--bg-elevated) 75%
    );
  }
  
  /* === Shimmer Effect === */
  .skeleton-shimmer {
    position: relative;
    overflow: hidden;
    background: var(--bg-elevated);
  }
  
  .skeleton-shimmer::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg, 
      transparent, 
      rgba(255, 255, 255, 0.06), 
      transparent
    );
    animation: shimmer 1.5s infinite;
  }
  
  @keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
  
  /* === Skeleton Fade Out === */
  .skeleton-fade-out {
    animation: skeletonFadeOut 0.2s ease forwards;
  }
  
  @keyframes skeletonFadeOut {
    to { 
      opacity: 0; 
      transform: scale(0.95); 
    }
  }
`;
