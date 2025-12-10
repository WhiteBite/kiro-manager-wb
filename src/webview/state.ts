/**
 * State management for webview
 */

interface WebviewState {
  filter: string;
  sort: string;
  compact: boolean;
  settingsOpen: boolean;
  searchQuery: string;
  scrollPosition: number;
}

const DEFAULT_STATE: WebviewState = {
  filter: 'all',
  sort: 'email',
  compact: false,
  settingsOpen: false,
  searchQuery: '',
  scrollPosition: 0,
};

// Generate state initialization script for webview
export function generateStateScript(): string {
  return `
    const STATE = ${JSON.stringify(DEFAULT_STATE)};
    
    function getState() { return STATE; }
    
    function setState(partial) {
      Object.assign(STATE, partial);
      try { localStorage.setItem('kiro-state', JSON.stringify(STATE)); } catch {}
    }
    
    function loadState() {
      try {
        const saved = localStorage.getItem('kiro-state');
        if (saved) Object.assign(STATE, JSON.parse(saved));
      } catch {}
    }
    
    loadState();
  `;
}
