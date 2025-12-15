/**
 * Abstract API adapter interface
 * Allows same UI to work in VS Code extension and standalone web app
 */

export interface ApiAdapter {
    /** Send command to backend */
    sendCommand(command: string, data?: Record<string, unknown>): void;

    /** Subscribe to messages from backend */
    onMessage(handler: (msg: { type: string;[key: string]: unknown }) => void): void;

    /** Check if running in VS Code */
    isVSCode(): boolean;

    /** Get platform info */
    getPlatform(): 'vscode' | 'web';
}

export interface ApiMessage {
    type: string;
    [key: string]: unknown;
}
