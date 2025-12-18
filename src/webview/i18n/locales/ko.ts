import { Translations } from '../types';

export const ko: Translations = {
  // Header & Navigation
  kiroAccounts: 'Kiro 계정',
  compactViewTip: '카드를 축소하여 더 많은 계정 표시',
  settingsTip: '자동 전환, 브라우저 모드, 로깅 설정',
  back: '뒤로',

  // Stats
  valid: '유효',
  expired: '만료됨',
  total: '총',
  noActive: '활성 없음',
  validFilter: '유효',
  expiredFilter: '만료됨',

  // Account Groups
  activeGroup: '활성',
  readyGroup: '준비됨',
  badGroup: '만료됨 / 소진됨',
  expiredGroup: '만료됨',
  exhaustedGroup: '소진됨',
  bannedGroup: '차단됨',
  banned: '차단',
  refreshAll: '모두 새로고침',
  deleteAll: '모두 삭제',

  // Usage card
  todaysUsage: '오늘 사용량',
  used: '사용됨',
  daysLeft: '일 남음',
  remaining: '남음',
  resetsAtMidnight: '자정에 초기화',

  // Actions
  autoReg: '자동 등록',
  autoRegTip: '새 AWS Builder ID 자동 생성',
  import: '가져오기',
  importTip: 'JSON 파일에서 기존 토큰 가져오기',
  refresh: '새로고침',
  refreshTip: '계정 다시 로드 및 토큰 상태 업데이트',
  export: '내보내기',
  exportTip: '모든 계정을 JSON 파일로 저장',
  running: '실행 중...',
  stop: '중지',

  // Filters
  all: '전체',
  byUsage: '사용량순',
  byExpiry: '만료일순',
  byDate: '날짜순',
  searchPlaceholder: '계정 검색...',
  newBadge: '새로운',

  // Account card
  active: '활성',
  copyTokenTip: '액세스 토큰을 클립보드에 복사',
  refreshTokenTip: '만료된 토큰 새로고침',
  viewQuotaTip: '이 계정의 사용 통계 표시',
  deleteTip: '계정 및 토큰 파일 삭제',
  noAccounts: '계정이 없습니다',
  createFirst: '첫 번째 계정 만들기',

  // Console
  console: '콘솔',
  clearTip: '콘솔 출력 지우기',
  openLogTip: '편집기에서 전체 로그 파일 열기',
  copyLogsTip: '로그 복사',

  // Progress
  step: '단계',

  // Footer
  connected: '연결됨',

  // Dialog
  confirm: '확인',
  cancel: '취소',
  deleteTitle: '계정 삭제',
  deleteConfirm: '이 계정을 삭제하시겠습니까?',
  areYouSure: '확실합니까?',

  // Settings
  settingsTitle: '설정',
  autoSwitch: '만료 시 자동 전환',
  autoSwitchDesc: '다음 유효한 계정으로 자동 전환',
  hideExhausted: '소진된 항목 숨기기',
  hideExhaustedDesc: '사용량 100% 계정 숨기기',
  headless: '헤드리스 모드',
  headlessDesc: '백그라운드에서 브라우저 실행',
  verbose: '상세 로깅',
  verboseDesc: '상세 로그 표시',
  screenshots: '오류 시 스크린샷',
  screenshotsDesc: '오류 발생 시 스크린샷 저장',
  spoofing: '스푸핑 모드',
  spoofingDesc: '브라우저 지문 무작위화',
  deviceFlow: '디바이스 플로우 인증',
  deviceFlowDesc: '로컬 서버 대신 디바이스 코드 사용',
  language: '언어',
  languageDesc: '인터페이스 언어',

  // Spoofing modules
  spoofAutomation: '자동화',
  spoofAutomationDesc: 'webdriver 플래그 숨김',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: '지문 무작위화',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: '하드웨어 정보 위장',
  spoofAudio: '오디오/폰트',
  spoofAudioDesc: '오디오 컨텍스트 마스킹',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: '로컬 IP 숨김',
  spoofBehavior: '행동',
  spoofBehaviorDesc: '인간적인 동작',
  spoofWarning: '비활성화하면 봇 감지될 수 있음',

  // Kiro Patch
  kiroPatch: 'Kiro 패치',
  kiroPatchDesc: '사용자 정의 머신 ID를 사용하도록 Kiro 패치',
  patchStatusLoading: '로딩 중...',
  patchStatusActive: '패치됨',
  patchStatusNotPatched: '패치 안됨',
  patch: '패치',
  removePatch: '제거',
  newMachineId: '새 ID',
  patchKiroTitle: 'Kiro 패치',
  patchKiroConfirm: '사용자 정의 머신 ID를 사용하도록 Kiro를 패치합니다. 먼저 Kiro를 닫으세요! 계속하시겠습니까?',
  removePatchTitle: '패치 제거',
  removePatchConfirm: '원본 Kiro 파일을 복원합니다. 계속하시겠습니까?',

  // Profile Editor - Basic
  newProfile: '새 프로필',
  editProfile: '프로필 편집',
  profileName: '프로필 이름',
  profileNamePlaceholder: '내 Gmail',
  server: '서버',
  port: '포트',
  password: '비밀번호',
  testConnection: '테스트',
  testing: '테스트 중...',
  emailStrategy: '이메일 전략',
  emailStrategyDesc: '등록용 이메일 생성 방법 선택',
  save: '저장',
  createProfile: '프로필 만들기',

  // Profile Editor - Wizard
  enterYourEmail: '이메일을 입력하세요',
  detected: '감지됨',
  chooseStrategy: '전략 선택',
  recommended: '추천',
  otherOptions: '다른 옵션',
  useAppPassword: '앱 비밀번호 사용',
  imapConnection: 'IMAP 연결',
  optional: '선택사항',
  checkConnection: '연결 확인',

  // Strategies
  strategySingleName: '단일 이메일',
  strategySingleDesc: 'IMAP 이메일을 직접 사용합니다. 이메일당 1개 계정만 가능.',
  strategySingleExample: 'your@gmail.com → your@gmail.com',
  strategyPlusAliasName: 'Plus 별칭',
  strategyPlusAliasDesc: '이메일에 +random을 추가합니다. 모든 이메일이 같은 받은편지함에 도착. Gmail, Outlook, Yandex에서 작동.',
  strategyPlusAliasExample: 'your@gmail.com → your+kiro5x7@gmail.com',
  strategyCatchAllName: 'Catch-All 도메인',
  strategyCatchAllDesc: '도메인에서 무작위 이메일을 생성합니다. 메일 서버에 catch-all 설정 필요.',
  strategyCatchAllExample: 'JohnSmith4521@yourdomain.com',
  strategyCatchAllHint: 'catch-all이 설정된 도메인을 입력하세요. 모든@도메인으로 오는 이메일이 IMAP 받은편지함에 도착합니다.',
  strategyCatchAllDomain: '등록 도메인',
  strategyPoolName: '이메일 풀',
  strategyPoolDesc: '이메일 주소 목록을 사용합니다. 각 이메일은 순서대로 한 번씩 사용됩니다.',
  strategyPoolHint: '순서대로 사용할 이메일 주소를 추가하세요. 각 이메일 = 1개 계정.',
  strategyPoolAdd: '이메일 추가...',
  strategyPoolFromFile: '파일에서',
  strategyPoolPaste: 'Paste',
  poolEmpty: 'Add at least one email to pool',
  emailsAdded: '{count}개 이메일 추가됨',
  example: '예시',

  // Strategy Features
  unlimitedAccounts: '무제한 계정',
  allEmailsOneInbox: '모든 이메일이 하나의 받은편지함에',
  noOwnDomain: '자체 도메인 불필요',
  notAllProvidersSupport: '모든 제공업체가 지원하지 않음',
  uniqueEmails: '고유한 이메일 주소',
  needOwnDomain: '자체 도메인 필요',
  needCatchAllSetup: 'catch-all 설정 필요',
  easyToSetup: '설정이 쉬움',
  worksEverywhere: '어디서나 작동',
  oneAccountPerEmail: '이메일당 1개 계정만',
  worksWithAnyProvider: '모든 제공업체에서 작동',
  controlOverList: '목록 제어',
  needManyEmails: '많은 이메일 필요',
  requiresDomain: '자체 도메인 필요',
  providerNoAlias: '는 별칭을 지원하지 않습니다',

  // Profile Panel & Active Profile
  activeProfile: '활성 프로필',
  change: '변경',
  noProfileConfigured: '프로필이 구성되지 않음',
  configure: '구성',
  emailProfiles: '이메일 프로필',
  noProfiles: '구성된 프로필 없음',
  addProfile: '프로필 추가',
  success: '성공',
  failed: '실패',

  // Strategy short descriptions
  strategySingleShort: '이메일당 1개 계정',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: '도메인의 모든 이메일',
  strategyPoolShort: '이메일 목록',

  // Danger Zone
  dangerZone: '위험 구역',
  resetMachineId: '머신 ID 재설정',
  resetMachineIdDesc: 'Kiro의 새 텔레메트리 ID를 생성합니다. 계정이 차단된 경우 사용하세요.',
  resetMachineIdTip: 'machineId, sqmId, devDeviceId 및 serviceMachineId 재설정',
  reset: '재설정',
  restartAfterReset: '재설정 후 Kiro를 다시 시작하세요',
  resetMachineIdTitle: '머신 ID 재설정',
  resetMachineIdConfirm: 'Kiro 텔레메트리 ID를 재설정합니다. 이후 Kiro를 다시 시작해야 합니다. 계속하시겠습니까?',

  // Other
  delete: '삭제',
  checkUpdates: '업데이트 확인',
  newVersion: '새 버전!',
  download: '다운로드',
  edit: '편집',
  unnamed: '이름 없음',
  customDomain: '사용자 정의 도메인',
  emailPasswordHint: '이메일 비밀번호 사용',

  // SSO Modal
  ssoImport: 'SSO 가져오기',
  ssoHint: '1. view.awsapps.com/start 열기\n2. DevTools → Application → Cookies\n3. x-amz-sso_authn 복사',
  pasteCookie: '쿠키 붙여넣기...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: '사용자 정의 도메인',

  // Provider Password Hints
  gmailPasswordHint: 'Google 계정 설정에서 앱 비밀번호 사용',
  yandexPasswordHint: 'Yandex 설정에서 앱 비밀번호 사용',
  mailruPasswordHint: 'Mail.ru 설정에서 앱 비밀번호 생성',
  outlookPasswordHint: 'Microsoft 계정 비밀번호 사용',

  // Toasts & Messages
  accountDeleted: '계정 삭제됨',
  badAccountsDeleted: '불량 계정 삭제됨',
  resettingMachineId: '머신 ID 재설정 중...',
  patchingKiro: 'Kiro 패치 중...',
  removingPatch: '패치 제거 중...',
  profileCreated: '프로필 생성됨',
  profileUpdated: '프로필 업데이트됨',
  profileDeleted: '프로필 삭제됨',
  tokenCopied: '토큰이 클립보드에 복사됨',
  logsCopied: '로그가 클립보드에 복사됨',
  fillAllFields: '모든 IMAP 필드를 입력하세요',
  clipboardError: '클립보드 읽기 실패',
  deleteProfileConfirm: '이 프로필을 삭제하시겠습니까?',
  deleteBadAccountsConfirm: '모든 만료/소진된 계정을 삭제하시겠습니까?',
  deleteBannedAccountsConfirm: '차단된 계정을 모두 삭제하시겠습니까?',
  bannedAccountsDeleted: '차단된 계정이 삭제되었습니다',
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
  checkHealth: '상태 확인',
  checkingHealth: '계정 상태 확인 중...',

  // Hero Profile Display
  ready: '준비됨',
  clickToConfigure: '클릭하여 설정',

  // Settings Cards
  automation: '자동화',
  interface: '인터페이스',
  settings: '설정',
  accounts: '계정',
  profiles: '프로필',
  pause: '일시정지',

  // Stats Dashboard
  statistics: '통계',
  weeklyUsage: '주간 사용량',
  avgPerAccount: '계정당 평균',
  accountHealth: '계정 상태',
};
