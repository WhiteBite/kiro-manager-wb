import { Translations } from '../types';

export const de: Translations = {
  // Header & Navigation
  kiroAccounts: 'Kiro Konten',
  compactViewTip: 'Karten verkleinern um mehr Konten anzuzeigen',
  settingsTip: 'Auto-Wechsel, Browser-Modus, Protokollierung konfigurieren',
  back: 'Zurück',

  // Stats
  valid: 'gültig',
  expired: 'abgelaufen',
  total: 'gesamt',
  noActive: 'Kein aktives',
  validFilter: 'Gültig',
  expiredFilter: 'Abgelaufen',

  // Account Groups
  activeGroup: 'Aktiv',
  readyGroup: 'Bereit',
  badGroup: 'Abgelaufen / Erschöpft',
  expiredGroup: 'Abgelaufen',
  exhaustedGroup: 'Erschöpft',
  bannedGroup: 'Gesperrt',
  banned: 'GESPERRT',
  refreshAll: 'Alle aktualisieren',
  deleteAll: 'Alle löschen',

  // Usage card
  todaysUsage: 'Heutige Nutzung',
  used: 'verwendet',
  daysLeft: 'Tage übrig',
  remaining: 'übrig',
  resetsAtMidnight: 'Setzt um Mitternacht zurück',

  // Actions
  autoReg: 'Auto-Reg',
  autoRegTip: 'Neue AWS Builder ID automatisch erstellen',
  import: 'Importieren',
  importTip: 'Vorhandenes Token aus JSON-Datei importieren',
  refresh: 'Aktualisieren',
  refreshTip: 'Konten neu laden und Token-Status aktualisieren',
  export: 'Exportieren',
  exportTip: 'Alle Konten in JSON-Datei speichern',
  running: 'Läuft...',
  stop: 'Stopp',

  // Filters
  all: 'Alle',
  byUsage: 'Nach Nutzung',
  byExpiry: 'Nach Ablauf',
  byDate: 'Nach Datum',
  searchPlaceholder: 'Konten suchen...',
  newBadge: 'NEU',

  // Account card
  active: 'Aktiv',
  copyTokenTip: 'Zugriffstoken in Zwischenablage kopieren',
  refreshTokenTip: 'Abgelaufenes Token aktualisieren',
  viewQuotaTip: 'Nutzungsstatistiken für dieses Konto anzeigen',
  deleteTip: 'Konto und Token-Datei entfernen',
  noAccounts: 'Noch keine Konten',
  createFirst: 'Erstes Konto erstellen',

  // Console
  console: 'Konsole',
  clearTip: 'Konsolenausgabe löschen',
  openLogTip: 'Vollständige Log-Datei im Editor öffnen',
  copyLogsTip: 'Protokolle kopieren',

  // Progress
  step: 'Schritt',

  // Footer
  connected: 'Verbunden',

  // Dialog
  confirm: 'Bestätigen',
  cancel: 'Abbrechen',
  deleteTitle: 'Konto löschen',
  deleteConfirm: 'Sind Sie sicher, dass Sie dieses Konto löschen möchten?',
  areYouSure: 'Sind Sie sicher?',

  // Settings
  settingsTitle: 'Einstellungen',
  autoSwitch: 'Auto-Wechsel bei Ablauf',
  autoSwitchDesc: 'Automatisch zum nächsten gültigen Konto wechseln',
  hideExhausted: 'Erschöpfte ausblenden',
  hideExhaustedDesc: 'Konten mit 100% Nutzung ausblenden',
  headless: 'Headless-Modus',
  headlessDesc: 'Browser im Hintergrund ausführen',
  verbose: 'Ausführliche Protokollierung',
  verboseDesc: 'Detaillierte Protokolle anzeigen',
  screenshots: 'Screenshots bei Fehlern',
  screenshotsDesc: 'Screenshots bei Fehlern speichern',
  spoofing: 'Spoofing-Modus',
  spoofingDesc: 'Browser-Fingerabdruck randomisieren',
  deviceFlow: 'Device Flow Auth',
  deviceFlowDesc: 'Gerätecode statt lokalem Server verwenden',
  language: 'Sprache',
  languageDesc: 'Oberflächensprache',

  // Spoofing modules
  spoofAutomation: 'Automatisierung',
  spoofAutomationDesc: 'Versteckt Webdriver-Flags',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'Randomisiert Fingerabdruck',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'Fälscht Hardware-Info',
  spoofAudio: 'Audio/Schriften',
  spoofAudioDesc: 'Maskiert Audio-Kontext',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'Versteckt lokale IP',
  spoofBehavior: 'Verhalten',
  spoofBehaviorDesc: 'Menschliche Aktionen',
  spoofWarning: 'Deaktivieren kann Bot-Erkennung auslösen',

  // Kiro Patch
  kiroPatch: 'Kiro Patch',
  kiroPatchDesc: 'Patcht Kiro für benutzerdefinierte Maschinen-ID',
  patchStatusLoading: 'Laden...',
  patchStatusActive: 'Gepatcht',
  patchStatusNotPatched: 'Nicht gepatcht',
  patch: 'Patch',
  removePatch: 'Entfernen',
  newMachineId: 'Neue ID',
  patchKiroTitle: 'Kiro patchen',
  patchKiroConfirm: 'Dies patcht Kiro für benutzerdefinierte Maschinen-ID. Schließen Sie Kiro zuerst! Fortfahren?',
  removePatchTitle: 'Patch entfernen',
  removePatchConfirm: 'Dies stellt die Original-Kiro-Dateien wieder her. Fortfahren?',

  // Profile Editor - Basic
  newProfile: 'Neues Profil',
  editProfile: 'Profil bearbeiten',
  profileName: 'Profilname',
  profileNamePlaceholder: 'Mein Gmail',
  server: 'Server',
  port: 'Port',
  password: 'Passwort',
  testConnection: 'Testen',
  testing: 'Teste...',
  emailStrategy: 'E-Mail-Strategie',
  emailStrategyDesc: 'Wählen Sie, wie E-Mails für die Registrierung generiert werden',
  save: 'Speichern',
  createProfile: 'Profil erstellen',

  // Profile Editor - Wizard
  enterYourEmail: 'Geben Sie Ihre E-Mail ein',
  detected: 'Erkannt',
  chooseStrategy: 'Strategie wählen',
  recommended: 'Empfohlen',
  otherOptions: 'Andere Optionen',
  useAppPassword: 'App-Passwort verwenden',
  imapConnection: 'IMAP-Verbindung',
  optional: 'optional',
  checkConnection: 'Verbindung prüfen',

  // Strategies
  strategySingleName: 'Einzelne E-Mail',
  strategySingleDesc: 'Verwendet Ihre IMAP-E-Mail direkt. Nur 1 Konto pro E-Mail.',
  strategySingleExample: 'ihre@gmail.com → ihre@gmail.com',
  strategyPlusAliasName: 'Plus-Alias',
  strategyPlusAliasDesc: 'Fügt +random zu Ihrer E-Mail hinzu. Alle E-Mails kommen im selben Postfach an. Funktioniert mit Gmail, Outlook, Yandex.',
  strategyPlusAliasExample: 'ihre@gmail.com → ihre+kiro5x7@gmail.com',
  strategyCatchAllName: 'Catch-All-Domain',
  strategyCatchAllDesc: 'Generiert zufällige E-Mails auf Ihrer Domain. Erfordert Catch-All-Konfiguration auf dem Mailserver.',
  strategyCatchAllExample: 'JohnSmith4521@ihredomain.com',
  strategyCatchAllHint: 'Geben Sie die Domain mit Catch-All-Konfiguration ein. Alle E-Mails an beliebig@domain kommen in Ihrem IMAP-Postfach an.',
  strategyCatchAllDomain: 'Registrierungsdomain',
  strategyPoolName: 'E-Mail-Pool',
  strategyPoolDesc: 'Verwenden Sie eine Liste Ihrer E-Mail-Adressen. Jede E-Mail wird einmal der Reihe nach verwendet.',
  strategyPoolHint: 'Fügen Sie E-Mail-Adressen hinzu, die der Reihe nach verwendet werden. Jede E-Mail = 1 Konto.',
  strategyPoolAdd: 'E-Mail hinzufügen...',
  strategyPoolFromFile: 'Aus Datei',
  strategyPoolPaste: 'Paste',
  poolEmpty: 'Add at least one email to pool',
  emailsAdded: '{count} E-Mails hinzugefügt',
  example: 'Beispiel',

  // Strategy Features
  unlimitedAccounts: 'Unbegrenzte Konten',
  allEmailsOneInbox: 'Alle E-Mails in einem Postfach',
  noOwnDomain: 'Keine eigene Domain nötig',
  notAllProvidersSupport: 'Nicht alle Anbieter unterstützen',
  uniqueEmails: 'Einzigartige E-Mail-Adressen',
  needOwnDomain: 'Eigene Domain erforderlich',
  needCatchAllSetup: 'Catch-All-Einrichtung erforderlich',
  easyToSetup: 'Einfach einzurichten',
  worksEverywhere: 'Funktioniert überall',
  oneAccountPerEmail: 'Nur 1 Konto pro E-Mail',
  worksWithAnyProvider: 'Funktioniert mit jedem Anbieter',
  controlOverList: 'Kontrolle über Liste',
  needManyEmails: 'Viele E-Mails erforderlich',
  requiresDomain: 'Eigene Domain erforderlich',
  providerNoAlias: 'unterstützt keine Aliase',

  // Profile Panel & Active Profile
  activeProfile: 'Aktives Profil',
  change: 'Ändern',
  noProfileConfigured: 'Kein Profil konfiguriert',
  configure: 'Konfigurieren',
  emailProfiles: 'E-Mail-Profile',
  noProfiles: 'Keine Profile konfiguriert',
  addProfile: 'Profil hinzufügen',
  success: 'Erfolg',
  failed: 'Fehlgeschlagen',

  // Strategy short descriptions
  strategySingleShort: 'Ein Konto pro E-Mail',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'Beliebige E-Mail auf Domain',
  strategyPoolShort: 'Ihre E-Mail-Liste',

  // Danger Zone
  dangerZone: 'Gefahrenzone',
  resetMachineId: 'Maschinen-ID zurücksetzen',
  resetMachineIdDesc: 'Generiert neue Telemetrie-IDs für Kiro. Verwenden Sie es, wenn das Konto gesperrt ist.',
  resetMachineIdTip: 'machineId, sqmId, devDeviceId und serviceMachineId zurücksetzen',
  reset: 'Zurücksetzen',
  restartAfterReset: 'Kiro nach dem Zurücksetzen neu starten',
  resetMachineIdTitle: 'Maschinen-ID zurücksetzen',
  resetMachineIdConfirm: 'Dies setzt die Kiro-Telemetrie-IDs zurück. Sie müssen Kiro danach neu starten. Fortfahren?',

  // Other
  delete: 'Löschen',
  checkUpdates: 'Updates prüfen',
  newVersion: 'Neue Version!',
  download: 'Herunterladen',
  edit: 'Bearbeiten',
  unnamed: 'Unbenannt',
  customDomain: 'Benutzerdefinierte Domain',
  emailPasswordHint: 'Verwenden Sie Ihr E-Mail-Passwort',

  // SSO Modal
  ssoImport: 'SSO-Import',
  ssoHint: '1. view.awsapps.com/start öffnen\n2. DevTools → Application → Cookies\n3. x-amz-sso_authn kopieren',
  pasteCookie: 'Cookie einfügen...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'Benutzerdefinierte Domain',

  // Provider Password Hints
  gmailPasswordHint: 'App-Passwort aus Google-Kontoeinstellungen verwenden',
  yandexPasswordHint: 'App-Passwort aus Yandex-Einstellungen verwenden',
  mailruPasswordHint: 'App-Passwort in Mail.ru-Einstellungen erstellen',
  outlookPasswordHint: 'Microsoft-Kontopasswort verwenden',

  // Toasts & Messages
  accountDeleted: 'Konto gelöscht',
  badAccountsDeleted: 'Schlechte Konten gelöscht',
  resettingMachineId: 'Maschinen-ID wird zurückgesetzt...',
  patchingKiro: 'Kiro wird gepatcht...',
  removingPatch: 'Patch wird entfernt...',
  profileCreated: 'Profil erstellt',
  profileUpdated: 'Profil aktualisiert',
  profileDeleted: 'Profil gelöscht',
  tokenCopied: 'Token in Zwischenablage kopiert',
  logsCopied: 'Protokolle in Zwischenablage kopiert',
  fillAllFields: 'Bitte alle IMAP-Felder ausfüllen',
  clipboardError: 'Zwischenablage konnte nicht gelesen werden',
  deleteProfileConfirm: 'Dieses Profil löschen?',
  deleteBadAccountsConfirm: 'Alle abgelaufenen/erschöpften Konten löschen?',
  deleteBannedAccountsConfirm: 'Alle gesperrten Konten löschen?',
  bannedAccountsDeleted: 'Gesperrte Konten gelöscht',
  emailsImported: 'Imported {count} emails',

  // Import/Export
  exportAccounts: 'Export Accounts',
  exportAccountsDesc: 'Export accounts with tokens',
  importAccounts: 'Import Accounts',
  importAccountsDesc: 'Import accounts from file',
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
  checkHealth: 'Gesundheit prüfen',
  checkingHealth: 'Konten werden überprüft...',

  // Hero Profile Display
  ready: 'Bereit',
  clickToConfigure: 'Klicken zum Konfigurieren',

  // Search
  noAccountsFound: 'Keine Konten gefunden',
  clearSearch: 'Suche löschen',

  // Settings Cards
  automation: 'Automatisierung',
  interface: 'Oberfläche',
  autoSwitchThreshold: 'Wechselschwelle',
  autoSwitchThresholdDesc: 'Wechseln wenn verbleibend < dieser Wert',
  settings: 'Einstellungen',
  accounts: 'Konten',
  profiles: 'Profile',
  pause: 'Pause',

  // Stats Dashboard
  statistics: 'Statistiken',
  weeklyUsage: 'Wöchentliche Nutzung',
  avgPerAccount: 'Durchschnitt pro Konto',
  accountHealth: 'Kontostatus',
};
