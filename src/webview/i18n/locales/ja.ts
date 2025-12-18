import { Translations } from '../types';

export const ja: Translations = {
  // Header & Navigation
  kiroAccounts: 'Kiro アカウント',
  compactViewTip: 'カードを縮小してより多くのアカウントを表示',
  settingsTip: '自動切替、ブラウザモード、ログを設定',
  back: '戻る',

  // Stats
  valid: '有効',
  expired: '期限切れ',
  total: '合計',
  noActive: 'アクティブなし',
  validFilter: '有効',
  expiredFilter: '期限切れ',

  // Account Groups
  activeGroup: 'アクティブ',
  readyGroup: '準備完了',
  badGroup: '期限切れ / 使い切り',
  expiredGroup: '期限切れ',
  exhaustedGroup: '使い切り',
  bannedGroup: 'BAN済み',
  banned: 'BAN',
  refreshAll: 'すべて更新',
  deleteAll: 'すべて削除',

  // Usage card
  todaysUsage: '今日の使用量',
  used: '使用済み',
  daysLeft: '日残り',
  remaining: '残り',
  resetsAtMidnight: '深夜にリセット',

  // Actions
  autoReg: '自動登録',
  autoRegTip: '新しいAWS Builder IDを自動作成',
  import: 'インポート',
  importTip: 'JSONファイルから既存のトークンをインポート',
  refresh: '更新',
  refreshTip: 'アカウントを再読み込みしてトークン状態を更新',
  export: 'エクスポート',
  exportTip: 'すべてのアカウントをJSONファイルに保存',
  running: '実行中...',
  stop: '停止',

  // Filters
  all: 'すべて',
  byUsage: '使用量順',
  byExpiry: '有効期限順',
  byDate: '日付順',
  searchPlaceholder: 'アカウントを検索...',
  newBadge: '新規',

  // Account card
  active: 'アクティブ',
  copyTokenTip: 'アクセストークンをクリップボードにコピー',
  refreshTokenTip: '期限切れトークンを更新',
  viewQuotaTip: 'このアカウントの使用統計を表示',
  deleteTip: 'アカウントとトークンファイルを削除',
  noAccounts: 'アカウントがありません',
  createFirst: '最初のアカウントを作成',

  // Console
  console: 'コンソール',
  clearTip: 'コンソール出力をクリア',
  openLogTip: 'エディタで完全なログファイルを開く',
  copyLogsTip: 'ログをコピー',

  // Progress
  step: 'ステップ',

  // Footer
  connected: '接続済み',

  // Dialog
  confirm: '確認',
  cancel: 'キャンセル',
  deleteTitle: 'アカウントを削除',
  deleteConfirm: 'このアカウントを削除してもよろしいですか？',
  areYouSure: 'よろしいですか？',

  // Settings
  settingsTitle: '設定',
  autoSwitch: '期限切れ時に自動切替',
  autoSwitchDesc: '次の有効なアカウントに自動的に切り替え',
  hideExhausted: '使い切りを非表示',
  hideExhaustedDesc: '使用量100%のアカウントを非表示',
  headless: 'ヘッドレスモード',
  headlessDesc: 'バックグラウンドでブラウザを実行',
  verbose: '詳細ログ',
  verboseDesc: '詳細なログを表示',
  screenshots: 'エラー時スクリーンショット',
  screenshotsDesc: 'エラー発生時にスクリーンショットを保存',
  spoofing: 'スプーフィングモード',
  spoofingDesc: 'ブラウザフィンガープリントをランダム化',
  deviceFlow: 'デバイスフロー認証',
  deviceFlowDesc: 'ローカルサーバーの代わりにデバイスコードを使用',
  language: '言語',
  languageDesc: 'インターフェース言語',

  // Spoofing modules
  spoofAutomation: '自動化',
  spoofAutomationDesc: 'webdriverフラグを隠す',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'フィンガープリントをランダム化',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'ハードウェア情報を偽装',
  spoofAudio: 'オーディオ/フォント',
  spoofAudioDesc: 'オーディオコンテキストをマスク',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'ローカルIPを隠す',
  spoofBehavior: '動作',
  spoofBehaviorDesc: '人間らしい動作',
  spoofWarning: '無効にするとボット検出される可能性があります',

  // Kiro Patch
  kiroPatch: 'Kiro パッチ',
  kiroPatchDesc: 'カスタムマシンIDを使用するためにKiroにパッチを適用',
  patchStatusLoading: '読み込み中...',
  patchStatusActive: 'パッチ済み',
  patchStatusNotPatched: '未パッチ',
  patch: 'パッチ',
  removePatch: '削除',
  newMachineId: '新しいID',
  patchKiroTitle: 'Kiroにパッチを適用',
  patchKiroConfirm: 'カスタムマシンIDを使用するためにKiroにパッチを適用します。先にKiroを閉じてください！続行しますか？',
  removePatchTitle: 'パッチを削除',
  removePatchConfirm: 'オリジナルのKiroファイルを復元します。続行しますか？',

  // Profile Editor - Basic
  newProfile: '新規プロファイル',
  editProfile: 'プロファイルを編集',
  profileName: 'プロファイル名',
  profileNamePlaceholder: 'マイGmail',
  server: 'サーバー',
  port: 'ポート',
  password: 'パスワード',
  testConnection: 'テスト',
  testing: 'テスト中...',
  emailStrategy: 'メール戦略',
  emailStrategyDesc: '登録用メールの生成方法を選択',
  save: '保存',
  createProfile: 'プロファイルを作成',

  // Profile Editor - Wizard
  enterYourEmail: 'メールアドレスを入力',
  detected: '検出済み',
  chooseStrategy: '戦略を選択',
  recommended: 'おすすめ',
  otherOptions: 'その他のオプション',
  useAppPassword: 'アプリパスワードを使用',
  imapConnection: 'IMAP接続',
  optional: 'オプション',
  checkConnection: '接続を確認',

  // Strategies
  strategySingleName: 'シングルメール',
  strategySingleDesc: 'IMAPメールを直接使用。メール1つにつき1アカウントのみ。',
  strategySingleExample: 'your@gmail.com → your@gmail.com',
  strategyPlusAliasName: 'Plusエイリアス',
  strategyPlusAliasDesc: 'メールに+randomを追加。すべてのメールが同じ受信箱に届きます。Gmail、Outlook、Yandexで動作。',
  strategyPlusAliasExample: 'your@gmail.com → your+kiro5x7@gmail.com',
  strategyCatchAllName: 'Catch-Allドメイン',
  strategyCatchAllDesc: 'ドメイン上でランダムなメールを生成。メールサーバーでcatch-allの設定が必要。',
  strategyCatchAllExample: 'JohnSmith4521@yourdomain.com',
  strategyCatchAllHint: 'catch-allが設定されたドメインを入力。任意@ドメインへのすべてのメールがIMAP受信箱に届きます。',
  strategyCatchAllDomain: '登録ドメイン',
  strategyPoolName: 'メールプール',
  strategyPoolDesc: 'メールアドレスのリストを使用。各メールは順番に1回使用されます。',
  strategyPoolHint: '順番に使用するメールアドレスを追加。各メール = 1アカウント。',
  strategyPoolAdd: 'メールを追加...',
  strategyPoolFromFile: 'ファイルから',
  strategyPoolPaste: 'Paste',
  poolEmpty: 'Add at least one email to pool',
  emailsAdded: '{count}件のメール追加',
  example: '例',

  // Strategy Features
  unlimitedAccounts: '無制限のアカウント',
  allEmailsOneInbox: 'すべてのメールが1つの受信箱に',
  noOwnDomain: '独自ドメイン不要',
  notAllProvidersSupport: 'すべてのプロバイダーがサポートしているわけではない',
  uniqueEmails: 'ユニークなメールアドレス',
  needOwnDomain: '独自ドメインが必要',
  needCatchAllSetup: 'catch-all設定が必要',
  easyToSetup: '設定が簡単',
  worksEverywhere: 'どこでも動作',
  oneAccountPerEmail: 'メール1つにつき1アカウントのみ',
  worksWithAnyProvider: 'どのプロバイダーでも動作',
  controlOverList: 'リストの制御',
  needManyEmails: '多くのメールが必要',
  requiresDomain: '独自ドメインが必要',
  providerNoAlias: 'はエイリアスをサポートしていません',

  // Profile Panel & Active Profile
  activeProfile: 'アクティブプロファイル',
  change: '変更',
  noProfileConfigured: 'プロファイル未設定',
  configure: '設定',
  emailProfiles: 'メールプロファイル',
  noProfiles: 'プロファイルがありません',
  addProfile: 'プロファイルを追加',
  success: '成功',
  failed: '失敗',

  // Strategy short descriptions
  strategySingleShort: 'メール1つにつき1アカウント',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'ドメイン上の任意のメール',
  strategyPoolShort: 'メールリスト',

  // Danger Zone
  dangerZone: '危険ゾーン',
  resetMachineId: 'マシンIDをリセット',
  resetMachineIdDesc: 'Kiroの新しいテレメトリIDを生成。アカウントがBANされた場合に使用。',
  resetMachineIdTip: 'machineId、sqmId、devDeviceId、serviceMachineIdをリセット',
  reset: 'リセット',
  restartAfterReset: 'リセット後にKiroを再起動してください',
  resetMachineIdTitle: 'マシンIDをリセット',
  resetMachineIdConfirm: 'KiroのテレメトリIDをリセットします。その後Kiroを再起動する必要があります。続行しますか？',

  // Other
  delete: '削除',
  checkUpdates: '更新を確認',
  newVersion: '新バージョン！',
  download: 'ダウンロード',
  edit: '編集',
  unnamed: '名前なし',
  customDomain: 'カスタムドメイン',
  emailPasswordHint: 'メールパスワードを使用',

  // SSO Modal
  ssoImport: 'SSOインポート',
  ssoHint: '1. view.awsapps.com/startを開く\n2. DevTools → Application → Cookies\n3. x-amz-sso_authnをコピー',
  pasteCookie: 'Cookieを貼り付け...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'カスタムドメイン',

  // Provider Password Hints
  gmailPasswordHint: 'Googleアカウント設定からアプリパスワードを使用',
  yandexPasswordHint: 'Yandex設定からアプリパスワードを使用',
  mailruPasswordHint: 'Mail.ru設定でアプリパスワードを作成',
  outlookPasswordHint: 'Microsoftアカウントのパスワードを使用',

  // Toasts & Messages
  accountDeleted: 'アカウントを削除しました',
  badAccountsDeleted: '不良アカウントを削除しました',
  resettingMachineId: 'マシンIDをリセット中...',
  patchingKiro: 'Kiroにパッチを適用中...',
  removingPatch: 'パッチを削除中...',
  profileCreated: 'プロファイルを作成しました',
  profileUpdated: 'プロファイルを更新しました',
  profileDeleted: 'プロファイルを削除しました',
  tokenCopied: 'トークンをクリップボードにコピーしました',
  logsCopied: 'ログをクリップボードにコピーしました',
  fillAllFields: 'すべてのIMAPフィールドを入力してください',
  clipboardError: 'クリップボードの読み取りに失敗しました',
  deleteProfileConfirm: 'このプロファイルを削除しますか？',
  deleteBadAccountsConfirm: 'すべての期限切れ/使い切りアカウントを削除しますか？',
  deleteBannedAccountsConfirm: 'BAN済みアカウントをすべて削除しますか？',
  bannedAccountsDeleted: 'BAN済みアカウントを削除しました',
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
  checkHealth: 'ヘルスチェック',
  checkingHealth: 'アカウントの状態を確認中...',

  // Hero Profile Display
  ready: '準備完了',
  clickToConfigure: 'クリックして設定',

  // Search
  noAccountsFound: 'アカウントが見つかりません',
  clearSearch: '検索をクリア',

  // Settings Cards
  automation: '自動化',
  interface: 'インターフェース',
  settings: '設定',
  accounts: 'アカウント',
  profiles: 'プロファイル',
  pause: '一時停止',

  // Stats Dashboard
  statistics: '統計',
  weeklyUsage: '週間使用量',
  avgPerAccount: 'アカウント平均',
  accountHealth: 'アカウント状態',
};
