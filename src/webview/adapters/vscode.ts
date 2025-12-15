/**
 * VS Code Extension Adapter
 * Uses postMessage API to communicate with extension host
 */

import { ApiAdapter, ApiMessage } from './types';

declare function acquireVsCodeApi(): {
    postMessage(msg: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

export class VSCodeAdapter implements ApiAdapter {
    private vscode: ReturnType<typeof acquireVsCodeApi>;
    private messageHandler?: (msg: ApiMessage) => void;

    constructor() {
        this.vscode = acquireVsCodeApi();

        // Listen for messages from extension
        window.addEventListener('message', (event) => {
            if (this.messageHandler) {
                this.messageHandler(event.data);
            }
        });
    }

    sendCommand(command: string, data?: Record<string, unknown>): void {
        this.vscode.postMessage({ command, ...data });
    }

    onMessage(handler: (msg: ApiMessage) => void): void {
        this.messageHandler = handler;
    }

    isVSCode(): boolean {
        return true;
    }

    getPlatform(): 'vscode' | 'web' {
        return 'vscode';
    }
}
