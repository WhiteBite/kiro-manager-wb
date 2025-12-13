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
  createdAt?: string;
}

export interface AccountUsage {
  currentUsage: number;
  usageLimit: number;
  percentageUsed: number;
  daysRemaining: number;
  loading?: boolean;
  error?: string;
  suspended?: boolean; // Account is suspended by AWS
}

export interface AccountInfo {
  filename: string;
  path: string;
  tokenData: TokenData;
  isActive: boolean;
  isExpired: boolean;
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
