/**
 * AWS SSO OIDC Client
 * Implements AWS SSO OIDC API calls for dynamic client registration
 * Based on Kiro's implementation
 */

import axios from 'axios';
import crypto from 'crypto';

// Start URL constants - based on Kiro's implementation (lines 107669-107670)
const BUILDER_ID_START_URL = 'https://view.awsapps.com/start';
const DEFAULT_SSO_START_URL = 'https://amzn.awsapps.com/start';

export class AWSSSOClient {
  constructor(region = 'us-east-1') {
    this.region = region;
    this.baseUrl = `https://oidc.${region}.amazonaws.com`;
  }

  /**
   * Get the correct startUrl based on provider type
   * Based on Kiro's getStartUrl() method (line 107782-107783)
   *
   * @param {string} provider - Provider type ('BuilderId', 'Enterprise', or default)
   * @param {string} startUrl - User-provided start URL (required for Enterprise)
   * @returns {string} The correct start URL
   */
  getStartUrl(provider, startUrl) {
    if (provider === 'Enterprise') {
      if (!startUrl) {
        throw new Error('Start URL is required for Enterprise provider');
      }
      return startUrl;
    }

    if (provider === 'BuilderId') {
      return BUILDER_ID_START_URL;
    }

    // Default fallback
    return startUrl || DEFAULT_SSO_START_URL;
  }

  /**
   * Register a new OAuth client with AWS SSO OIDC
   * This is equivalent to Kiro's registerClient() method (lines 107762-107780)
   *
   * @param {Object} params - Registration parameters
   * @param {string} params.issuerUrl - REQUIRED: Start URL for the SSO provider
   * @returns {Promise<Object>} Client registration response
   */
  async registerClient({
    issuerUrl,  // REQUIRED - must be provided
    clientName = 'Kiro Batch Login CLI',
    clientType = 'public',
    scopes = [
      'codewhisperer:completions',
      'codewhisperer:analysis',
      'codewhisperer:conversations',
      'codewhisperer:transformations',
      'codewhisperer:taskassist'
    ],
    grantTypes = ['authorization_code', 'refresh_token'],
    redirectUris = ['http://127.0.0.1/oauth/callback']
  }) {
    // Validate required parameter
    if (!issuerUrl) {
      throw new Error('issuerUrl is required for client registration');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/client/register`,
        {
          clientName,
          clientType,
          scopes,
          grantTypes,
          redirectUris,
          issuerUrl  // Always include issuerUrl
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        clientId: response.data.clientId,
        clientSecret: response.data.clientSecret,
        clientIdIssuedAt: response.data.clientIdIssuedAt,
        clientSecretExpiresAt: response.data.clientSecretExpiresAt,
        authorizationEndpoint: response.data.authorizationEndpoint,
        tokenEndpoint: response.data.tokenEndpoint
      };
    } catch (error) {
      if (error.response) {
        throw new Error(
          `AWS SSO Client Registration failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }
      throw new Error(`AWS SSO Client Registration failed: ${error.message}`);
    }
  }

  /**
   * Exchange authorization code for access token
   *
   * @param {Object} params - Token exchange parameters
   * @returns {Promise<Object>} Token response
   */
  async createToken({
    clientId,
    clientSecret,
    grantType,
    code = null,
    codeVerifier = null,
    redirectUri = null,
    refreshToken = null
  }) {
    try {
      const body = {
        clientId,
        clientSecret,
        grantType
      };

      if (grantType === 'authorization_code') {
        body.code = code;
        body.codeVerifier = codeVerifier;
        body.redirectUri = redirectUri;
      } else if (grantType === 'refresh_token') {
        body.refreshToken = refreshToken;
      }

      const response = await axios.post(
        `${this.baseUrl}/token`,
        body,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return {
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
        idToken: response.data.idToken,
        tokenType: response.data.tokenType,
        expiresIn: response.data.expiresIn
      };
    } catch (error) {
      if (error.response) {
        throw new Error(
          `Token exchange failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      }
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  /**
   * Generate PKCE parameters
   * Same as Kiro's implementation
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

  /**
   * Generate random state for CSRF protection
   */
  generateState() {
    return crypto.randomUUID();
  }

  /**
   * Build authorization URL
   * Based on Kiro's implementation (line 107803-107811)
   */
  buildAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
    scopes = [
      'codewhisperer:completions',
      'codewhisperer:analysis',
      'codewhisperer:conversations',
      'codewhisperer:transformations',
      'codewhisperer:taskassist'
    ]
  }) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scopes: scopes.join(','),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${this.baseUrl}/authorize?${params.toString()}`;
  }
}
