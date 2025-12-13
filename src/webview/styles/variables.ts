/**
 * CSS Variables - Design tokens
 */

export const variables = `
  :root {
    /* Colors */
    --accent: #3fb68b;
    --accent-hover: #4ec9a0;
    --accent-dim: rgba(63, 182, 139, 0.12);
    --accent-glow: rgba(63, 182, 139, 0.4);
    --danger: #e55353;
    --danger-dim: rgba(229, 83, 83, 0.12);
    --warning: #d9a334;
    --warning-dim: rgba(217, 163, 52, 0.12);
    --success: #3fb68b;
    
    /* VS Code integration */
    --muted: var(--vscode-descriptionForeground, #888);
    --border: var(--vscode-panel-border, rgba(128,128,128,0.2));
    --bg: var(--vscode-sideBar-background);
    --bg-hover: var(--vscode-list-hoverBackground);
    --bg-active: var(--vscode-list-activeSelectionBackground);
    --bg-elevated: rgba(255,255,255,0.03);
    --fg: var(--vscode-foreground);
    --input-bg: var(--vscode-input-background);
    --input-border: var(--vscode-input-border, rgba(128,128,128,0.3));
    
    /* Glass effect */
    --glass-bg: rgba(255,255,255,0.02);
    --glass-border: rgba(255,255,255,0.08);
    
    /* Spacing & Radius */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 10px;
    
    /* Transitions */
    --transition: 0.15s ease;
    --transition-normal: 0.2s ease;
  }
`;
