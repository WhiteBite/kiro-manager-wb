import { Translations } from '../types';

export const fr: Translations = {
  // Header & Navigation
  kiroAccounts: 'Comptes Kiro',
  compactViewTip: 'Réduire les cartes pour afficher plus de comptes',
  settingsTip: 'Configurer le changement auto, mode navigateur, journaux',
  back: 'Retour',

  // Stats
  valid: 'valides',
  expired: 'expirés',
  total: 'total',
  noActive: 'Aucun actif',
  validFilter: 'Valides',
  expiredFilter: 'Expirés',

  // Account Groups
  activeGroup: 'Actif',
  readyGroup: 'Prêts',
  badGroup: 'Expirés / Épuisés',
  expiredGroup: 'Expirés',
  exhaustedGroup: 'Épuisés',
  bannedGroup: 'Bannis',
  banned: 'BANNI',
  refreshAll: 'Tout actualiser',
  deleteAll: 'Tout supprimer',

  // Usage card
  todaysUsage: "Utilisation du jour",
  used: 'utilisé',
  daysLeft: 'jours restants',
  resetsAtMidnight: 'Réinitialise à minuit',

  // Actions
  autoReg: 'Auto-Reg',
  autoRegTip: 'Créer automatiquement un nouvel AWS Builder ID',
  import: 'Importer',
  importTip: 'Importer un token existant depuis un fichier JSON',
  refresh: 'Actualiser',
  refreshTip: 'Recharger les comptes et mettre à jour le statut des tokens',
  export: 'Exporter',
  exportTip: 'Sauvegarder tous les comptes dans un fichier JSON',
  running: 'En cours...',
  stop: 'Arrêter',

  // Filters
  all: 'Tous',
  byUsage: 'Par Utilisation',
  byExpiry: 'Par Expiration',
  byDate: 'Par Date',
  searchPlaceholder: 'Rechercher des comptes...',
  newBadge: 'NOUVEAU',

  // Account card
  active: 'Actif',
  copyTokenTip: "Copier le token d'accès dans le presse-papiers",
  refreshTokenTip: 'Actualiser le token expiré',
  viewQuotaTip: "Afficher les statistiques d'utilisation de ce compte",
  deleteTip: 'Supprimer le compte et le fichier token',
  noAccounts: 'Pas encore de comptes',
  createFirst: 'Créer le Premier Compte',

  // Console
  console: 'Console',
  clearTip: 'Effacer la sortie console',
  openLogTip: "Ouvrir le fichier journal complet dans l'éditeur",
  copyLogsTip: 'Copier les journaux',

  // Progress
  step: 'Étape',

  // Footer
  connected: 'Connecté',

  // Dialog
  confirm: 'Confirmer',
  cancel: 'Annuler',
  deleteTitle: 'Supprimer le Compte',
  deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce compte ?',
  areYouSure: 'Êtes-vous sûr ?',

  // Settings
  settingsTitle: 'Paramètres',
  autoSwitch: "Changement auto à l'expiration",
  autoSwitchDesc: 'Basculer automatiquement vers le prochain compte valide',
  hideExhausted: 'Masquer épuisés',
  hideExhaustedDesc: "Masquer les comptes à 100% d'utilisation",
  headless: 'Mode headless',
  headlessDesc: "Exécuter le navigateur en arrière-plan",
  verbose: 'Journalisation détaillée',
  verboseDesc: 'Afficher les journaux détaillés',
  screenshots: "Captures d'écran en cas d'erreur",
  screenshotsDesc: "Sauvegarder les captures d'écran lors d'erreurs",
  spoofing: 'Mode spoofing',
  spoofingDesc: "Randomiser l'empreinte du navigateur",
  deviceFlow: 'Auth Device Flow',
  deviceFlowDesc: 'Utiliser le code appareil au lieu du serveur local',
  language: 'Langue',
  languageDesc: "Langue de l'interface",

  // Spoofing modules
  spoofAutomation: 'Automatisation',
  spoofAutomationDesc: 'Cache les flags webdriver',
  spoofCanvas: 'Canvas/WebGL',
  spoofCanvasDesc: "Randomise l'empreinte",
  spoofNavigator: 'Navigator',
  spoofNavigatorDesc: 'Falsifie les infos matériel',
  spoofAudio: 'Audio/Polices',
  spoofAudioDesc: 'Masque le contexte audio',
  spoofWebrtc: 'WebRTC',
  spoofWebrtcDesc: "Cache l'IP locale",
  spoofBehavior: 'Comportement',
  spoofBehaviorDesc: 'Actions humaines',
  spoofWarning: 'Désactiver peut causer la détection de bot',

  // Kiro Patch
  kiroPatch: 'Patch Kiro',
  kiroPatchDesc: 'Patche Kiro pour utiliser un Machine ID personnalisé',
  patchStatusLoading: 'Chargement...',
  patchStatusActive: 'Patché',
  patchStatusNotPatched: 'Non patché',
  patch: 'Patch',
  removePatch: 'Retirer',
  newMachineId: 'Nouvel ID',
  patchKiroTitle: 'Patcher Kiro',
  patchKiroConfirm: "Ceci patchera Kiro pour utiliser un Machine ID personnalisé. Fermez Kiro d'abord ! Continuer ?",
  removePatchTitle: 'Retirer le Patch',
  removePatchConfirm: 'Ceci restaurera les fichiers Kiro originaux. Continuer ?',

  // Profile Editor - Basic
  newProfile: 'Nouveau Profil',
  editProfile: 'Modifier le Profil',
  profileName: 'Nom du Profil',
  profileNamePlaceholder: 'Mon Gmail',
  server: 'Serveur',
  port: 'Port',
  password: 'Mot de passe',
  testConnection: 'Tester',
  testing: 'Test en cours...',
  emailStrategy: 'Stratégie Email',
  emailStrategyDesc: "Choisissez comment générer les emails pour l'inscription",
  save: 'Enregistrer',
  createProfile: 'Créer le Profil',

  // Profile Editor - Wizard
  enterYourEmail: 'Entrez votre email',
  detected: 'Détecté',
  chooseStrategy: 'Choisir la stratégie',
  recommended: 'Recommandé',
  otherOptions: 'Autres options',
  useAppPassword: "Utilisez un mot de passe d'application",
  imapConnection: 'Connexion IMAP',
  optional: 'optionnel',
  checkConnection: 'Vérifier la connexion',

  // Strategies
  strategySingleName: 'Email Unique',
  strategySingleDesc: 'Utilise votre email IMAP directement. Seulement 1 compte par email.',
  strategySingleExample: 'votre@gmail.com → votre@gmail.com',
  strategyPlusAliasName: 'Plus Alias',
  strategyPlusAliasDesc: 'Ajoute +random à votre email. Tous les emails arrivent dans la même boîte. Fonctionne avec Gmail, Outlook, Yandex.',
  strategyPlusAliasExample: 'votre@gmail.com → votre+kiro5x7@gmail.com',
  strategyCatchAllName: 'Domaine Catch-All',
  strategyCatchAllDesc: 'Génère des emails aléatoires sur votre domaine. Nécessite catch-all configuré sur le serveur mail.',
  strategyCatchAllExample: 'JohnSmith4521@votredomaine.com',
  strategyCatchAllHint: "Entrez le domaine avec catch-all configuré. Tous les emails vers n'importe@domaine arriveront dans votre boîte IMAP.",
  strategyCatchAllDomain: "Domaine d'inscription",
  strategyPoolName: "Pool d'Emails",
  strategyPoolDesc: "Utilisez une liste de vos adresses email. Chaque email est utilisé une fois dans l'ordre.",
  strategyPoolHint: "Ajoutez des adresses email à utiliser dans l'ordre. Chaque email = 1 compte.",
  strategyPoolAdd: 'Ajouter email...',
  strategyPoolFromFile: 'Depuis fichier',
  strategyPoolPaste: 'Paste',
  poolEmpty: 'Add at least one email to pool',
  example: 'Exemple',

  // Strategy Features
  unlimitedAccounts: 'Comptes illimités',
  allEmailsOneInbox: 'Tous les emails dans une boîte',
  noOwnDomain: 'Pas de domaine propre nécessaire',
  notAllProvidersSupport: 'Pas tous les fournisseurs supportent',
  uniqueEmails: 'Adresses email uniques',
  needOwnDomain: 'Domaine propre nécessaire',
  needCatchAllSetup: 'Configuration catch-all nécessaire',
  easyToSetup: 'Facile à configurer',
  worksEverywhere: 'Fonctionne partout',
  oneAccountPerEmail: 'Seulement 1 compte par email',
  worksWithAnyProvider: 'Fonctionne avec tout fournisseur',
  controlOverList: 'Contrôle sur la liste',
  needManyEmails: 'Beaucoup d\'emails nécessaires',
  requiresDomain: 'Domaine propre requis',
  providerNoAlias: 'ne supporte pas les alias',

  // Profile Panel & Active Profile
  activeProfile: 'Profil Actif',
  change: 'Changer',
  noProfileConfigured: 'Aucun profil configuré',
  configure: 'Configurer',
  emailProfiles: 'Profils Email',
  noProfiles: 'Aucun profil configuré',
  addProfile: 'Ajouter un Profil',
  success: 'Succès',
  failed: 'Échoué',

  // Strategy short descriptions
  strategySingleShort: 'Un compte par email',
  strategyPlusAliasShort: 'user+random@domain',
  strategyCatchAllShort: "N'importe quel email sur le domaine",
  strategyPoolShort: "Votre liste d'emails",

  // Danger Zone
  dangerZone: 'Zone Dangereuse',
  resetMachineId: 'Réinitialiser Machine ID',
  resetMachineIdDesc: 'Génère de nouveaux IDs de télémétrie pour Kiro. Utilisez si le compte est banni.',
  resetMachineIdTip: 'Réinitialiser machineId, sqmId, devDeviceId et serviceMachineId',
  reset: 'Réinitialiser',
  restartAfterReset: 'Redémarrer Kiro après la réinitialisation',
  resetMachineIdTitle: 'Réinitialiser Machine ID',
  resetMachineIdConfirm: 'Ceci réinitialisera les IDs de télémétrie Kiro. Vous devrez redémarrer Kiro après. Continuer ?',

  // Other
  delete: 'Supprimer',
  checkUpdates: 'Vérifier les Mises à Jour',
  newVersion: 'Nouvelle version !',
  download: 'Télécharger',
  edit: 'Modifier',
  unnamed: 'Sans nom',
  customDomain: 'Domaine Personnalisé',
  emailPasswordHint: 'Utilisez votre mot de passe email',

  // SSO Modal
  ssoImport: 'Import SSO',
  ssoHint: '1. Ouvrir view.awsapps.com/start\n2. DevTools → Application → Cookies\n3. Copier x-amz-sso_authn',
  pasteCookie: 'Coller le cookie...',

  // Provider Names
  providerGmail: 'Gmail',
  providerYandex: 'Yandex',
  providerMailru: 'Mail.ru',
  providerOutlook: 'Outlook',
  providerCustom: 'Domaine Personnalisé',

  // Provider Password Hints
  gmailPasswordHint: "Utilisez le mot de passe d'application des paramètres Google",
  yandexPasswordHint: "Utilisez le mot de passe d'application des paramètres Yandex",
  mailruPasswordHint: "Créez un mot de passe d'application dans les paramètres Mail.ru",
  outlookPasswordHint: 'Utilisez votre mot de passe de compte Microsoft',

  // Toasts & Messages
  accountDeleted: 'Compte supprimé',
  badAccountsDeleted: 'Mauvais comptes supprimés',
  resettingMachineId: 'Réinitialisation du Machine ID...',
  patchingKiro: 'Patch de Kiro en cours...',
  removingPatch: 'Retrait du patch...',
  profileCreated: 'Profil créé',
  profileUpdated: 'Profil mis à jour',
  profileDeleted: 'Profil supprimé',
  tokenCopied: 'Token copié dans le presse-papiers',
  logsCopied: 'Journaux copiés dans le presse-papiers',
  fillAllFields: 'Veuillez remplir tous les champs IMAP',
  clipboardError: 'Impossible de lire le presse-papiers',
  deleteProfileConfirm: 'Supprimer ce profil ?',
  deleteBadAccountsConfirm: 'Supprimer tous les comptes expirés/épuisés ?',
  deleteBannedAccountsConfirm: 'Supprimer tous les comptes bannis?',
  bannedAccountsDeleted: 'Comptes bannis supprimés',
  emailsImported: 'Imported {count} emails',

  // Import/Export
  exportAccounts: 'Export Accounts',
  exportAccountsDesc: 'Export accounts with tokens',
  importAccounts: 'Import Accounts',
  importAccountsDesc: 'Import accounts from file',
  exportSelected: 'Export Selected',
  exportAll: 'Export All',
};
