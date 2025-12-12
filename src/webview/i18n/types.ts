/**
 * i18n Type Definitions
 */

export type Language = 'en' | 'ru' | 'zh' | 'es' | 'pt' | 'ja' | 'de' | 'fr' | 'ko' | 'hi';

export interface Translations {
  // Header & Navigation
  kiroAccounts: string;
  compactViewTip: string;
  settingsTip: string;
  // Stats
  valid: string;
  expired: string;
  total: string;
  noActive: string;
  validFilter: string;
  expiredFilter: string;
  // Usage card
  todaysUsage: string;
  used: string;
  daysLeft: string;
  resetsAtMidnight: string;
  // Actions
  autoReg: string;
  autoRegTip: string;
  import: string;
  importTip: string;
  refresh: string;
  refreshTip: string;
  export: string;
  exportTip: string;
  running: string;
  // Filters
  all: string;
  byEmail: string;
  byUsage: string;
  byExpiry: string;
  // Account card
  active: string;
  copyTokenTip: string;
  refreshTokenTip: string;
  viewQuotaTip: string;
  deleteTip: string;
  noAccounts: string;
  createFirst: string;
  // Console
  console: string;
  clearTip: string;
  openLogTip: string;
  copyLogsTip: string;
  // Progress
  step: string;
  // Footer
  connected: string;
  // Dialog
  confirm: string;
  cancel: string;
  deleteTitle: string;
  deleteConfirm: string;
  // Settings
  settingsTitle: string;
  autoSwitch: string;
  autoSwitchDesc: string;
  hideExhausted: string;
  hideExhaustedDesc: string;
  headless: string;
  headlessDesc: string;
  verbose: string;
  verboseDesc: string;
  screenshots: string;
  screenshotsDesc: string;
  language: string;
  languageDesc: string;
}