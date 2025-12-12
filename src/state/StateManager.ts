/**
 * StateManager - Centralized state management for UI updates
 * Handles incremental updates instead of full re-renders
 */

import * as vscode from 'vscode';
import { AccountInfo } from '../types';
import { KiroUsageData } from '../utils';

export interface AppState {
  accounts: AccountInfo[];
  activeAccount: AccountInfo | null;
  kiroUsage: KiroUsageData | null;
  isLoading: boolean;
  lastRefresh: number;
  autoRegStatus: string;
}

export type StateUpdateType = 
  | 'accounts'
  | 'usage'
  | 'activeAccount'
  | 'status'
  | 'full';

export interface StateUpdate {
  type: StateUpdateType;
  data: Partial<AppState>;
}

type StateListener = (update: StateUpdate) => void;

export class StateManager {
  private _state: AppState;
  private _listeners: Set<StateListener> = new Set();
  private _debounceTimer: NodeJS.Timeout | null = null;
  private _pendingUpdates: StateUpdate[] = [];
  private _debounceMs: number = 100;

  constructor() {
    this._state = {
      accounts: [],
      activeAccount: null,
      kiroUsage: null,
      isLoading: false,
      lastRefresh: 0,
      autoRegStatus: ''
    };
  }

  get state(): Readonly<AppState> {
    return this._state;
  }

  // Subscribe to state changes
  subscribe(listener: StateListener): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // Update accounts only
  updateAccounts(accounts: AccountInfo[]): void {
    this._state.accounts = accounts;
    this._state.activeAccount = accounts.find(a => a.isActive) || null;
    this._queueUpdate({ type: 'accounts', data: { accounts, activeAccount: this._state.activeAccount } });
  }

  // Update usage only
  updateUsage(usage: KiroUsageData | null): void {
    this._state.kiroUsage = usage;
    this._queueUpdate({ type: 'usage', data: { kiroUsage: usage } });
  }

  // Update active account
  updateActiveAccount(account: AccountInfo | null): void {
    this._state.activeAccount = account;
    this._queueUpdate({ type: 'activeAccount', data: { activeAccount: account } });
  }

  // Update auto-reg status
  updateStatus(status: string): void {
    this._state.autoRegStatus = status;
    this._queueUpdate({ type: 'status', data: { autoRegStatus: status } });
  }

  // Full state update
  updateFull(state: Partial<AppState>): void {
    Object.assign(this._state, state);
    this._state.lastRefresh = Date.now();
    this._queueUpdate({ type: 'full', data: state });
  }

  // Set loading state
  setLoading(isLoading: boolean): void {
    this._state.isLoading = isLoading;
  }

  // Queue update with debouncing
  private _queueUpdate(update: StateUpdate): void {
    this._pendingUpdates.push(update);
    
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      this._flushUpdates();
    }, this._debounceMs);
  }

  // Flush all pending updates
  private _flushUpdates(): void {
    if (this._pendingUpdates.length === 0) return;

    // Merge updates of the same type
    const mergedUpdates = this._mergeUpdates(this._pendingUpdates);
    this._pendingUpdates = [];

    // Notify listeners
    for (const update of mergedUpdates) {
      this._listeners.forEach(listener => listener(update));
    }
  }

  // Merge updates to reduce re-renders
  private _mergeUpdates(updates: StateUpdate[]): StateUpdate[] {
    const merged: Map<StateUpdateType, StateUpdate> = new Map();

    for (const update of updates) {
      if (update.type === 'full') {
        // Full update replaces everything
        merged.clear();
        merged.set('full', update);
      } else if (!merged.has('full')) {
        // Merge partial updates
        const existing = merged.get(update.type);
        if (existing) {
          existing.data = { ...existing.data, ...update.data };
        } else {
          merged.set(update.type, update);
        }
      }
    }

    return Array.from(merged.values());
  }

  // Force immediate flush
  flush(): void {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    this._flushUpdates();
  }
}

// Singleton instance
let _instance: StateManager | null = null;

export function getStateManager(): StateManager {
  if (!_instance) {
    _instance = new StateManager();
  }
  return _instance;
}
