/**
 * Webview-specific types
 */

export interface AutoRegSettings {
  headless: boolean;
  verbose: boolean;
  screenshotsOnError: boolean;
  spoofing: boolean;
  deviceFlow: boolean;
  autoSwitchThreshold?: number;
  strategy?: 'webview' | 'automated';
  deferQuotaCheck?: boolean;
  oauthProvider?: 'Google' | 'Github' | 'ask';
  // Proxy settings
  proxyAddress?: string;
  useProxyForRegistration?: boolean;
}

export interface ProxyStatus {
  status: 'unknown' | 'testing' | 'working' | 'not_working' | 'not_configured';
  ip?: string;
  responseTime?: number;
  error?: string;
}

export interface RegProgress {
  step: number;
  totalSteps: number;
  stepName: string;
  detail: string;
}

export interface WebviewMessage {
  command: string;
  [key: string]: unknown;
}
