/**
 * Application Constants
 * Centralized configuration values and magic numbers
 */

export const CONFIG = {
    // Logging
    MAX_CONSOLE_LOGS: 200,

    // Performance
    RENDER_DEBOUNCE_MS: 50,
    PERF_LOG_THRESHOLD_MS: 50,

    // Usage refresh
    USAGE_REFRESH_MAX_RETRIES: 3,
    USAGE_REFRESH_DELAYS: [500, 1000, 2000] as const,

    // Cache
    CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes

    // UI
    TOAST_DURATION_MS: 3000,
    TOAST_FADE_MS: 200,

    // Accounts
    USAGE_EXHAUSTED_THRESHOLD: 100, // percentage
    USAGE_WARNING_THRESHOLD: 80,
    USAGE_CRITICAL_THRESHOLD: 95,
} as const;

export const PATHS = {
    LOG_DIR: '.kiro-batch-login',
    LOG_FILE: 'autoreg.log',
    AUTOREG_DIR: '.kiro-autoreg',
    PROFILES_FILE: 'imap-profiles.json',
} as const;

export const IMAP_DEFAULTS = {
    PORT: 993,
    TIMEOUT_MS: 10000,
} as const;

// Strategy icons
export const STRATEGY_ICONS = {
    single: '📧',
    plus_alias: '➕',
    catch_all: '🌐',
    pool: '📋',
} as const;

// Provider icons
export const PROVIDER_ICONS = {
    gmail: '🔴',
    yandex: '🟡',
    mailru: '🔵',
    outlook: '🟦',
    custom: '🌐',
} as const;
