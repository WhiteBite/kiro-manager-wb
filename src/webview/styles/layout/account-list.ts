/**
 * Account List styles - Cards with adaptive grid
 * Narrow: single column, actions below name
 * Wide: grid layout (2-3 columns)
 */

export const accountListStyles = `
  /* === Account List Container === */
  .list {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--padding-main);
    padding-bottom: 120px; /* Space for console drawer */
  }
  
  /* === Grid Layout for Wide Screens === */
  @media (min-width: 500px) {
    .list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: var(--space-3);
      align-content: start;
    }
    .list-group {
      grid-column: 1 / -1;
    }
  }
  
  /* === List Group Header === */
  .list-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-1);
    font-size: var(--font-size-xs);
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-left: 3px solid transparent;
    margin-left: -3px;
    padding-left: calc(var(--space-1) + 3px);
  }
  
  /* Status color markers */
  .list-group.active-group { 
    color: var(--accent);
    border-left-color: var(--accent);
    background: linear-gradient(90deg, rgba(72, 187, 120, 0.08) 0%, transparent 50%);
  }
  .list-group.ready-group { 
    color: var(--muted);
    border-left-color: #718096;
  }
  .list-group.danger { 
    color: var(--danger);
    border-left-color: var(--danger);
    background: linear-gradient(90deg, rgba(245, 101, 101, 0.08) 0%, transparent 50%);
  }
  .list-group.warning { 
    color: var(--warning);
    border-left-color: var(--warning);
    background: linear-gradient(90deg, rgba(236, 201, 75, 0.08) 0%, transparent 50%);
  }
  .list-group.expired-group {
    color: var(--warning);
    border-left-color: var(--warning);
    background: linear-gradient(90deg, rgba(236, 201, 75, 0.08) 0%, transparent 50%);
  }
  
  .list-group-count {
    padding: 2px var(--space-2);
    background: var(--bg-elevated);
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
  }
  
  .list-group-action {
    margin-left: auto;
    padding: var(--space-1) var(--space-2);
    font-size: var(--font-size-xs);
    font-weight: 600;
    background: var(--danger-dim);
    color: var(--danger);
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all var(--transition);
  }
  
  .list-group-action:hover {
    background: var(--danger);
    color: #fff;
  }

  /* === Account Card === */
  .account {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-3);
    margin-bottom: var(--space-2);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition-normal);
    position: relative;
    min-width: 0;
  }
  
  .account:hover {
    border-color: rgba(72, 187, 120, 0.5);
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(72, 187, 120, 0.02) 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(72, 187, 120, 0.2);
  }
  
  .account:active {
    transform: scale(0.99);
  }
  
  /* Account States */
  .account.active {
    border-color: var(--accent);
    background: linear-gradient(135deg, rgba(72, 187, 120, 0.12) 0%, rgba(72, 187, 120, 0.02) 100%);
    box-shadow: 0 0 12px var(--accent-glow);
  }
  
  .account.expired { 
    border-color: var(--warning);
    background: linear-gradient(135deg, rgba(236, 201, 75, 0.08) 0%, transparent 100%);
  }
  
  .account.exhausted { 
    border-color: #ed8936;
    background: linear-gradient(135deg, rgba(237, 137, 54, 0.08) 0%, transparent 100%);
  }
  
  .account.banned {
    border-color: var(--danger);
    background: linear-gradient(135deg, rgba(245, 101, 101, 0.12) 0%, transparent 100%);
    opacity: 0.7;
  }
  
  .account.banned::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--danger);
  }
  
  /* === Account Avatar === */
  .account-avatar {
    position: relative;
    width: clamp(28px, 8vw, 36px);
    height: clamp(28px, 8vw, 36px);
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-xs);
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }
  
  .account.expired .account-avatar { 
    background: linear-gradient(135deg, #718096 0%, #4a5568 100%); 
  }
  .account.banned .account-avatar { 
    background: linear-gradient(135deg, var(--danger) 0%, #fc8181 100%); 
  }
  
  .account-status {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--bg);
  }
  
  .account-status.active { 
    background: var(--accent); 
    box-shadow: 0 0 6px var(--accent); 
  }
  .account-status.ready { background: #718096; }
  .account-status.expired { background: var(--warning); }
  .account-status.banned { background: var(--danger); }
  
  /* === Account Info === */
  .account-info { 
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  
  .account-email {
    font-size: var(--font-size-sm);
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .account-meta {
    display: flex;
    gap: var(--space-2);
    margin-top: 2px;
    font-size: var(--font-size-xs);
    color: var(--muted);
    flex-wrap: wrap;
  }
  
  .account-meta span {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    white-space: nowrap;
  }
  
  .account-meta svg { 
    width: var(--icon-xs);
    height: var(--icon-xs);
  }
  
  /* === Account Actions === */
  .account-actions {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity var(--transition);
  }
  
  .account:hover .account-actions { opacity: 1; }
  
  /* Larger hit area for action buttons */
  .account-btn {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    cursor: pointer;
    color: var(--muted);
    transition: all var(--transition);
    padding: 0;
  }
  
  .account-btn:hover {
    background: var(--bg-hover);
    color: var(--fg);
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .account-btn:active {
    transform: scale(0.95);
  }
  
  .account-btn.danger:hover {
    background: var(--danger-dim);
    border-color: var(--danger);
    color: var(--danger);
  }

  .account-btn.danger.confirm-delete {
    background: linear-gradient(135deg, var(--danger) 0%, #fc8181 100%);
    border-color: var(--danger);
    color: #fff;
    box-shadow: 0 0 0 2px rgba(245, 101, 101, 0.25), 0 6px 18px rgba(245, 101, 101, 0.25);
    animation: confirmDeletePulse 1s ease-in-out infinite;
  }

  .account-btn.danger.confirm-delete:hover {
    transform: scale(1.12);
    box-shadow: 0 0 0 2px rgba(245, 101, 101, 0.35), 0 10px 22px rgba(245, 101, 101, 0.35);
  }

  @keyframes confirmDeletePulse {
    0%, 100% { filter: brightness(1); }
    50% { filter: brightness(1.08); }
  }
  
  .account-btn svg { 
    width: 14px;
    height: 14px;
  }
  
  /* Touch devices: even larger buttons */
  @media (hover: none) {
    .account-btn {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
    }
    .account-btn svg {
      width: 18px;
      height: 18px;
    }
  }

  /* === Empty State === */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--space-8) var(--space-4);
    color: var(--muted);
  }
  
  .empty-illustration {
    margin-bottom: var(--space-4);
    opacity: 0.8;
    animation: float 3s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  
  .empty-title {
    font-size: var(--font-size-md);
    font-weight: 600;
    color: var(--fg);
    margin-bottom: var(--space-2);
  }
  
  .empty-desc {
    font-size: var(--font-size-sm);
    color: var(--muted);
    max-width: 220px;
    line-height: 1.5;
    margin-bottom: var(--space-4);
  }

  /* === Narrow: stack actions below === */
  @media (max-width: 200px) {
    .account {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-2);
    }
    .account-actions {
      justify-content: flex-end;
      opacity: 1;
    }
  }
  
  /* === Touch devices: always show actions === */
  @media (hover: none) {
    .account-actions { opacity: 1 !important; }
  }
  
  /* === Wide: grid mode === */
  @media (min-width: 500px) {
    .account {
      margin-bottom: 0;
    }
  }
`;
