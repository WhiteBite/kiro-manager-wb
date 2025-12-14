/**
 * Tests for token refresh logic
 * Verifies the timing constants and expiry checks match Kiro's behavior
 */

import {
    isTokenExpired,
    tokenNeedsRefresh,
    isTokenTrulyInvalid,
    AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS,
    REFRESH_BEFORE_EXPIRY_SECONDS,
    REFRESH_LOOP_INTERVAL_SECONDS
} from '../src/accounts';
import { TokenData } from '../src/types';

// Helper to create token with specific expiry
function createToken(expiresInSeconds: number): TokenData {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return {
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresAt,
        provider: 'BuilderId',
        authMethod: 'IdC'
    };
}

describe('Token Refresh Logic', () => {
    describe('Timing constants (should match Kiro)', () => {
        it('AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS should be 180 (3 minutes)', () => {
            expect(AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS).toBe(180);
            expect(AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS).toBe(3 * 60);
        });

        it('REFRESH_BEFORE_EXPIRY_SECONDS should be 600 (10 minutes)', () => {
            expect(REFRESH_BEFORE_EXPIRY_SECONDS).toBe(600);
            expect(REFRESH_BEFORE_EXPIRY_SECONDS).toBe(10 * 60);
        });

        it('REFRESH_LOOP_INTERVAL_SECONDS should be 60 (1 minute)', () => {
            expect(REFRESH_LOOP_INTERVAL_SECONDS).toBe(60);
        });
    });

    describe('isTokenExpired()', () => {
        it('should return true for token without expiresAt', () => {
            const token = { ...createToken(3600), expiresAt: undefined as any };
            expect(isTokenExpired(token)).toBe(true);
        });

        it('should return true for expired token', () => {
            const token = createToken(-60); // Expired 1 minute ago
            expect(isTokenExpired(token)).toBe(true);
        });

        it('should return false for valid token', () => {
            const token = createToken(3600); // Expires in 1 hour
            expect(isTokenExpired(token)).toBe(false);
        });

        it('should support offset parameter', () => {
            const token = createToken(300); // Expires in 5 minutes

            // Without offset - not expired
            expect(isTokenExpired(token, 0)).toBe(false);

            // With 10 minute offset - considered expired
            expect(isTokenExpired(token, 600)).toBe(true);

            // With 3 minute offset - not expired yet
            expect(isTokenExpired(token, 180)).toBe(false);
        });
    });

    describe('tokenNeedsRefresh()', () => {
        it('should return true if token expires within 10 minutes', () => {
            const token = createToken(5 * 60); // Expires in 5 minutes
            expect(tokenNeedsRefresh(token)).toBe(true);
        });

        it('should return true if token expires in exactly 10 minutes', () => {
            const token = createToken(10 * 60); // Expires in 10 minutes
            expect(tokenNeedsRefresh(token)).toBe(true);
        });

        it('should return false if token expires in more than 10 minutes', () => {
            const token = createToken(15 * 60); // Expires in 15 minutes
            expect(tokenNeedsRefresh(token)).toBe(false);
        });

        it('should return true for already expired token', () => {
            const token = createToken(-60); // Expired 1 minute ago
            expect(tokenNeedsRefresh(token)).toBe(true);
        });
    });

    describe('isTokenTrulyInvalid()', () => {
        it('should return true for token without expiresAt', () => {
            const token = { ...createToken(3600), expiresAt: undefined as any };
            expect(isTokenTrulyInvalid(token)).toBe(true);
        });

        it('should return false for valid token', () => {
            const token = createToken(3600); // Expires in 1 hour
            expect(isTokenTrulyInvalid(token)).toBe(false);
        });

        it('should return false for recently expired token (within grace period)', () => {
            const token = createToken(-60); // Expired 1 minute ago
            expect(isTokenTrulyInvalid(token)).toBe(false);
        });

        it('should return false for token expired exactly 3 minutes ago', () => {
            const token = createToken(-180); // Expired 3 minutes ago
            expect(isTokenTrulyInvalid(token)).toBe(false);
        });

        it('should return true for token expired more than 3 minutes ago', () => {
            const token = createToken(-181); // Expired 3 min 1 sec ago
            expect(isTokenTrulyInvalid(token)).toBe(true);
        });

        it('should return true for token expired 5 minutes ago', () => {
            const token = createToken(-300); // Expired 5 minutes ago
            expect(isTokenTrulyInvalid(token)).toBe(true);
        });
    });

    describe('Grace period behavior (like Kiro)', () => {
        it('should allow using token during 3-minute grace period after expiry', () => {
            // Token expired 2 minutes ago
            const token = createToken(-120);

            // Basic expired check - yes, it's expired
            expect(isTokenExpired(token)).toBe(true);

            // But it's not truly invalid yet (within grace period)
            expect(isTokenTrulyInvalid(token)).toBe(false);

            // And it needs refresh
            expect(tokenNeedsRefresh(token)).toBe(true);
        });

        it('should reject token after grace period', () => {
            // Token expired 4 minutes ago
            const token = createToken(-240);

            expect(isTokenExpired(token)).toBe(true);
            expect(isTokenTrulyInvalid(token)).toBe(true);
            expect(tokenNeedsRefresh(token)).toBe(true);
        });
    });

    describe('Proactive refresh behavior (like Kiro)', () => {
        it('should trigger refresh 10 minutes before expiry', () => {
            // Token expires in 9 minutes - should trigger refresh
            const token9min = createToken(9 * 60);
            expect(tokenNeedsRefresh(token9min)).toBe(true);
            expect(isTokenExpired(token9min)).toBe(false);
            expect(isTokenTrulyInvalid(token9min)).toBe(false);
        });

        it('should not trigger refresh if more than 10 minutes remain', () => {
            // Token expires in 11 minutes - no refresh needed yet
            const token11min = createToken(11 * 60);
            expect(tokenNeedsRefresh(token11min)).toBe(false);
            expect(isTokenExpired(token11min)).toBe(false);
            expect(isTokenTrulyInvalid(token11min)).toBe(false);
        });
    });
});
