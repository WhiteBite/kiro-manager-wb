/**
 * Social Authentication Provider
 * Handles social authentication for Google and GitHub through Kiro's proprietary auth service
 * Based on Kiro's Social authentication (lines 107892-107977)
 */

import crypto from 'crypto';
import { AuthProvider } from './base-provider.js';
import { KiroAuthServiceClient } from '../kiro-auth-client.js';
import { OAuthCallbackServer } from '../oauth-server.js';

// Predefined ports for social authentication (line 107891)
const SOCIAL_AUTH_PORTS = [49153, 50153, 51153, 52153, 53153, 4649, 6588, 9091, 8008, 3128];

/**
 * Social Authentication Provider
 * Supports Google and GitHub authentication through Kiro's auth service
 */
export class SocialAuthProvider extends AuthProvider {
  /**
   * @param {Object} config - Provider configuration
   * @param {string} config.providerId - Provider identifier ('Google' or 'Github')
   */
  constructor(config) {
    super();
    this.config = config;
    this.kiroAuthClient = new KiroAuthServiceClient();
  }

  /**
   * Authenticate user through social provider
   * @param {Object} options - Authentication options (unused for social auth)
   * @returns {Promise<AuthResult>} Authentication result with tokens
   */
  async login(options = {}) {
    const server = new OAuthCallbackServer({
      strategy: 'predefined',
      ports: SOCIAL_AUTH_PORTS,
      hostname: 'localhost'  // IMPORTANT: Use 'localhost' instead of '127.0.0.1' (line 107920)
    });

    try {
      // Generate random UUID for state (CSRF protection)
      const state = crypto.randomUUID();

      // Start local callback server with predefined port strategy
      const redirectUri = await server.start();

      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = this.generatePKCE();

      // Open browser to Kiro auth service login page
      await this.kiroAuthClient.login({
        provider: this.config.providerId,
        redirectUri: redirectUri,
        codeChallenge: codeChallenge,
        state: state
      });

      // Wait for OAuth callback
      const { code, state: returnedState } = await server.waitForCallback();

      // Validate state (CSRF protection)
      if (state !== returnedState) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Exchange authorization code for access token
      const tokenResponse = await this.kiroAuthClient.createToken({
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri
      });

      // Return AuthResult with social auth structure
      // IMPORTANT: Social auth includes profileArn
      return {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        profileArn: tokenResponse.profileArn,  // Social auth specific
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
        provider: this.config.providerId,
        authMethod: 'social',
        idToken: tokenResponse.idToken,
        tokenType: tokenResponse.tokenType,
        expiresIn: tokenResponse.expiresIn
      };
    } catch (error) {
      throw new Error(`Social authentication failed: ${error.message}`);
    } finally {
      // Always clean up the server
      await server.stop();
    }
  }

  /**
   * Refresh an existing token
   * @param {string} refreshToken - Current refresh token
   * @param {Object} metadata - Additional metadata (profileArn, etc.)
   * @returns {Promise<AuthResult>} New authentication result with refreshed tokens
   */
  async refreshToken(refreshToken, metadata = {}) {
    try {
      const tokenResponse = await this.kiroAuthClient.refreshToken({
        refreshToken: refreshToken
      });

      // Return new AuthResult with profileArn preserved from metadata
      return {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        profileArn: metadata.profileArn || tokenResponse.profileArn,  // Preserve profileArn
        expiresAt: new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString(),
        provider: this.config.providerId,
        authMethod: 'social',
        idToken: tokenResponse.idToken,
        tokenType: tokenResponse.tokenType,
        expiresIn: tokenResponse.expiresIn
      };
    } catch (error) {
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Get provider identifier
   * @returns {string} Provider ID (e.g., 'Google', 'Github')
   */
  getProviderId() {
    return this.config.providerId;
  }

  /**
   * Get authentication method
   * @returns {string} Auth method ('social')
   */
  getAuthMethod() {
    return 'social';
  }

  /**
   * Generate PKCE parameters for OAuth flow
   * @returns {Object} Object with codeVerifier and codeChallenge
   */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    return {
      codeVerifier,
      codeChallenge,
      codeChallengeMethod: 'S256'
    };
  }
}
