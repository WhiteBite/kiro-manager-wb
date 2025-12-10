/**
 * Base Provider Interface
 * Defines the contract for all authentication providers
 * Based on Kiro's dual authentication architecture
 */

/**
 * Authentication result structure
 * @typedef {Object} AuthResult
 * @property {string} accessToken - OAuth access token
 * @property {string} refreshToken - OAuth refresh token
 * @property {string} expiresAt - ISO timestamp when token expires
 * @property {string} providerId - Provider identifier (e.g., 'google', 'builderId')
 * @property {string} authMethod - Authentication method ('IdC' or 'social')
 * @property {string} [region] - AWS region (IdC only)
 * @property {string} [clientIdHash] - Client ID hash (IdC only)
 * @property {string} [profileArn] - Profile ARN (Social only)
 * @property {string} [idToken] - ID token (optional)
 * @property {string} [tokenType] - Token type (usually 'Bearer')
 * @property {number} [expiresIn] - Seconds until expiration
 */

/**
 * Base authentication provider interface
 * All provider implementations must implement these methods
 */
export class AuthProvider {
  /**
   * Authenticate user and obtain tokens
   * @param {Object} options - Authentication options
   * @returns {Promise<AuthResult>} Authentication result with tokens
   */
  async login(options) {
    throw new Error('login() must be implemented by subclass');
  }

  /**
   * Refresh an existing token
   * @param {string} refreshToken - Current refresh token
   * @param {Object} metadata - Additional metadata needed for refresh
   * @returns {Promise<AuthResult>} New authentication result with refreshed tokens
   */
  async refreshToken(refreshToken, metadata) {
    throw new Error('refreshToken() must be implemented by subclass');
  }

  /**
   * Get provider identifier
   * @returns {string} Provider ID (e.g., 'google', 'builderId')
   */
  getProviderId() {
    throw new Error('getProviderId() must be implemented by subclass');
  }

  /**
   * Get authentication method
   * @returns {string} Auth method ('IdC' or 'social')
   */
  getAuthMethod() {
    throw new Error('getAuthMethod() must be implemented by subclass');
  }
}

/**
 * Provider configuration structure
 * @typedef {Object} ProviderConfig
 * @property {string} providerId - Unique provider identifier
 * @property {string} authMethod - Authentication method ('IdC' or 'social')
 * @property {string} [region] - AWS region (IdC providers)
 * @property {string} [startUrl] - Start URL (IdC Enterprise)
 * @property {string} [endpoint] - API endpoint (Social providers)
 * @property {Array<number>} [allowedPorts] - Allowed callback ports (Social providers)
 */
