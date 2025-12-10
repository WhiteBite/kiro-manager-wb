/**
 * IdC Authentication Provider
 * Handles AWS SSO OIDC authentication for BuilderId, Enterprise, and Internal providers
 * Based on Kiro's IdC authentication implementation (lines 107727-107890)
 */

import { AuthProvider } from './base-provider.js';
import { AWSSSOClient } from '../aws-sso-client.js';
import { OAuthCallbackServer } from '../oauth-server.js';
import crypto from 'crypto';
import chalk from 'chalk';
import open from 'open';

export class IdCAuthProvider extends AuthProvider {
  /**
   * @param {Object} config - Provider configuration
   * @param {string} config.providerId - Provider identifier (e.g., 'builderId', 'enterprise', 'internal')
   * @param {string} config.region - AWS region (default: 'us-east-1')
   * @param {string} [config.startUrl] - Start URL (required for Enterprise provider)
   */
  constructor(config) {
    super();
    this.config = config;
    this.ssoClient = new AWSSSOClient(config.region);
  }

  /**
   * Authenticate user via AWS SSO OIDC
   * Based on Kiro's implementation (lines 107727-107890)
   *
   * @returns {Promise<AuthResult>} Authentication result with tokens
   */
  async login() {
    let server = null;

    try {
      console.log(chalk.cyan(`\n🔐 Starting IdC authentication for ${this.config.providerId}...`));

      // Step 1: Get the correct start URL
      const startUrl = this.ssoClient.getStartUrl(
        this.config.providerId,
        this.config.startUrl
      );
      console.log(chalk.gray(`Start URL: ${startUrl}`));

      // Step 2: Register OAuth client with AWS SSO OIDC
      console.log(chalk.cyan('📝 Registering OAuth client...'));
      const clientRegistration = await this.ssoClient.registerClient({
        issuerUrl: startUrl
      });

      console.log(chalk.green('✓ Client registered successfully'));
      console.log(chalk.gray(`  Client ID: ${clientRegistration.clientId.substring(0, 20)}...`));

      // Step 3: Start OAuth callback server with random port strategy
      console.log(chalk.cyan('🌐 Starting OAuth callback server...'));
      server = new OAuthCallbackServer({
        strategy: 'random',
        hostname: '127.0.0.1'
      });

      const redirectUri = await server.start();

      // Step 4: Generate PKCE parameters
      const pkce = this.ssoClient.generatePKCE();
      const state = this.ssoClient.generateState();

      console.log(chalk.gray(`  PKCE Code Challenge: ${pkce.codeChallenge.substring(0, 20)}...`));
      console.log(chalk.gray(`  State: ${state}`));

      // Step 5: Build authorization URL
      const authUrl = this.ssoClient.buildAuthorizationUrl({
        clientId: clientRegistration.clientId,
        redirectUri: redirectUri,
        state: state,
        codeChallenge: pkce.codeChallenge
      });

      // Step 6: Open browser for user authentication
      console.log(chalk.cyan('\n🌐 Opening browser for authentication...'));
      console.log(chalk.yellow('Please complete the authentication in your browser.'));
      console.log(chalk.gray(`If the browser doesn't open automatically, visit:\n${authUrl}\n`));

      // Only open browser if not running in headless mode (check for NO_BROWSER env var)
      if (process.env.NO_BROWSER !== 'true') {
        await open(authUrl);
      }

      // Step 7: Wait for OAuth callback
      console.log(chalk.cyan('⏳ Waiting for authentication callback...'));
      const callback = await server.waitForCallback();

      // Verify state matches
      if (callback.state !== state) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      console.log(chalk.green('✓ Callback received, exchanging code for tokens...'));

      // Step 8: Exchange authorization code for tokens
      const tokenResponse = await this.ssoClient.createToken({
        clientId: clientRegistration.clientId,
        clientSecret: clientRegistration.clientSecret,
        grantType: 'authorization_code',
        code: callback.code,
        codeVerifier: pkce.codeVerifier,
        redirectUri: redirectUri
      });

      console.log(chalk.green('✓ Tokens obtained successfully'));

      // Step 9: Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString();

      // Step 10: Generate clientIdHash from startUrl
      const clientIdHash = crypto
        .createHash('sha256')
        .update(startUrl)
        .digest('hex');

      // Step 11: Build and return AuthResult
      const authResult = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: expiresAt,
        provider: this.config.providerId,
        authMethod: 'IdC',
        region: this.config.region,
        clientIdHash: clientIdHash,
        idToken: tokenResponse.idToken,
        tokenType: tokenResponse.tokenType,
        expiresIn: tokenResponse.expiresIn,
        // Store client credentials for token refresh
        _clientId: clientRegistration.clientId,
        _clientSecret: clientRegistration.clientSecret
      };

      console.log(chalk.green(`\n✅ Authentication successful for ${this.config.providerId}!`));
      console.log(chalk.gray(`  Access Token: ${tokenResponse.accessToken.substring(0, 30)}...`));
      console.log(chalk.gray(`  Expires At: ${expiresAt}`));

      return authResult;

    } catch (error) {
      console.error(chalk.red(`\n❌ Authentication failed: ${error.message}`));
      throw error;
    } finally {
      // Always clean up the server
      if (server) {
        await server.stop();
      }
    }
  }

  /**
   * Refresh an existing access token
   * Based on Kiro's token refresh implementation
   *
   * @param {string} refreshToken - Current refresh token
   * @param {Object} metadata - Additional metadata (must include clientId, clientSecret, region)
   * @returns {Promise<AuthResult>} New authentication result with refreshed tokens
   */
  async refreshToken(refreshToken, metadata) {
    try {
      console.log(chalk.cyan(`\n🔄 Refreshing token for ${this.config.providerId}...`));

      // Validate required metadata
      if (!metadata.clientId || !metadata.clientSecret) {
        throw new Error('Client credentials (clientId, clientSecret) are required for token refresh');
      }

      if (!metadata.region) {
        throw new Error('Region is required for token refresh');
      }

      // Create SSO client with the correct region
      const ssoClient = new AWSSSOClient(metadata.region);

      // Exchange refresh token for new tokens
      const tokenResponse = await ssoClient.createToken({
        clientId: metadata.clientId,
        clientSecret: metadata.clientSecret,
        grantType: 'refresh_token',
        refreshToken: refreshToken
      });

      console.log(chalk.green('✓ Token refreshed successfully'));

      // Calculate new expiration timestamp
      const expiresAt = new Date(Date.now() + tokenResponse.expiresIn * 1000).toISOString();

      // Build and return new AuthResult
      const authResult = {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: expiresAt,
        provider: this.config.providerId,
        authMethod: 'IdC',
        region: metadata.region,
        clientIdHash: metadata.clientIdHash,
        idToken: tokenResponse.idToken,
        tokenType: tokenResponse.tokenType,
        expiresIn: tokenResponse.expiresIn,
        // Preserve client credentials for future refreshes
        _clientId: metadata.clientId,
        _clientSecret: metadata.clientSecret
      };

      console.log(chalk.gray(`  New Access Token: ${tokenResponse.accessToken.substring(0, 30)}...`));
      console.log(chalk.gray(`  New Expires At: ${expiresAt}`));

      return authResult;

    } catch (error) {
      console.error(chalk.red(`\n❌ Token refresh failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Get provider identifier
   * @returns {string} Provider ID
   */
  getProviderId() {
    return this.config.providerId;
  }

  /**
   * Get authentication method
   * @returns {string} Auth method ('IdC')
   */
  getAuthMethod() {
    return 'IdC';
  }
}
