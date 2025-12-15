/**
 * API Adapter Factory
 * Automatically selects the right adapter based on environment
 */

export { ApiAdapter, ApiMessage } from './types';
export { VSCodeAdapter } from './vscode';
export { WebAdapter } from './web';

import { ApiAdapter } from './types';
import { VSCodeAdapter } from './vscode';
import { WebAdapter } from './web';

let instance: ApiAdapter | null = null;

/**
 * Get the API adapter instance
 * Creates VS Code adapter if running in extension, Web adapter otherwise
 */
export function getApi(): ApiAdapter {
    if (!instance) {
        // Check if we're in VS Code webview
        const isVSCode = typeof acquireVsCodeApi !== 'undefined';
        instance = isVSCode ? new VSCodeAdapter() : new WebAdapter();
    }
    return instance;
}

/**
 * Initialize API with specific adapter (for testing)
 */
export function initApi(adapter: ApiAdapter): void {
    instance = adapter;
}

// Type declaration for VS Code API
declare function acquireVsCodeApi(): unknown;
