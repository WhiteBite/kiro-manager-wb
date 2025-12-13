/**
 * Profile Editor Component - Wizard with Visual Diagrams
 * Smart email-first approach with provider auto-detection
 * Fully i18n-enabled
 */

import { ImapProfile, EmailStrategyType } from '../../types';
import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface ProfileEditorProps {
  profile?: Partial<ImapProfile>;
  mode: 'create' | 'edit';
  t: Translations;
}

// Provider database with capabilities
interface ProviderConfig {
  nameKey: keyof Translations;
  icon: string;
  domains: string[];
  imap: { server: string; port: number };
  supports: EmailStrategyType[];
  recommended: EmailStrategyType;
  passwordHintKey: keyof Translations;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  gmail: {
    nameKey: 'providerGmail',
    icon: '🔴',
    domains: ['gmail.com', 'googlemail.com'],
    imap: { server: 'imap.gmail.com', port: 993 },
    supports: ['plus_alias', 'single', 'pool'],
    recommended: 'plus_alias',
    passwordHintKey: 'gmailPasswordHint'
  },
  yandex: {
    nameKey: 'providerYandex',
    icon: '🟡',
    domains: ['yandex.ru', 'yandex.com', 'ya.ru'],
    imap: { server: 'imap.yandex.ru', port: 993 },
    supports: ['plus_alias', 'single', 'pool'],
    recommended: 'plus_alias',
    passwordHintKey: 'yandexPasswordHint'
  },
  mailru: {
    nameKey: 'providerMailru',
    icon: '🔵',
    domains: ['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru'],
    imap: { server: 'imap.mail.ru', port: 993 },
    supports: ['single', 'pool'],
    recommended: 'pool',
    passwordHintKey: 'mailruPasswordHint'
  },
  outlook: {
    nameKey: 'providerOutlook',
    icon: '🟦',
    domains: ['outlook.com', 'hotmail.com', 'live.com'],
    imap: { server: 'outlook.office365.com', port: 993 },
    supports: ['plus_alias', 'single', 'pool'],
    recommended: 'plus_alias',
    passwordHintKey: 'outlookPasswordHint'
  }
};

// Strategy config with translation keys
interface StrategyConfig {
  nameKey: keyof Translations;
  descKey: keyof Translations;
  prosKeys: (keyof Translations)[];
  consKeys: (keyof Translations)[];
}

const STRATEGY_CONFIG: Record<EmailStrategyType, StrategyConfig> = {
  plus_alias: {
    nameKey: 'strategyPlusAliasName',
    descKey: 'strategyPlusAliasDesc',
    prosKeys: ['unlimitedAccounts', 'allEmailsOneInbox', 'noOwnDomain'],
    consKeys: ['notAllProvidersSupport']
  },
  catch_all: {
    nameKey: 'strategyCatchAllName',
    descKey: 'strategyCatchAllDesc',
    prosKeys: ['unlimitedAccounts', 'uniqueEmails', 'allEmailsOneInbox'],
    consKeys: ['needOwnDomain', 'needCatchAllSetup']
  },
  single: {
    nameKey: 'strategySingleName',
    descKey: 'strategySingleDesc',
    prosKeys: ['easyToSetup', 'worksEverywhere'],
    consKeys: ['oneAccountPerEmail']
  },
  pool: {
    nameKey: 'strategyPoolName',
    descKey: 'strategyPoolDesc',
    prosKeys: ['worksWithAnyProvider', 'controlOverList'],
    consKeys: ['oneAccountPerEmail', 'needManyEmails']
  }
};

