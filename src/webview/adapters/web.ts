/**
 * Standalone Web Adapter
 * Uses WebSocket to communicate with Python Flask backend
 */

import { ApiAdapter, ApiMessage } from './types';

export class WebAdapter implements ApiAdapter {
    private ws: WebSocket | null = null;
    private messageHandler?: (msg: ApiMessage) => void;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private messageQueue: Array<{ command: string; data?: Record<string, unknown> }> = [];

    constructor(wsUrl?: string) {
        const url = wsUrl || `ws://${window.location.host}/ws`;
        this.connect(url);
    }

    private connect(url: string): void {
        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                // Send queued messages
                while (this.messageQueue.length > 0) {
                    const msg = this.messageQueue.shift();
                    if (msg) this.sendCommand(msg.command, msg.data);
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (this.messageHandler) {
                        this.messageHandler(msg);
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.tryReconnect(url);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (e) {
            console.error('Failed to connect WebSocket:', e);
            this.tryReconnect(url);
        }
    }

    private tryReconnect(url: string): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
            setTimeout(() => this.connect(url), delay);
        }
    }

    sendCommand(command: string, data?: Record<string, unknown>): void {
        const msg = JSON.stringify({ command, ...data });

        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(msg);
        } else {
            // Queue message for when connection is ready
            this.messageQueue.push({ command, data });
        }
    }

    onMessage(handler: (msg: ApiMessage) => void): void {
        this.messageHandler = handler;
    }

    isVSCode(): boolean {
        return false;
    }

    getPlatform(): 'vscode' | 'web' {
        return 'web';
    }
}
