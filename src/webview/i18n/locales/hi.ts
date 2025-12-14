import { Translations } from '../types';

export const hi: Translations = {
  // Header & Navigation
  kiroAccounts: 'Kiro खाते',
  compactViewTip: 'अधिक खाते दिखाने के लिए कार्ड छोटे करें',
  settingsTip: 'ऑटो-स्विच, ब्राउज़र मोड, लॉगिंग कॉन्फ़िगर करें',
  back: 'वापस',

  // Stats
  valid: 'वैध',
  expired: 'समाप्त',
  total: 'कुल',
  noActive: 'कोई सक्रिय नहीं',
  validFilter: 'वैध',
  expiredFilter: 'समाप्त',

  // Account Groups
  activeGroup: 'सक्रिय',
  readyGroup: 'तैयार',
  badGroup: 'समाप्त / खत्म',
  expiredGroup: 'समाप्त',
  exhaustedGroup: 'खत्म',
  bannedGroup: 'प्रतिबंधित',
  banned: 'प्रतिबंधित',
  refreshAll: 'सभी रिफ्रेश करें',
  deleteAll: 'सभी हटाएं',

  // Usage card
  todaysUsage: 'आज का उपयोग',
  used: 'उपयोग किया',
  daysLeft: 'दिन बाकी',
  resetsAtMidnight: 'आधी रात को रीसेट',

  // Actions
  autoReg: 'ऑटो-रेग',
  autoRegTip: 'स्वचालित रूप से नया AWS Builder ID बनाएं',
  import: 'आयात',
  importTip: 'JSON फ़ाइल से मौजूदा टोकन आयात करें',
  refresh: 'रीफ्रेश',
  refreshTip: 'खाते पुनः लोड करें और टोकन स्थिति अपडेट करें',
  export: 'निर्यात',
  exportTip: 'सभी खातों को JSON फ़ाइल में सहेजें',
  running: 'चल रहा है...',
  stop: 'रोकें',

  // Filters
  all: 'सभी',
  byUsage: 'उपयोग द्वारा',
  byExpiry: 'समाप्ति द्वारा',
  byDate: 'तारीख द्वारा',
  searchPlaceholder: 'खाते खोजें...',
  newBadge: 'नया',

  // Account card
  active: 'सक्रिय',
  copyTokenTip: 'एक्सेस टोकन क्लिपबोर्ड पर कॉपी करें',
  refreshTokenTip: 'समाप्त टोकन रीफ्रेश करें',
  viewQuotaTip: 'इस खाते के उपयोग आंकड़े दिखाएं',
  deleteTip: 'खाता और टोकन फ़ाइल हटाएं',
  noAccounts: 'अभी तक कोई खाता नहीं',
  createFirst: 'पहला खाता बनाएं',

  // Console
  console: 'कंसोल',
  clearTip: 'कंसोल आउटपुट साफ़ करें',
  openLogTip: 'संपादक में पूर्ण लॉग फ़ाइल खोलें',
  copyLogsTip: 'लॉग कॉपी करें',

  // Progress
  step: 'चरण',

  // Footer
  connected: 'जुड़ा हुआ',

  // Dialog
  confirm: 'पुष्टि करें',
  cancel: 'रद्द करें',
  deleteTitle: 'खाता हटाएं',
  deleteConfirm: 'क्या आप वाकई इस खाते को हटाना चाहते हैं?',
  areYouSure: 'क्या आप निश्चित हैं?',

  // Settings
  settingsTitle: 'सेटिंग्स',
  autoSwitch: 'समाप्ति पर ऑटो-स्विच',
  autoSwitchDesc: 'स्वचालित रूप से अगले वैध खाते पर स्विच करें',
  hideExhausted: 'समाप्त छुपाएं',
  hideExhaustedDesc: '100% उपयोग वाले खातों को छुपाएं',
  headless: 'हेडलेस मोड',
  headlessDesc: 'पृष्ठभूमि में ब्राउज़र चलाएं',
  verbose: 'विस्तृत लॉगिंग',
  verboseDesc: 'विस्तृत लॉग दिखाएं',
  screenshots: 'त्रुटि पर स्क्रीनशॉट',
  screenshotsDesc: 'त्रुटियों पर स्क्रीनशॉट सहेजें',
  spoofing: 'स्पूफिंग मोड',
  spoofingDesc: 'ब्राउज़र फिंगरप्रिंट को रैंडमाइज़ करें',
  deviceFlow: 'डिवाइस फ्लो प्रमाणीकरण',
  deviceFlowDesc: 'स्थानीय सर्वर के बजाय डिवाइस कोड का उपयोग करें',
  language: 'भाषा',
  languageDesc: 'इंटरफ़ेस भाषा',

  // Spoofing modules
  spoofAutomation: 'ऑटोमेशन',
  spoofAutomationDesc: 'webdriver फ्लैग छुपाएं',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'फिंगरप्रिंट रैंडमाइज़ करें',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'हार्डवेयर जानकारी स्पूफ करें',
  spoofAudio: 'ऑडियो/फॉन्ट्स',
  spoofAudioDesc: 'ऑडियो कॉन्टेक्स्ट मास्क करें',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'लोकल IP छुपाएं',
  spoofBehavior: 'व्यवहार',
  spoofBehaviorDesc: 'मानव जैसी क्रियाएं',
  spoofWarning: 'अक्षम करने से बॉट डिटेक्शन हो सकता है',

  // Kiro Patch
  kiroPatch: 'Kiro पैच',
  kiroPatchDesc: 'कस्टम मशीन ID उपयोग करने के लिए Kiro को पैच करें',
  patchStatusLoading: 'लोड हो रहा है...',
  patchStatusActive: 'पैच किया गया',
  patchStatusNotPatched: 'पैच नहीं किया',
  patch: 'पैच',
  removePatch: 'हटाएं',
  newMachineId: 'नया ID',
  patchKiroTitle: 'Kiro पैच करें',
  patchKiroConfirm: 'यह कस्टम मशीन ID उपयोग करने के लिए Kiro को पैच करेगा। पहले Kiro बंद करें! जारी रखें?',
  removePatchTitle: 'पैच हटाएं',
  removePatchConfirm: 'यह मूल Kiro फ़ाइलों को पुनर्स्थापित करेगा। जारी रखें?',

  // Profile Editor - Basic
  newProfile: 'नया प्रोफ़ाइल',
  editProfile: 'प्रोफ़ाइल संपादित करें',
  profileName: 'प्रोफ़ाइल नाम',
  profileNamePlaceholder: 'मेरा Gmail',
  server: 'सर्वर',
  port: 'पोर्ट',
  password: 'पासवर्ड',
  testConnection: 'परीक्षण',
  testing: 'परीक्षण हो रहा है...',
  emailStrategy: 'ईमेल रणनीति',
  emailStrategyDesc: 'पंजीकरण के लिए ईमेल कैसे जनरेट करें चुनें',
  save: 'सहेजें',
  createProfile: 'प्रोफ़ाइल बनाएं',

  // Profile Editor - Wizard
  enterYourEmail: 'अपना ईमेल दर्ज करें',
  detected: 'पता चला',
  chooseStrategy: 'रणनीति चुनें',
  recommended: 'अनुशंसित',
  otherOptions: 'अन्य विकल्प',
  useAppPassword: 'ऐप पासवर्ड का उपयोग करें',
  imapConnection: 'IMAP कनेक्शन',
  optional: 'वैकल्पिक',
  checkConnection: 'कनेक्शन जांचें',

  // Strategies
  strategySingleName: 'एकल ईमेल',
  strategySingleDesc: 'आपके IMAP ईमेल का सीधे उपयोग करता है। प्रति ईमेल केवल 1 खाता।',
  strategySingleExample: 'your@gmail.com → your@gmail.com',
  strategyPlusAliasName: 'Plus उपनाम',
  strategyPlusAliasDesc: 'आपके ईमेल में +random जोड़ता है। सभी ईमेल एक ही इनबॉक्स में आते हैं। Gmail, Outlook, Yandex के साथ काम करता है।',
  strategyPlusAliasExample: 'your@gmail.com → your+kiro5x7@gmail.com',
  strategyCatchAllName: 'Catch-All डोमेन',
  strategyCatchAllDesc: 'आपके डोमेन पर यादृच्छिक ईमेल जनरेट करता है। मेल सर्वर पर catch-all कॉन्फ़िगर होना आवश्यक।',
  strategyCatchAllExample: 'JohnSmith4521@yourdomain.com',
  strategyCatchAllHint: 'catch-all कॉन्फ़िगर किया गया डोमेन दर्ज करें। किसी भी@डोमेन पर सभी ईमेल आपके IMAP इनबॉक्स में आएंगे।',
  strategyCatchAllDomain: 'पंजीकरण डोमेन',
  strategyPoolName: 'ईमेल पूल',
  strategyPoolDesc: 'अपने ईमेल पतों की सूची का उपयोग करें। प्रत्येक ईमेल क्रम में एक बार उपयोग किया जाता है।',
  strategyPoolHint: 'क्रम में उपयोग करने के लिए ईमेल पते जोड़ें। प्रत्येक ईमेल = 1 खाता।',
  strategyPoolAdd: 'ईमेल जोड़ें...',
  strategyPoolFromFile: 'फ़ाइल से',
  strategyPoolPaste: 'Paste',
  poolEmpty: 'Add at least one email to pool',
  example: 'उदाहरण',

  // Strategy Features
  unlimitedAccounts: 'असीमित खाते',
  allEmailsOneInbox: 'सभी ईमेल एक इनबॉक्स में',
  noOwnDomain: 'अपना डोमेन आवश्यक नहीं',
  notAllProvidersSupport: 'सभी प्रदाता समर्थन नहीं करते',
  uniqueEmails: 'अद्वितीय ईमेल पते',
  needOwnDomain: 'अपना डोमेन आवश्यक',
  needCatchAllSetup: 'catch-all सेटअप आवश्यक',
  easyToSetup: 'सेटअप करना आसान',
  worksEverywhere: 'हर जगह काम करता है',
  oneAccountPerEmail: 'प्रति ईमेल केवल 1 खाता',
  worksWithAnyProvider: 'किसी भी प्रदाता के साथ काम करता है',
  controlOverList: 'सूची पर नियंत्रण',
  needManyEmails: 'कई ईमेल आवश्यक',
  requiresDomain: 'अपना डोमेन आवश्यक',
  providerNoAlias: 'उपनाम का समर्थन नहीं करता',

  // Profile Panel & Active Profile
  activeProfile: 'सक्रिय प्रोफ़ाइल',
  change: 'बदलें',
  noProfileConfigured: 'कोई प्रोफ़ाइल कॉन्फ़िगर नहीं',
  configure: 'कॉन्फ़िगर करें',
  emailProfiles: 'ईमेल प्रोफ़ाइल',
  noProfiles: 'कोई प्रोफ़ाइल कॉन्फ़िगर नहीं',
  addProfile: 'प्रोफ़ाइल जोड़ें',
  success: 'सफल',
  failed: 'विफल',

  // Strategy short descriptions
  strategySingleShort: 'प्रति ईमेल एक खाता',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'डोमेन पर कोई भी ईमेल',
  strategyPoolShort: 'आपकी ईमेल सूची',

  // Danger Zone
  dangerZone: 'खतरनाक क्षेत्र',
  resetMachineId: 'मशीन ID रीसेट करें',
  resetMachineIdDesc: 'Kiro के लिए नए टेलीमेट्री ID जनरेट करें। अगर खाता प्रतिबंधित है तो उपयोग करें।',
  resetMachineIdTip: 'machineId, sqmId, devDeviceId और serviceMachineId रीसेट करें',
  reset: 'रीसेट',
  restartAfterReset: 'रीसेट के बाद Kiro को पुनः आरंभ करें',
  resetMachineIdTitle: 'मशीन ID रीसेट करें',
  resetMachineIdConfirm: 'यह Kiro टेलीमेट्री ID रीसेट करेगा। आपको बाद में Kiro पुनः आरंभ करना होगा। जारी रखें?',

  // Other
  delete: 'हटाएं',
  checkUpdates: 'अपडेट जांचें',
  newVersion: 'नया संस्करण!',
  download: 'डाउनलोड',
  edit: 'संपादित करें',
  unnamed: 'बिना नाम',
  customDomain: 'कस्टम डोमेन',
  emailPasswordHint: 'अपना ईमेल पासवर्ड उपयोग करें',

  // SSO Modal
  ssoImport: 'SSO आयात',
  ssoHint: '1. view.awsapps.com/start खोलें\n2. DevTools → Application → Cookies\n3. x-amz-sso_authn कॉपी करें',
  pasteCookie: 'कुकी पेस्ट करें...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'कस्टम डोमेन',

  // Provider Password Hints
  gmailPasswordHint: 'Google खाता सेटिंग्स से ऐप पासवर्ड उपयोग करें',
  yandexPasswordHint: 'Yandex सेटिंग्स से ऐप पासवर्ड उपयोग करें',
  mailruPasswordHint: 'Mail.ru सेटिंग्स में ऐप पासवर्ड बनाएं',
  outlookPasswordHint: 'अपना Microsoft खाता पासवर्ड उपयोग करें',

  // Toasts & Messages
  accountDeleted: 'खाता हटाया गया',
  badAccountsDeleted: 'खराब खाते हटाए गए',
  resettingMachineId: 'मशीन ID रीसेट हो रहा है...',
  patchingKiro: 'Kiro पैच हो रहा है...',
  removingPatch: 'पैच हटाया जा रहा है...',
  profileCreated: 'प्रोफ़ाइल बनाया गया',
  profileUpdated: 'प्रोफ़ाइल अपडेट किया गया',
  profileDeleted: 'प्रोफ़ाइल हटाया गया',
  tokenCopied: 'टोकन क्लिपबोर्ड पर कॉपी किया गया',
  logsCopied: 'लॉग क्लिपबोर्ड पर कॉपी किए गए',
  fillAllFields: 'कृपया सभी IMAP फ़ील्ड भरें',
  clipboardError: 'क्लिपबोर्ड पढ़ने में विफल',
  deleteProfileConfirm: 'इस प्रोफ़ाइल को हटाएं?',
  deleteBadAccountsConfirm: 'सभी समाप्त/खत्म खातों को हटाएं?',
  deleteBannedAccountsConfirm: 'सभी प्रतिबंधित खातों को हटाएं?',
  bannedAccountsDeleted: 'प्रतिबंधित खाते हटा दिए गए',
  emailsImported: 'Imported {count} emails',

  // Import/Export
  exportAccounts: 'Export Accounts',
  exportAccountsDesc: 'Export accounts with tokens',
  importAccounts: 'Import Accounts',
  importAccountsDesc: 'Import accounts from file',
  exportSelected: 'Export Selected',
  exportAll: 'Export All',
};
