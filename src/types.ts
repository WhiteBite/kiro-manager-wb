/**
 * Shared types for Kiro Account Switcher
 */

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: string;
  expiresIn?: number;
  tokenType?: string;
  provider: string;
  authMethod: string;
  region?: string;
  clientIdHash?: string;
  accountName?: string;
  email?: string;
  _clientId?: string;
  _clientSecret?: string;
  _clientSecretExpiresAt?: string; // When client credentials expire (90 days from creation)
  createdAt?: string;
}

export interface AccountUsage {
  currentUsage: number;
  usageLimit: number;
  percentageUsed: number;
  daysRemaining: number;
  loading?: boolean;
  error?: string;
  suspended?: boolean; // Account is suspended by AWS (usage limit)
  isBanned?: boolean;  // Account is banned/blocked (auth error)
  banReason?: string;  // Reason for ban if known
}

export interface AccountInfo {
  filename: string;
  path: string;
  tokenData: TokenData;
  isActive: boolean;
  isExpired: boolean;
  needsRefresh?: boolean; // Token expires within 10 min (like Kiro's proactive refresh)
  expiresIn: string;
  usageCount: number;
  tokenLimit: number;
  usage?: AccountUsage;
  createdAt?: string;
}

export interface UsageStats {
  [accountName: string]: {
    count: number;
    lastUsed?: string;
    limit?: number;
  };
}

// ============================================
// OIDC & API Result Types
// ============================================

export interface OIDCError {
  error?: string;
  error_description?: string;
  message?: string;
}

export type OIDCErrorType =
  | 'InvalidGrantException'
  | 'AccessDeniedException'
  | 'ExpiredTokenException'
  | 'InvalidClientException'
  | 'UnauthorizedClientException'
  | 'InvalidRequestException'
  | 'SlowDownException'
  | 'AuthorizationPendingException'
  | 'InternalServerException'
  | 'NetworkError'
  | 'UnknownError';

export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: OIDCErrorType;
  errorMessage?: string;
  isBanned?: boolean;
  isInvalidCredentials?: boolean;
  isRateLimited?: boolean;
}

export interface SwitchAccountResult {
  success: boolean;
  error?: OIDCErrorType;
  errorMessage?: string;
  isBanned?: boolean;
}

export interface BanCheckResult {
  isBanned: boolean;
  reason?: string;
  message?: string;
  error?: string;
  usageData?: {
    currentUsage: number;
    usageLimit: number;
    percentageUsed: number;
    resetDate?: string;
  };
}

export interface AccountHealthStatus {
  isHealthy: boolean;
  isBanned?: boolean;
  isExpired?: boolean;
  needsRefresh?: boolean;
  error?: OIDCErrorType;
  errorMessage?: string;
  usage?: AccountUsage;
}

// ============================================
// IMAP Profiles & Email Strategies
// ============================================

/**
 * Email generation strategy type
 */
export type EmailStrategyType = 'single' | 'plus_alias' | 'catch_all' | 'pool';

/**
 * Email item in pool (for 'pool' strategy)
 */
export interface EmailPoolItem {
  email: string;
  password?: string; // IMAP password for this email (for different accounts like GMX)
  status: 'pending' | 'used' | 'failed';
  usedAt?: string;
  error?: string;
  accountId?: string; // linked account after registration
}

/**
 * Email generation strategy configuration
 */
export interface EmailStrategy {
  type: EmailStrategyType;

  // For 'catch_all' strategy
  domain?: string;

  // For 'pool' strategy  
  emails?: EmailPoolItem[];
}

/**
 * IMAP connection settings
 */
export interface ImapSettings {
  server: string;
  port?: number;
  user: string;
  password: string;
  ssl?: boolean;
}

/**
 * IMAP Profile - combines IMAP settings with email strategy
 */
export interface ImapProfile {
  id: string;
  name: string;
  imap: ImapSettings;
  strategy: EmailStrategy;
  status: 'active' | 'paused' | 'exhausted' | 'error';
  isDefault?: boolean;

  // Proxy settings (optional)
  proxy?: {
    enabled: boolean;
    urls: string[];  // List of proxies for round-robin rotation
    currentIndex?: number;  // Current position in rotation
  };

  // Registration settings (optional)
  registration?: {
    // Login name template with {N} placeholder for number
    // Example: "MyAccount_{N}" -> "MyAccount_001", "MyAccount_002"
    loginTemplate?: string;
    // Starting number for {N}
    startNumber?: number;
    // Current number (auto-incremented)
    currentNumber?: number;
    // Scheduled registration interval in minutes (0 = manual only)
    scheduleInterval?: number;
    // Max accounts to register in scheduled mode
    maxAccounts?: number;
    // Is scheduled registration active
    scheduleActive?: boolean;
  };

  // Statistics
  stats: {
    registered: number;
    failed: number;
    lastUsed?: string;
    lastError?: string;
  };

  // Provider detection (auto-filled)
  provider?: {
    name: string;           // "Gmail", "Yandex", etc.
    supportsAlias: boolean;
    catchAllPossible: boolean;
  };

  createdAt: string;
  updatedAt: string;
}

/**
 * Provider hints for auto-detection
 */
export interface ProviderHint {
  name: string;
  domains: string[];
  imapServer: string;
  imapPort: number;
  supportsAlias: boolean;
  catchAllPossible: boolean;
  recommendedStrategy: EmailStrategyType;
}

/**
 * All IMAP profiles storage
 */
export interface ImapProfilesData {
  profiles: ImapProfile[];
  activeProfileId?: string;
  version: number;
}
