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
  byUsage: string;
  byExpiry: string;
  byDate: string;
  searchPlaceholder: string;
  newBadge: string;
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
  spoofing: string;
  spoofingDesc: string;
  language: string;
  languageDesc: string;
  // Profile Editor
  newProfile: string;
  profileName: string;
  profileNamePlaceholder: string;
  server: string;
  port: string;
  password: string;
  testConnection: string;
  emailStrategy: string;
  emailStrategyDesc: string;
  save: string;
  // Strategies
  strategySingleName: string;
  strategySingleDesc: string;
  strategySingleExample: string;
  strategyPlusAliasName: string;
  strategyPlusAliasDesc: string;
  strategyPlusAliasExample: string;
  strategyCatchAllName: string;
  strategyCatchAllDesc: string;
  strategyCatchAllExample: string;
  strategyCatchAllHint: string;
  strategyCatchAllDomain: string;
  strategyPoolName: string;
  strategyPoolDesc: string;
  strategyPoolHint: string;
  strategyPoolAdd: string;
  strategyPoolFromFile: string;
  strategyPoolPaste: string;
  example: string;
  // Profile Panel & Active Profile
  activeProfile: string;
  change: string;
  noProfileConfigured: string;
  configure: string;
  emailProfiles: string;
  noProfiles: string;
  addProfile: string;
  // Strategy short descriptions (for active profile card)
  strategySingleShort: string;
  strategyPlusAliasShort: string;
  strategyCatchAllShort: string;
  strategyPoolShort: string;
  // Danger Zone
  dangerZone: string;
  resetMachineId: string;
  resetMachineIdDesc: string;
  resetMachineIdTip: string;
  reset: string;
  restartAfterReset: string;
  // Other
  deleteAll: string;
  delete: string;
  checkUpdates: string;
  newVersion: string;
  download: string;
  // SSO Modal
  ssoImport: string;
  ssoHint: string;
  pasteCookie: string;
}