/**
 * Profile Editor Component - Wizard with Visual Diagrams
 * Smart email-first approach with provider auto-detection
 */

import { ImapProfile, EmailStrategyType, ProviderHint } from '../../types';
import { ICONS } from '../icons';

export interface ProfileEditorProps {
  profile?: Partial<ImapProfile>;
  providerHints: ProviderHint[];
  mode: 'create' | 'edit';
}

// Provider database with capabilities
const PROVIDERS: Record<string, {
  name: string;
  icon: string;
  domains: string[];
  imap: { server: string; port: number };
  supports: EmailStrategyType[];
  recommended: EmailStrategyType;
  passwordHint: string;
}> = {
  gmail: {
    name: 'Gmail',
    icon: '🔴',
    domains: ['gmail.com', 'googlemail.com'],
    imap: { server: 'imap.gmail.com', port: 993 },
    supports: ['plus_alias', 'single', 'pool'],
    recommended: 'plus_alias',
    passwordHint: 'Используйте App Password (пароль приложения)'
  },
  yandex: {
    name: 'Яндекс',
    icon: '🟡',
    domains: ['yandex.ru', 'yandex.com', 'ya.ru'],
    imap: { server: 'imap.yandex.ru', port: 993 },
    supports: ['plus_alias', 'single', 'pool'],
    recommended: 'plus_alias',
    passwordHint: 'Используйте пароль приложения из настроек Яндекс'
  },
  mailru: {
    name: 'Mail.ru',
    icon: '🔵',
    domains: ['mail.ru', 'inbox.ru', 'list.ru', 'bk.ru'],
    imap: { server: 'imap.mail.ru', port: 993 },
    supports: ['single', 'pool'],
    recommended: 'pool',
    passwordHint: 'Создайте пароль для внешних приложений в настройках'
  },
  outlook: {
    name: 'Outlook',
    icon: '🟦',
    domains: ['outlook.com', 'hotmail.com', 'live.com'],
    imap: { server: 'outlook.office365.com', port: 993 },
    supports: ['plus_alias', 'single', 'pool'],
    recommended: 'plus_alias',
    passwordHint: 'Используйте пароль от аккаунта Microsoft'
  }
};


