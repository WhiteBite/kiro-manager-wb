/**
 * SecretStorage Integration for secure token storage
 * Uses VS Code's SecretStorage API to store sensitive data in system keychain
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TokenData } from './types';
import { getTokensDir } from './utils';

const SECRET_KEY_PREFIX = 'kiro-account-';

export class TokenSecretStorage {
    private secrets: vscode.SecretStorage;
    private enabled: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        this.secrets = context.secrets;
    }

    /**
     * Check if SecretStorage is enabled in settings
     */
    isEnabled(): boolean {
        return vscode.workspace.getConfiguration('kiroAccountSwitcher').get('useSecretStorage', false);
    }

    /**
     * Store token secrets (accessToken, refreshToken, clientSecret)
     */
    async storeSecrets(accountName: string, tokenData: TokenData): Promise<void> {
        if (!this.isEnabled()) return;

        const key = SECRET_KEY_PREFIX + accountName;
        const secrets = {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            _clientSecret: tokenData._clientSecret
        };

        await this.secrets.store(key, JSON.stringify(secrets));
    }

    /**
     * Retrieve token secrets
     */
    async getSecrets(accountName: string): Promise<Partial<TokenData> | null> {
        if (!this.isEnabled()) return null;

        const key = SECRET_KEY_PREFIX + accountName;
        const stored = await this.secrets.get(key);

        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch {
            return null;
        }
    }

    /**
     * Delete token secrets
     */
    async deleteSecrets(accountName: string): Promise<void> {
        const key = SECRET_KEY_PREFIX + accountName;
        await this.secrets.delete(key);
    }

    /**
     * Migrate existing tokens to SecretStorage
     */
    async migrateToSecretStorage(): Promise<number> {
        const tokensDir = getTokensDir();
        if (!fs.existsSync(tokensDir)) return 0;

        const files = fs.readdirSync(tokensDir).filter(f => f.startsWith('token-') && f.endsWith('.json'));
        let migrated = 0;

        for (const file of files) {
            try {
                const filepath = path.join(tokensDir, file);
                const content = fs.readFileSync(filepath, 'utf8');
                const tokenData = JSON.parse(content) as TokenData;
                const accountName = tokenData.accountName || file;

                // Store secrets
                await this.storeSecrets(accountName, tokenData);

                // Remove secrets from file (keep metadata)
                const sanitized = {
                    ...tokenData,
                    accessToken: '[STORED_IN_KEYCHAIN]',
                    refreshToken: '[STORED_IN_KEYCHAIN]',
                    _clientSecret: '[STORED_IN_KEYCHAIN]'
                };

                fs.writeFileSync(filepath, JSON.stringify(sanitized, null, 2));
                migrated++;
            } catch (error) {
                console.error(`Failed to migrate ${file}:`, error);
            }
        }

        return migrated;
    }

    /**
     * Migrate back from SecretStorage to files
     */
    async migrateFromSecretStorage(): Promise<number> {
        const tokensDir = getTokensDir();
        if (!fs.existsSync(tokensDir)) return 0;

        const files = fs.readdirSync(tokensDir).filter(f => f.startsWith('token-') && f.endsWith('.json'));
        let migrated = 0;

        for (const file of files) {
            try {
                const filepath = path.join(tokensDir, file);
                const content = fs.readFileSync(filepath, 'utf8');
                const tokenData = JSON.parse(content) as TokenData;
                const accountName = tokenData.accountName || file;

                // Get secrets from storage
                const secrets = await this.getSecrets(accountName);
                if (!secrets) continue;

                // Restore secrets to file
                const restored = {
                    ...tokenData,
                    accessToken: secrets.accessToken || tokenData.accessToken,
                    refreshToken: secrets.refreshToken || tokenData.refreshToken,
                    _clientSecret: secrets._clientSecret || tokenData._clientSecret
                };

                fs.writeFileSync(filepath, JSON.stringify(restored, null, 2));

                // Delete from SecretStorage
                await this.deleteSecrets(accountName);
                migrated++;
            } catch (error) {
                console.error(`Failed to restore ${file}:`, error);
            }
        }

        return migrated;
    }

    /**
     * Load token with secrets from SecretStorage
     */
    async loadTokenWithSecrets(tokenData: TokenData): Promise<TokenData> {
        if (!this.isEnabled()) return tokenData;

        const accountName = tokenData.accountName || '';
        const secrets = await this.getSecrets(accountName);

        if (!secrets) return tokenData;

        return {
            ...tokenData,
            accessToken: secrets.accessToken || tokenData.accessToken,
            refreshToken: secrets.refreshToken || tokenData.refreshToken,
            _clientSecret: secrets._clientSecret || tokenData._clientSecret
        };
    }
}

// Singleton instance
let instance: TokenSecretStorage | null = null;

export function initSecretStorage(context: vscode.ExtensionContext): TokenSecretStorage {
    instance = new TokenSecretStorage(context);
    return instance;
}

export function getSecretStorage(): TokenSecretStorage | null {
    return instance;
}
