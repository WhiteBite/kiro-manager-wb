/**
 * Provider Factory
 *
 * Creates the appropriate authentication provider based on provider ID.
 * Supports both IdC (AWS SSO OIDC) and Social (Kiro Auth Service) providers.
 */

import { IdCAuthProvider } from './idc-provider.js';
import { SocialAuthProvider } from './social-provider.js';

/**
 * Provider configuration mapping
 * Based on Kiro's provider types (lines 97726-97746)
 */
const PROVIDER_CONFIGS = {
  // IdC Providers (AWS SSO OIDC)
  'BuilderId': {
    authMethod: 'IdC',
    region: 'us-east-1',
    startUrl: null  // Will use default from AWSSSOClient
  },
  'Enterprise': {
    authMethod: 'IdC',
    region: 'us-east-1',
    startUrl: null  // Must be provided by user
  },
  'Internal': {
    authMethod: 'IdC',
    region: 'us-east-1',
    startUrl: null
  },

  // Social Providers (Kiro Auth Service)
  'Google': {
    authMethod: 'social'
  },
  'Github': {  // Note: Kiro uses 'Github' not 'GitHub'
    authMethod: 'social'
  }
};

/**
 * Create an authentication provider instance
 *
 * @param {string} providerId - The provider ID (e.g., 'BuilderId', 'Google')
 * @param {Object} options - Additional options to merge with default config
 * @param {string} [options.region] - AWS region for IdC providers
 * @param {string} [options.startUrl] - Start URL for IdC providers
 * @returns {IdCAuthProvider|SocialAuthProvider} The instantiated provider
 * @throws {Error} If provider is not supported
 */
export function createAuthProvider(providerId, options = {}) {
  // Look up provider configuration
  const config = PROVIDER_CONFIGS[providerId];

  if (!config) {
    throw new Error(
      `Unsupported provider: ${providerId}. ` +
      `Supported providers: ${getSupportedProviders().join(', ')}`
    );
  }

  // Merge options with default config
  const providerConfig = {
    ...config,
    ...options,
    providerId
  };

  // Instantiate the appropriate provider based on authMethod
  switch (config.authMethod) {
    case 'IdC':
      return new IdCAuthProvider(providerConfig);

    case 'social':
      return new SocialAuthProvider(providerConfig);

    default:
      throw new Error(
        `Unknown auth method: ${config.authMethod} for provider ${providerId}`
      );
  }
}

/**
 * Get list of supported provider IDs
 *
 * @returns {string[]} Array of supported provider IDs
 */
export function getSupportedProviders() {
  return Object.keys(PROVIDER_CONFIGS);
}

/**
 * Get configuration for a specific provider
 *
 * @param {string} providerId - The provider ID
 * @returns {Object|null} The provider configuration or null if not found
 */
export function getProviderConfig(providerId) {
  return PROVIDER_CONFIGS[providerId] || null;
}

// Export the configuration for direct access if needed
export { PROVIDER_CONFIGS };
