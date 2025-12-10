/**
 * State management for webview
 */

export type FilterType = 'all' | 'valid' | 'expired';
export type SortType = 'email' | 'usage' | 'expiry';

export interface WebviewState {
  filter: FilterType;
  sort: SortType;
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

// State store with persistence
class StateStore {
  private state: WebviewState;
  private listeners: Set<(state: WebviewState) => void> = new Set();

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): WebviewState {
    try {
      const saved = localStorage.getItem('kiro-webview-state');
      return saved ? { ...DEFAULT_STATE, ...JSON.parse(saved) } : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  }

  private saveState(): void {
    try {
      localStorage.setItem('kiro-webview-state', JSON.stringify(this.state));
    } catch {}
  }

  getState(): WebviewState {
    return { ...this.state };
  }

  setState(partial: Partial<WebviewState>): void {
    this.state = { ...this.state, ...partial };
    this.saveState();
    this.notify();
  }

  subscribe(listener: (state: WebviewState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

export const store = new StateStore();

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
