/**
 * Webview-specific types
 */

export interface AutoRegSettings {
  headless: boolean;
  verbose: boolean;
  screenshotsOnError: boolean;
  spoofFingerprint: boolean;
}

export interface WebviewMessage {
  command: string;
  [key: string]: unknown;
}
