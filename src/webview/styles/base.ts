/**
 * Base styles - Reset, typography, scrollbar
 */

export const base = `
  /* Reset */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; background-color: #1e1e1e; }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    color: var(--fg, #cccccc);
    background: var(--bg, #1e1e1e);
    background-color: #1e1e1e;
    display: flex;
    flex-direction: column;
  }
  
  .app { 
    display: flex; 
    flex-direction: column; 
    height: 100%; 
    overflow: hidden; /* Don't scroll the whole app */
  }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { 
    background: rgba(128,128,128,0.25); 
    border-radius: 4px; 
  }
  ::-webkit-scrollbar-thumb:hover { 
    background: rgba(128,128,128,0.4); 
  }

  /* Utility classes */
  .hidden { display: none !important; }
  .text-muted { color: var(--muted); }
  .text-accent { color: var(--accent); }
  .text-danger { color: var(--danger); }
  .font-mono { font-family: var(--vscode-editor-font-family, monospace); }
`;
