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
}

export interface AccountUsage {
  currentUsage: number;
  usageLimit: number;
  percentageUsed: number;
  daysRemaining: number;
  loading?: boolean;
  error?: string;
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
}

export interface UsageStats {
  [accountName: string]: {
    count: number;
    lastUsed?: string;
    limit?: number;
  };
}
