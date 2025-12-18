/**
 * i18n Type Definitions
 * All UI strings must be defined here for type-safe translations
 */

export type Language = 'en' | 'ru' | 'zh' | 'es' | 'pt' | 'ja' | 'de' | 'fr' | 'ko' | 'hi';

export interface Translations {
  // ============================================
  // Header & Navigation
  // ============================================
  kiroAccounts: string;
  compactViewTip: string;
  settingsTip: string;
  back: string;

  // ============================================
  // Stats
  // ============================================
  valid: string;
  expired: string;
  total: string;
  noActive: string;
  validFilter: string;
  expiredFilter: string;

  // ============================================
  // Account Groups
  // ============================================
  activeGroup: string;
  readyGroup: string;
  badGroup: string;
  expiredGroup: string;
  exhaustedGroup: string;
  bannedGroup: string;
  banned: string;
  refreshAll: string;
  deleteAll: string;

  // ============================================
  // Usage card
  // ============================================
  todaysUsage: string;
  used: string;
  daysLeft: string;
  remaining: string;
  resetsAtMidnight: string;

  // ============================================
  // Actions
  // ============================================
  autoReg: string;
  autoRegTip: string;
  import: string;
  importTip: string;
  refresh: string;
  refreshTip: string;
  export: string;
  exportTip: string;
  running: string;
  stop: string;

  // ============================================
  // Filters
  // ============================================
  all: string;
  byUsage: string;
  byExpiry: string;
  byDate: string;
  searchPlaceholder: string;
  newBadge: string;

  // ============================================
  // Account card
  // ============================================
  active: string;
  copyTokenTip: string;
  refreshTokenTip: string;
  viewQuotaTip: string;
  deleteTip: string;
  noAccounts: string;
  createFirst: string;

  // ============================================
  // Console
  // ============================================
  console: string;
  clearTip: string;
  openLogTip: string;
  copyLogsTip: string;

  // ============================================
  // Progress
  // ============================================
  step: string;

  // ============================================
  // Footer
  // ============================================
  connected: string;

  // ============================================
  // Dialog
  // ============================================
  confirm: string;
  cancel: string;
  deleteTitle: string;
  deleteConfirm: string;
  areYouSure: string;

  // ============================================
  // Settings
  // ============================================
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
  deviceFlow: string;
  deviceFlowDesc: string;
  language: string;
  languageDesc: string;

  // Spoofing modules
  spoofAutomation: string;
  spoofAutomationDesc: string;
  spoofCanvas: string;
  spoofCanvasDesc: string;
  spoofNavigator: string;
  spoofNavigatorDesc: string;
  spoofAudio: string;
  spoofAudioDesc: string;
  spoofWebrtc: string;
  spoofWebrtcDesc: string;
  spoofBehavior: string;
  spoofBehaviorDesc: string;
  spoofWarning: string;

  // ============================================
  // Kiro Patch
  // ============================================
  kiroPatch: string;
  kiroPatchDesc: string;
  patchStatusLoading: string;
  patchStatusActive: string;
  patchStatusNotPatched: string;
  patch: string;
  removePatch: string;
  newMachineId: string;
  patchKiroTitle: string;
  patchKiroConfirm: string;
  removePatchTitle: string;
  removePatchConfirm: string;

  // ============================================
  // Profile Editor - Basic
  // ============================================
  newProfile: string;
  editProfile: string;
  profileName: string;
  profileNamePlaceholder: string;
  server: string;
  port: string;
  password: string;
  testConnection: string;
  testing: string;
  emailStrategy: string;
  emailStrategyDesc: string;
  save: string;
  createProfile: string;

  // ============================================
  // Profile Editor - Wizard
  // ============================================
  enterYourEmail: string;
  detected: string;
  chooseStrategy: string;
  recommended: string;
  otherOptions: string;
  useAppPassword: string;
  imapConnection: string;
  optional: string;
  checkConnection: string;

