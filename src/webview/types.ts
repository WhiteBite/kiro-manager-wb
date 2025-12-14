/**
 * Webview-specific types
 */

export interface AutoRegSettings {
  headless: boolean;
  verbose: boolean;
  screenshotsOnError: boolean;
  spoofing: boolean;
  deviceFlow: boolean;
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
