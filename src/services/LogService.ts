/**
 * Log Service - Centralized logging for the extension
 * Handles console logs, file logging, and log management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface LogEntry {
    timestamp: string;
    message: string;
    level: 'info' | 'success' | 'warning' | 'error';
}

export class LogService {
    private static _instance: LogService;
    private _logs: string[] = [];
    private _logFile: string;
    private _maxLogs: number = 200;
    private _listeners: Set<(log: string) => void> = new Set();

    private constructor() {
        const logDir = path.join(os.homedir(), '.kiro-batch-login');
        this._logFile = path.join(logDir, 'autoreg.log');
        this._ensureLogDir(logDir);
    }

    static getInstance(): LogService {
        if (!LogService._instance) {
            LogService._instance = new LogService();
        }
        return LogService._instance;
    }

    private _ensureLogDir(dir: string): void {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        } catch (err) {
            console.error('Failed to create log directory:', err);
        }
    }

    /**
     * Add a log entry
     */
    add(message: string): string {
        const timestamp = new Date().toLocaleTimeString();
        const logLine = `[${timestamp}] ${message}`;

        this._logs.push(logLine);

        // Trim old logs
        if (this._logs.length > this._maxLogs) {
            this._logs = this._logs.slice(-this._maxLogs);
        }

        // Write to file
        this._writeToFile(logLine);

        // Notify listeners
        this._notifyListeners(logLine);

        return logLine;
    }

    /**
     * Add success log
     */
    success(message: string): string {
        return this.add(`✓ ${message}`);
    }

    /**
     * Add error log
     */
    error(message: string): string {
        return this.add(`✗ ${message}`);
    }

    /**
     * Add warning log
     */
    warn(message: string): string {
        return this.add(`⚠ ${message}`);
    }

    /**
     * Add info log
     */
    info(message: string): string {
        return this.add(`ℹ ${message}`);
    }

    /**
     * Get all logs
     */
    getAll(): string[] {
        return [...this._logs];
    }

    /**
     * Get recent logs
     */
    getRecent(count: number = 100): string[] {
        return this._logs.slice(-count);
    }

    /**
     * Clear all logs
     */
    clear(): void {
        this._logs = [];
        this._clearFile();
    }

    /**
     * Get log file path
     */
    getLogFilePath(): string {
        return this._logFile;
    }

    /**
     * Check if log file exists
     */
    logFileExists(): boolean {
        return fs.existsSync(this._logFile);
    }

    /**
     * Subscribe to new log entries
     */
    subscribe(listener: (log: string) => void): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    private _writeToFile(line: string): void {
        try {
            fs.appendFileSync(this._logFile, line + '\n');
        } catch (err) {
            // Silently fail - don't want logging to break the app
        }
    }

    private _clearFile(): void {
        try {
            fs.writeFileSync(this._logFile, '');
        } catch (err) {
            // Silently fail
        }
    }

    private _notifyListeners(log: string): void {
        this._listeners.forEach(listener => {
            try {
                listener(log);
            } catch (err) {
                console.error('Log listener error:', err);
            }
        });
    }
}

// Export singleton getter
export function getLogService(): LogService {
    return LogService.getInstance();
}
