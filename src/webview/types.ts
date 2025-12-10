/**
 * Webview-specific types
 */

export interface AutoRegSettings {
  headless: boolean;
  verbose: boolean;
  screenshotsOnError: boolean;
}

export interface WebviewMessage {
  command: string;
  [key: string]: unknown;
}
