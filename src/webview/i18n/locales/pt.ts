import { Translations } from '../types';

export const pt: Translations = {
  // Header & Navigation
  kiroAccounts: 'Contas Kiro',
  compactViewTip: 'Reduzir cartões para mostrar mais contas',
  settingsTip: 'Configurar troca automática, modo navegador, logs',
  back: 'Voltar',

  // Stats
  valid: 'válidas',
  expired: 'expiradas',
  total: 'total',
  noActive: 'Sem conta ativa',
  validFilter: 'Válidas',
  expiredFilter: 'Expiradas',

  // Account Groups
  activeGroup: 'Ativa',
  readyGroup: 'Prontas',
  badGroup: 'Expiradas / Esgotadas',
  expiredGroup: 'Expiradas',
  exhaustedGroup: 'Esgotadas',
  bannedGroup: 'Banidas',
  banned: 'BANIDO',
  refreshAll: 'Atualizar todas',
  deleteAll: 'Excluir todas',

  // Usage card
  todaysUsage: 'Uso de Hoje',
  used: 'usado',
  daysLeft: 'dias restantes',
  resetsAtMidnight: 'Reinicia à meia-noite',

  // Actions
  autoReg: 'Auto-Reg',
  autoRegTip: 'Criar novo AWS Builder ID automaticamente',
  import: 'Importar',
  importTip: 'Importar token existente de arquivo JSON',
  refresh: 'Atualizar',
  refreshTip: 'Recarregar contas e atualizar status dos tokens',
  export: 'Exportar',
  exportTip: 'Salvar todas as contas em arquivo JSON',
  running: 'Executando...',
  stop: 'Parar',

  // Filters
  all: 'Todas',
  byUsage: 'Por Uso',
  byExpiry: 'Por Expiração',
  byDate: 'Por Data',
  searchPlaceholder: 'Pesquisar contas...',
  newBadge: 'NOVO',

  // Account card
  active: 'Ativa',
  copyTokenTip: 'Copiar token de acesso para área de transferência',
  refreshTokenTip: 'Atualizar token expirado',
  viewQuotaTip: 'Mostrar estatísticas de uso desta conta',
  deleteTip: 'Remover conta e arquivo de token',
  noAccounts: 'Sem contas ainda',
  createFirst: 'Criar Primeira Conta',

  // Console
  console: 'Console',
  clearTip: 'Limpar saída do console',
  openLogTip: 'Abrir arquivo de log completo no editor',
  copyLogsTip: 'Copiar logs',

  // Progress
  step: 'Passo',

  // Footer
  connected: 'Conectado',

  // Dialog
  confirm: 'Confirmar',
  cancel: 'Cancelar',
  deleteTitle: 'Excluir Conta',
  deleteConfirm: 'Tem certeza que deseja excluir esta conta?',
  areYouSure: 'Tem certeza?',

  // Settings
  settingsTitle: 'Configurações',
  autoSwitch: 'Troca automática ao expirar',
  autoSwitchDesc: 'Trocar automaticamente para próxima conta válida',
  hideExhausted: 'Ocultar esgotadas',
  hideExhaustedDesc: 'Ocultar contas com uso em 100%',
  headless: 'Modo headless',
  headlessDesc: 'Executar navegador em segundo plano',
  verbose: 'Log detalhado',
  verboseDesc: 'Mostrar logs detalhados',
  screenshots: 'Capturas em erro',
  screenshotsDesc: 'Salvar capturas quando ocorrerem erros',
  spoofing: 'Modo spoofing',
  spoofingDesc: 'Aleatorizar impressão digital do navegador',
  deviceFlow: 'Auth Device Flow',
  deviceFlowDesc: 'Usar código de dispositivo em vez de servidor local',
  language: 'Idioma',
  languageDesc: 'Idioma da interface',

  // Spoofing modules
  spoofAutomation: 'Automação',
  spoofAutomationDesc: 'Oculta flags do webdriver',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: 'Aleatoriza impressão digital',
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'Falsifica info de hardware',
  spoofAudio: 'Áudio/Fontes',
  spoofAudioDesc: 'Mascara contexto de áudio',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: 'Oculta IP local',
  spoofBehavior: 'Comportamento',
  spoofBehaviorDesc: 'Ações humanas',
  spoofWarning: 'Desativar pode causar detecção de bot',

  // Kiro Patch
  kiroPatch: 'Patch Kiro',
  kiroPatchDesc: 'Aplica patch no Kiro para usar Machine ID personalizado',
  patchStatusLoading: 'Carregando...',
  patchStatusActive: 'Patcheado',
  patchStatusNotPatched: 'Sem patch',
  patch: 'Patch',
  removePatch: 'Remover',
  newMachineId: 'Novo ID',
  patchKiroTitle: 'Aplicar Patch no Kiro',
  patchKiroConfirm: 'Isso aplicará patch no Kiro para usar Machine ID personalizado. Feche o Kiro primeiro! Continuar?',
  removePatchTitle: 'Remover Patch',
  removePatchConfirm: 'Isso restaurará os arquivos originais do Kiro. Continuar?',

  // Profile Editor - Basic
  newProfile: 'Novo Perfil',
  editProfile: 'Editar Perfil',
  profileName: 'Nome do Perfil',
  profileNamePlaceholder: 'Meu Gmail',
  server: 'Servidor',
  port: 'Porta',
  password: 'Senha',
  testConnection: 'Testar',
  testing: 'Testando...',
  emailStrategy: 'Estratégia de Email',
  emailStrategyDesc: 'Escolha como gerar emails para registro',
  save: 'Salvar',
  createProfile: 'Criar Perfil',

  // Profile Editor - Wizard
  enterYourEmail: 'Digite seu email',
  detected: 'Detectado',
  chooseStrategy: 'Escolha a estratégia',
  recommended: 'Recomendado',
  otherOptions: 'Outras opções',
  useAppPassword: 'Use senha de aplicativo',
  imapConnection: 'Conexão IMAP',
  optional: 'opcional',
  checkConnection: 'Verificar conexão',

  // Strategies
  strategySingleName: 'Email Único',
  strategySingleDesc: 'Usa seu email IMAP diretamente. Apenas 1 conta por email.',
  strategySingleExample: 'seu@gmail.com → seu@gmail.com',
  strategyPlusAliasName: 'Plus Alias',
  strategyPlusAliasDesc: 'Adiciona +random ao seu email. Todos os emails chegam na mesma caixa. Funciona com Gmail, Outlook, Yandex.',
  strategyPlusAliasExample: 'seu@gmail.com → seu+kiro5x7@gmail.com',
  strategyCatchAllName: 'Domínio Catch-All',
  strategyCatchAllDesc: 'Gera emails aleatórios no seu domínio. Requer catch-all configurado no servidor de email.',
  strategyCatchAllExample: 'JohnSmith4521@seudominio.com',
  strategyCatchAllHint: 'Digite o domínio com catch-all configurado. Todos os emails para qualquer@domínio chegarão na sua caixa IMAP.',
  strategyCatchAllDomain: 'Domínio de Registro',
  strategyPoolName: 'Pool de Emails',
  strategyPoolDesc: 'Use uma lista de seus endereços de email. Cada email é usado uma vez em ordem.',
  strategyPoolHint: 'Adicione endereços de email para usar em ordem. Cada email = 1 conta.',
  strategyPoolAdd: 'Adicionar email...',
  strategyPoolFromFile: 'Do arquivo',
  strategyPoolPaste: 'Colar',
  example: 'Exemplo',

  // Strategy Features
  unlimitedAccounts: 'Contas ilimitadas',
  allEmailsOneInbox: 'Todos os emails em uma caixa',
  noOwnDomain: 'Não precisa de domínio próprio',
  notAllProvidersSupport: 'Nem todos os provedores suportam',
  uniqueEmails: 'Emails únicos',
  needOwnDomain: 'Precisa de domínio próprio',
  needCatchAllSetup: 'Precisa configurar catch-all',
  easyToSetup: 'Fácil de configurar',
  worksEverywhere: 'Funciona em qualquer lugar',
  oneAccountPerEmail: 'Apenas 1 conta por email',
  worksWithAnyProvider: 'Funciona com qualquer provedor',
  controlOverList: 'Controle sobre a lista',
  needManyEmails: 'Precisa de muitos emails',
  requiresDomain: 'Requer domínio próprio',
  providerNoAlias: 'não suporta alias',

  // Profile Panel & Active Profile
  activeProfile: 'Perfil Ativo',
  change: 'Alterar',
  noProfileConfigured: 'Nenhum perfil configurado',
  configure: 'Configurar',
  emailProfiles: 'Perfis de Email',
  noProfiles: 'Nenhum perfil configurado',
  addProfile: 'Adicionar Perfil',
  success: 'Sucesso',
  failed: 'Falhou',

  // Strategy short descriptions
  strategySingleShort: 'Uma conta por email',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: 'Qualquer email no domínio',
  strategyPoolShort: 'Sua lista de emails',

  // Danger Zone
  dangerZone: 'Zona de Perigo',
  resetMachineId: 'Redefinir Machine ID',
  resetMachineIdDesc: 'Gera novos IDs de telemetria para Kiro. Use se a conta estiver banida.',
  resetMachineIdTip: 'Redefinir machineId, sqmId, devDeviceId e serviceMachineId',
  reset: 'Redefinir',
  restartAfterReset: 'Reinicie o Kiro após a redefinição',
  resetMachineIdTitle: 'Redefinir Machine ID',
  resetMachineIdConfirm: 'Isso redefinirá os IDs de telemetria do Kiro. Você precisará reiniciar o Kiro depois. Continuar?',

  // Other
  delete: 'Excluir',
  checkUpdates: 'Verificar Atualizações',
  newVersion: 'Nova versão!',
  download: 'Baixar',
  edit: 'Editar',
  unnamed: 'Sem nome',
  customDomain: 'Domínio Personalizado',
  emailPasswordHint: 'Use sua senha de email',

  // SSO Modal
  ssoImport: 'Importar SSO',
  ssoHint: '1. Abrir view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Copiar x-amz-sso_authn',
  pasteCookie: 'Colar cookie...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'Domínio Personalizado',

  // Provider Password Hints
  gmailPasswordHint: 'Use senha de aplicativo das configurações do Google',
  yandexPasswordHint: 'Use senha de aplicativo das configurações do Yandex',
  mailruPasswordHint: 'Crie senha de aplicativo nas configurações do Mail.ru',
  outlookPasswordHint: 'Use sua senha da conta Microsoft',

  // Toasts & Messages
  accountDeleted: 'Conta excluída',
  badAccountsDeleted: 'Contas ruins excluídas',
  resettingMachineId: 'Redefinindo Machine ID...',
  patchingKiro: 'Aplicando patch no Kiro...',
  removingPatch: 'Removendo patch...',
  profileCreated: 'Perfil criado',
  profileUpdated: 'Perfil atualizado',
  profileDeleted: 'Perfil excluído',
  tokenCopied: 'Token copiado para área de transferência',
  logsCopied: 'Logs copiados para área de transferência',
  fillAllFields: 'Por favor preencha todos os campos IMAP',
  clipboardError: 'Falha ao ler área de transferência',
  deleteProfileConfirm: 'Excluir este perfil?',
  deleteBadAccountsConfirm: 'Excluir todas as contas expiradas/esgotadas?',
  deleteBannedAccountsConfirm: 'Excluir todas as contas banidas?',
  bannedAccountsDeleted: 'Contas banidas excluídas',
  emailsImported: 'Imported {count} emails',

  // Import/Export
  exportAccounts: 'Export Accounts',
  exportAccountsDesc: 'Export accounts with tokens',
  importAccounts: 'Import Accounts',
  importAccountsDesc: 'Import accounts from file',
  exportSelected: 'Export Selected',
  exportAll: 'Export All',
};
