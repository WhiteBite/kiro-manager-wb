import { Translations } from '../types';

export const es: Translations = {
  // Header & Navigation
  kiroAccounts: 'Cuentas Kiro',
  compactViewTip: 'Reducir tarjetas para mostrar más cuentas',
  settingsTip: 'Configurar cambio automático, modo navegador, registros',
  back: 'Atrás',

  // Stats
  valid: 'válidas',
  expired: 'expiradas',
  total: 'total',
  noActive: 'Sin cuenta activa',
  validFilter: 'Válidas',
  expiredFilter: 'Expiradas',

  // Account Groups
  activeGroup: 'Activa',
  readyGroup: 'Listas',
  badGroup: 'Expiradas / Agotadas',
  expiredGroup: 'Expiradas',
  exhaustedGroup: 'Agotadas',
  bannedGroup: 'Baneadas',
  banned: 'BANEADO',
  refreshAll: 'Actualizar todas',
  deleteAll: 'Eliminar todas',

  // Usage card
  todaysUsage: 'Uso de hoy',
  used: 'usado',
  daysLeft: 'días restantes',
  resetsAtMidnight: 'Se reinicia a medianoche',

  // Actions
  autoReg: 'Auto-Reg',
  autoRegTip: 'Crear nuevo AWS Builder ID automáticamente',
  import: 'Importar',
  importTip: 'Importar token existente desde archivo JSON',
  refresh: 'Actualizar',
  refreshTip: 'Recargar cuentas y actualizar estado de tokens',
  export: 'Exportar',
  exportTip: 'Guardar todas las cuentas en archivo JSON',
  running: 'Ejecutando...',
  stop: 'Detener',

  // Filters
  all: 'Todas',
  byUsage: 'Por Uso',
  byExpiry: 'Por Expiración',
  byDate: 'Por Fecha',
  searchPlaceholder: 'Buscar cuentas...',
  newBadge: 'NUEVO',

  // Account card
  active: 'Activa',
  copyTokenTip: 'Copiar token de acceso al portapapeles',
  refreshTokenTip: 'Actualizar token expirado',
  viewQuotaTip: 'Mostrar estadísticas de uso de esta cuenta',
  deleteTip: 'Eliminar cuenta y archivo de token',
  noAccounts: 'Sin cuentas aún',
  createFirst: 'Crear Primera Cuenta',

  // Console
  console: 'Consola',
  clearTip: 'Limpiar salida de consola',
  openLogTip: 'Abrir archivo de log completo en editor',
  copyLogsTip: 'Copiar registros',

  // Progress
  step: 'Paso',

  // Footer
  connected: 'Conectado',

  // Dialog
  confirm: 'Confirmar',
  cancel: 'Cancelar',
  deleteTitle: 'Eliminar Cuenta',
  deleteConfirm: '¿Estás seguro de que quieres eliminar esta cuenta?',
  areYouSure: '¿Estás seguro?',

  // Settings
  settingsTitle: 'Configuración',
  autoSwitch: 'Cambio automático al expirar',
  autoSwitchDesc: 'Cambiar automáticamente a la siguiente cuenta válida',
  hideExhausted: 'Ocultar agotadas',
  hideExhaustedDesc: 'Ocultar cuentas con uso al 100%',
  headless: 'Modo headless',
  headlessDesc: 'Ejecutar navegador en segundo plano',
  verbose: 'Registro detallado',
  verboseDesc: 'Mostrar registros detallados',
  screenshots: 'Capturas en error',
  screenshotsDesc: 'Guardar capturas cuando ocurran errores',
  spoofing: 'Modo spoofing',
  spoofingDesc: 'Aleatorizar huella del navegador',
  deviceFlow: 'Auth Device Flow',
  deviceFlowDesc: 'Usar código de dispositivo en lugar de servidor local',
  language: 'Idioma',
  languageDesc: 'Idioma de la interfaz',

  // Spoofing modules
  spoofAutomation: 'Automatización',
  spoofAutomationDesc: 'Oculta flags de webdriver',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'Aleatoriza huella',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'Falsifica info de hardware',
  spoofAudio: 'Audio/Fuentes',
  spoofAudioDesc: 'Enmascara contexto de audio',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'Oculta IP local',
  spoofBehavior: 'Comportamiento',
  spoofBehaviorDesc: 'Acciones humanas',
  spoofWarning: 'Desactivar puede causar detección de bot',

  // Kiro Patch
  kiroPatch: 'Parche Kiro',
  kiroPatchDesc: 'Parchea Kiro para usar Machine ID personalizado',
  patchStatusLoading: 'Cargando...',
  patchStatusActive: 'Parcheado',
  patchStatusNotPatched: 'Sin parche',
  patch: 'Parche',
  removePatch: 'Quitar',
  newMachineId: 'Nuevo ID',
  patchKiroTitle: 'Parchear Kiro',
  patchKiroConfirm: 'Esto parcheará Kiro para usar Machine ID personalizado. ¡Cierra Kiro primero! ¿Continuar?',
  removePatchTitle: 'Quitar Parche',
  removePatchConfirm: 'Esto restaurará los archivos originales de Kiro. ¿Continuar?',

  // Profile Editor - Basic
  newProfile: 'Nuevo Perfil',
  editProfile: 'Editar Perfil',
  profileName: 'Nombre del Perfil',
  profileNamePlaceholder: 'Mi Gmail',
  server: 'Servidor',
  port: 'Puerto',
  password: 'Contraseña',
  testConnection: 'Probar',
  testing: 'Probando...',
  emailStrategy: 'Estrategia de Email',
  emailStrategyDesc: 'Elige cómo generar emails para el registro',
  save: 'Guardar',
  createProfile: 'Crear Perfil',

  // Profile Editor - Wizard
  enterYourEmail: 'Ingresa tu email',
  detected: 'Detectado',
  chooseStrategy: 'Elige estrategia',
  recommended: 'Recomendado',
  otherOptions: 'Otras opciones',
  useAppPassword: 'Usa contraseña de aplicación',
  imapConnection: 'Conexión IMAP',
  optional: 'opcional',
  checkConnection: 'Verificar conexión',

  // Strategies
  strategySingleName: 'Email Único',
  strategySingleDesc: 'Usa tu email IMAP directamente. Solo 1 cuenta por email.',
  strategySingleExample: 'tu@gmail.com → tu@gmail.com',
  strategyPlusAliasName: 'Plus Alias',
  strategyPlusAliasDesc: 'Añade +random a tu email. Todos los emails llegan al mismo buzón. Funciona con Gmail, Outlook, Yandex.',
  strategyPlusAliasExample: 'tu@gmail.com → tu+kiro5x7@gmail.com',
  strategyCatchAllName: 'Dominio Catch-All',
  strategyCatchAllDesc: 'Genera emails aleatorios en tu dominio. Requiere catch-all configurado en el servidor de correo.',
  strategyCatchAllExample: 'JohnSmith4521@tudominio.com',
  strategyCatchAllHint: 'Ingresa el dominio con catch-all configurado. Todos los emails a cualquier@dominio llegarán a tu buzón IMAP.',
  strategyCatchAllDomain: 'Dominio de Registro',
  strategyPoolName: 'Pool de Emails',
  strategyPoolDesc: 'Usa una lista de tus direcciones de email. Cada email se usa una vez en orden.',
  strategyPoolHint: 'Añade direcciones de email para usar en orden. Cada email = 1 cuenta.',
  strategyPoolAdd: 'Añadir email...',
  strategyPoolFromFile: 'Desde archivo',
  strategyPoolPaste: 'Pegar',
  example: 'Ejemplo',

  // Strategy Features
  unlimitedAccounts: 'Cuentas ilimitadas',
  allEmailsOneInbox: 'Todos los emails en un buzón',
  noOwnDomain: 'No necesitas dominio propio',
  notAllProvidersSupport: 'No todos los proveedores soportan',
  uniqueEmails: 'Emails únicos',
  needOwnDomain: 'Necesitas dominio propio',
  needCatchAllSetup: 'Necesitas configurar catch-all',
  easyToSetup: 'Fácil de configurar',
  worksEverywhere: 'Funciona en todas partes',
  oneAccountPerEmail: 'Solo 1 cuenta por email',
  worksWithAnyProvider: 'Funciona con cualquier proveedor',
  controlOverList: 'Control sobre la lista',
  needManyEmails: 'Necesitas muchos emails',
  requiresDomain: 'Requiere dominio propio',
  providerNoAlias: 'no soporta alias',

  // Profile Panel & Active Profile
  activeProfile: 'Perfil Activo',
  change: 'Cambiar',
  noProfileConfigured: 'Sin perfil configurado',
  configure: 'Configurar',
  emailProfiles: 'Perfiles de Email',
  noProfiles: 'Sin perfiles configurados',
  addProfile: 'Añadir Perfil',
  success: 'Éxito',
  failed: 'Fallido',

  // Strategy short descriptions
  strategySingleShort: 'Una cuenta por email',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'Cualquier email en dominio',
  strategyPoolShort: 'Tu lista de emails',

  // Danger Zone
  dangerZone: 'Zona de Peligro',
  resetMachineId: 'Restablecer Machine ID',
  resetMachineIdDesc: 'Genera nuevos IDs de telemetría para Kiro. Usar si la cuenta está bloqueada.',
  resetMachineIdTip: 'Restablecer machineId, sqmId, devDeviceId y serviceMachineId',
  reset: 'Restablecer',
  restartAfterReset: 'Reiniciar Kiro después del restablecimiento',
  resetMachineIdTitle: 'Restablecer Machine ID',
  resetMachineIdConfirm: 'Esto restablecerá los IDs de telemetría de Kiro. Necesitarás reiniciar Kiro después. ¿Continuar?',

  // Other
  delete: 'Eliminar',
  checkUpdates: 'Buscar Actualizaciones',
  newVersion: '¡Nueva versión!',
  download: 'Descargar',
  edit: 'Editar',
  unnamed: 'Sin nombre',
  customDomain: 'Dominio Personalizado',
  emailPasswordHint: 'Usa tu contraseña de email',

  // SSO Modal
  ssoImport: 'Importar SSO',
  ssoHint: '1. Abrir view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Copiar x-amz-sso_authn',
  pasteCookie: 'Pegar cookie...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'Dominio Personalizado',

  // Provider Password Hints
  gmailPasswordHint: 'Usa contraseña de aplicación de configuración de Google',
  yandexPasswordHint: 'Usa contraseña de aplicación de configuración de Yandex',
  mailruPasswordHint: 'Crea contraseña de aplicación en configuración de Mail.ru',
  outlookPasswordHint: 'Usa tu contraseña de cuenta Microsoft',

  // Toasts & Messages
  accountDeleted: 'Cuenta eliminada',
  badAccountsDeleted: 'Cuentas malas eliminadas',
  resettingMachineId: 'Restableciendo Machine ID...',
  patchingKiro: 'Parcheando Kiro...',
  removingPatch: 'Quitando parche...',
  profileCreated: 'Perfil creado',
  profileUpdated: 'Perfil actualizado',
  profileDeleted: 'Perfil eliminado',
  tokenCopied: 'Token copiado al portapapeles',
  logsCopied: 'Registros copiados al portapapeles',
  fillAllFields: 'Por favor completa todos los campos IMAP',
  clipboardError: 'Error al leer portapapeles',
  deleteProfileConfirm: '¿Eliminar este perfil?',
  deleteBadAccountsConfirm: '¿Eliminar todas las cuentas expiradas/agotadas?',
  deleteBannedAccountsConfirm: '¿Eliminar todas las cuentas baneadas?',
  bannedAccountsDeleted: 'Cuentas baneadas eliminadas',
  emailsImported: 'Imported {count} emails',

  // Import/Export
  exportAccounts: 'Export Accounts',
  exportAccountsDesc: 'Export accounts with tokens',
  importAccounts: 'Import Accounts',
  importAccountsDesc: 'Import accounts from file',
  exportSelected: 'Export Selected',
  exportAll: 'Export All',
};
