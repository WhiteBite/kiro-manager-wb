/**
 * Base styles - Reset, typography, scrollbar, animations, utilities
 * Fully responsive from 100px to 1000px
 */

export const base = `
  /* === Reset === */
  *, *::before, *::after { 
    box-sizing: border-box; 
    margin: 0; 
    padding: 0; 
  }
  
  html, body { 
    height: 100%; 
    overflow: hidden; 
    background: var(--bg);
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: var(--font-size-base);
    line-height: 1.5;
    color: var(--fg);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* === App Container === */
  .app { 
    display: flex; 
    flex-direction: column; 
    height: 100%;
    width: 100%;
    min-width: 100px;
    max-width: 100%;
    overflow: hidden;
  }

  /* === Scrollbars (thin, dark, rounded) === */
  ::-webkit-scrollbar { 
    width: 6px; 
    height: 6px;
  }
  ::-webkit-scrollbar-track { 
    background: transparent;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb { 
    background: rgba(255, 255, 255, 0.12);
    border-radius: 3px;
    border: 1px solid transparent;
    background-clip: padding-box;
  }
  ::-webkit-scrollbar-thumb:hover { 
    background: rgba(255, 255, 255, 0.2);
    background-clip: padding-box;
  }
  ::-webkit-scrollbar-thumb:active {
    background: var(--accent);
    background-clip: padding-box;
  }
  ::-webkit-scrollbar-corner {
    background: transparent;
  }
  
  /* Firefox */
  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
  }
  
  /* List scrollbar - accent tinted */
  .list::-webkit-scrollbar-thumb {
    background: rgba(72, 187, 120, 0.2);
  }
  .list::-webkit-scrollbar-thumb:hover {
    background: rgba(72, 187, 120, 0.35);
  }
  
  /* Console scrollbar */
  .console-body::-webkit-scrollbar {
    width: 4px;
  }
  .console-body::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
  }

  /* === Animations === */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 4px var(--accent-glow); }
    50% { box-shadow: 0 0 12px var(--accent-glow); }
  }
  
  .animate-fade-in { animation: fadeIn 0.2s ease-out; }
  .animate-slide-in { animation: slideIn 0.2s ease-out; }
  .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }

  /* === Text Utilities === */
  .hidden { display: none !important; }
  .text-muted { color: var(--muted); }
  .text-accent { color: var(--accent); }
  .text-danger { color: var(--danger); }
  .text-warning { color: var(--warning); }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-mono { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  .font-medium { font-weight: 500; }
  .font-semibold { font-weight: 600; }
  .font-bold { font-weight: 700; }
  .truncate { 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
  }
  
  /* === Spacing Utilities === */
  .m-0 { margin: 0; }
  .m-1 { margin: var(--space-1); }
  .m-2 { margin: var(--space-2); }
  .m-3 { margin: var(--space-3); }
  .m-4 { margin: var(--space-4); }
  
  .mt-1 { margin-top: var(--space-1); }
  .mt-2 { margin-top: var(--space-2); }
  .mt-3 { margin-top: var(--space-3); }
  .mt-4 { margin-top: var(--space-4); }
  
  .mb-1 { margin-bottom: var(--space-1); }
  .mb-2 { margin-bottom: var(--space-2); }
  .mb-3 { margin-bottom: var(--space-3); }
  .mb-4 { margin-bottom: var(--space-4); }
  
  .p-0 { padding: 0; }
  .p-1 { padding: var(--space-1); }
  .p-2 { padding: var(--space-2); }
  .p-3 { padding: var(--space-3); }
  .p-4 { padding: var(--space-4); }
  
  .px-2 { padding-left: var(--space-2); padding-right: var(--space-2); }
  .px-3 { padding-left: var(--space-3); padding-right: var(--space-3); }
  .py-2 { padding-top: var(--space-2); padding-bottom: var(--space-2); }
  .py-3 { padding-top: var(--space-3); padding-bottom: var(--space-3); }
  
  .gap-1 { gap: var(--space-1); }
  .gap-2 { gap: var(--space-2); }
  .gap-3 { gap: var(--space-3); }
  .gap-4 { gap: var(--space-4); }
  
  /* === Flex Utilities === */
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-row { flex-direction: row; }
  .flex-wrap { flex-wrap: wrap; }
  .flex-1 { flex: 1; min-width: 0; }
  .items-center { align-items: center; }
  .items-start { align-items: flex-start; }
  .items-end { align-items: flex-end; }
  .justify-center { justify-content: center; }
  .justify-between { justify-content: space-between; }
  .justify-end { justify-content: flex-end; }
  
  /* === Width/Height === */
  .w-full { width: 100%; }
  .h-full { height: 100%; }
  .min-w-0 { min-width: 0; }
  
  /* === Border Utilities === */
  .rounded-sm { border-radius: var(--radius-sm); }
  .rounded-md { border-radius: var(--radius-md); }
  .rounded-lg { border-radius: var(--radius-lg); }
  .rounded-full { border-radius: var(--radius-full); }
  
  /* === Overflow === */
  .overflow-hidden { overflow: hidden; }
  .overflow-auto { overflow: auto; }
  .overflow-y-auto { overflow-y: auto; overflow-x: hidden; }
  
  /* === Cursor === */
  .cursor-pointer { cursor: pointer; }
  .cursor-default { cursor: default; }
  
  /* === Transitions === */
  .transition { transition: all var(--transition); }
  .transition-colors { 
    transition: color var(--transition), 
                background-color var(--transition), 
                border-color var(--transition); 
  }
`;