  // ============================================
  // Strategies
  // ============================================
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

  // ============================================
  // Strategy Features (pros/cons)
  // ============================================
  unlimitedAccounts: string;
  allEmailsOneInbox: string;
  noOwnDomain: string;
  notAllProvidersSupport: string;
  uniqueEmails: string;
  needOwnDomain: string;
  needCatchAllSetup: string;
  easyToSetup: string;
  worksEverywhere: string;
  oneAccountPerEmail: string;
  worksWithAnyProvider: string;
  controlOverList: string;
  needManyEmails: string;
  requiresDomain: string;
  providerNoAlias: string;

  // ============================================
  // Profile Panel & Active Profile
  // ============================================
  activeProfile: string;
  change: string;
  noProfileConfigured: string;
  configure: string;
  emailProfiles: string;
  noProfiles: string;
  addProfile: string;
  success: string;
  failed: string;

  // ============================================
  // Strategy short descriptions
  // ============================================
  strategySingleShort: string;
  strategyPlusAliasShort: string;
  strategyCatchAllShort: string;
  strategyPoolShort: string;

  // ============================================
  // Danger Zone
  // ============================================
  dangerZone: string;
  resetMachineId: string;
  resetMachineIdDesc: string;
  resetMachineIdTip: string;
  reset: string;
  restartAfterReset: string;
  resetMachineIdTitle: string;
  resetMachineIdConfirm: string;

  // ============================================
  // Other
  // ============================================
  delete: string;
  checkUpdates: string;
  newVersion: string;
  download: string;
  edit: string;
  unnamed: string;
  customDomain: string;
  emailPasswordHint: string;

  // ============================================
  // SSO Modal
  // ============================================
  ssoImport: string;
  ssoHint: string;
  pasteCookie: string;

  // ============================================
  // Provider Names
  // ============================================
  providerGmail: string;
  providerYandex: string;
  providerMailru: string;
  providerOutlook: string;
  providerCustom: string;

  // ============================================
  // Provider Password Hints
  // ============================================
  gmailPasswordHint: string;
  yandexPasswordHint: string;
  mailruPasswordHint: string;
  outlookPasswordHint: string;

  // ============================================
  // Toasts & Messages
  // ============================================
  accountDeleted: string;
  badAccountsDeleted: string;
  resettingMachineId: string;
  patchingKiro: string;
  removingPatch: string;
  profileCreated: string;
  profileUpdated: string;
  profileDeleted: string;
  tokenCopied: string;
  logsCopied: string;
  fillAllFields: string;
  clipboardError: string;
  deleteProfileConfirm: string;
  deleteBadAccountsConfirm: string;
  deleteBannedAccountsConfirm: string;
  bannedAccountsDeleted: string;
  emailsImported: string;

  // ============================================
  // Import/Export
  // ============================================
  exportAccounts: string;
  exportAccountsDesc: string;
  importAccounts: string;
  importAccountsDesc: string;
  exportSelected: string;
  exportAll: string;
  poolEmpty: string;
  emailsAdded: string;

  // ============================================
  // Selection Mode (Bulk Actions)
  // ============================================
  selectMode: string;
  selected: string;
  selectAll: string;
  deselectAll: string;
  refreshSelected: string;
  deleteSelected: string;
  deleteSelectedConfirm: string;
  selectedAccountsDeleted: string;
  refreshingTokens: string;
  checkHealth: string;
  checkingHealth: string;

  // ============================================
  // Hero Profile Display
  // ============================================
  ready: string;
  clickToConfigure: string;

  // ============================================
  // Settings Cards
  // ============================================
  automation: string;
  interface: string;
  settings: string;
  accounts: string;
  profiles: string;
  pause: string;

  // ============================================
  // Stats Dashboard
  // ============================================
  statistics: string;
  weeklyUsage: string;
  avgPerAccount: string;
  accountHealth: string;
}
