/**
 * Kiro Auth Service Client
 * Client for Kiro's proprietary authentication service
 * Used for social authentication (Google, GitHub)
 * Based on Kiro's mh class (lines 102072-102180)
 */

import axios from 'axios';
import open from 'open';

/**
 * Kiro Authentication Service Client
 * Handles communication with Kiro's auth service at auth.desktop.kiro.dev
 */
export class KiroAuthServiceClient {
  constructor() {
    // Based on Kiro's pa object (line 102055-102057)
    this.endpoint = 'https://prod.us-east-1.auth.desktop.kiro.dev';

    // Create axios client with retry configuration
    // Based on Kiro's client setup (lines 102076-102082)
    this.client = axios.create({
      baseURL: this.endpoint,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'KiroBatchLoginCLI/1.0.0'
      }
    });
  }

  /**
   * Get login URL
   * Based on Kiro's loginUrl getter (lines 102084-102086)
   */
  get loginUrl() {
    return `${this.endpoint}/login`;
  }

  /**
   * Get token creation URL
   * Based on Kiro's createTokenUrl getter (lines 102087-102089)
   */
  get createTokenUrl() {
    return `${this.endpoint}/oauth/token`;
  }

  /**
   * Get token refresh URL
   * Based on Kiro's refreshTokenUrl getter (lines 102090-102092)
   */
  get refreshTokenUrl() {
    return `${this.endpoint}/refreshToken`;
  }

  /**
   * Get logout URL
   * Based on Kiro's logoutUrl getter (lines 102093-102095)
   */
  get logoutUrl() {
    return `${this.endpoint}/logout`;
  }

  /**
   * Get account deletion URL
   * Based on Kiro's deleteAccountUrl getter (lines 102096-102098)
   */
  get deleteAccountUrl() {
    return `${this.endpoint}/account`;
  }

  /**
   * Open browser to login page
   * Based on Kiro's login() method (lines 102102-102108)
   *
   * @param {Object} params - Login parameters
   * @param {string} params.provider - Provider name ('Google' or 'Github')
   * @param {string} params.redirectUri - OAuth callback URI
   * @param {string} params.codeChallenge - PKCE code challenge
   * @param {string} params.state - CSRF state parameter
   * @returns {Promise<void>}
   */
  async login({ provider, redirectUri, codeChallenge, state }) {
    // Build login URL with query parameters
    // Based on line 102106: `${this.loginUrl}?idp=${t13}&redirect_uri=${encodeURIComponent(r16)}&code_challenge=${n14}&code_challenge_method=S256&state=${s15}`
    const loginUrl = `${this.loginUrl}?idp=${provider}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=${state}`;

    // Open browser to login URL
    await open(loginUrl);
  }

  /**
   * Exchange authorization code for access token
   * Based on Kiro's createToken() method (lines 102113-102126)
   *
   * @param {Object} params - Token creation parameters
   * @param {string} params.code - Authorization code from callback
   * @param {string} params.codeVerifier - PKCE code verifier
   * @param {string} params.redirectUri - OAuth callback URI (must match login)
   * @param {string} [params.invitationCode] - Optional invitation code
   * @returns {Promise<Object>} Token response
   */
  async createToken({ code, codeVerifier, redirectUri, invitationCode }) {
    try {
      const response = await this.client.post(
        this.createTokenUrl,
        {
          code: code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          invitation_code: invitationCode
        }
      );

      return response.data;
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        throw new Error(
          `Kiro Auth Service token creation failed: ${status} - ${JSON.stringify(data)}`
        );
      }

      throw new Error(`Kiro Auth Service request failed: ${error.message}`);
    }
  }

  /**
   * Refresh an existing access token
   * Based on Kiro's refreshToken() method (lines 102131-102143)
   *
   * @param {Object} params - Refresh parameters
   * @param {string} params.refreshToken - Current refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshToken({ refreshToken }) {
    try {
      const response = await this.client.post(
        this.refreshTokenUrl,
        {
          refreshToken: refreshToken
        }
      );

      return response.data;
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        throw new Error(
          `Kiro Auth Service token refresh failed: ${status} - ${JSON.stringify(data)}`
        );
      }

      throw new Error(`Kiro Auth Service request failed: ${error.message}`);
    }
  }

  /**
   * Logout and invalidate refresh token
   * Based on Kiro's logout() method (lines 102148-102160)
   *
   * @param {Object} params - Logout parameters
   * @param {string} params.refreshToken - Refresh token to invalidate
   * @returns {Promise<void>}
   */
  async logout({ refreshToken }) {
    try {
      await this.client.post(
        this.logoutUrl,
        {
          refreshToken: refreshToken
        }
      );
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        throw new Error(
          `Kiro Auth Service logout failed: ${status} - ${JSON.stringify(data)}`
        );
      }

      throw new Error(`Kiro Auth Service request failed: ${error.message}`);
    }
  }

  /**
   * Delete user account
   * Based on Kiro's deleteAccount() method (lines 102165-102178)
   *
   * @param {string} accessToken - Current access token
   * @returns {Promise<void>}
   */
  async deleteAccount(accessToken) {
    try {
      await this.client.delete(this.deleteAccountUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        throw new Error(
          `Kiro Auth Service account deletion failed: ${status} - ${JSON.stringify(data)}`
        );
      }

      throw new Error(`Kiro Auth Service request failed: ${error.message}`);
    }
  }
}
