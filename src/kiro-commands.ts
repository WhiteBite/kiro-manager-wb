/**
 * Kiro Internal Commands
 * These are the internal commands used by Kiro for authentication
 * 
 * Discovered through reverse engineering kiro-agent extension
 */

export const KIRO_COMMANDS = {
  // Sign out command - triggers logout flow
  SIGN_OUT: '_signOutOfKiro',
  
  // Account dashboard - shows usage and account info
  SHOW_DASHBOARD: 'kiro.accountDashboard.showDashboard',
  
  // Delete account
  DELETE_ACCOUNT: 'kiroAgent.deleteAccount',
  
  // Debug commands (require enableDevMode)
  DEBUG_SET_ONBOARDING: 'kiroAgent.debug.SetQOnboardingState',
  DEBUG_RESET_ONBOARDING: 'kiroAgent.debug.resetOnboardingState',
  DEBUG_OPEN_METADATA: 'kiroAgent.debug.openMetadata',
  DEBUG_PURGE_METADATA: 'kiroAgent.debug.purgeMetadata',
  
  // New session
  NEW_SESSION: 'kiroAgent.newSession',
  
  // View history
  VIEW_HISTORY: 'kiroAgent.viewHistoryChats'
};

/**
 * Kiro Auth Events
 */
export const KIRO_AUTH_EVENTS = {
  // Login status changed
  LOGIN_STATUS_CHANGED: 'kiro.auth.loginStatusChanged',
  
  // User initiated logout
  USER_LOGOUT: 'kiro.auth.userLogout'
};

/**
 * Kiro Storage Keys
 * Used in SecretStorage for token management
 */
export const KIRO_STORAGE_KEYS = {
  // Token storage prefix
  TOKENS_PREFIX: 'kiro.idc.tokens',
  
  // Client info prefix
  CLIENT_PREFIX: 'kiro.idc.client',
  
  // Code verifier for PKCE
  CODE_VERIFIER: 'kiro.idc.codeVerifier'
};

/**
 * Kiro Auth Methods
 */
export type KiroAuthMethod = 'IdC' | 'social';

/**
 * Kiro Providers
 */
export type KiroProvider = 'BuilderId' | 'Enterprise' | 'Google' | 'Github' | 'Internal';

/**
 * Token format expected by Kiro
 */
export interface KiroTokenFormat {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: string;
  expiresIn?: number;
  tokenType: string;
  storedAt?: string;
}

/**
 * Client format expected by Kiro
 */
export interface KiroClientFormat {
  clientId: string;
  clientSecret?: string;
  clientIdHash: string;
  region: string;
  provider: KiroProvider;
  clientSecretExpiresAt?: string;
}

/**
 * Full auth session format
 */
export interface KiroAuthSession {
  tokens: KiroTokenFormat;
  client: KiroClientFormat;
  authMethod: KiroAuthMethod;
  profileArn?: string;
}
