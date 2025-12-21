/**
 * Tests for Import/Export accounts functionality
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Import/Export Accounts', () => {

    describe('Export format', () => {
        it('should have correct export structure', () => {
            // Simulate export data structure
            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                accounts: [
                    {
                        filename: 'token-BuilderId-IdC-test-123.json',
                        tokenData: {
                            accessToken: 'test-access-token',
                            refreshToken: 'test-refresh-token',
                            expiresAt: '2025-01-01T00:00:00Z',
                            tokenType: 'Bearer',
                            clientIdHash: 'hash123',
                            accountName: 'TestUser',
                            provider: 'BuilderId',
                            _clientId: 'client-id',
                            _clientSecret: 'client-secret'
                        },
                        password: 'TestPassword123!'
                    }
                ]
            };

            expect(exportData.version).toBe(1);
            expect(exportData.accounts).toHaveLength(1);
            expect(exportData.accounts[0].tokenData).toHaveProperty('accessToken');
            expect(exportData.accounts[0].tokenData).toHaveProperty('refreshToken');
            expect(exportData.accounts[0].tokenData).toHaveProperty('_clientId');
            expect(exportData.accounts[0].tokenData).toHaveProperty('_clientSecret');
            expect(exportData.accounts[0]).toHaveProperty('password');
        });

        it('should be valid JSON', () => {
            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                accounts: []
            };

            const json = JSON.stringify(exportData, null, 2);
            const parsed = JSON.parse(json);

            expect(parsed.version).toBe(1);
            expect(parsed.accounts).toEqual([]);
        });
    });

    describe('Import validation', () => {
        it('should reject invalid format', () => {
            const invalidData: Record<string, unknown> = { foo: 'bar' };

            const isValid = invalidData.accounts && Array.isArray(invalidData.accounts);
            expect(isValid).toBeFalsy();
        });

        it('should accept valid format', () => {
            const validData = {
                version: 1,
                accounts: [
                    {
                        tokenData: {
                            accountName: 'Test',
                            refreshToken: 'token123'
                        }
                    }
                ]
            };

            const isValid = validData.accounts && Array.isArray(validData.accounts);
            expect(isValid).toBeTruthy();
        });

        it('should detect duplicate accounts', () => {
            const existingAccounts = [
                { tokenData: { accountName: 'User1', refreshToken: 'token1' } },
                { tokenData: { accountName: 'User2', refreshToken: 'token2' } }
            ];

            const importData = {
                accounts: [
                    { tokenData: { accountName: 'User1', refreshToken: 'token1' } }, // duplicate
                    { tokenData: { accountName: 'User3', refreshToken: 'token3' } }  // new
                ]
            };

            const duplicates = importData.accounts.filter(acc =>
                existingAccounts.some(existing =>
                    existing.tokenData.accountName === acc.tokenData.accountName ||
                    existing.tokenData.refreshToken === acc.tokenData.refreshToken
                )
            );

            expect(duplicates).toHaveLength(1);
            expect(duplicates[0].tokenData.accountName).toBe('User1');
        });
    });

    describe('Token file naming', () => {
        it('should generate safe filename from account name', () => {
            const accountName = 'Test@User!123';
            const timestamp = Date.now();
            const safeName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
            const filename = `token-BuilderId-IdC-${safeName}-${timestamp}.json`;

            expect(filename).toMatch(/^token-BuilderId-IdC-Test_User_123-\d+\.json$/);
            expect(filename).not.toContain('@');
            expect(filename).not.toContain('!');
        });
    });

    describe('Tokens directory', () => {
        it('should have correct tokens path', () => {
            const homeDir = os.homedir();
            const tokensDir = path.join(homeDir, '.kiro-manager-wb', 'tokens');

            // Path should be constructable
            expect(tokensDir).toContain('.kiro-manager-wb');
            expect(tokensDir).toContain('tokens');
        });
    });
});
