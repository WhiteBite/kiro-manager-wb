/**
 * Usage Service - Manages Kiro usage data and caching
 * Handles usage refresh, caching, and account usage tracking
 */

import { KiroUsageData, getKiroUsageFromDB, clearUsageCache, invalidateAccountUsage } from '../utils';
import { updateActiveAccountUsage, loadSingleAccountUsage } from '../accounts';
import { AccountInfo } from '../types';

export interface UsageRefreshOptions {
    maxRetries?: number;
    retryDelays?: number[];
    onRetry?: (attempt: number, maxRetries: number) => void;
}

const DEFAULT_OPTIONS: Required<UsageRefreshOptions> = {
    maxRetries: 3,
    retryDelays: [500, 1000, 2000],
    onRetry: () => { }
};

export class UsageService {
    private static _instance: UsageService;
    private _currentUsage: KiroUsageData | null = null;
    private _listeners: Set<(usage: KiroUsageData | null) => void> = new Set();

    private constructor() { }

    static getInstance(): UsageService {
        if (!UsageService._instance) {
            UsageService._instance = new UsageService();
        }
        return UsageService._instance;
    }

    /**
     * Get current cached usage
     */
    getCurrent(): KiroUsageData | null {
        return this._currentUsage;
    }

    /**
     * Refresh usage from Kiro DB
     */
    async refresh(): Promise<KiroUsageData | null> {
        try {
            this._currentUsage = await getKiroUsageFromDB();
            this._notifyListeners();
            return this._currentUsage;
        } catch (err) {
            console.error('Failed to refresh usage:', err);
            this._currentUsage = null;
            this._notifyListeners();
            return null;
        }
    }

    /**
     * Refresh usage after account switch with retry logic
     */
    async refreshAfterSwitch(
        oldAccountName: string | null,
        newAccountName: string,
        options: UsageRefreshOptions = {}
    ): Promise<KiroUsageData | null> {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Clear caches
        clearUsageCache();

        // Invalidate old account's usage
        if (oldAccountName) {
            invalidateAccountUsage(oldAccountName);
        }

        // Reset current usage
        this._currentUsage = null;
        this._notifyListeners();

        // Retry loop
        for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
            const delay = opts.retryDelays[attempt] || opts.retryDelays[opts.retryDelays.length - 1];

            // Wait for Kiro to update its DB
            await this._delay(delay);

            // Try to load usage
            const usage = await getKiroUsageFromDB();

            if (usage) {
                this._currentUsage = usage;
                updateActiveAccountUsage(newAccountName, usage);
                this._notifyListeners();
                return usage;
            }

            // Notify about retry
            if (attempt < opts.maxRetries) {
                opts.onRetry(attempt + 1, opts.maxRetries);
                console.log(`Usage not ready, retrying (${attempt + 1}/${opts.maxRetries})...`);
            }
        }

        return null;
    }

    /**
     * Update usage for active account
     */
    updateForAccount(accountName: string, usage: KiroUsageData): void {
        this._currentUsage = usage;
        updateActiveAccountUsage(accountName, usage);
        this._notifyListeners();
    }

    /**
     * Load usage for a specific account from cache
     */
    async loadForAccount(accountName: string): Promise<KiroUsageData | null> {
        return loadSingleAccountUsage(accountName);
    }

    /**
     * Invalidate usage cache for an account
     */
    invalidateAccount(accountName: string): void {
        invalidateAccountUsage(accountName);
    }

    /**
     * Clear all usage caches
     */
    clearCache(): void {
        clearUsageCache();
        this._currentUsage = null;
        this._notifyListeners();
    }

    /**
     * Subscribe to usage changes
     */
    subscribe(listener: (usage: KiroUsageData | null) => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    /**
     * Apply usage data to account
     */
    applyToAccount(account: AccountInfo, usage: KiroUsageData): void {
        account.usage = {
            currentUsage: usage.currentUsage,
            usageLimit: usage.usageLimit,
            percentageUsed: usage.percentageUsed,
            daysRemaining: usage.daysRemaining,
            loading: false
        };
    }

    private _notifyListeners(): void {
        this._listeners.forEach(listener => {
            try {
                listener(this._currentUsage);
            } catch (err) {
                console.error('Usage listener error:', err);
            }
        });
    }

    private _delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton getter
export function getUsageService(): UsageService {
    return UsageService.getInstance();
}
