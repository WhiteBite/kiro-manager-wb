import { Translations } from '../types';

export const ru: Translations = {
  // Header & Navigation
  kiroAccounts: 'Аккаунты Kiro',
  compactViewTip: 'Уменьшить карточки для показа большего числа аккаунтов',
  settingsTip: 'Настроить авто-переключение, режим браузера, логи',
  back: 'Назад',

  // Stats
  valid: 'активных',
  expired: 'истекших',
  total: 'всего',
  noActive: 'Нет активного',
  validFilter: 'Активные',
  expiredFilter: 'Истекшие',

  // Account Groups
  activeGroup: 'Активный',
  readyGroup: 'Готовы',
  badGroup: 'Истекшие / Исчерпанные',
  expiredGroup: 'Истекшие',
  exhaustedGroup: 'Исчерпанные',
  bannedGroup: 'Забаненные',
  banned: 'БАН',
  refreshAll: 'Обновить все',
  deleteAll: 'Удалить все',

  // Usage card
  todaysUsage: 'Использование',
  used: 'использовано',
  daysLeft: 'дней осталось',
  remaining: 'осталось',
  resetsAtMidnight: 'Сброс в полночь',

  // Actions
  autoReg: 'Авторегистрация',
  autoRegTip: 'Запустить автоматическую регистрацию аккаунтов',
  autoRegCountLabel: 'Кол-во',
  autoRegCountPlaceholder: 'Число аккаунтов',
  import: 'Импорт',
  importTip: 'Импортировать токен из JSON файла',
  refresh: 'Обновить',
  refreshTip: 'Перезагрузить аккаунты и обновить статус токенов',
  export: 'Экспорт',
  exportTip: 'Сохранить все аккаунты в JSON файл',
  running: 'Выполняется...',
  stop: 'Стоп',

  // Filters
  all: 'Все',
  byUsage: 'По usage',
  byExpiry: 'По сроку',
  byDate: 'По дате',
  searchPlaceholder: 'Поиск аккаунтов...',
  newBadge: 'НОВЫЙ',

  // Account card
  active: 'Активен',
  copyTokenTip: 'Скопировать access token в буфер обмена',
  refreshTokenTip: 'Обновить истекший токен',
  viewQuotaTip: 'Показать статистику использования аккаунта',
  deleteTip: 'Удалить аккаунт и файл токена',
  noAccounts: 'Нет аккаунтов',
  createFirst: 'Создать первый аккаунт',

  // Console
  console: 'Консоль',
  clearTip: 'Очистить вывод консоли',
  openLogTip: 'Открыть полный лог в редакторе',
  copyLogsTip: 'Копировать логи',

  // Progress
  step: 'Шаг',

  // Footer
  connected: 'Подключено',

  // Dialog
  confirm: 'Подтвердить',
  cancel: 'Отмена',
  deleteTitle: 'Удалить аккаунт',
  deleteConfirm: 'Вы уверены, что хотите удалить этот аккаунт?',
  areYouSure: 'Вы уверены?',

  // Settings
  settingsTitle: 'Настройки',
  autoSwitch: 'Авто-переключение',
  autoSwitchDesc: 'Переключаться на следующий аккаунт',
  hideExhausted: 'Скрыть исчерпанные',
  hideExhaustedDesc: 'Скрыть аккаунты с лимитом 100%',
  headless: 'Скрытый режим',
  headlessDesc: 'Запускать браузер в фоне',
  verbose: 'Подробные логи',
  verboseDesc: 'Показывать детальные логи',
  screenshots: 'Скриншоты при ошибках',
  screenshotsDesc: 'Сохранять скриншоты при ошибках',
  spoofing: 'Режим спуфинга',
  spoofingDesc: 'Рандомизировать отпечаток браузера',
  deviceFlow: 'Device Flow авторизация',
  deviceFlowDesc: 'Использовать код устройства вместо локального сервера',
  language: 'Язык',
  languageDesc: 'Язык интерфейса',

  // Spoofing modules
  spoofAutomation: 'Автоматизация',
  spoofAutomationDesc: 'Скрывает флаги webdriver',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'Рандомизирует отпечаток',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'Подменяет инфо об устройстве',
  spoofAudio: 'Аудио/Шрифты',
  spoofAudioDesc: 'Маскирует аудио контекст',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'Скрывает локальный IP',
  spoofBehavior: 'Поведение',
  spoofBehaviorDesc: 'Человеческие действия',
  spoofWarning: 'Отключение может привести к обнаружению бота',

  // Kiro Patch
  kiroPatch: 'Патч Kiro',
  kiroPatchDesc: 'Патчит Kiro для использования кастомного Machine ID',
  patchStatusLoading: 'Загрузка...',
  patchStatusActive: 'Патч установлен',
  patchStatusNotPatched: 'Не пропатчен',
  patch: 'Патч',
  removePatch: 'Убрать',
  newMachineId: 'Новый ID',
  patchKiroTitle: 'Пропатчить Kiro',
  patchKiroConfirm: 'Это пропатчит Kiro для использования кастомного Machine ID. Сначала закройте Kiro! Продолжить?',
  removePatchTitle: 'Удалить патч',
  removePatchConfirm: 'Это восстановит оригинальные файлы Kiro. Продолжить?',

  // Profile Editor - Basic
  newProfile: 'Новый профиль',
  editProfile: 'Редактировать профиль',
  profileName: 'Название',
  profileNamePlaceholder: 'Мой Gmail',
  server: 'Сервер',
  port: 'Порт',
  password: 'Пароль',
  testConnection: 'Проверить',
  testing: 'Проверка...',
  emailStrategy: 'Стратегия Email',
  emailStrategyDesc: 'Выберите как генерировать email для регистрации',
  save: 'Сохранить',
  createProfile: 'Создать профиль',

  // Profile Editor - Wizard
  enterYourEmail: 'Введите ваш email',
  detected: 'Обнаружен',
  chooseStrategy: 'Выберите стратегию',
  recommended: 'Рекомендуем',
  otherOptions: 'Другие варианты',
  useAppPassword: 'Используйте пароль приложения',
  imapConnection: 'Подключение к почте',
  optional: 'опционально',
  checkConnection: 'Проверить подключение',

  // Strategies
  strategySingleName: 'Один Email',
  strategySingleDesc: 'Используется ваш IMAP email напрямую. Только 1 аккаунт на email.',
  strategySingleExample: 'your@gmail.com → your@gmail.com',
  strategyPlusAliasName: 'Plus Alias',
  strategyPlusAliasDesc: 'Добавляет +random к вашему email. Все письма приходят в один ящик. Работает с Gmail, Outlook, Yandex.',
  strategyPlusAliasExample: 'your@gmail.com → your+kiro5x7@gmail.com',
  strategyCatchAllName: 'Catch-All Домен',
  strategyCatchAllDesc: 'Генерирует случайные email на вашем домене. Требуется настроенный catch-all на почтовом сервере.',
  strategyCatchAllExample: 'JohnSmith4521@yourdomain.com',
  strategyCatchAllHint: 'Укажите домен на котором настроен catch-all. Все письма на любой@домен будут приходить в ваш IMAP ящик.',
  strategyCatchAllDomain: 'Домен для регистрации',
  strategyPoolName: 'Пул Email',
  strategyPoolDesc: 'Используйте список своих email адресов. Каждый email используется один раз по очереди.',
  strategyPoolHint: 'Добавьте email адреса которые будут использоваться по очереди. Каждый email = 1 аккаунт. Формат: email:password',
  strategyPoolAdd: 'email:password или email...',
  strategyPoolFromFile: 'Из файла',
  strategyPoolPaste: 'Вставить',
  poolEmpty: 'Добавьте хотя бы один email в пул',
  emailsAdded: '{count} email добавлено',
  example: 'Пример',

  // Strategy Features
  unlimitedAccounts: 'Безлимит аккаунтов',
  allEmailsOneInbox: 'Все письма в одном ящике',
  noOwnDomain: 'Не нужен свой домен',
  notAllProvidersSupport: 'Не все провайдеры поддерживают',
  uniqueEmails: 'Уникальные email адреса',
  needOwnDomain: 'Нужен свой домен',
  needCatchAllSetup: 'Нужна настройка catch-all',
  easyToSetup: 'Просто настроить',
  worksEverywhere: 'Работает везде',
  oneAccountPerEmail: 'Только 1 аккаунт на email',
  worksWithAnyProvider: 'Работает с любым провайдером',
  controlOverList: 'Контроль над списком',
  needManyEmails: 'Нужно много email-ов',
  requiresDomain: 'Требуется свой домен',
  providerNoAlias: 'не поддерживает алиасы',

  // Profile Panel & Active Profile
  activeProfile: 'Активный профиль',
  change: 'Изменить',
  noProfileConfigured: 'Профиль не настроен',
  configure: 'Настроить',
  emailProfiles: 'Email Профили',
  noProfiles: 'Нет профилей',
  addProfile: 'Добавить профиль',
  success: 'Успешно',
  failed: 'Ошибок',

  // Strategy short descriptions
  strategySingleShort: 'Один аккаунт на email',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'Любой email на домене',
  strategyPoolShort: 'Список ваших email',

  // Danger Zone
  dangerZone: 'Опасная зона',
  resetMachineId: 'Сброс Machine ID',
  resetMachineIdDesc: 'Генерирует новые telemetry ID для Kiro. Используйте если аккаунт заблокирован.',
  resetMachineIdTip: 'Сбросить machineId, sqmId, devDeviceId и serviceMachineId',
  reset: 'Сбросить',
  restartAfterReset: 'После сброса нужно перезапустить Kiro',
  resetMachineIdTitle: 'Сброс Machine ID',
  resetMachineIdConfirm: 'Это сбросит telemetry ID Kiro. Потребуется перезапуск. Продолжить?',

  // LLM Settings
  llmSettings: 'LLM API',
  llmBaseUrl: 'Базовый URL',
  llmPort: 'Порт',
  llmApiKey: 'API ключ (опционально)',
  llmApiKeyDesc: 'Если задан, все запросы должны содержать этот ключ в заголовке Authorization.',
  llmModel: 'Модель по умолчанию',
  llmModelDesc: 'Модель чата для использования по умолчанию.',
  llmServer: 'LLM Сервер',
  llmServerDesc: 'Запустить или остановить локальный OpenAI-совместимый сервер.',
  startServer: 'Запустить',
  stopServer: 'Остановить',
  restartServer: 'Перезапустить',
  serverStatus: 'Статус сервера',
  serverStatusRunning: 'Запущен',
  serverStatusStopped: 'Остановлен',
  serverStatusError: 'Ошибка',

  // Other
  delete: 'Удалить',
  checkUpdates: 'Проверить',
  newVersion: 'Новая версия!',
  download: 'Скачать',
  edit: 'Редактировать',
  unnamed: 'Без имени',
  customDomain: 'Свой домен',
  emailPasswordHint: 'Используйте пароль от почты',

  // SSO Modal
  ssoImport: 'SSO Импорт',
  ssoHint: '1. Откройте view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Скопируйте x-amz-sso_authn',
  pasteCookie: 'Вставьте cookie...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Яндекс',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'Свой домен',

  // Provider Password Hints
  gmailPasswordHint: 'Используйте App Password (пароль приложения)',
  yandexPasswordHint: 'Используйте пароль приложения из настроек Яндекс',
  mailruPasswordHint: 'Создайте пароль для внешних приложений в настройках',
  outlookPasswordHint: 'Используйте пароль от аккаунта Microsoft',

  // Toasts & Messages
  accountDeleted: 'Аккаунт удалён',
  badAccountsDeleted: 'Плохие аккаунты удалены',
  resettingMachineId: 'Сброс Machine ID...',
  patchingKiro: 'Патчим Kiro...',
  removingPatch: 'Удаляем патч...',
  profileCreated: 'Профиль создан',
  profileUpdated: 'Профиль обновлён',
  profileDeleted: 'Профиль удалён',
  tokenCopied: 'Токен скопирован',
  logsCopied: 'Логи скопированы',
  fillAllFields: 'Заполните все поля IMAP',
  clipboardError: 'Не удалось прочитать буфер обмена',
  deleteProfileConfirm: 'Удалить этот профиль?',
  deleteBadAccountsConfirm: 'Удалить все истёкшие/исчерпанные аккаунты?',
  deleteBannedAccountsConfirm: 'Удалить все забаненные аккаунты?',
  bannedAccountsDeleted: 'Забаненные аккаунты удалены',
  emailsImported: 'Импортировано {count} email',

  // Import/Export
  exportAccounts: 'Экспорт аккаунтов',
  exportAccountsDesc: 'Экспорт аккаунтов с токенами для передачи',
  importAccounts: 'Импорт аккаунтов',
  importAccountsDesc: 'Импорт аккаунтов из файла экспорта',
  exportSelected: 'Экспорт выбранных',
  exportAll: 'Экспорт всех',

  // Selection Mode (Bulk Actions)
  selectMode: 'Выбрать',
  selected: 'выбрано',
  selectAll: 'Выбрать все',
  deselectAll: 'Снять выбор',
  refreshSelected: 'Обновить токены',
  deleteSelected: 'Удалить выбранные',
  deleteSelectedConfirm: 'Удалить {count} выбранных аккаунтов?',
  selectedAccountsDeleted: '{count} аккаунтов удалено',
  refreshingTokens: 'Обновляем токены...',
  checkHealth: 'Проверить здоровье',
  checkingHealth: 'Проверяем здоровье аккаунтов...',

  // Hero Profile Display
  ready: 'Готов',
  clickToConfigure: 'Нажмите для настройки',

  // Search
  noAccountsFound: 'Аккаунты не найдены',
  clearSearch: 'Очистить поиск',

  // Settings Cards
  automation: 'Автоматизация',
  interface: 'Интерфейс',
  autoSwitchThreshold: 'Порог переключения',
  autoSwitchThresholdDesc: 'Переключать когда осталось меньше',
  settings: 'Настройки',
  accounts: 'Аккаунты',
  profiles: 'Профили',
  pause: 'Пауза',

  // Stats Dashboard
  statistics: 'Статистика',
  weeklyUsage: 'За неделю',
  avgPerAccount: 'Среднее на аккаунт',
  accountHealth: 'Состояние аккаунтов',
};