// Strategy diagrams (visual, mostly language-independent)
function getDiagramHtml(strategy: EmailStrategyType): string {
  const diagrams: Record<EmailStrategyType, string> = {
    plus_alias: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-email">you<span class="highlight">+kiro1</span>@gmail.com</div>
          <div class="diagram-email">you<span class="highlight">+kiro2</span>@gmail.com</div>
          <div class="diagram-email">you<span class="highlight">+kiroN</span>@gmail.com</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws"><div class="diagram-icon">☁️</div><div class="diagram-label">AWS</div></div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox"><div class="diagram-icon">📥</div><div class="diagram-email">you@gmail.com</div></div>
      </div>`,
    catch_all: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-email"><span class="highlight">john123</span>@domain.com</div>
          <div class="diagram-email"><span class="highlight">mary456</span>@domain.com</div>
          <div class="diagram-email"><span class="highlight">random</span>@domain.com</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws"><div class="diagram-icon">☁️</div><div class="diagram-label">AWS</div></div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox"><div class="diagram-icon">📥</div><div class="diagram-email">admin@domain.com</div></div>
      </div>`,
    single: `
      <div class="diagram-flow">
        <div class="diagram-step generated"><div class="diagram-email">you@gmail.com</div></div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws"><div class="diagram-icon">☁️</div><div class="diagram-label">AWS</div></div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox"><div class="diagram-icon">📥</div><div class="diagram-email">you@gmail.com</div></div>
      </div>`,
    pool: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-email">email1@mail.ru ✓</div>
          <div class="diagram-email">email2@mail.ru ✓</div>
          <div class="diagram-email">email3@mail.ru ...</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws"><div class="diagram-icon">☁️</div><div class="diagram-label">AWS</div></div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox"><div class="diagram-icon">📥</div></div>
      </div>`
  };
  return diagrams[strategy];
}

function detectProvider(email: string, t: Translations): { name: string; icon: string; imap: { server: string; port: number }; supports: EmailStrategyType[]; recommended: EmailStrategyType; passwordHint: string } | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;

  for (const [, provider] of Object.entries(PROVIDERS)) {
    if (provider.domains.includes(domain)) {
      return {
        name: t[provider.nameKey] as string,
        icon: provider.icon,
        imap: provider.imap,
        supports: provider.supports,
        recommended: provider.recommended,
        passwordHint: t[provider.passwordHintKey] as string
      };
    }
  }

  // Custom domain
  return {
    name: t.customDomain,
    icon: '🌐',
    imap: { server: `imap.${domain}`, port: 993 },
    supports: ['catch_all', 'plus_alias', 'single', 'pool'],
    recommended: 'catch_all',
    passwordHint: t.emailPasswordHint
  };
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


function renderStrategyCard(strategyType: EmailStrategyType, t: Translations, isRecommended: boolean, isSupported: boolean, providerName?: string): string {
  const config = STRATEGY_CONFIG[strategyType];
  const name = t[config.nameKey] as string;
  const pros = config.prosKeys.map(k => `<div class="feature-item pro">✓ ${t[k]}</div>`).join('');
  const cons = config.consKeys.map(k => `<div class="feature-item con">⚠️ ${t[k]}</div>`).join('');

  if (!isSupported) {
    return `
      <div class="strategy-card disabled" data-strategy="${strategyType}">
        <div class="strategy-card-header">
          <div class="strategy-badge disabled-badge">❌</div>
          <div class="strategy-title">${name}</div>
        </div>
        <div class="strategy-diagram mini">${getDiagramHtml(strategyType)}</div>
        <div class="disabled-reason">${strategyType === 'catch_all' ? t.requiresDomain : `${providerName} ${t.providerNoAlias}`}</div>
      </div>`;
  }

  return `
    <div class="strategy-card ${isRecommended ? 'recommended selected' : ''}" data-strategy="${strategyType}" onclick="selectStrategyWizard('${strategyType}')">
      <div class="strategy-card-header">
        ${isRecommended ? `<div class="strategy-badge recommended-badge">🎯 ${t.recommended}</div>` : ''}
        <div class="strategy-title">${name}</div>
      </div>
      <div class="strategy-diagram ${isRecommended ? '' : 'mini'}">${getDiagramHtml(strategyType)}</div>
      <div class="strategy-features ${isRecommended ? '' : 'compact'}">
        <div class="strategy-pros">${isRecommended ? pros : config.prosKeys.slice(0, 2).map(k => `<div class="feature-item pro">✓ ${t[k]}</div>`).join('')}</div>
        <div class="strategy-cons">${isRecommended ? cons : config.consKeys.slice(0, 1).map(k => `<div class="feature-item con">⚠️ ${t[k]}</div>`).join('')}</div>
      </div>
      <button class="btn ${isRecommended ? 'btn-primary' : 'btn-secondary btn-sm'} btn-block strategy-select-btn">
        ${isRecommended ? `✓ ${name}` : t.chooseStrategy}
      </button>
    </div>`;
}

function renderPoolItem(email: string, status: string, index: number): string {
  const statusIcon = status === 'used' ? '✅' : status === 'failed' ? '❌' : '⬜';
  const statusClass = status === 'used' ? 'used' : status === 'failed' ? 'failed' : 'pending';
  return `
    <div class="pool-item ${statusClass}" data-index="${index}">
      <span class="pool-status">${statusIcon}</span>
      <span class="pool-email">${escapeHtml(email)}</span>
      <button class="pool-remove" onclick="removeEmailFromPool(${index})" ${status === 'used' ? 'disabled' : ''}>✕</button>
    </div>`;
}

export function renderProfileEditor({ profile, mode, t }: ProfileEditorProps): string {
  const isEdit = mode === 'edit';
  const currentEmail = profile?.imap?.user || '';
  const currentStrategy = profile?.strategy?.type || '';
  const currentDomain = profile?.strategy?.domain || '';
  const emails = profile?.strategy?.emails || [];
  const detectedProvider = currentEmail ? detectProvider(currentEmail, t) : null;

  // Render recommended strategy
  const renderRecommended = (recommended: EmailStrategyType, provider: ReturnType<typeof detectProvider>) => {
    if (!provider) return '';
    return renderStrategyCard(recommended, t, true, true);
  };

  // Render other strategies
  const renderOthers = (recommended: EmailStrategyType, provider: ReturnType<typeof detectProvider>) => {
    if (!provider) return '';
    const allStrategies: EmailStrategyType[] = ['plus_alias', 'catch_all', 'single', 'pool'];
    return allStrategies
      .filter(type => type !== recommended)
      .map(type => renderStrategyCard(type, t, false, provider.supports.includes(type), provider.name))
      .join('');
  };

  return `
    <div class="profile-editor wizard" id="profileEditor">
      <div class="editor-header">
        <button class="overlay-back" onclick="closeProfileEditor()">${ICONS.chevronLeft} ${t.back}</button>
        <span class="editor-title">${isEdit ? t.editProfile : t.newProfile}</span>
      </div>
      
      <div class="editor-content">
        <!-- Step 1: Email Input -->
        <div class="wizard-step" id="step1">
          <div class="step-header">
            <span class="step-number">1</span>
            <span class="step-title">${t.enterYourEmail}</span>
          </div>
          <div class="email-input-section">
            <input type="email" class="form-input form-input-large" id="imapUser" placeholder="your@email.com"
                   value="${escapeHtml(currentEmail)}" oninput="onEmailInputWizard(this.value)" autocomplete="email">
            <div class="provider-detection" id="providerDetection" style="display: ${detectedProvider ? 'block' : 'none'}">
              ${detectedProvider ? `
                <div class="provider-badge">
                  <span class="provider-icon">${detectedProvider.icon}</span>
                  <span class="provider-name">${detectedProvider.name}</span>
                  <span class="provider-check">✓ ${t.detected}</span>
                </div>` : ''}
            </div>
          </div>
        </div>
        
        <!-- Step 2: Strategy Selection -->
        <div class="wizard-step" id="step2" style="display: ${currentEmail ? 'block' : 'none'}">
          <div class="step-header">
            <span class="step-number">2</span>
            <span class="step-title">${t.chooseStrategy}</span>
          </div>
          <div class="recommended-strategy" id="recommendedStrategy">
            ${detectedProvider ? renderRecommended(detectedProvider.recommended, detectedProvider) : ''}
          </div>
          <details class="other-strategies" id="otherStrategies">
            <summary class="other-strategies-toggle">
              <span>${t.otherOptions}</span>
              <span class="toggle-icon">${ICONS.chevronDown}</span>
            </summary>
            <div class="strategies-grid" id="strategiesGrid">
              ${detectedProvider ? renderOthers(detectedProvider.recommended, detectedProvider) : ''}
            </div>
          </details>
        </div>
        
        <!-- Step 3: Strategy-specific config -->
        <div class="wizard-step" id="step3" style="display: ${currentStrategy ? 'block' : 'none'}">
          <div class="strategy-config" id="catchAllConfig" style="display: ${currentStrategy === 'catch_all' ? 'block' : 'none'}">
            <div class="step-header"><span class="step-number">3</span><span class="step-title">${t.strategyCatchAllName}</span></div>
            <div class="form-group">
              <label class="form-label">${t.strategyCatchAllDomain}</label>
              <input type="text" class="form-input" id="catchAllDomain" placeholder="yourdomain.com" value="${escapeHtml(currentDomain)}">
              <div class="form-hint">${t.strategyCatchAllHint}</div>
            </div>
          </div>
          <div class="strategy-config" id="poolConfig" style="display: ${currentStrategy === 'pool' ? 'block' : 'none'}">
            <div class="step-header"><span class="step-number">3</span><span class="step-title">${t.strategyPoolName}</span></div>
            <div class="email-pool-editor">
              <div class="pool-stats" id="poolStats">
                <span class="pool-count">📧 <span id="poolCount">${emails.length}</span></span>
              </div>
              <div class="pool-list" id="poolList">${emails.map((e, i) => renderPoolItem(e.email, e.status, i)).join('')}</div>
              <div class="pool-add">
                <input type="email" class="form-input" id="newPoolEmail" placeholder="${t.strategyPoolAdd}" onkeypress="if(event.key==='Enter') addEmailToPool()">
                <button class="btn btn-icon" onclick="addEmailToPool()">${ICONS.plus}</button>
              </div>
              <div class="pool-actions">
                <button class="btn btn-secondary btn-sm" onclick="pasteEmails()">📋 ${t.strategyPoolPaste}</button>
                <button class="btn btn-secondary btn-sm" onclick="importEmailsFromFile()">📁 ${t.strategyPoolFromFile}</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Step 4: IMAP Connection -->
        <div class="wizard-step" id="step4" style="display: ${currentStrategy ? 'block' : 'none'}">
          <div class="step-header">
            <span class="step-number">${currentStrategy === 'catch_all' || currentStrategy === 'pool' ? '4' : '3'}</span>
            <span class="step-title">${t.imapConnection}</span>
          </div>
          <div class="imap-settings">
            <div class="form-row">
              <div class="form-group flex-2">
                <label class="form-label">${t.server}</label>
                <input type="text" class="form-input" id="imapServer" placeholder="imap.gmail.com" value="${escapeHtml(profile?.imap?.server || detectedProvider?.imap.server || '')}">
              </div>
              <div class="form-group flex-1">
                <label class="form-label">${t.port}</label>
                <input type="number" class="form-input" id="imapPort" value="${profile?.imap?.port || detectedProvider?.imap.port || 993}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">${t.password}</label>
              <div class="password-input-wrapper">
                <input type="password" class="form-input" id="imapPassword" placeholder="••••••••" value="${escapeHtml(profile?.imap?.password || '')}">
                <button class="password-toggle" onclick="togglePasswordVisibility('imapPassword')" type="button">${ICONS.eye}</button>
              </div>
              <div class="form-hint" id="passwordHint">${detectedProvider?.passwordHint || t.emailPasswordHint}</div>
            </div>
            <button class="btn btn-secondary" onclick="testImapConnection()" id="testConnectionBtn">🔌 ${t.checkConnection}</button>
            <div class="connection-status" id="connectionStatus"></div>
          </div>
        </div>
        
        <!-- Profile Name -->
        <div class="wizard-step compact" id="stepName" style="display: ${currentStrategy ? 'block' : 'none'}">
          <div class="form-group">
            <label class="form-label">${t.profileName} <span class="optional">(${t.optional})</span></label>
            <input type="text" class="form-input" id="profileName" placeholder="${t.profileNamePlaceholder}" value="${escapeHtml(profile?.name || '')}">
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeProfileEditor()">${t.cancel}</button>
        <button class="btn btn-primary" onclick="saveProfile('${profile?.id || ''}')" id="saveBtn" disabled>${isEdit ? t.save : t.createProfile}</button>
      </div>
    </div>`;
}


// Client-side scripts for the wizard (uses T object from scripts.ts)
export const profileEditorScripts = `
  let currentPoolEmails = [];
  let selectedStrategy = null;
  let detectedProvider = null;
  
  const PROVIDERS_CLIENT = {
    gmail: { name: T.providerGmail, icon: '🔴', domains: ['gmail.com', 'googlemail.com'], imap: { server: 'imap.gmail.com', port: 993 }, supports: ['plus_alias', 'single', 'pool'], recommended: 'plus_alias', passwordHint: T.gmailPasswordHint },
    yandex: { name: T.providerYandex, icon: '🟡', domains: ['yandex.ru', 'yandex.com', 'ya.ru'], imap: { server: 'imap.yandex.ru', port: 993 }, supports: ['plus_alias', 'single', 'pool'], recommended: 'plus_alias', passwordHint: T.yandexPasswordHint },
    mailru: { name: T.providerMailru, icon: '🔵', domains: ['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru'], imap: { server: 'imap.mail.ru', port: 993 }, supports: ['single', 'pool'], recommended: 'pool', passwordHint: T.mailruPasswordHint },
    outlook: { name: T.providerOutlook, icon: '🟦', domains: ['outlook.com', 'hotmail.com', 'live.com'], imap: { server: 'outlook.office365.com', port: 993 }, supports: ['plus_alias', 'single', 'pool'], recommended: 'plus_alias', passwordHint: T.outlookPasswordHint }
  };
  
  const STRATEGY_CONFIG_CLIENT = {
    plus_alias: { name: T.strategyPlusAliasName, pros: [T.unlimitedAccounts, T.allEmailsOneInbox, T.noOwnDomain], cons: [T.notAllProvidersSupport] },
    catch_all: { name: T.strategyCatchAllName, pros: [T.unlimitedAccounts, T.uniqueEmails, T.allEmailsOneInbox], cons: [T.needOwnDomain, T.needCatchAllSetup] },
    single: { name: T.strategySingleName, pros: [T.easyToSetup, T.worksEverywhere], cons: [T.oneAccountPerEmail] },
    pool: { name: T.strategyPoolName, pros: [T.worksWithAnyProvider, T.controlOverList], cons: [T.oneAccountPerEmail, T.needManyEmails] }
  };
  
  const DIAGRAMS = {
    plus_alias: '<div class="diagram-flow"><div class="diagram-step generated"><div class="diagram-email">you<span class="highlight">+kiro1</span>@gmail.com</div><div class="diagram-email">you<span class="highlight">+kiro2</span>@gmail.com</div></div><div class="diagram-arrow">→</div><div class="diagram-step aws"><div class="diagram-icon">☁️</div></div><div class="diagram-arrow">→</div><div class="diagram-step inbox"><div class="diagram-icon">📥</div></div></div>',
    catch_all: '<div class="diagram-flow"><div class="diagram-step generated"><div class="diagram-email"><span class="highlight">random</span>@domain.com</div></div><div class="diagram-arrow">→</div><div class="diagram-step aws"><div class="diagram-icon">☁️</div></div><div class="diagram-arrow">→</div><div class="diagram-step inbox"><div class="diagram-icon">📥</div></div></div>',
    single: '<div class="diagram-flow"><div class="diagram-step generated"><div class="diagram-email">you@gmail.com</div></div><div class="diagram-arrow">→</div><div class="diagram-step aws"><div class="diagram-icon">☁️</div></div><div class="diagram-arrow">→</div><div class="diagram-step inbox"><div class="diagram-icon">📥</div></div></div>',
    pool: '<div class="diagram-flow"><div class="diagram-step generated"><div class="diagram-email">email1@mail.ru ✓</div><div class="diagram-email">email2@mail.ru ...</div></div><div class="diagram-arrow">→</div><div class="diagram-step aws"><div class="diagram-icon">☁️</div></div><div class="diagram-arrow">→</div><div class="diagram-step inbox"><div class="diagram-icon">📥</div></div></div>'
  };
  
  function detectProviderClient(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    for (const [key, provider] of Object.entries(PROVIDERS_CLIENT)) {
      if (provider.domains.includes(domain)) return { ...provider, key };
    }
    return { key: 'custom', name: T.customDomain, icon: '🌐', domains: [domain], imap: { server: 'imap.' + domain, port: 993 }, supports: ['catch_all', 'plus_alias', 'single', 'pool'], recommended: 'catch_all', passwordHint: T.emailPasswordHint };
  }
  
  function onEmailInputWizard(email) {
    const provider = detectProviderClient(email);
    const detection = document.getElementById('providerDetection');
    const step2 = document.getElementById('step2');
    
    if (provider && email.includes('@')) {
      detectedProvider = provider;
      detection.innerHTML = '<div class="provider-badge"><span class="provider-icon">' + provider.icon + '</span><span class="provider-name">' + provider.name + '</span><span class="provider-check">✓ ' + T.detected + '</span></div>';
      detection.style.display = 'block';
      document.getElementById('imapServer').value = provider.imap.server;
      document.getElementById('imapPort').value = provider.imap.port;
      document.getElementById('passwordHint').textContent = provider.passwordHint;
      step2.style.display = 'block';
      document.getElementById('recommendedStrategy').innerHTML = renderStrategyCardClient(provider.recommended, true, true);
      document.getElementById('strategiesGrid').innerHTML = ['plus_alias', 'catch_all', 'single', 'pool'].filter(t => t !== provider.recommended).map(t => renderStrategyCardClient(t, false, provider.supports.includes(t))).join('');
      selectStrategyWizard(provider.recommended);
    } else {
      detection.style.display = 'none';
      step2.style.display = 'none';
      detectedProvider = null;
    }
  }
  
  function renderStrategyCardClient(strategyType, isRecommended, isSupported) {
    const config = STRATEGY_CONFIG_CLIENT[strategyType];
    if (!isSupported) {
      return '<div class="strategy-card disabled" data-strategy="' + strategyType + '"><div class="strategy-card-header"><div class="strategy-badge disabled-badge">❌</div><div class="strategy-title">' + config.name + '</div></div><div class="strategy-diagram mini">' + DIAGRAMS[strategyType] + '</div><div class="disabled-reason">' + (strategyType === 'catch_all' ? T.requiresDomain : detectedProvider?.name + ' ' + T.providerNoAlias) + '</div></div>';
    }
    const pros = (isRecommended ? config.pros : config.pros.slice(0, 2)).map(p => '<div class="feature-item pro">✓ ' + p + '</div>').join('');
    const cons = (isRecommended ? config.cons : config.cons.slice(0, 1)).map(c => '<div class="feature-item con">⚠️ ' + c + '</div>').join('');
    return '<div class="strategy-card ' + (isRecommended ? 'recommended selected' : '') + '" data-strategy="' + strategyType + '" onclick="selectStrategyWizard(\\'' + strategyType + '\\')"><div class="strategy-card-header">' + (isRecommended ? '<div class="strategy-badge recommended-badge">🎯 ' + T.recommended + '</div>' : '') + '<div class="strategy-title">' + config.name + '</div></div><div class="strategy-diagram ' + (isRecommended ? '' : 'mini') + '">' + DIAGRAMS[strategyType] + '</div><div class="strategy-features ' + (isRecommended ? '' : 'compact') + '"><div class="strategy-pros">' + pros + '</div><div class="strategy-cons">' + cons + '</div></div><button class="btn ' + (isRecommended ? 'btn-primary' : 'btn-secondary btn-sm') + ' btn-block strategy-select-btn">' + (isRecommended ? '✓ ' + config.name : T.chooseStrategy) + '</button></div>';
  }
  
  function selectStrategyWizard(strategy) {
    selectedStrategy = strategy;
    document.querySelectorAll('.strategy-card').forEach(el => el.classList.toggle('selected', el.dataset.strategy === strategy));
    document.getElementById('catchAllConfig').style.display = strategy === 'catch_all' ? 'block' : 'none';
    document.getElementById('poolConfig').style.display = strategy === 'pool' ? 'block' : 'none';
    document.getElementById('step3').style.display = (strategy === 'catch_all' || strategy === 'pool') ? 'block' : 'none';
    document.getElementById('step4').style.display = 'block';
    document.getElementById('stepName').style.display = 'block';
    updateSaveButton();
  }
  
  function updateSaveButton() {
    const email = document.getElementById('imapUser').value;
    const password = document.getElementById('imapPassword').value;
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = !(email && email.includes('@') && password && selectedStrategy);
  }
  
  function addEmailToPool() {
    const input = document.getElementById('newPoolEmail');
    const email = input.value.trim();
    if (!email || !email.includes('@')) return;
    if (!currentPoolEmails.includes(email.toLowerCase())) {
      currentPoolEmails.push(email);
      renderPoolList();
    }
    input.value = '';
  }
  
  function removeEmailFromPool(index) {
    currentPoolEmails.splice(index, 1);
    renderPoolList();
  }
  
  function renderPoolList() {
    const list = document.getElementById('poolList');
    list.innerHTML = currentPoolEmails.map((email, i) => '<div class="pool-item pending" data-index="' + i + '"><span class="pool-status">⬜</span><span class="pool-email">' + email + '</span><button class="pool-remove" onclick="removeEmailFromPool(' + i + ')">✕</button></div>').join('');
    document.getElementById('poolCount').textContent = currentPoolEmails.length;
  }
  
  function pasteEmails() {
    navigator.clipboard.readText().then(text => {
      text.split(/[\\n,;\\s]+/).filter(e => e.includes('@')).forEach(email => {
        if (!currentPoolEmails.includes(email.toLowerCase())) currentPoolEmails.push(email.trim());
      });
      renderPoolList();
    });
  }
  
  function importEmailsFromFile() {
    vscode.postMessage({ command: 'importEmailsFromFile' });
  }
  
  function testImapConnection() {
    const btn = document.getElementById('testConnectionBtn');
    const status = document.getElementById('connectionStatus');
    btn.disabled = true;
    btn.textContent = '⏳ ' + T.testing;
    status.innerHTML = '';
    vscode.postMessage({ command: 'testImap', server: document.getElementById('imapServer').value, user: document.getElementById('imapUser').value, password: document.getElementById('imapPassword').value, port: parseInt(document.getElementById('imapPort').value) || 993 });
  }
  
  function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
  }
  
  function saveProfile(existingId) {
    const name = document.getElementById('profileName').value.trim();
    const server = document.getElementById('imapServer').value.trim();
    const user = document.getElementById('imapUser').value.trim();
    const password = document.getElementById('imapPassword').value;
    const port = parseInt(document.getElementById('imapPort').value) || 993;
    const strategy = { type: selectedStrategy };
    if (selectedStrategy === 'catch_all') strategy.domain = document.getElementById('catchAllDomain').value.trim();
    else if (selectedStrategy === 'pool') strategy.emails = currentPoolEmails.map(email => ({ email, status: 'pending' }));
    vscode.postMessage({ command: existingId ? 'updateProfile' : 'createProfile', profile: { id: existingId || undefined, name: name || (detectedProvider?.name || T.unnamed) + ' - ' + selectedStrategy, imap: { server, user, password, port }, strategy } });
  }
  
  function closeProfileEditor() {
    document.getElementById('profileEditor')?.classList.remove('visible');
  }
  
  document.getElementById('imapPassword')?.addEventListener('input', updateSaveButton);
`;
