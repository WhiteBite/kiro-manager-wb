/**
 * CSS Variables - Design tokens
 * Fixed dark theme - same everywhere (VS Code extension & standalone)
 */

export const variables = `
  :root {
    /* Brand Colors */
    --accent: #3fb68b;
    --accent-hover: #4ec9a0;
    --accent-dim: rgba(63, 182, 139, 0.12);
    --accent-glow: rgba(63, 182, 139, 0.4);
    --danger: #e55353;
    --danger-dim: rgba(229, 83, 83, 0.12);
    --warning: #d9a334;
    --warning-dim: rgba(217, 163, 52, 0.12);
    --success: #3fb68b;
    
    /* Fixed Dark Theme - same everywhere */
    --muted: #888888;
    --border: rgba(128, 128, 128, 0.2);
    --bg: #1e1e1e;
    --bg-hover: rgba(255, 255, 255, 0.05);
    --bg-active: rgba(63, 182, 139, 0.2);
    --bg-elevated: rgba(255, 255, 255, 0.03);
    --fg: #cccccc;
    --input-bg: #3c3c3c;
    --input-border: rgba(128, 128, 128, 0.3);
    
    /* Glass effect */
    --glass-bg: rgba(255, 255, 255, 0.02);
    --glass-border: rgba(255, 255, 255, 0.08);
    
    /* Spacing & Radius */
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 10px;
    
    /* Transitions */
    --transition: 0.15s ease;
    --transition-normal: 0.2s ease;
    --transition-slow: 0.3s ease;
    
    /* Shadows */
    --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
    
    /* Z-index layers */
    --z-base: 1;
    --z-dropdown: 10;
    --z-sticky: 20;
    --z-drawer: 50;
    --z-fab: 80;
    --z-overlay: 100;
    --z-modal: 200;
    --z-dialog: 300;
    --z-toast: 400;
  }
`;
