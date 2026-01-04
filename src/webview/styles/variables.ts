/**
 * CSS Variables - Design tokens
 * Fully adaptive from 100px to 1000px width
 * Theme: Dark Mode with Glassmorphism
 */

export const variables = `
  :root {
    /* === Brand Colors === */
    --accent: #48bb78;
    --accent-hover: #68d391;
    --accent-dim: rgba(72, 187, 120, 0.12);
    --accent-glow: rgba(72, 187, 120, 0.4);
    --danger: #f56565;
    --danger-dim: rgba(245, 101, 101, 0.12);
    --warning: #ecc94b;
    --warning-dim: rgba(236, 201, 75, 0.12);
    --success: #48bb78;
    
    /* === Dark Theme (Glassmorphism) === */
    --bg: #121212;
    --bg-elevated: rgba(255, 255, 255, 0.04);
    --bg-hover: rgba(255, 255, 255, 0.08);
    --bg-active: rgba(72, 187, 120, 0.15);
    --fg: #f0f0f0;
    --fg-secondary: #b0b0b0;
    --muted: #888888;
    --border: rgba(255, 255, 255, 0.08);
    --border-strong: rgba(255, 255, 255, 0.15);
    --input-bg: rgba(255, 255, 255, 0.06);
    --input-border: rgba(255, 255, 255, 0.12);
    
    /* Glass effect */
    --glass-bg: rgba(255, 255, 255, 0.03);
    --glass-border: rgba(255, 255, 255, 0.08);
    --glass-blur: blur(12px);
    
    /* === Fluid Typography (100px - 1000px) === */
    --font-size-xs: clamp(9px, 1vw + 6px, 11px);
    --font-size-sm: clamp(10px, 1.2vw + 6px, 12px);
    --font-size-base: clamp(11px, 1.4vw + 6px, 13px);
    --font-size-md: clamp(12px, 1.6vw + 6px, 14px);
    --font-size-lg: clamp(14px, 2vw + 6px, 16px);
    --font-size-xl: clamp(16px, 2.5vw + 6px, 20px);
    --font-size-2xl: clamp(20px, 4vw + 6px, 28px);
    --font-size-hero: clamp(24px, 8vw + 4px, 48px);
    
    /* === Fluid Spacing (scales with viewport) === */
    --space-1: clamp(2px, 0.4vw + 1px, 4px);
    --space-2: clamp(4px, 0.8vw + 2px, 8px);
    --space-3: clamp(6px, 1.2vw + 3px, 12px);
    --space-4: clamp(8px, 1.6vw + 4px, 16px);
    --space-5: clamp(10px, 2vw + 5px, 20px);
    --space-6: clamp(12px, 2.4vw + 6px, 24px);
    --space-8: clamp(16px, 3.2vw + 8px, 32px);
    
    /* === Adaptive Padding (main container) === */
    --padding-main: clamp(4px, 2vw, 16px);
    --padding-card: clamp(6px, 2.5vw, 16px);
    --padding-section: clamp(8px, 3vw, 20px);
    
    /* === Touch-friendly sizes (fixed for usability) === */
    --touch-target: 44px;
    --button-min-height: 32px;
    --input-min-height: 32px;
    --toggle-width: 36px;
    --toggle-height: 20px;
    
    /* === Icon sizes (fluid) === */
    --icon-xs: clamp(10px, 1.5vw + 6px, 14px);
    --icon-sm: clamp(12px, 2vw + 6px, 16px);
    --icon-md: clamp(14px, 2.5vw + 6px, 20px);
    --icon-lg: clamp(18px, 3vw + 8px, 24px);
    
    /* === Border Radius === */
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-full: 9999px;
    
    /* === Transitions === */
    --transition-fast: 0.1s ease;
    --transition: 0.15s ease;
    --transition-normal: 0.2s ease;
    --transition-slow: 0.3s ease;
    
    /* === Shadows === */
    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
    --shadow-glow: 0 0 20px rgba(72, 187, 120, 0.3);
    
    /* === Z-index layers === */
    --z-base: 1;
    --z-dropdown: 10;
    --z-sticky: 20;
    --z-drawer: 50;
    --z-fab: 80;
    --z-overlay: 100;
    --z-modal: 200;
    --z-dialog: 300;
    --z-toast: 400;
    
    /* === Grid breakpoints (for JS detection) === */
    --bp-narrow: 250px;
    --bp-medium: 500px;
    --bp-wide: 750px;
  }
`;