// Strategy visual diagrams (SVG-like ASCII art rendered as HTML)
const STRATEGY_DIAGRAMS: Record<EmailStrategyType, { 
  title: string;
  titleRu: string;
  diagram: string;
  pros: string[];
  cons: string[];
}> = {
  plus_alias: {
    title: 'Plus Alias',
    titleRu: 'Плюс-алиасы',
    diagram: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-label">Генерируется</div>
          <div class="diagram-email">you<span class="highlight">+kiro1</span>@gmail.com</div>
          <div class="diagram-email">you<span class="highlight">+kiro2</span>@gmail.com</div>
          <div class="diagram-email">you<span class="highlight">+kiroN</span>@gmail.com</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws">
          <div class="diagram-icon">☁️</div>
          <div class="diagram-label">AWS</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox">
          <div class="diagram-icon">📥</div>
          <div class="diagram-label">Ваш ящик</div>
          <div class="diagram-email">you@gmail.com</div>
        </div>
      </div>
    `,
    pros: ['♾️ Безлимит аккаунтов', '📥 Все письма в одном ящике', '🔒 Не нужен свой домен'],
    cons: ['⚠️ Не все провайдеры поддерживают']
  },
  catch_all: {
    title: 'Catch-All Domain',
    titleRu: 'Catch-All домен',
    diagram: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-label">Генерируется</div>
          <div class="diagram-email"><span class="highlight">john123</span>@yourdomain.ru</div>
          <div class="diagram-email"><span class="highlight">mary456</span>@yourdomain.ru</div>
          <div class="diagram-email"><span class="highlight">random</span>@yourdomain.ru</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws">
          <div class="diagram-icon">☁️</div>
          <div class="diagram-label">AWS</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox">
          <div class="diagram-icon">📥</div>
          <div class="diagram-label">Ваш ящик</div>
          <div class="diagram-email">admin@yourdomain.ru</div>
        </div>
      </div>
    `,
    pros: ['♾️ Безлимит аккаунтов', '🎭 Уникальные email адреса', '📥 Все письма в одном ящике'],
    cons: ['🌐 Нужен свой домен', '⚙️ Нужна настройка catch-all']
  },
  single: {
    title: 'Single Email',
    titleRu: 'Один email',
    diagram: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-label">Используется</div>
          <div class="diagram-email">you@gmail.com</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws">
          <div class="diagram-icon">☁️</div>
          <div class="diagram-label">AWS</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox">
          <div class="diagram-icon">📥</div>
          <div class="diagram-label">Ваш ящик</div>
          <div class="diagram-email">you@gmail.com</div>
        </div>
      </div>
    `,
    pros: ['✅ Просто настроить', '✅ Работает везде'],
    cons: ['⚠️ Только 1 аккаунт на email']
  },
  pool: {
    title: 'Email Pool',
    titleRu: 'Пул email-ов',
    diagram: `
      <div class="diagram-flow">
        <div class="diagram-step generated">
          <div class="diagram-label">Ваш список</div>
          <div class="diagram-email">email1@mail.ru ✓</div>
          <div class="diagram-email">email2@mail.ru ✓</div>
          <div class="diagram-email">email3@mail.ru ...</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step aws">
          <div class="diagram-icon">☁️</div>
          <div class="diagram-label">AWS</div>
        </div>
        <div class="diagram-arrow">→</div>
        <div class="diagram-step inbox">
          <div class="diagram-icon">📥</div>
          <div class="diagram-label">Каждый ящик</div>
          <div class="diagram-email">отдельно</div>
        </div>
      </div>
    `,
    pros: ['✅ Работает с любым провайдером', '📋 Контроль над списком'],
    cons: ['⚠️ 1 аккаунт = 1 email', '📝 Нужно много email-ов']
  }
};


function detectProvider(email: string): typeof PROVIDERS[keyof typeof PROVIDERS] | null {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return null;
  
  for (const [, provider] of Object.entries(PROVIDERS)) {
    if (provider.domains.includes(domain)) {
      return provider;
    }
  }
  
  // Custom domain - supports all strategies
  return {
    name: 'Свой домен',
    icon: '🌐',
    domains: [domain],
    imap: { server: `imap.${domain}`, port: 993 },
    supports: ['catch_all', 'plus_alias', 'single', 'pool'],
    recommended: 'catch_all',
    passwordHint: 'Используйте пароль от почты'
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderProfileEditor({ profile, providerHints, mode }: ProfileEditorProps): string {
  const isEdit = mode === 'edit';
  const currentEmail = profile?.imap?.user || '';
  const currentStrategy = profile?.strategy?.type || '';
  const currentDomain = profile?.strategy?.domain || '';
  const emails = profile?.strategy?.emails || [];
  
  // Detect provider from existing email
  const detectedProvider = currentEmail ? detectProvider(currentEmail) : null;
  
  return `
    <div class="profile-editor wizard" id="profileEditor">
      <div class="editor-header">
        <button class="overlay-back" onclick="closeProfileEditor()">
          ${ICONS.chevronLeft} Назад
        </button>
        <span class="editor-title">${isEdit ? 'Редактировать профиль' : 'Новый IMAP профиль'}</span>
      </div>
      
      <div class="editor-content">
        <!-- Step 1: Email Input -->
        <div class="wizard-step" id="step1">
          <div class="step-header">
            <span class="step-number">1</span>
            <span class="step-title">Введите ваш email</span>
          </div>
          
          <div class="email-input-section">
            <input type="email" 
                   class="form-input form-input-large" 
                   id="imapUser" 
                   placeholder="your@email.com"
                   value="${escapeHtml(currentEmail)}"
                   oninput="onEmailInputWizard(this.value)"
                   autocomplete="email">
            
            <div class="provider-detection" id="providerDetection" style="display: ${detectedProvider ? 'block' : 'none'}">
              ${detectedProvider ? `
                <div class="provider-badge">
                  <span class="provider-icon">${detectedProvider.icon}</span>
                  <span class="provider-name">${detectedProvider.name}</span>
                  <span class="provider-check">✓ Обнаружен</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        
        <!-- Step 2: Strategy Selection with Diagrams -->
        <div class="wizard-step" id="step2" style="display: ${currentEmail ? 'block' : 'none'}">
          <div class="step-header">
            <span class="step-number">2</span>
            <span class="step-title">Выберите стратегию</span>
          </div>
          
          <!-- Recommended Strategy (highlighted) -->
          <div class="recommended-strategy" id="recommendedStrategy">
            ${detectedProvider ? renderRecommendedStrategy(detectedProvider.recommended, detectedProvider) : ''}
          </div>
          
          <!-- Other strategies (collapsed) -->
          <details class="other-strategies" id="otherStrategies">
            <summary class="other-strategies-toggle">
              <span>Другие варианты</span>
              <span class="toggle-icon">${ICONS.chevronDown}</span>
            </summary>
            <div class="strategies-grid" id="strategiesGrid">
              ${detectedProvider ? renderOtherStrategies(detectedProvider.recommended, detectedProvider) : ''}
            </div>
          </details>
        </div>
        
        <!-- Step 3: Strategy-specific config -->
        <div class="wizard-step" id="step3" style="display: ${currentStrategy ? 'block' : 'none'}">
          <!-- Catch-All Domain -->
          <div class="strategy-config" id="catchAllConfig" style="display: ${currentStrategy === 'catch_all' ? 'block' : 'none'}">
            <div class="step-header">
              <span class="step-number">3</span>
              <span class="step-title">Настройка Catch-All</span>
            </div>
            <div class="form-group">
              <label class="form-label">Домен для catch-all</label>
              <input type="text" 
                     class="form-input" 
                     id="catchAllDomain" 
                     placeholder="yourdomain.ru"
                     value="${escapeHtml(currentDomain)}">
              <div class="form-hint">Все письма на *@этот-домен будут приходить в ваш ящик</div>
            </div>
          </div>
          
          <!-- Email Pool -->
          <div class="strategy-config" id="poolConfig" style="display: ${currentStrategy === 'pool' ? 'block' : 'none'}">
            <div class="step-header">
              <span class="step-number">3</span>
              <span class="step-title">Список email-ов</span>
            </div>
            <div class="email-pool-editor">
              <div class="pool-stats" id="poolStats">
                <span class="pool-count">📧 <span id="poolCount">${emails.length}</span> email-ов</span>
                <span class="pool-pending">⏳ <span id="poolPending">${emails.filter(e => e.status === 'pending').length}</span> ожидают</span>
              </div>
              <div class="pool-list" id="poolList">
                ${emails.map((e, i) => renderPoolItem(e.email, e.status, i)).join('')}
              </div>
              <div class="pool-add">
                <input type="email" 
                       class="form-input" 
                       id="newPoolEmail" 
                       placeholder="Добавить email..."
                       onkeypress="if(event.key==='Enter') addEmailToPool()">
                <button class="btn btn-icon" onclick="addEmailToPool()" title="Добавить">
                  ${ICONS.plus}
                </button>
              </div>
              <div class="pool-actions">
                <button class="btn btn-secondary btn-sm" onclick="pasteEmails()">
                  📋 Вставить список
                </button>
                <button class="btn btn-secondary btn-sm" onclick="importEmailsFromFile()">
                  📁 Из файла
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Step 4: IMAP Connection -->
        <div class="wizard-step" id="step4" style="display: ${currentStrategy ? 'block' : 'none'}">
          <div class="step-header">
            <span class="step-number">${currentStrategy === 'catch_all' || currentStrategy === 'pool' ? '4' : '3'}</span>
            <span class="step-title">Подключение к почте</span>
          </div>
          
          <div class="imap-settings">
            <div class="form-row">
              <div class="form-group flex-2">
                <label class="form-label">IMAP сервер</label>
                <input type="text" 
                       class="form-input" 
                       id="imapServer" 
                       placeholder="imap.gmail.com"
                       value="${escapeHtml(profile?.imap?.server || detectedProvider?.imap.server || '')}">
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Порт</label>
                <input type="number" 
                       class="form-input" 
                       id="imapPort" 
                       value="${profile?.imap?.port || detectedProvider?.imap.port || 993}">
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Пароль</label>
              <div class="password-input-wrapper">
                <input type="password" 
                       class="form-input" 
                       id="imapPassword" 
                       placeholder="••••••••"
                       value="${escapeHtml(profile?.imap?.password || '')}">
                <button class="password-toggle" onclick="togglePasswordVisibility('imapPassword')" type="button">
                  ${ICONS.eye}
                </button>
              </div>
              <div class="form-hint" id="passwordHint">
                ${detectedProvider?.passwordHint || 'Введите пароль от почты'}
              </div>
            </div>
            
            <button class="btn btn-secondary" onclick="testImapConnection()" id="testConnectionBtn">
              🔌 Проверить подключение
            </button>
            <div class="connection-status" id="connectionStatus"></div>
          </div>
        </div>
        
        <!-- Profile Name (optional, auto-generated) -->
        <div class="wizard-step compact" id="stepName" style="display: ${currentStrategy ? 'block' : 'none'}">
          <div class="form-group">
            <label class="form-label">Название профиля <span class="optional">(опционально)</span></label>
            <input type="text" 
                   class="form-input" 
                   id="profileName" 
                   placeholder="${detectedProvider?.name || 'Мой профиль'}"
                   value="${escapeHtml(profile?.name || '')}">
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeProfileEditor()">Отмена</button>
        <button class="btn btn-primary" onclick="saveProfile('${profile?.id || ''}')" id="saveBtn" disabled>
          ${isEdit ? 'Сохранить' : 'Создать профиль'}
        </button>
      </div>
    </div>
  `;
}


function renderRecommendedStrategy(strategyType: EmailStrategyType, provider: typeof PROVIDERS[keyof typeof PROVIDERS]): string {
  const strategy = STRATEGY_DIAGRAMS[strategyType];
  
  return `
    <div class="strategy-card recommended selected" data-strategy="${strategyType}" onclick="selectStrategyWizard('${strategyType}')">
      <div class="strategy-card-header">
        <div class="strategy-badge recommended-badge">🎯 Рекомендуем</div>
        <div class="strategy-title">${strategy.titleRu}</div>
      </div>
      
      <div class="strategy-diagram">
        ${strategy.diagram}
      </div>
      
      <div class="strategy-features">
        <div class="strategy-pros">
          ${strategy.pros.map(p => `<div class="feature-item pro">${p}</div>`).join('')}
        </div>
        <div class="strategy-cons">
          ${strategy.cons.map(c => `<div class="feature-item con">${c}</div>`).join('')}
        </div>
      </div>
      
      <button class="btn btn-primary btn-block strategy-select-btn">
        ✓ Использовать ${strategy.titleRu}
      </button>
    </div>
  `;
}

function renderOtherStrategies(recommendedType: EmailStrategyType, provider: typeof PROVIDERS[keyof typeof PROVIDERS]): string {
  const allStrategies: EmailStrategyType[] = ['plus_alias', 'catch_all', 'single', 'pool'];
  
  return allStrategies
    .filter(type => type !== recommendedType)
    .map(type => {
      const strategy = STRATEGY_DIAGRAMS[type];
      const isSupported = provider.supports.includes(type);
      
      return `
        <div class="strategy-card ${!isSupported ? 'disabled' : ''}" 
             data-strategy="${type}" 
             onclick="${isSupported ? `selectStrategyWizard('${type}')` : ''}">
          <div class="strategy-card-header">
            ${!isSupported ? '<div class="strategy-badge disabled-badge">❌ Не поддерживается</div>' : ''}
            <div class="strategy-title">${strategy.titleRu}</div>
          </div>
          
          <div class="strategy-diagram mini">
            ${strategy.diagram}
          </div>
          
          <div class="strategy-features compact">
            ${strategy.pros.slice(0, 2).map(p => `<div class="feature-item pro">${p}</div>`).join('')}
            ${strategy.cons.slice(0, 1).map(c => `<div class="feature-item con">${c}</div>`).join('')}
          </div>
          
          ${isSupported ? `
            <button class="btn btn-secondary btn-sm btn-block strategy-select-btn">
              Выбрать
            </button>
          ` : `
            <div class="disabled-reason">
              ${type === 'catch_all' ? 'Требуется свой домен' : 
                type === 'plus_alias' ? `${provider.name} не поддерживает алиасы` : ''}
            </div>
          `}
        </div>
      `;
    }).join('');
}

function renderPoolItem(email: string, status: string, index: number): string {
  const statusIcon = status === 'used' ? '✅' : status === 'failed' ? '❌' : '⬜';
  const statusClass = status === 'used' ? 'used' : status === 'failed' ? 'failed' : 'pending';
  
  return `
    <div class="pool-item ${statusClass}" data-index="${index}">
      <span class="pool-status">${statusIcon}</span>
      <span class="pool-email">${escapeHtml(email)}</span>
      <button class="pool-remove" onclick="removeEmailFromPool(${index})" ${status === 'used' ? 'disabled' : ''}>
        ✕
      </button>
    </div>
  `;
}

// Export scripts for the wizard
export const profileEditorScripts = `
  let currentPoolEmails = [];
  let selectedStrategy = null;
  let detectedProvider = null;
  
  const PROVIDERS = ${JSON.stringify(PROVIDERS)};
  const STRATEGY_DIAGRAMS = {
    plus_alias: ${JSON.stringify(STRATEGY_DIAGRAMS.plus_alias)},
    catch_all: ${JSON.stringify(STRATEGY_DIAGRAMS.catch_all)},
    single: ${JSON.stringify(STRATEGY_DIAGRAMS.single)},
    pool: ${JSON.stringify(STRATEGY_DIAGRAMS.pool)}
  };
  
  function detectProviderClient(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    
    for (const [key, provider] of Object.entries(PROVIDERS)) {
      if (provider.domains.includes(domain)) {
        return { ...provider, key };
      }
    }
    
    // Custom domain
    return {
      key: 'custom',
      name: 'Свой домен',
      icon: '🌐',
      domains: [domain],
      imap: { server: 'imap.' + domain, port: 993 },
      supports: ['catch_all', 'plus_alias', 'single', 'pool'],
      recommended: 'catch_all',
      passwordHint: 'Используйте пароль от почты'
    };
  }
  
  function onEmailInputWizard(email) {
    const provider = detectProviderClient(email);
    const detection = document.getElementById('providerDetection');
    const step2 = document.getElementById('step2');
    const recommendedDiv = document.getElementById('recommendedStrategy');
    const otherDiv = document.getElementById('strategiesGrid');
    
    if (provider && email.includes('@')) {
      detectedProvider = provider;
      
      // Show provider badge
      detection.innerHTML = \`
        <div class="provider-badge">
          <span class="provider-icon">\${provider.icon}</span>
          <span class="provider-name">\${provider.name}</span>
          <span class="provider-check">✓ Обнаружен</span>
        </div>
      \`;
      detection.style.display = 'block';
      
      // Auto-fill IMAP settings
      document.getElementById('imapServer').value = provider.imap.server;
      document.getElementById('imapPort').value = provider.imap.port;
      document.getElementById('passwordHint').textContent = provider.passwordHint;
      
      // Show step 2 with strategies
      step2.style.display = 'block';
      
      // Render recommended strategy
      recommendedDiv.innerHTML = renderRecommendedStrategyClient(provider.recommended, provider);
      
      // Render other strategies
      otherDiv.innerHTML = renderOtherStrategiesClient(provider.recommended, provider);
      
      // Auto-select recommended
      selectStrategyWizard(provider.recommended);
    } else {
      detection.style.display = 'none';
      step2.style.display = 'none';
      detectedProvider = null;
    }
  }
  
  function renderRecommendedStrategyClient(strategyType, provider) {
    const strategy = STRATEGY_DIAGRAMS[strategyType];
    return \`
      <div class="strategy-card recommended selected" data-strategy="\${strategyType}" onclick="selectStrategyWizard('\${strategyType}')">
        <div class="strategy-card-header">
          <div class="strategy-badge recommended-badge">🎯 Рекомендуем</div>
          <div class="strategy-title">\${strategy.titleRu}</div>
        </div>
        <div class="strategy-diagram">\${strategy.diagram}</div>
        <div class="strategy-features">
          <div class="strategy-pros">\${strategy.pros.map(p => '<div class="feature-item pro">' + p + '</div>').join('')}</div>
          <div class="strategy-cons">\${strategy.cons.map(c => '<div class="feature-item con">' + c + '</div>').join('')}</div>
        </div>
        <button class="btn btn-primary btn-block strategy-select-btn">✓ Использовать \${strategy.titleRu}</button>
      </div>
    \`;
  }
  
  function renderOtherStrategiesClient(recommendedType, provider) {
    const allStrategies = ['plus_alias', 'catch_all', 'single', 'pool'];
    return allStrategies
      .filter(type => type !== recommendedType)
      .map(type => {
        const strategy = STRATEGY_DIAGRAMS[type];
        const isSupported = provider.supports.includes(type);
        return \`
          <div class="strategy-card \${!isSupported ? 'disabled' : ''}" data-strategy="\${type}" onclick="\${isSupported ? "selectStrategyWizard('" + type + "')" : ''}">
            <div class="strategy-card-header">
              \${!isSupported ? '<div class="strategy-badge disabled-badge">❌ Не поддерживается</div>' : ''}
              <div class="strategy-title">\${strategy.titleRu}</div>
            </div>
            <div class="strategy-diagram mini">\${strategy.diagram}</div>
            <div class="strategy-features compact">
              \${strategy.pros.slice(0,2).map(p => '<div class="feature-item pro">' + p + '</div>').join('')}
              \${strategy.cons.slice(0,1).map(c => '<div class="feature-item con">' + c + '</div>').join('')}
            </div>
            \${isSupported ? '<button class="btn btn-secondary btn-sm btn-block strategy-select-btn">Выбрать</button>' : '<div class="disabled-reason">' + (type === 'catch_all' ? 'Требуется свой домен' : type === 'plus_alias' ? provider.name + ' не поддерживает алиасы' : '') + '</div>'}
          </div>
        \`;
      }).join('');
  }
  
  function selectStrategyWizard(strategy) {
    selectedStrategy = strategy;
    
    // Update UI
    document.querySelectorAll('.strategy-card').forEach(el => {
      el.classList.toggle('selected', el.dataset.strategy === strategy);
    });
    
    // Show/hide strategy-specific config
    document.getElementById('catchAllConfig').style.display = strategy === 'catch_all' ? 'block' : 'none';
    document.getElementById('poolConfig').style.display = strategy === 'pool' ? 'block' : 'none';
    
    // Show step 3/4
    document.getElementById('step3').style.display = (strategy === 'catch_all' || strategy === 'pool') ? 'block' : 'none';
    document.getElementById('step4').style.display = 'block';
    document.getElementById('stepName').style.display = 'block';
    
    // Enable save button
    updateSaveButton();
  }
  
  function updateSaveButton() {
    const email = document.getElementById('imapUser').value;
    const password = document.getElementById('imapPassword').value;
    const saveBtn = document.getElementById('saveBtn');
    
    const isValid = email && email.includes('@') && password && selectedStrategy;
    saveBtn.disabled = !isValid;
  }
  
  // Pool management
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
    list.innerHTML = currentPoolEmails.map((email, i) => 
      '<div class="pool-item pending" data-index="' + i + '">' +
        '<span class="pool-status">⬜</span>' +
        '<span class="pool-email">' + email + '</span>' +
        '<button class="pool-remove" onclick="removeEmailFromPool(' + i + ')">✕</button>' +
      '</div>'
    ).join('');
    
    document.getElementById('poolCount').textContent = currentPoolEmails.length;
    document.getElementById('poolPending').textContent = currentPoolEmails.length;
  }
  
  function pasteEmails() {
    navigator.clipboard.readText().then(text => {
      const emails = text.split(/[\\n,;\\s]+/).filter(e => e.includes('@'));
      emails.forEach(email => {
        if (!currentPoolEmails.includes(email.toLowerCase())) {
          currentPoolEmails.push(email.trim());
        }
      });
      renderPoolList();
    });
  }
  
  function importEmailsFromFile() {
    vscode.postMessage({ type: 'importEmailsFromFile' });
  }
  
  function testImapConnection() {
    const btn = document.getElementById('testConnectionBtn');
    const status = document.getElementById('connectionStatus');
    
    btn.disabled = true;
    btn.textContent = '⏳ Проверка...';
    status.innerHTML = '';
    
    const server = document.getElementById('imapServer').value;
    const user = document.getElementById('imapUser').value;
    const password = document.getElementById('imapPassword').value;
    const port = document.getElementById('imapPort').value || 993;
    
    vscode.postMessage({ 
      type: 'testImapConnection', 
      data: { server, user, password, port }
    });
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
    
    if (selectedStrategy === 'catch_all') {
      strategy.domain = document.getElementById('catchAllDomain').value.trim();
    } else if (selectedStrategy === 'pool') {
      strategy.emails = currentPoolEmails.map(email => ({ email, status: 'pending' }));
    }
    
    vscode.postMessage({
      type: existingId ? 'updateProfile' : 'createProfile',
      data: {
        id: existingId || undefined,
        name: name || (detectedProvider?.name || 'Профиль') + ' - ' + selectedStrategy,
        imap: { server, user, password, port },
        strategy
      }
    });
  }
  
  function closeProfileEditor() {
    vscode.postMessage({ type: 'closeProfileEditor' });
  }
  
  // Listen for password input to enable save
  document.getElementById('imapPassword')?.addEventListener('input', updateSaveButton);
`;
