import { Translations } from '../types';

export const en: Translations = {
  // Header & Navigation
  kiroAccounts: 'Kiro Accounts',
  compactViewTip: 'Shrink cards to show more accounts',
  settingsTip: 'Configure auto-switch, browser mode, logging',
  back: 'Back',

  // Stats
  valid: 'valid',
  expired: 'expired',
  total: 'total',
  noActive: 'No active',
  validFilter: 'Valid',
  expiredFilter: 'Expired',

  // Account Groups
  activeGroup: 'Active',
  readyGroup: 'Ready',
  badGroup: 'Expired / Exhausted',
  expiredGroup: 'Expired',
  exhaustedGroup: 'Exhausted',
  bannedGroup: 'Banned',
  banned: 'BANNED',
  refreshAll: 'Refresh all',
  deleteAll: 'Delete all',

  // Usage card
  todaysUsage: "Today's Usage",
  used: 'used',
  daysLeft: 'days left',
  remaining: 'remaining',
  resetsAtMidnight: 'Resets at midnight',

  // Actions
  autoReg: 'Auto-Reg',
  autoRegTip: 'Create new AWS Builder ID automatically',
  import: 'Import',
  importTip: 'Import existing token from JSON file',
  refresh: 'Refresh',
  refreshTip: 'Reload accounts and update token status',
  export: 'Export',
  exportTip: 'Save all accounts to JSON file',
  running: 'Running...',
  stop: 'Stop',

  // Filters
  all: 'All',
  byUsage: 'By Usage',
  byExpiry: 'By Expiry',
  byDate: 'By Date',
  searchPlaceholder: 'Search accounts...',
  newBadge: 'NEW',

  // Account card
  active: 'Active',
  copyTokenTip: 'Copy access token to clipboard',
  refreshTokenTip: 'Refresh expired token',
  viewQuotaTip: 'Show usage statistics for this account',
  deleteTip: 'Remove account and token file',
  noAccounts: 'No accounts yet',
  createFirst: 'Create First Account',

  // Console
  console: 'Console',
  clearTip: 'Clear console output',
  openLogTip: 'Open full log file in editor',
  copyLogsTip: 'Copy logs to clipboard',

  // Progress
  step: 'Step',

  // Footer
  connected: 'Connected',

  // Dialog
  confirm: 'Confirm',
  cancel: 'Cancel',
  deleteTitle: 'Delete Account',
  deleteConfirm: 'Are you sure you want to delete this account?',
  areYouSure: 'Are you sure?',

  // Settings
  settingsTitle: 'Settings',
  autoSwitch: 'Auto-switch on expiry',
  autoSwitchDesc: 'Automatically switch to next valid account',
  hideExhausted: 'Hide exhausted',
  hideExhaustedDesc: 'Hide accounts with 100% usage',
  headless: 'Headless mode',
  headlessDesc: 'Run browser in background',
  verbose: 'Verbose logging',
  verboseDesc: 'Show detailed logs',
  screenshots: 'Screenshots on error',
  screenshotsDesc: 'Save screenshots when errors occur',
  spoofing: 'Spoofing mode',
  spoofingDesc: 'Randomize browser fingerprint',
  deviceFlow: 'Device Flow auth',
  deviceFlowDesc: 'Use device code instead of local server',
  language: 'Language',
  languageDesc: 'Interface language',

  // Spoofing modules
  spoofAutomation: 'Automation',
  spoofAutomationDesc: 'Hides webdriver flags',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'Randomizes fingerprint',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'Spoofs hardware info',
  spoofAudio: 'Audio/Fonts',
  spoofAudioDesc: 'Masks audio context',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'Hides local IP',
  spoofBehavior: 'Behavior',
  spoofBehaviorDesc: 'Human-like actions',
  spoofWarning: 'Disabling may cause bot detection failures',

  // Kiro Patch
  kiroPatch: 'Kiro Patch',
  kiroPatchDesc: 'Patches Kiro to use custom Machine ID',
  patchStatusLoading: 'Loading...',
  patchStatusActive: 'Patched',
  patchStatusNotPatched: 'Not patched',
  patch: 'Patch',
  removePatch: 'Remove',
  newMachineId: 'New ID',
  patchKiroTitle: 'Patch Kiro',
  patchKiroConfirm: 'This will patch Kiro to use custom Machine ID. Close Kiro first! Continue?',
  removePatchTitle: 'Remove Patch',
  removePatchConfirm: 'This will restore original Kiro files. Continue?',

  // Profile Editor - Basic
  newProfile: 'New Profile',
  editProfile: 'Edit Profile',
  profileName: 'Profile Name',
  profileNamePlaceholder: 'My Gmail',
  server: 'Server',
  port: 'Port',
  password: 'Password',
  testConnection: 'Test',
  testing: 'Testing...',
  emailStrategy: 'Email Strategy',
  emailStrategyDesc: 'Choose how to generate emails for registration',
  save: 'Save',
  createProfile: 'Create Profile',

  // Profile Editor - Wizard
  enterYourEmail: 'Enter your email',
  detected: 'Detected',
  chooseStrategy: 'Choose strategy',
  recommended: 'Recommended',
  otherOptions: 'Other options',
  useAppPassword: 'Use App Password',
  imapConnection: 'IMAP Connection',
  optional: 'optional',
  checkConnection: 'Check connection',

  // Strategies
  strategySingleName: 'Single Email',
  strategySingleDesc: 'Uses your IMAP email directly. Only 1 account per email.',
  strategySingleExample: 'your@gmail.com → your@gmail.com',
  strategyPlusAliasName: 'Plus Alias',
  strategyPlusAliasDesc: 'Adds +random to your email. All emails arrive to same inbox. Works with Gmail, Outlook, Yandex.',
  strategyPlusAliasExample: 'your@gmail.com → your+kiro5x7@gmail.com',
  strategyCatchAllName: 'Catch-All Domain',
  strategyCatchAllDesc: 'Generates random emails on your domain. Requires catch-all configured on mail server.',
  strategyCatchAllExample: 'JohnSmith4521@yourdomain.com',
  strategyCatchAllHint: 'Enter domain with catch-all configured. All emails to any@domain will arrive to your IMAP inbox.',
  strategyCatchAllDomain: 'Registration Domain',
  strategyPoolName: 'Email Pool',
  strategyPoolDesc: 'Use a list of your email addresses. Each email is used once in order.',
  strategyPoolHint: 'Add email addresses to use in order. Each email = 1 account. Format: email:password',
  strategyPoolAdd: 'email:password or email...',
  strategyPoolFromFile: 'From file',
  strategyPoolPaste: 'Paste',
  poolEmpty: 'Add at least one email to pool',
  emailsAdded: '{count} emails added',
  example: 'Example',

  // Strategy Features
  unlimitedAccounts: 'Unlimited accounts',
  allEmailsOneInbox: 'All emails in one inbox',
  noOwnDomain: 'No own domain needed',
  notAllProvidersSupport: 'Not all providers support',
  uniqueEmails: 'Unique email addresses',
  needOwnDomain: 'Need own domain',
  needCatchAllSetup: 'Need catch-all setup',
  easyToSetup: 'Easy to setup',
  worksEverywhere: 'Works everywhere',
  oneAccountPerEmail: 'Only 1 account per email',
  worksWithAnyProvider: 'Works with any provider',
  controlOverList: 'Control over list',
  needManyEmails: 'Need many emails',
  requiresDomain: 'Requires own domain',
  providerNoAlias: 'does not support aliases',

  // Profile Panel & Active Profile
  activeProfile: 'Active Profile',
  change: 'Change',
  noProfileConfigured: 'No profile configured',
  configure: 'Configure',
  emailProfiles: 'Email Profiles',
  noProfiles: 'No profiles configured',
  addProfile: 'Add Profile',
  success: 'Success',
  failed: 'Failed',

  // Strategy short descriptions
  strategySingleShort: 'One account per email',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'Any email on domain',
  strategyPoolShort: 'Your email list',

  // Danger Zone
  dangerZone: 'Danger Zone',
  resetMachineId: 'Reset Machine ID',
  resetMachineIdDesc: 'Generate new telemetry IDs for Kiro. Use if account is banned.',
  resetMachineIdTip: 'Reset machineId, sqmId, devDeviceId and serviceMachineId',
  reset: 'Reset',
  restartAfterReset: 'Restart Kiro after reset',
  resetMachineIdTitle: 'Reset Machine ID',
  resetMachineIdConfirm: 'This will reset Kiro telemetry IDs. You need to restart Kiro after. Continue?',

  // Other
  delete: 'Delete',
  checkUpdates: 'Check Updates',
  newVersion: 'New version!',
  download: 'Download',
  edit: 'Edit',
  unnamed: 'Unnamed',
  customDomain: 'Custom Domain',
  emailPasswordHint: 'Use your email password',

  // SSO Modal
  ssoImport: 'SSO Import',
  ssoHint: '1. Open view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Copy x-amz-sso_authn',
  pasteCookie: 'Paste cookie...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'Custom Domain',

  // Provider Password Hints
  gmailPasswordHint: 'Use App Password from Google Account settings',
  yandexPasswordHint: 'Use app password from Yandex settings',
  mailruPasswordHint: 'Create app password in Mail.ru settings',
  outlookPasswordHint: 'Use your Microsoft account password',

  // Toasts & Messages
  accountDeleted: 'Account deleted',
  badAccountsDeleted: 'Bad accounts deleted',
  resettingMachineId: 'Resetting Machine ID...',
  patchingKiro: 'Patching Kiro...',
  removingPatch: 'Removing patch...',
  profileCreated: 'Profile created',
  profileUpdated: 'Profile updated',
  profileDeleted: 'Profile deleted',
  tokenCopied: 'Token copied to clipboard',
  logsCopied: 'Logs copied to clipboard',
  fillAllFields: 'Please fill all IMAP fields',
  clipboardError: 'Failed to read clipboard',
  deleteProfileConfirm: 'Delete this profile?',
  deleteBadAccountsConfirm: 'Delete all expired/exhausted accounts?',
  deleteBannedAccountsConfirm: 'Delete all banned accounts?',
  bannedAccountsDeleted: 'Banned accounts deleted',
  emailsImported: 'Imported {count} emails',

  // Import/Export
  exportAccounts: 'Export Accounts',
  exportAccountsDesc: 'Export accounts with tokens for transfer',
  importAccounts: 'Import Accounts',
  importAccountsDesc: 'Import accounts from export file',
  exportSelected: 'Export Selected',
  exportAll: 'Export All',

  // Selection Mode (Bulk Actions)
  selectMode: 'Select',
  selected: 'selected',
  selectAll: 'Select All',
  deselectAll: 'Deselect All',
  refreshSelected: 'Refresh Tokens',
  deleteSelected: 'Delete Selected',
  deleteSelectedConfirm: 'Delete {count} selected accounts?',
  selectedAccountsDeleted: '{count} accounts deleted',
  refreshingTokens: 'Refreshing tokens...',
  checkHealth: 'Check Health',
  checkingHealth: 'Checking accounts health...',

  // Hero Profile Display
  ready: 'Ready',
  clickToConfigure: 'Click to configure',

  // Settings Cards
  automation: 'Automation',
  interface: 'Interface',
  settings: 'Settings',
  accounts: 'Accounts',
  profiles: 'Profiles',
  pause: 'Pause',

  // Stats Dashboard
  statistics: 'Statistics',
  weeklyUsage: 'Weekly Usage',
  avgPerAccount: 'Avg per account',
  accountHealth: 'Account Health',
};
