/**
 * Client-side scripts for webview v5.0
 */

import { generateStateScript } from './state';
import { Translations } from './i18n/types';

/**
 * Generates the complete client-side JavaScript for the webview.
 * Includes all UI interactions, tab navigation, account management,
 * console logging, and VS Code API communication.
 * @param _totalAccounts - Total number of accounts (currently unused, reserved for future use)
 * @param _bannedCount - Number of banned accounts (currently unused, reserved for future use)
 * @param t - Translations object for internationalization
 * @returns Complete JavaScript code as a string to be injected into the webview
 * @example
 * const script = generateWebviewScript(10, 2, translations);
 * // Returns JS code with embedded translations
 */
export function generateWebviewScript(_totalAccounts: number, _bannedCount: number, t: Translations): string {
  // Serialize translations for client-side use
  const T = JSON.stringify(t);

  return `
    const T = ${T};
   
    const vscode = acquireVsCodeApi();
    let pendingAction = null;
    let focusedAccountIndex = -1;
    
    // Client-side HTML escaping (uses DOM API, different from server-side helpers.ts version)
    function escapeHtmlClient(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Registration step definitions for progress indicators
    const REG_STEPS = [
      { id: 'setup', icon: '⚙️', name: 'Setup' },
      { id: 'email', icon: '📧', name: 'Email' },
      { id: 'browser', icon: '🌐', name: 'Browser' },
      { id: 'signup', icon: '📝', name: 'Sign Up' },
      { id: 'verify', icon: '✉️', name: 'Verify' },
      { id: 'auth', icon: '🔐', name: 'Auth' },
      { id: 'token', icon: '🎫', name: 'Token' },
      { id: 'done', icon: '✅', name: 'Done' }
    ];
    
    function renderStepIndicatorsJS(currentStep, totalSteps, error) {
      const steps = REG_STEPS.slice(0, totalSteps);
      const stepsHtml = steps.map((step, i) => {
        const stepNum = i + 1;
        let status = 'pending';
        if (stepNum < currentStep) status = 'done';
        else if (stepNum === currentStep) status = error ? 'error' : 'active';
        return '<div class="step-indicator ' + status + '" title="' + step.name + '">' +
               '<span class="step-icon">' + step.icon + '</span>' +
               '<span class="step-dot"></span>' +
               '</div>';
      }).join('<div class="step-line"></div>');
      return '<div class="step-indicators">' + stepsHtml + '</div>';
    }
    
    ${generateStateScript()}
    
    // === Tab Navigation ===
    
    let currentTab = 'accounts';
    
    function switchTab(tabId) {
      if (currentTab === tabId) return;
      
      const previousTab = currentTab;
      currentTab = tabId;
      setState({ activeTab: tabId });
      
      // Update tab buttons
      document.querySelectorAll('.tab-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      
      // Animate tab content transition
      const previousContent = document.getElementById('tab-' + previousTab);
      const newContent = document.getElementById('tab-' + tabId);
      
      // Fade out previous
      if (previousContent) {
        previousContent.classList.add('tab-fade-out');
        previousContent.classList.remove('active');
      }
      
      // Fade in new
      if (newContent) {
        newContent.classList.add('tab-fade-in');
        newContent.classList.add('active');
        
        // Scroll to top
        newContent.scrollTop = 0;
        
        // Remove animation classes after transition
        setTimeout(() => {
          if (previousContent) previousContent.classList.remove('tab-fade-out');
          newContent.classList.remove('tab-fade-in');
        }, 200);
      }
      
      // FAB visibility - only show on accounts tab
      const fab = document.getElementById('fabContainer');
      if (fab) {
        fab.style.display = tabId === 'accounts' ? '' : 'none';
      }
      
      // Reset keyboard navigation when switching tabs
      focusedAccountIndex = -1;
      document.querySelectorAll('.account.keyboard-focus').forEach(acc => {
        acc.classList.remove('keyboard-focus');
      });
      
      // Load data for specific tabs
      if (tabId === 'profiles') {
        vscode.postMessage({ command: 'loadProfiles' });
        vscode.postMessage({ command: 'getActiveProfile' });
      } else if (tabId === 'settings') {
        // Settings tab now includes Stats and LLM
        vscode.postMessage({ command: 'getPatchStatus' });
        vscode.postMessage({ command: 'getActiveProfile' });
        getLLMSettings();
        vscode.postMessage({ command: 'getLLMServerStatus' });
      }
    }
    
    // === UI Actions ===
    
    function openSettings() {
      switchTab('settings');
      // Load active profile when opening settings
      vscode.postMessage({ command: 'getActiveProfile' });
      // Load patch status
      vscode.postMessage({ command: 'getPatchStatus' });
    }
    
    function closeSettings() {
      document.getElementById('settingsOverlay')?.classList.remove('visible');
    }
    
    // Render active profile in settings
    function renderActiveProfile(profile) {
      const container = document.getElementById('activeProfileContent');
      if (!container) return;
      
      const strategyLabels = {
        single: { icon: '📧', name: T.strategySingleName, desc: T.strategySingleShort },
        plus_alias: { icon: '➕', name: T.strategyPlusAliasName, desc: T.strategyPlusAliasShort },
        catch_all: { icon: '🌐', name: T.strategyCatchAllName, desc: T.strategyCatchAllShort },
        pool: { icon: '📋', name: T.strategyPoolName, desc: T.strategyPoolShort }
      };
      
      if (!profile) {
        container.innerHTML = \`
          <div class="active-profile-empty">
            <span class="empty-icon">📧</span>
            <span class="empty-text">\${T.noProfileConfigured}</span>
            <button class="btn btn-primary btn-sm" onclick="openProfilesPanel()">\${T.configure}</button>
          </div>
        \`;
        return;
      }
      
      const strategy = strategyLabels[profile.strategy?.type] || strategyLabels.single;
      const stats = profile.stats || { registered: 0, failed: 0 };
      
      container.innerHTML = \`
        <div class="active-profile-info">
          <div class="active-profile-avatar">\${strategy.icon}</div>
          <div class="active-profile-details">
            <div class="active-profile-name">\${profile.name || T.unnamed}</div>
            <div class="active-profile-email">\${profile.imap?.user || ''}</div>
            <div class="active-profile-strategy">
              <span class="strategy-name">\${strategy.name}</span>
              <span class="strategy-desc">· \${strategy.desc}</span>
            </div>
          </div>
        </div>
        <div class="active-profile-stats">
          <div class="active-profile-stat">
            <span class="active-profile-stat-value success">\${stats.registered}</span>
            <span class="active-profile-stat-label">\${T.success}</span>
          </div>
          <div class="active-profile-stat">
            <span class="active-profile-stat-value danger">\${stats.failed}</span>
            <span class="active-profile-stat-label">\${T.failed}</span>
          </div>
        </div>
      \`;
    }
    
    function toggleAutoSwitch(enabled) {
      vscode.postMessage({ command: 'toggleAutoSwitch', enabled });
      // Show/hide threshold row
      const thresholdRow = document.getElementById('autoSwitchThresholdRow');
      if (thresholdRow) {
        thresholdRow.style.display = enabled ? '' : 'none';
      }
    }
    
    function toggleSetting(key, value) {
      vscode.postMessage({ command: 'updateSetting', key, value });
    }
    
    function updateSetting(key, value) {
      vscode.postMessage({ command: 'updateSetting', key, value });
    }
    
    function selectRegistrationStrategy(strategy) {
      // Update switch buttons on main page
      document.querySelectorAll('.strategy-sw-btn').forEach((btn, idx) => {
        const isAuto = strategy === 'automated';
        if (idx === 0) {
          btn.classList.toggle('active', isAuto);
        } else {
          btn.classList.toggle('active', !isAuto);
        }
      });
      
      // Update hint icon
      const hint = document.querySelector('.strategy-hint');
      if (hint) {
        hint.className = 'strategy-hint ' + (strategy === 'automated' ? 'high' : 'low');
        hint.textContent = strategy === 'automated' ? '⚠' : '✓';
      }
      
      // Update strategy cards in settings (if visible)
      document.querySelectorAll('.strategy-option').forEach(option => {
        const radio = option.querySelector('input[name="strategy"]');
        if (radio) {
          radio.checked = radio.value === strategy;
          option.classList.toggle('selected', radio.value === strategy);
        }
      });
      
      // Show/hide defer quota check option in settings
      const deferOption = document.getElementById('deferQuotaCheckOption');
      if (deferOption) {
        deferOption.style.display = strategy === 'automated' ? '' : 'none';
      }
      
      // Show/hide OAuth provider option in settings
      const oauthOption = document.getElementById('oauthProviderOption');
      if (oauthOption) {
        oauthOption.style.display = strategy === 'webview' ? '' : 'none';
      }
      
      // Save setting
      vscode.postMessage({ command: 'updateSetting', key: 'strategy', value: strategy });
    }
    
    function toggleSpoofing(enabled) {
      vscode.postMessage({ command: 'updateSetting', key: 'spoofing', value: enabled });
      // Toggle details visibility
      const details = document.getElementById('spoofDetails');
      if (details) {
        details.classList.toggle('hidden', !enabled);
      }
    }
    
    function changeLanguage(lang) {
      vscode.postMessage({ command: 'setLanguage', language: lang });
    }

    function toggleSettingsCard(header, event) {
      if (event) {
        // Prevent toggle if clicking on a button or input inside the header
        const target = event.target;
        if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('.toggle')) {
          return;
        }
        event.stopPropagation();
      }
      const card = header.closest('.settings-card');
      if (card) {
        card.classList.toggle('collapsed');
      }
    }
    
    function checkUpdates() {
      vscode.postMessage({ command: 'checkForUpdates' });
    }
    
    function exportAllAccounts() {
      vscode.postMessage({ command: 'exportAccounts' });
    }
    
    function importAccounts() {
      vscode.postMessage({ command: 'importAccounts' });
    }
    
    function confirmResetMachineId() {
      pendingAction = { type: 'resetMachineId' };
      document.getElementById('dialogTitle').textContent = T.resetMachineIdTitle;
      document.getElementById('dialogText').textContent = T.resetMachineIdConfirm;
      // Change button to Confirm (not Delete)
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.confirm;
      btn.className = 'btn btn-warning';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function resetMachineId() {
      vscode.postMessage({ command: 'resetMachineId' });
    }
    
    // === Kiro Patching ===
    
    function confirmPatchKiro() {
      pendingAction = { type: 'patchKiro' };
      document.getElementById('dialogTitle').textContent = T.patchKiroTitle;
      document.getElementById('dialogText').textContent = T.patchKiroConfirm;
      // Change button to Apply (not Delete)
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.apply;
      btn.className = 'btn btn-primary';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function confirmUnpatchKiro() {
      pendingAction = { type: 'unpatchKiro' };
      document.getElementById('dialogTitle').textContent = T.removePatchTitle;
      document.getElementById('dialogText').textContent = T.removePatchConfirm;
      // Change button to Confirm (not Delete)
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.confirm;
      btn.className = 'btn btn-warning';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function patchKiro(force = false) {
      vscode.postMessage({ command: 'patchKiro', force });
    }
    
    function unpatchKiro() {
      vscode.postMessage({ command: 'unpatchKiro' });
    }
    
    function generateNewMachineId() {
      vscode.postMessage({ command: 'generateMachineId' });
    }
    
    function getPatchStatus() {
      vscode.postMessage({ command: 'getPatchStatus' });
    }
    
    function openVsCodeSettings() {
      vscode.postMessage({ command: 'openVsCodeSettings' });
    }

    // === LLM Server ===
    function getLLMSettings() {
      vscode.postMessage({ command: 'getLLMSettings' });
    }

    function saveLLMSettings() {
      const settings = {
        baseUrl: document.getElementById('llmBaseUrl')?.value || '',
        port: document.getElementById('llmPort')?.value || '8421',
        apiKey: document.getElementById('llmApiKey')?.value || '',
        model: document.getElementById('llmModel')?.value || 'claude-sonnet-4-20250514',
      };
      vscode.postMessage({ command: 'saveLLMSettings', settings });
      showToast('LLM settings saved', 'success');
    }

    function startLLMServer() {
      const btn = document.getElementById('llmStartBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ ' + T.starting;
      }
      updateLLMServerStatus({ status: 'Starting...' });
      vscode.postMessage({ command: 'startLLMServer' });
    }

    function stopLLMServer() {
      const btn = document.getElementById('llmStopBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ ' + T.stopping;
      }
      updateLLMServerStatus({ status: 'Stopping...' });
      vscode.postMessage({ command: 'stopLLMServer' });
    }

    function restartLLMServer() {
      const btn = document.getElementById('llmRestartBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ ' + T.restarting;
      }
      updateLLMServerStatus({ status: 'Restarting...' });
      vscode.postMessage({ command: 'restartLLMServer' });
    }

    function updateLLMServerStatus(status) {
      const statusEl = document.getElementById('llmServerStatus');
      const startBtn = document.getElementById('llmStartBtn');
      const stopBtn = document.getElementById('llmStopBtn');
      const restartBtn = document.getElementById('llmRestartBtn');
      
      if (statusEl) {
        const statusText = status.status || (status.running ? 'Running' : 'Stopped');
        statusEl.textContent = statusText;
        statusEl.className = 'patch-status ' + statusText.toLowerCase().replace('...', '');
      }
      
      // Re-enable buttons and update text
      const isRunning = status.running || status.status === 'Running';
      const isPending = status.status?.includes('...');
      
      if (startBtn) {
        startBtn.disabled = isPending || isRunning;
        startBtn.textContent = T.startServer;
      }
      if (stopBtn) {
        stopBtn.disabled = isPending || !isRunning;
        stopBtn.textContent = T.stopServer;
      }
      if (restartBtn) {
        restartBtn.disabled = isPending;
        restartBtn.textContent = T.restartServer;
      }
      
      // Load models when server is running
      if (isRunning && !isPending) {
        vscode.postMessage({ command: 'getLLMModels' });
      }
    }

    function updateLLMModels(models) {
      const select = document.getElementById('llmModel');
      if (!select || !models || !models.length) return;
      
      const currentValue = select.value;
      select.innerHTML = '';
      
      models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        // Show model id with credit info from description
        const credit = model.description?.match(/\\([^)]+\\)/)?.[0] || '';
        option.textContent = model.id + (credit ? ' ' + credit : '');
        select.appendChild(option);
      });
      
      // Restore selection if exists
      if (currentValue) {
        select.value = currentValue;
      }
    }

    function updateLLMSettings(settings) {
      const baseUrlEl = document.getElementById('llmBaseUrl');
      const portEl = document.getElementById('llmPort');
      const apiKeyEl = document.getElementById('llmApiKey');
      const modelEl = document.getElementById('llmModel');
      if (baseUrlEl) baseUrlEl.value = settings.baseUrl || 'http://127.0.0.1';
      if (portEl) portEl.value = settings.port || '8421';
      if (apiKeyEl) apiKeyEl.value = settings.apiKey || '';
      if (modelEl) modelEl.value = settings.model || 'claude-sonnet-4-20250514';
    }
    
    function startAutoReg() {
      const countInput = document.getElementById('regCountInput');
      const count = countInput ? parseInt(countInput.value, 10) : 1;
      vscode.postMessage({ command: 'startAutoReg', count: count > 1 ? count : undefined });
    }
    
    function stopAutoReg() {
      vscode.postMessage({ command: 'stopAutoReg' });
    }
    
    function togglePauseAutoReg() {
      vscode.postMessage({ command: 'togglePauseAutoReg' });
    }
    
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
    
    function refreshUsage() {
      vscode.postMessage({ command: 'refreshUsage' });
    }
    
    function switchAccount(filename) {
      // Add switching state to show loading feedback
      const accountEl = document.querySelector('.account[data-filename="' + filename + '"]');
      if (accountEl) {
        accountEl.classList.add('switching');
      }
      vscode.postMessage({ command: 'switchAccount', email: filename });
    }

    function copyToken(filename) {
      vscode.postMessage({ command: 'copyToken', email: filename });
    }
    
    function refreshToken(filename) {
      vscode.postMessage({ command: 'refreshToken', email: filename });
    }
    
    function openUpdateUrl(url) {
      vscode.postMessage({ command: 'openUrl', url: url });
    }

    document.addEventListener('click', (e) => {
      const target = e.target;
      const link = target?.closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      e.preventDefault();
      e.stopPropagation();
      openUpdateUrl(href);
    }, true);
    
    // === SSO Modal ===
    
    function openSsoModal() {
      document.getElementById('ssoModal')?.classList.add('visible');
    }
    
    function closeSsoModal() {
      document.getElementById('ssoModal')?.classList.remove('visible');
      const input = document.getElementById('ssoTokenInput');
      if (input) input.value = '';
    }
    
    function importSsoToken() {
      const input = document.getElementById('ssoTokenInput');
      const token = input?.value?.trim();
      if (token) {
        vscode.postMessage({ command: 'importSsoToken', token });
        closeSsoModal();
      }
    }
    
    // === Console Drawer ===
    
    function toggleLogs() {
      const drawer = document.getElementById('logsDrawer');
      drawer?.classList.toggle('open');
    }
    
    // === Batch Registration Toggle ===
    
    function toggleBatchReg(event) {
      if (event) {
        const target = event.target;
        if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
          return;
        }
        event.stopPropagation();
      }
      const card = document.getElementById('scheduledRegCard');
      if (card) {
        card.classList.toggle('collapsed');
        const toggle = card.querySelector('.batch-reg-toggle');
        if (toggle) {
          toggle.textContent = card.classList.contains('collapsed') ? '▼' : '▲';
        }
      }
    }
    
    function clearConsole() {
      const content = document.getElementById('logsContent');
      if (content) content.innerHTML = '';
      updateLogsCount();
      vscode.postMessage({ command: 'clearConsole' });
    }
    
    function copyLogs() {
      const content = document.getElementById('logsContent');
      if (content) {
        const logs = Array.from(content.querySelectorAll('.console-line'))
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join('\\n');
        vscode.postMessage({ command: 'copyLogs', logs });
      }
    }
    
    function filterConsole(type) {
      const content = document.getElementById('logsContent');
      const filters = document.querySelectorAll('.console-filter');
      
      // Update active filter button
      filters.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === type);
      });
      
      // Filter log lines
      if (content) {
        const lines = content.querySelectorAll('.console-line');
        lines.forEach(line => {
          if (type === 'all') {
            line.classList.remove('hidden');
          } else {
            const lineType = line.getAttribute('data-type');
            line.classList.toggle('hidden', lineType !== type);
          }
        });
      }
    }
    
    function updateLogsCount() {
      const content = document.getElementById('logsContent');
      const countEl = document.getElementById('logsCount');
      if (content && countEl) {
        const count = content.querySelectorAll('.console-line:not(.hidden)').length;
        const hasErrors = content.querySelector('.console-line.error') !== null;
        const hasWarnings = content.querySelector('.console-line.warning') !== null;
        countEl.textContent = count.toString();
        countEl.classList.remove('error', 'warning');
        if (hasErrors) countEl.classList.add('error');
        else if (hasWarnings) countEl.classList.add('warning');
      }
    }
    
    // Track if user has scrolled up
    let isScrolledToBottom = true;
    let hasNewMessages = false;
    
    function handleConsoleScroll() {
      const content = document.getElementById('logsContent');
      if (!content) return;
      
      const threshold = 50; // pixels from bottom
      const scrolledToBottom = content.scrollHeight - content.scrollTop - content.clientHeight < threshold;
      isScrolledToBottom = scrolledToBottom;
      
      // Update scroll button visibility
      const scrollBtn = document.getElementById('scrollToBottomBtn');
      if (scrollBtn) {
        scrollBtn.classList.toggle('hidden', scrolledToBottom);
      }
      
      // Hide new messages bar if scrolled to bottom
      if (scrolledToBottom) {
        hasNewMessages = false;
        const newMsgBar = document.getElementById('newMessagesBar');
        newMsgBar?.classList.remove('visible');
        const newIndicator = document.getElementById('newLogsIndicator');
        newIndicator?.classList.remove('visible');
      }
    }
    
    function scrollConsoleToBottom() {
      const content = document.getElementById('logsContent');
      if (content) {
        content.scrollTo({
          top: content.scrollHeight,
          behavior: 'smooth'
        });
        isScrolledToBottom = true;
        hasNewMessages = false;
        
        // Hide indicators
        const newMsgBar = document.getElementById('newMessagesBar');
        newMsgBar?.classList.remove('visible');
        const newIndicator = document.getElementById('newLogsIndicator');
        newIndicator?.classList.remove('visible');
        const scrollBtn = document.getElementById('scrollToBottomBtn');
        scrollBtn?.classList.add('hidden');
      }
    }
    
    function showNewMessagesIndicator() {
      if (!isScrolledToBottom) {
        hasNewMessages = true;
        const newMsgBar = document.getElementById('newMessagesBar');
        newMsgBar?.classList.add('visible');
        const newIndicator = document.getElementById('newLogsIndicator');
        newIndicator?.classList.add('visible');
      }
    }
    
    // Syntax highlighting helper
    function highlightLogMessage(message) {
      let highlighted = escapeHtmlClient(message);
      
      // Highlight paths
      highlighted = highlighted.replace(
        /([A-Za-z]:)?[\\/][\\w\\-\\.\\/\\\\]+/g,
        '<span class="hl-path">$&</span>'
      );
      
      // Highlight URLs
      highlighted = highlighted.replace(
        /(https?:\\/\\/[^\\s<]+)/g,
        '<span class="hl-url">$1</span>'
      );
      
      // Highlight numbers
      highlighted = highlighted.replace(
        /\\b(\\d+(?:\\.\\d+)?)\\b/g,
        '<span class="hl-number">$1</span>'
      );
      
      // Highlight quoted strings
      highlighted = highlighted.replace(
        /(&quot;[^&]*&quot;|&#39;[^&]*&#39;|"[^"]*"|'[^']*')/g,
        '<span class="hl-string">$1</span>'
      );
      
      // Highlight keywords
      highlighted = highlighted.replace(
        /\\b(SUCCESS|FAIL|ERROR|WARN|OK|DONE|START|STOP|TRUE|FALSE|NULL|NONE)\\b/gi,
        '<span class="hl-keyword">$1</span>'
      );
      
      // Highlight email addresses
      highlighted = highlighted.replace(
        /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})/g,
        '<span class="hl-email">$1</span>'
      );
      
      return highlighted;
    }
    
    function appendLogLine(log) {
      const content = document.getElementById('logsContent');
      if (!content) return;
      
      // Determine log type
      let type = 'info';
      let icon = '›';
      if (log.includes('ERROR') || log.includes('FAIL') || log.includes('✗') || log.includes('❌')) {
        type = 'error';
        icon = '✗';
      } else if (log.includes('SUCCESS') || log.includes('✓') || log.includes('✅') || log.includes('[OK]')) {
        type = 'success';
        icon = '✓';
      } else if (log.includes('WARN') || log.includes('⚠') || log.includes('⛔')) {
        type = 'warning';
        icon = '!';
      }
      
      // Extract time if present
      const timeMatch = log.match(/^\\[?(\\d{1,2}:\\d{2}:\\d{2})\\s*[AP]?M?\\]?/i);
      const time = timeMatch ? timeMatch[1] : '';
      const message = timeMatch ? log.slice(timeMatch[0].length).trim() : log;
      
      // Check for duplicate message (grouping)
      const lastLine = content.lastElementChild;
      if (lastLine) {
        const lastMsg = lastLine.querySelector('.console-msg')?.textContent;
        const lastType = lastLine.getAttribute('data-type');
        if (lastMsg === message && lastType === type) {
          // Increment count badge
          let countBadge = lastLine.querySelector('.console-count');
          if (countBadge) {
            const count = parseInt(countBadge.textContent || '1') + 1;
            countBadge.textContent = count.toString();
          } else {
            countBadge = document.createElement('span');
            countBadge.className = 'console-count';
            countBadge.textContent = '2';
            lastLine.appendChild(countBadge);
          }
          // Update time
          const timeEl = lastLine.querySelector('.console-time');
          if (timeEl && time) {
            timeEl.textContent = time;
          }
          return;
        }
      }
      
      // Create line element with animation
      const line = document.createElement('div');
      line.className = \`console-line \${type}\`;
      line.setAttribute('data-type', type);
      line.innerHTML = \`
        <span class="console-icon">\${icon}</span>
        \${time ? \`<span class="console-time">\${time}</span>\` : ''}
        <span class="console-msg">\${highlightLogMessage(message)}</span>
      \`;
      
      content.appendChild(line);
      
      // Auto-scroll only if already at bottom
      if (isScrolledToBottom) {
        content.scrollTop = content.scrollHeight;
      } else {
        showNewMessagesIndicator();
      }
      
      // Check current filter
      const activeFilter = document.querySelector('.console-filter.active');
      const currentFilter = activeFilter?.getAttribute('data-filter') || 'all';
      if (currentFilter !== 'all' && currentFilter !== type) {
        line.classList.add('hidden');
      }
      
      // Keep max 200 lines
      while (content.children.length > 200 && content.firstChild) {
        content.removeChild(content.firstChild);
      }
      
      updateLogsCount();
      updateConsoleStatus();
      
      // Auto-open on errors
      if (type === 'error') {
        document.getElementById('logsDrawer')?.classList.add('open');
      }
    }
    
    function updateConsoleStatus() {
      const content = document.getElementById('logsContent');
      const drawer = document.getElementById('logsDrawer');
      if (!content || !drawer) return;
      
      const hasErrors = content.querySelector('.console-line.error') !== null;
      const hasWarnings = content.querySelector('.console-line.warning') !== null;
      
      drawer.classList.remove('has-errors', 'has-warnings');
      if (hasErrors) {
        drawer.classList.add('has-errors');
      } else if (hasWarnings) {
        drawer.classList.add('has-warnings');
      }
      
      // Update indicator
      const indicator = drawer.querySelector('.console-icon-indicator');
      if (indicator) {
        indicator.classList.remove('has-errors', 'has-warnings');
        if (hasErrors) indicator.classList.add('has-errors');
        else if (hasWarnings) indicator.classList.add('has-warnings');
      }
    }

    // === Delete with Double-Click (no modal) ===
    
    let pendingDeleteFilename = null;
    let pendingDeleteTimeout = null;
    
    function confirmDelete(filename) {
      const btn = event?.target?.closest('.account-btn.danger');
      
      // If same file clicked again within timeout - delete!
      if (pendingDeleteFilename === filename && btn) {
        clearTimeout(pendingDeleteTimeout);
        pendingDeleteFilename = null;
        btn.classList.remove('confirm-delete');
        vscode.postMessage({ command: 'deleteAccount', email: filename });
        showToast(T.accountDeleted, 'success');
        return;
      }
      
      // First click - highlight button and wait for second click
      // Reset any previous pending delete
      if (pendingDeleteTimeout) {
        clearTimeout(pendingDeleteTimeout);
        document.querySelectorAll('.account-btn.danger.confirm-delete').forEach(b => {
          b.classList.remove('confirm-delete');
        });
      }
      
      pendingDeleteFilename = filename;
      if (btn) {
        btn.classList.add('confirm-delete');
      }
      
      // Reset after 3 seconds
      pendingDeleteTimeout = setTimeout(() => {
        pendingDeleteFilename = null;
        if (btn) btn.classList.remove('confirm-delete');
      }, 3000);
    }
    
    function confirmDeleteExhausted() {
      pendingAction = { type: 'deleteExhausted' };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.deleteBadAccountsConfirm;
      // Reset button to Delete style
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.delete;
      btn.className = 'btn btn-danger';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function confirmDeleteBanned() {
      pendingAction = { type: 'deleteBanned' };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.deleteBannedAccountsConfirm || 'Delete all banned accounts?';
      // Reset button to Delete style
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.delete;
      btn.className = 'btn btn-danger';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function refreshAllExpired() {
      vscode.postMessage({ command: 'refreshAllExpired' });
    }
    
    function checkAllAccountsHealth() {
      vscode.postMessage({ command: 'checkAllAccountsHealth' });
      showToast(T.checkingHealth || 'Checking accounts health...', 'success');
    }
    
    function closeDialog() {
      document.getElementById('dialogOverlay').classList.remove('visible');
      pendingAction = null;
    }
    
    function dialogAction() {
      if (pendingAction?.type === 'delete') {
        vscode.postMessage({ command: 'deleteAccount', email: pendingAction.filename });
        showToast(T.accountDeleted, 'success');
      } else if (pendingAction?.type === 'deleteExhausted') {
        vscode.postMessage({ command: 'deleteExhaustedAccounts' });
        showToast(T.badAccountsDeleted, 'success');
      } else if (pendingAction?.type === 'deleteBanned') {
        vscode.postMessage({ command: 'deleteBannedAccounts' });
        showToast(T.bannedAccountsDeleted || 'Banned accounts deleted', 'success');
      } else if (pendingAction?.type === 'deleteSelected') {
        vscode.postMessage({ command: 'deleteSelectedAccounts', filenames: pendingAction.filenames });
        showToast((T.selectedAccountsDeleted || '{count} accounts deleted').replace('{count}', pendingAction.filenames.length), 'success');
        selectionMode = false;
        selectedAccounts.clear();
      } else if (pendingAction?.type === 'deleteProfile') {
        vscode.postMessage({ command: 'deleteProfile', profileId: pendingAction.profileId });
        showToast(T.profileDeleted || 'Profile deleted', 'success');
      } else if (pendingAction?.type === 'resetMachineId') {
        vscode.postMessage({ command: 'resetMachineId' });
        showToast(T.resettingMachineId, 'success');
      } else if (pendingAction?.type === 'patchKiro') {
        vscode.postMessage({ command: 'patchKiro' });
        showToast(T.patchingKiro, 'success');
      } else if (pendingAction?.type === 'unpatchKiro') {
        vscode.postMessage({ command: 'unpatchKiro' });
        showToast(T.removingPatch, 'success');
      }
      closeDialog();
    }
    
    // === Search & Filters ===
    
    let searchQuery = '';
    let tokenFilter = 'all'; // all, fresh, partial, trial, empty
    
    function searchAccounts(query) {
      searchQuery = query.toLowerCase().trim();
      applyFilters();
    }
    
    function clearSearch() {
      const input = document.getElementById('searchInput');
      if (input) input.value = '';
      searchQuery = '';
      applyFilters();
    }
    
    function filterByTokens(filter) {
      tokenFilter = filter;
      
      // Update select value (for dropdown)
      const select = document.getElementById('tokenFilterSelect');
      if (select) select.value = filter;
      
      applyFilters();
    }
    
    function getAccountTokens(acc) {
      // Extract remaining tokens from usage text (format: "123/500")
      const usageText = acc.querySelector('.account-meta span:first-child')?.textContent || '';
      const match = usageText.match(/(\\d+)\\/(\\d+)/);
      if (!match) return -1;
      return parseInt(match[1], 10);
    }
    
    function applyFilters() {
      let visibleCount = 0;
      document.querySelectorAll('.account').forEach(acc => {
        const email = (acc.querySelector('.account-email')?.textContent || '').toLowerCase();
        const searchMatch = !searchQuery || email.includes(searchQuery);
        
        // Token filter
        let tokenMatch = true;
        if (tokenFilter !== 'all') {
          const tokens = getAccountTokens(acc);
          
          switch (tokenFilter) {
            case 'fresh':
              tokenMatch = tokens === 500;
              break;
            case 'partial':
              tokenMatch = tokens > 0 && tokens < 500 && tokens !== 50;
              break;
            case 'trial':
              tokenMatch = tokens === 50;
              break;
            case 'empty':
              tokenMatch = tokens === 0;
              break;
          }
        }
        
        const match = searchMatch && tokenMatch;
        acc.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      
      // Show/hide empty search state
      const emptySearch = document.getElementById('emptySearchState');
      if (emptySearch) {
        emptySearch.style.display = ((searchQuery || tokenFilter !== 'all') && visibleCount === 0) ? 'block' : 'none';
      }
      
      // Hide group headers if all accounts in group are hidden
      document.querySelectorAll('.list-group').forEach(group => {
        let nextEl = group.nextElementSibling;
        let hasVisible = false;
        while (nextEl && !nextEl.classList.contains('list-group')) {
          if (nextEl.classList.contains('account') && nextEl.style.display !== 'none') {
            hasVisible = true;
            break;
          }
          nextEl = nextEl.nextElementSibling;
        }
        group.style.display = hasVisible ? '' : 'none';
      });
    }
    
    // === Toast ===
    
    function showToast(message, type = 'success') {
      if (getState()?.disableToasts) return;
      const container = document.getElementById('toastContainer');
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      const icons = { success: '✓', error: '✗', warning: '⚠️', info: 'ℹ' };
      toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '•') + '</span><span class="toast-message">' + message + '</span>';
      
      // Add entering animation class
      toast.classList.add('toast-entering');
      container.appendChild(toast);
      
      // Trigger reflow for animation
      toast.offsetHeight;
      
      // Remove entering class to start animation
      requestAnimationFrame(() => {
        toast.classList.remove('toast-entering');
        toast.classList.add('toast-visible');
      });
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        toast.classList.add('toast-removing');
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
      
      // Allow manual dismiss on click
      toast.addEventListener('click', () => {
        toast.classList.add('toast-removing');
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
      });
    }
    
    // === Skeleton Loading ===
    
    function renderSkeletonCards(count = 3) {
      let html = '';
      for (let i = 0; i < count; i++) {
        html += \`
          <div class="account skeleton">
            <div class="account-avatar skeleton-pulse"></div>
            <div class="account-info">
              <div class="skeleton-line skeleton-pulse" style="width: 70%"></div>
              <div class="skeleton-line skeleton-pulse" style="width: 40%"></div>
            </div>
          </div>
        \`;
      }
      return html;
    }
    
    function showSkeletonLoading() {
      const list = document.getElementById('accountList');
      if (list) {
        list.innerHTML = renderSkeletonCards(3);
      }
    }
    
    function hideSkeletonLoading() {
      const skeletons = document.querySelectorAll('.account.skeleton');
      skeletons.forEach(skeleton => {
        skeleton.classList.add('skeleton-fade-out');
        setTimeout(() => skeleton.remove(), 200);
      });
    }

    // === Message Handler ===
    
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'appendLog':
          appendLogLine(msg.log);
          break;
        case 'updateStatus':
          updateStatus(msg.status);
          break;
        case 'updateAccounts':
          {
            const list = document.getElementById('accountList');
            if (list && typeof msg.html === 'string') {
              list.innerHTML = msg.html;
            }

            // Update header badge counts if provided
            const badge = document.querySelector('.header-badge');
            if (badge && typeof msg.validCount === 'number' && typeof msg.totalCount === 'number') {
              badge.textContent = msg.validCount + '/' + msg.totalCount;
            }

            // Optional: update tab badges by triggering a light state write (tab bar is static HTML)
            // If full rerender is needed for badges, keep it out of hot path.
          }
          break;
        case 'updateUsage':
          // Incremental usage update - refresh hero section
          if (msg.usage) updateHeroUsage(msg.usage);
          else clearHeroUsage();
          break;
        case 'toast':
          showToast(msg.message, msg.toastType || 'success');
          break;
        case 'profilesLoaded':
          renderProfilesList(msg.profiles, msg.activeProfileId);
          break;
        case 'activeProfileLoaded':
          renderActiveProfile(msg.profile);
          break;
        case 'profileLoaded':
          populateProfileEditor(msg.profile);
          break;
        case 'providerDetected':
          applyProviderHint(msg.hint, msg.recommendedStrategy);
          break;
        case 'patchStatus':
          updatePatchStatus(msg);
          break;
        case 'llmServerStatus':
          updateLLMServerStatus(msg.status);
          break;
        case 'llmSettings':
          updateLLMSettings(msg.settings);
          break;
        case 'llmModels':
          updateLLMModels(msg.models);
          break;
        case 'scheduledRegState':
          updateScheduledRegState(msg.state);
          break;
        case 'imapTestResult':
          updateImapTestResult(msg);
          break;
      }
    });
    
    function updateHeroUsage(usage) {
      const hero = document.querySelector('.hero');
      if (!hero || hero.classList.contains('progress')) return;

      const current = typeof usage.currentUsage === 'number' ? usage.currentUsage : 0;
      const limit = typeof usage.usageLimit === 'number' ? usage.usageLimit : 500;
      const percent = typeof usage.percentageUsed === 'number' ? usage.percentageUsed : 0;
      const remaining = limit - current;

      const usageClass = percent >= 95 ? 'high' : percent >= 80 ? 'medium' : 'low';
      const isLow = remaining < 50;
      const isCritical = remaining < 10;

      hero.classList.toggle('warning', isLow && !isCritical);
      hero.classList.toggle('critical', isCritical);

      const valueEl = hero.querySelector('.hero-value');
      if (valueEl) {
        valueEl.textContent = remaining.toLocaleString();
        valueEl.className = 'hero-value ' + usageClass;
      }

      const fillEl = hero.querySelector('.hero-progress-fill');
      if (fillEl) {
        fillEl.style.width = Math.min(percent, 100) + '%';
        fillEl.className = 'hero-progress-fill ' + usageClass;
      }

      const footerStats = hero.querySelectorAll('.hero-footer .hero-stat');
      if (footerStats && footerStats.length > 0) {
        footerStats[0].textContent = current.toLocaleString() + '/' + limit + ' ' + (T.used || 'used');
      }
    }

    function clearHeroUsage() {
      const hero = document.querySelector('.hero');
      if (!hero || hero.classList.contains('progress')) return;

      hero.classList.remove('warning', 'critical');

      const valueEl = hero.querySelector('.hero-value');
      if (valueEl) {
        valueEl.textContent = '?';
        valueEl.className = 'hero-value';
      }

      const fillEl = hero.querySelector('.hero-progress-fill');
      if (fillEl) {
        fillEl.style.width = '0%';
        fillEl.className = 'hero-progress-fill';
      }

      const footerStats = hero.querySelectorAll('.hero-footer .hero-stat');
      if (footerStats && footerStats.length > 0) {
        footerStats[0].textContent = '—';
      }
    }
    
    function updateImapTestResult(result) {
      const btn = document.getElementById('testConnectionBtn');
      if (!btn) return;
      
      if (result.status === 'testing') {
        btn.disabled = true;
        btn.innerHTML = '⏳ ' + (T.testing || 'Testing...');
        btn.className = 'btn btn-secondary';
      } else if (result.status === 'success') {
        btn.disabled = false;
        btn.innerHTML = '✅ ' + (T.connected || 'Connected!');
        btn.className = 'btn btn-success';
        showToast(result.message, 'success');
        // Reset after 3 seconds
        setTimeout(() => {
          btn.innerHTML = '🔌 ' + T.testConnection;
          btn.className = 'btn btn-secondary';
        }, 3000);
      } else {
        btn.disabled = false;
        btn.innerHTML = '❌ ' + (T.failed || 'Failed');
        btn.className = 'btn btn-danger';
        showToast(result.message, 'error');
        // Reset after 3 seconds
        setTimeout(() => {
          btn.innerHTML = '🔌 ' + T.testConnection;
          btn.className = 'btn btn-secondary';
        }, 3000);
      }
    }
    
    function updatePatchStatus(status) {
      if (!status) return;
      
      const patchBtn = document.getElementById('patchKiroBtn');
      const updateBtn = document.getElementById('updatePatchBtn');
      const unpatchBtn = document.getElementById('unpatchKiroBtn');
      const generateBtn = document.getElementById('generateIdBtn');
      const statusEl = document.getElementById('patchStatusText');
      const versionInfoEl = document.getElementById('patchVersionInfo');
      const machineIdEl = document.getElementById('currentMachineId');
      const indicator = document.getElementById('patchIndicator');
      
      // Update settings panel status
      if (statusEl) {
        if (status.error) {
          statusEl.textContent = status.error;
          statusEl.className = 'patch-status error';
        } else if (status.isPatched) {
          if (status.needsUpdate) {
            statusEl.textContent = T.patchStatusOutdated + ' ⚠️';
            statusEl.className = 'patch-status warning';
          } else {
            statusEl.textContent = T.patchStatusActive + ' ✓';
            statusEl.className = 'patch-status success';
          }
        } else {
          statusEl.textContent = T.patchStatusNotPatched;
          statusEl.className = 'patch-status warning';
        }
      }
      
      // Update version info
      if (versionInfoEl) {
        if (status.isPatched && status.patchVersion) {
          let versionText = T.patchVersion + ' v' + status.patchVersion;
          if (status.latestPatchVersion && status.patchVersion !== status.latestPatchVersion) {
            versionText += ' → v' + status.latestPatchVersion;
          }
          if (status.kiroVersion) {
            versionText += ' | ' + T.kiroVersion + ' v' + status.kiroVersion;
          }
          versionInfoEl.textContent = versionText;
          versionInfoEl.style.display = '';
        } else if (status.kiroVersion) {
          versionInfoEl.textContent = T.kiroVersion + ' v' + status.kiroVersion;
          versionInfoEl.style.display = '';
        } else {
          versionInfoEl.style.display = 'none';
        }
      }
      
      // Update machine ID preview
      if (machineIdEl && status.currentMachineId) {
        machineIdEl.textContent = 'ID: ' + status.currentMachineId.substring(0, 16) + '...';
        machineIdEl.title = status.currentMachineId;
      }
      
      // Update header indicator
      if (indicator) {
        indicator.className = 'patch-indicator visible';
        if (status.error) {
          indicator.classList.add('error');
          indicator.title = status.error;
        } else if (status.isPatched) {
          if (status.needsUpdate) {
            indicator.classList.add('needs-update');
            indicator.title = T.patchUpdateAvailable + ': v' + status.patchVersion + ' → v' + status.latestPatchVersion;
          } else {
            indicator.classList.add('patched');
            indicator.title = T.patchStatusActive + ' (v' + status.patchVersion + ')';
          }
        } else if (status.currentMachineId) {
          // Has custom ID but not patched - needs attention
          indicator.classList.add('not-patched');
          indicator.title = T.patchStatusNotPatched;
          indicator.onclick = openSettings;
        } else {
          // No custom ID, no patch - hide indicator
          indicator.className = 'patch-indicator';
        }
      }
      
      // Update buttons visibility
      if (status.isPatched) {
        if (patchBtn) patchBtn.style.display = 'none';
        if (updateBtn) updateBtn.style.display = status.needsUpdate ? '' : 'none';
        if (unpatchBtn) unpatchBtn.style.display = '';
      } else {
        if (patchBtn) patchBtn.style.display = '';
        if (updateBtn) updateBtn.style.display = 'none';
        if (unpatchBtn) unpatchBtn.style.display = 'none';
      }
    }
    
    function updateStatus(status) {
      const btn = document.querySelector('.btn-primary');
      const hero = document.querySelector('.hero');
      const fab = document.getElementById('fabContainer');
      const autoregControls = document.querySelector('.autoreg-controls');
      
      if (!status) {
        // Registration finished
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚡ ' + T.autoReg;
        }
        // Update FAB state - restore primary button
        if (fab) {
          fab.classList.remove('running');
          fab.innerHTML = \`
            <button class="fab fab-primary pulse" onclick="startAutoReg()" title="\${T.autoReg}">
              <span class="fab-icon"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z"/></svg></span>
            </button>
          \`;
        }
        // Restore autoreg controls to idle state
        if (autoregControls) {
          autoregControls.classList.remove('running');
          autoregControls.innerHTML = \`
            <div class="form-group">
              <label for="regCountInput">\${T.autoRegCountLabel || 'Count'}</label>
              <input type="number" id="regCountInput" class="form-control" value="1" min="1" max="100" placeholder="\${T.autoRegCountPlaceholder || '1'}">
            </div>
            <button class="btn btn-primary pulse" onclick="startAutoReg()" title="\${T.autoRegTip || T.autoReg}">
              ▶️ <span class="btn-text">\${T.autoReg}</span>
            </button>
          \`;
        }
        // Refresh to show new account
        vscode.postMessage({ command: 'refresh' });
        return;
      }
      
      // Show running state
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> ' + T.running;
      }
      
      // Update autoreg controls to running state with stop/pause buttons
      if (autoregControls) {
        autoregControls.classList.add('running');
        autoregControls.innerHTML = \`
          <button class="btn btn-danger" onclick="stopAutoReg()" title="\${T.stop || 'Stop'}">
            ⏹ <span class="btn-text">\${T.stop || 'Stop'}</span>
          </button>
          <button class="btn btn-secondary" onclick="togglePauseAutoReg()" title="\${T.pause || 'Pause'}">
            ⏸ <span class="btn-text">\${T.pause || 'Pause'}</span>
          </button>
        \`;
      }
      
      // Update FAB to running state
      if (fab) {
        fab.classList.add('running');
        // Update FAB content to show stop/pause buttons
        fab.innerHTML = \`
          <button class="fab fab-stop" onclick="stopAutoReg()" title="\${T.stop || 'Stop'}">
            <span class="fab-icon">⏹</span>
          </button>
          <button class="fab fab-pause" onclick="togglePauseAutoReg()" title="\${T.pause || 'Pause'}">
            <span class="fab-icon">⏸</span>
          </button>
          <div class="fab-status">
            <span class="spinner"></span>
            <span class="fab-status-text">\${T.running}</span>
          </div>
        \`;
      }
      
      // Update hero with progress (incremental update, no full refresh)
      try {
        const progress = JSON.parse(status);
        if (progress && hero) {
          const percent = Math.round((progress.step / progress.totalSteps) * 100);
          const hasError = (progress.detail || '').toLowerCase().includes('error') ||
                          (progress.detail || '').toLowerCase().includes('fail');
          
          // Only update hero content, preserve console drawer state
          hero.className = 'hero progress';
          hero.innerHTML = \`
            <div class="hero-header">
              <span class="hero-email">\${progress.stepName || ''}</span>
              <span class="hero-step">\${progress.step}/\${progress.totalSteps}</span>
            </div>
            \${renderStepIndicatorsJS(progress.step, progress.totalSteps, hasError)}
            <div class="hero-progress">
              <div class="hero-progress-fill \${hasError ? 'high' : 'low'}" style="width: \${percent}%"></div>
            </div>
            <div class="hero-stats">
              <span class="hero-usage \${hasError ? 'text-danger' : ''}">\${progress.detail || ''}</span>
              <span class="hero-percent">\${percent}%</span>
            </div>
          \`;
        }
      } catch {}
    }
    
    // === Keyboard Shortcuts ===
    
    
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      const isInputFocused = target instanceof HTMLInputElement || 
                             target instanceof HTMLTextAreaElement ||
                             target instanceof HTMLSelectElement;
      
      // Escape - close modals/drawer
      if (e.key === 'Escape') {
        // Close in order of priority
        const logsDrawer = document.getElementById('logsDrawer');
        if (logsDrawer?.classList.contains('open')) {
          logsDrawer.classList.remove('open');
          return;
        }
        if (document.getElementById('ssoModal')?.classList.contains('visible')) {
          closeSsoModal();
          return;
        }
        if (document.getElementById('profileEditor')?.classList.contains('visible')) {
          closeProfileEditor();
          return;
        }
        if (document.getElementById('dialogOverlay')?.classList.contains('visible')) {
          closeDialog();
          return;
        }
        // Clear search if has value
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
          clearSearch();
          searchInput.blur();
          return;
        }
      }
      
      // Cmd/Ctrl+K - focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Cmd/Ctrl+F - also focus search (legacy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Cmd/Ctrl+R - refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refresh();
        showToast(T.refreshing || 'Refreshing...', 'success');
      }
      
      // Arrow keys - navigate accounts (only when not in input)
      if (!isInputFocused && currentTab === 'accounts') {
        const accounts = Array.from(document.querySelectorAll('.account:not([style*="display: none"])'));
        
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          focusedAccountIndex = Math.min(focusedAccountIndex + 1, accounts.length - 1);
          focusAccount(accounts, focusedAccountIndex);
        }
        
        if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          focusedAccountIndex = Math.max(focusedAccountIndex - 1, 0);
          focusAccount(accounts, focusedAccountIndex);
        }
        
        // Enter - switch to focused account
        if (e.key === 'Enter' && focusedAccountIndex >= 0 && focusedAccountIndex < accounts.length) {
          e.preventDefault();
          const account = accounts[focusedAccountIndex];
          const filename = account.getAttribute('data-filename');
          if (filename) switchAccount(filename);
        }
        
        // Delete/Backspace - delete focused account
        if ((e.key === 'Delete' || e.key === 'Backspace') && focusedAccountIndex >= 0 && focusedAccountIndex < accounts.length) {
          e.preventDefault();
          const account = accounts[focusedAccountIndex];
          const filename = account.getAttribute('data-filename');
          if (filename) confirmDelete(filename);
        }
      }
      
      // Tab navigation with numbers (1-4)
      if (!isInputFocused && e.key >= '1' && e.key <= '4') {
        const tabs = ['accounts', 'profiles', 'llm', 'settings'];
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          switchTab(tabs[tabIndex]);
        }
      }
    });
    
    function focusAccount(accounts, index) {
      // Remove focus from all
      accounts.forEach(acc => acc.classList.remove('keyboard-focus'));
      
      // Add focus to current
      if (index >= 0 && index < accounts.length) {
        const account = accounts[index];
        account.classList.add('keyboard-focus');
        account.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    
    // Reset focus index when clicking
    document.addEventListener('click', () => {
      focusedAccountIndex = -1;
      document.querySelectorAll('.account.keyboard-focus').forEach(acc => {
        acc.classList.remove('keyboard-focus');
      });
    });
    
    // === IMAP Profiles ===
    
    let currentPoolEmails = [];
    let editingProfileId = null;
    
    function openProfilesPanel() {
      // For tab navigation - just switch to profiles tab
      switchTab('profiles');
    }
    
    function closeProfilesPanel() {
      // Legacy - switch back to accounts
      switchTab('accounts');
    }
    
    function createProfile() {
      editingProfileId = null;
      currentPoolEmails = [];
      
      // Show editor form, hide list (for inline mode)
      const listContainer = document.getElementById('profilesListContainer');
      const editorForm = document.getElementById('profileEditorForm');
      if (listContainer) listContainer.style.display = 'none';
      if (editorForm) editorForm.style.display = 'block';
      
      // Legacy overlay mode
      document.getElementById('profileEditor')?.classList.add('visible');
      
      // Reset form
      const nameEl = document.getElementById('profileName');
      const userEl = document.getElementById('imapUser');
      const serverEl = document.getElementById('imapServer');
      const portEl = document.getElementById('imapPort');
      const passwordEl = document.getElementById('imapPassword');
      const proxyCheckbox = document.getElementById('proxyEnabled');
      const proxyUrlsEl = document.getElementById('proxyUrls');
      const proxyFields = document.getElementById('proxyFields');
      if (nameEl) nameEl.value = '';
      if (userEl) userEl.value = '';
      if (serverEl) serverEl.value = '';
      if (portEl) portEl.value = '993';
      if (passwordEl) passwordEl.value = '';
      if (proxyCheckbox) proxyCheckbox.checked = false;
      if (proxyUrlsEl) proxyUrlsEl.value = '';
      if (proxyFields) proxyFields.style.display = 'none';
      selectStrategy('single');
      
      // Update title
      const title = document.querySelector('.editor-title');
      if (title) title.textContent = T.newProfile || 'New Profile';
    }
    
    function editProfile(profileId) {
      editingProfileId = profileId;
      vscode.postMessage({ command: 'getProfile', profileId });
      
      // Show editor form, hide list (for inline mode)
      const listContainer = document.getElementById('profilesListContainer');
      const editorForm = document.getElementById('profileEditorForm');
      if (listContainer) listContainer.style.display = 'none';
      if (editorForm) editorForm.style.display = 'block';
    }
    
    function closeProfileEditor() {
      // Hide editor form, show list (for inline mode)
      const listContainer = document.getElementById('profilesListContainer');
      const editorForm = document.getElementById('profileEditorForm');
      if (listContainer) listContainer.style.display = 'block';
      if (editorForm) editorForm.style.display = 'none';
      
      // Legacy overlay mode
      document.getElementById('profileEditor')?.classList.remove('visible');
      editingProfileId = null;
    }
    
    function toggleProxyFields() {
      const checkbox = document.getElementById('proxyEnabled');
      const fields = document.getElementById('proxyFields');
      if (checkbox && fields) {
        fields.style.display = checkbox.checked ? 'block' : 'none';
      }
    }
    
    function selectProfile(profileId) {
      vscode.postMessage({ command: 'setActiveProfile', profileId });
    }
    
    function deleteProfile(profileId) {
      // Use custom dialog instead of confirm() which doesn't work in webview
      pendingAction = { type: 'deleteProfile', profileId };
      document.getElementById('dialogTitle').textContent = T.deleteTitle || 'Delete';
      document.getElementById('dialogText').textContent = T.deleteProfileConfirm;
      // Reset button to Delete style
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.delete;
      btn.className = 'btn btn-danger';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function selectStrategy(strategy) {
      document.querySelectorAll('.strategy-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.strategy === strategy);
      });
      const catchAllConfig = document.getElementById('catchAllConfig');
      const poolConfig = document.getElementById('poolConfig');
      const imapEmailGroup = document.getElementById('imapEmailGroup');
      const imapPasswordGroup = document.getElementById('imapPasswordGroup');
      const testConnectionBtn = document.getElementById('testConnectionBtn');
      
      if (catchAllConfig) catchAllConfig.style.display = strategy === 'catch_all' ? 'block' : 'none';
      if (poolConfig) poolConfig.style.display = strategy === 'pool' ? 'block' : 'none';
      
      // For Pool strategy - hide email/password fields (they come from pool list)
      const isPool = strategy === 'pool';
      if (imapEmailGroup) imapEmailGroup.style.display = isPool ? 'none' : 'block';
      if (imapPasswordGroup) imapPasswordGroup.style.display = isPool ? 'none' : 'block';
      if (testConnectionBtn) testConnectionBtn.style.display = isPool ? 'none' : 'block';
    }
    
    function onEmailInput(email) {
      vscode.postMessage({ command: 'detectProvider', email });
    }
    
    function testImapConnection() {
      const server = document.getElementById('imapServer')?.value?.trim();
      const user = document.getElementById('imapUser')?.value?.trim();
      const password = document.getElementById('imapPassword')?.value;
      const port = document.getElementById('imapPort')?.value || '993';
      
      // Validate fields before testing
      if (!server || !user || !password) {
        showToast(T.fillAllFields || 'Please fill all IMAP fields', 'error');
        return;
      }
      
      vscode.postMessage({ command: 'testImap', server, user, password, port: parseInt(port) });
    }
    
    function togglePasswordVisibility(inputId) {
      const input = document.getElementById(inputId);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    function addEmailToPool() {
      const input = document.getElementById('newPoolEmail');
      const value = input?.value?.trim();
      if (!value || !value.includes('@')) return;
      
      // Parse email:password format
      let email, password;
      if (value.includes(':') && value.indexOf(':') > value.indexOf('@')) {
        const colonPos = value.lastIndexOf(':');
        const atPos = value.indexOf('@');
        if (colonPos > atPos) {
          email = value.substring(0, colonPos);
          password = value.substring(colonPos + 1);
        } else {
          email = value;
        }
      } else {
        email = value;
      }
      
      const existing = currentPoolEmails.find(e => (e.email || e).toLowerCase() === email.toLowerCase());
      if (!existing) {
        currentPoolEmails.push(password ? { email, password } : { email });
        renderPoolList();
      }
      if (input) input.value = '';
    }
    
    function removeEmailFromPool(index) {
      currentPoolEmails.splice(index, 1);
      renderPoolList();
    }
    
    function renderPoolList() {
      const list = document.getElementById('poolList');
      if (!list) return;
      list.innerHTML = currentPoolEmails.map((item, i) => {
        const email = item.email || item;
        const hasPassword = item.password ? ' 🔑' : '';
        const status = item.status || 'pending';
        const statusIcon = status === 'used' ? '✅' : status === 'failed' ? '❌' : '⬜';
        const statusClass = status === 'used' ? 'used' : status === 'failed' ? 'failed' : 'pending';
        const errorTip = item.error ? ' title="' + item.error + '"' : '';
        return '<div class="pool-item ' + statusClass + '" data-index="' + i + '"' + errorTip + '>' +
          '<span class="pool-status">' + statusIcon + '</span>' +
          '<span class="pool-email">' + email + hasPassword + '</span>' +
          (status === 'pending' ? '<button class="pool-remove" onclick="removeEmailFromPool(' + i + ')">✕</button>' : '') +
        '</div>';
      }).join('');
      
      // Show pool stats
      const used = currentPoolEmails.filter(e => e.status === 'used').length;
      const failed = currentPoolEmails.filter(e => e.status === 'failed').length;
      const pending = currentPoolEmails.length - used - failed;
      const statsEl = document.getElementById('poolStats');
      if (statsEl) {
        statsEl.innerHTML = '<span class="pool-stat success">' + used + ' ✅</span> ' +
          '<span class="pool-stat danger">' + failed + ' ❌</span> ' +
          '<span class="pool-stat">' + pending + ' ⬜</span>';
      }
    }
    
    function importEmailsFromFile() {
      vscode.postMessage({ command: 'importEmailsFromFile' });
    }
    
    function parseAndAddEmails(text) {
      // Support formats: email, email:password, one per line or separated by newlines
      const lines = text.split(new RegExp('[\\\\r\\\\n]+')).filter(e => e.includes('@'));
      let added = 0;
      lines.forEach(line => {
        const trimmed = line.trim();
        // Parse email:password format
        let email, password;
        if (trimmed.includes(':') && trimmed.indexOf(':') > trimmed.indexOf('@')) {
          const colonPos = trimmed.lastIndexOf(':');
          const atPos = trimmed.indexOf('@');
          if (colonPos > atPos) {
            email = trimmed.substring(0, colonPos);
            password = trimmed.substring(colonPos + 1);
          } else {
            email = trimmed;
          }
        } else {
          email = trimmed;
        }
        
        const existing = currentPoolEmails.find(e => e.email?.toLowerCase() === email.toLowerCase() || e === email.toLowerCase());
        if (!existing) {
          currentPoolEmails.push(password ? { email, password } : { email });
          added++;
        }
      });
      return added;
    }
    
    function pasteEmails() {
      navigator.clipboard.readText().then(text => {
        const added = parseAndAddEmails(text);
        renderPoolList();
        if (added > 0) {
          showToast((T.emailsAdded || '{count} emails added').replace('{count}', added), 'success');
        }
      }).catch(() => {
        showToast(T.clipboardError, 'error');
      });
    }
    
    function handlePoolPaste(event) {
      const text = (event.clipboardData || window.clipboardData)?.getData('text');
      if (!text) return;
      
      // Check if pasted text contains multiple lines or email:password format
      const hasMultipleLines = text.includes('\\n') || text.includes('\\r');
      const hasEmailPassword = text.includes('@') && text.includes(':') && text.indexOf(':') > text.indexOf('@');
      
      if (hasMultipleLines || hasEmailPassword) {
        event.preventDefault();
        const added = parseAndAddEmails(text);
        renderPoolList();
        if (added > 0) {
          showToast((T.emailsAdded || '{count} emails added').replace('{count}', added), 'success');
        }
        // Clear input
        event.target.value = '';
      }
      // If single email without password - let default paste behavior work
    }
    
    function saveProfile() {
      const name = document.getElementById('profileName')?.value?.trim() || T.unnamed;
      const server = document.getElementById('imapServer')?.value?.trim();
      const user = document.getElementById('imapUser')?.value?.trim();
      const password = document.getElementById('imapPassword')?.value;
      const port = parseInt(document.getElementById('imapPort')?.value) || 993;
      
      // Proxy settings
      const proxyEnabled = document.getElementById('proxyEnabled')?.checked || false;
      const proxyUrlsText = document.getElementById('proxyUrls')?.value?.trim() || '';
      const proxyUrls = proxyUrlsText.split('\\n').map(u => u.trim()).filter(u => u.length > 0);
      const proxy = proxyEnabled && proxyUrls.length > 0 ? { enabled: true, urls: proxyUrls, currentIndex: 0 } : undefined;
      
      const selectedStrategy = document.querySelector('.strategy-option.selected');
      const strategyType = selectedStrategy?.dataset?.strategy || 'single';
      
      const strategy = { type: strategyType };
      if (strategyType === 'catch_all') {
        strategy.domain = document.getElementById('catchAllDomain')?.value?.trim();
      } else if (strategyType === 'pool') {
        // Support both old format (string) and new format (object with email/password)
        strategy.emails = currentPoolEmails.map(item => {
          const email = item.email || item;
          const pwd = item.password;
          return { email, password: pwd, status: 'pending' };
        });
      }
      
      // For Pool strategy - email/password come from pool list, not from IMAP fields
      const isPool = strategyType === 'pool';
      
      if (isPool) {
        // Validate pool has entries
        if (!currentPoolEmails || currentPoolEmails.length === 0) {
          showToast(T.poolEmpty || 'Add at least one email to pool', 'error');
          return;
        }
        if (!server) {
          showToast(T.fillAllFields, 'error');
          return;
        }
        // Use first pool email as fallback IMAP credentials
        const firstEntry = currentPoolEmails[0];
        const firstEmail = firstEntry.email || firstEntry;
        const firstPassword = firstEntry.password || '';
        
        vscode.postMessage({
          command: editingProfileId ? 'updateProfile' : 'createProfile',
          profile: {
            id: editingProfileId,
            name,
            imap: { server, user: firstEmail, password: firstPassword, port },
            strategy,
            proxy
          }
        });
      } else {
        // For other strategies - require all IMAP fields
        if (!server || !user || !password) {
          showToast(T.fillAllFields, 'error');
          return;
        }
        
        vscode.postMessage({
          command: editingProfileId ? 'updateProfile' : 'createProfile',
          profile: {
            id: editingProfileId,
            name,
            imap: { server, user, password, port },
            strategy,
            proxy
          }
        });
      }
      
      closeProfileEditor();
    }
    
    // === Profile Message Handlers ===
    
    function renderProfilesList(profiles, activeId) {
      const container = document.getElementById('profilesContent');
      if (!container) return;
      
      if (!profiles || profiles.length === 0) {
        container.innerHTML = \`
          <div class="profiles-empty">
            <div class="empty-icon">📧</div>
            <div class="empty-text">\${T.noProfiles}</div>
            <button class="btn btn-primary" onclick="createProfile()">+ \${T.addProfile}</button>
          </div>
        \`;
        return;
      }
      
      const strategyLabels = {
        single: T.strategySingleName,
        plus_alias: T.strategyPlusAliasName,
        catch_all: T.strategyCatchAllName,
        pool: T.strategyPoolName
      };
      
      const strategyIcons = {
        single: '📧',
        plus_alias: '➕',
        catch_all: '🌐',
        pool: '📋'
      };
      
      let html = '<div class="profiles-list">';
      
      profiles.forEach(profile => {
        const isActive = profile.id === activeId;
        const strategyType = profile.strategy?.type || 'single';
        const stats = profile.stats || { registered: 0, failed: 0 };
        
        html += \`
          <div class="profile-card \${isActive ? 'active' : ''}" data-id="\${profile.id}">
            <div class="profile-card-header">
              <div class="profile-card-radio" onclick="selectProfile('\${profile.id}')">
                <span class="radio-dot \${isActive ? 'checked' : ''}"></span>
              </div>
              <div class="profile-card-info" onclick="editProfile('\${profile.id}')">
                <div class="profile-card-name">\${profile.name || T.unnamed}</div>
                <div class="profile-card-email">\${profile.imap?.user || ''}</div>
              </div>
              <div class="profile-card-actions">
                <button class="icon-btn" onclick="editProfile('\${profile.id}')" title="\${T.edit}">✏️</button>
                <button class="icon-btn danger" onclick="deleteProfile('\${profile.id}')" title="\${T.delete}">🗑</button>
              </div>
            </div>
            <div class="profile-card-meta">
              <span class="profile-strategy">\${strategyIcons[strategyType]} \${strategyLabels[strategyType]}</span>
              <span class="profile-stats">✓ \${stats.registered} / ✗ \${stats.failed}</span>
            </div>
          </div>
        \`;
      });
      
      html += '</div>';
      html += \`<button class="btn btn-primary profiles-add-btn" onclick="createProfile()">+ \${T.addProfile}</button>\`;
      
      container.innerHTML = html;
    }
    
    function populateProfileEditor(profile) {
      if (!profile) return;
      
      editingProfileId = profile.id;
      
      document.getElementById('profileName').value = profile.name || '';
      document.getElementById('imapUser').value = profile.imap?.user || '';
      document.getElementById('imapServer').value = profile.imap?.server || '';
      document.getElementById('imapPort').value = profile.imap?.port || 993;
      document.getElementById('imapPassword').value = profile.imap?.password || '';
      
      // Proxy settings
      const proxyCheckbox = document.getElementById('proxyEnabled');
      const proxyUrlsInput = document.getElementById('proxyUrls');
      const proxyFields = document.getElementById('proxyFields');
      const proxyStats = document.getElementById('proxyStats');
      if (proxyCheckbox && proxyUrlsInput) {
        const hasProxy = profile.proxy?.enabled || false;
        proxyCheckbox.checked = hasProxy;
        proxyUrlsInput.value = (profile.proxy?.urls || []).join('\\n');
        if (proxyFields) {
          proxyFields.style.display = hasProxy ? 'block' : 'none';
        }
        if (proxyStats && profile.proxy?.urls) {
          proxyStats.textContent = profile.proxy.urls.length + ' proxies';
        }
      }
      
      const strategyType = profile.strategy?.type || 'single';
      selectStrategy(strategyType);
      
      if (strategyType === 'catch_all' && profile.strategy?.domain) {
        document.getElementById('catchAllDomain').value = profile.strategy.domain;
      }
      
      if (strategyType === 'pool' && profile.strategy?.emails) {
        // Keep full email objects with status
        currentPoolEmails = profile.strategy.emails.map(e => ({
          email: e.email,
          password: e.password,
          status: e.status || 'pending',
          error: e.error
        }));
        renderPoolList();
      }
      
      document.getElementById('profileEditor')?.classList.add('visible');
      
      // Update editor title
      const title = document.querySelector('.editor-title');
      if (title) {
        title.textContent = T.editProfile;
      }
    }
    
    function applyProviderHint(hint, recommendedStrategy) {
      if (!hint) return;
      
      const serverInput = document.getElementById('imapServer');
      const portInput = document.getElementById('imapPort');
      const hintEl = document.getElementById('providerHint');
      
      if (serverInput && !serverInput.value) {
        serverInput.value = hint.imapServer || '';
      }
      if (portInput && !portInput.value) {
        portInput.value = hint.imapPort || 993;
      }
      
      if (hintEl) {
        const aliasSupport = hint.supportsAlias 
          ? '✓ ' + T.strategyPlusAliasName
          : '✗ ' + hint.name + ' ' + T.providerNoAlias;
        hintEl.innerHTML = \`<span class="provider-name">\${hint.name}</span> · \${aliasSupport}\`;
        hintEl.style.display = 'block';
      }
      
      // Auto-select recommended strategy
      if (recommendedStrategy) {
        selectStrategy(recommendedStrategy);
      }
    }
    
    function addImportedEmails(emails) {
      if (!emails || !Array.isArray(emails)) return;
      
      emails.forEach(email => {
        const e = email.trim().toLowerCase();
        if (e && e.includes('@') && !currentPoolEmails.includes(e)) {
          currentPoolEmails.push(email.trim());
        }
      });
      
      renderPoolList();
      showToast(T.emailsImported.replace('{count}', emails.length), 'success');
    }
    
    // === Selection Mode (Bulk Actions) ===
    
    let selectionMode = false;
    let selectedAccounts = new Set();
    
    function toggleSelectionMode() {
      selectionMode = !selectionMode;
      selectedAccounts.clear();
      
      // Toggle bulk actions bar visibility
      const bar = document.getElementById('bulkActionsBar');
      const selectBtn = document.getElementById('selectModeBtn');
      if (bar) bar.classList.toggle('hidden', !selectionMode);
      if (selectBtn) selectBtn.classList.toggle('active', selectionMode);
      
      // Toggle checkbox visibility - add/remove checkboxes dynamically
      document.querySelectorAll('.account').forEach(card => {
        let checkbox = card.querySelector('.account-checkbox');
        if (selectionMode) {
          if (!checkbox) {
            const filename = card.dataset.filename;
            checkbox = document.createElement('label');
            checkbox.className = 'account-checkbox';
            checkbox.onclick = (e) => e.stopPropagation();
            checkbox.innerHTML = '<input type="checkbox" data-filename="' + filename + '" onchange="toggleAccountSelection(\\'' + filename + '\\', this.checked)"><span class="checkmark"></span>';
            card.insertBefore(checkbox, card.firstChild);
          }
        } else {
          if (checkbox) checkbox.remove();
          card.classList.remove('selected');
        }
      });
      
      updateBulkActionsBar();
    }
    
    function toggleAccountSelection(filename, checked) {
      if (checked) {
        selectedAccounts.add(filename);
      } else {
        selectedAccounts.delete(filename);
      }
      
      // Update visual state
      const card = document.querySelector('.account[data-filename="' + filename + '"]');
      if (card) card.classList.toggle('selected', checked);
      
      updateBulkActionsBar();
    }
    
    function selectAllAccounts() {
      document.querySelectorAll('.account-checkbox input').forEach(cb => {
        cb.checked = true;
        const filename = cb.dataset.filename;
        if (filename) selectedAccounts.add(filename);
      });
      document.querySelectorAll('.account').forEach(card => card.classList.add('selected'));
      updateBulkActionsBar();
    }
    
    function deselectAllAccounts() {
      document.querySelectorAll('.account-checkbox input').forEach(cb => {
        cb.checked = false;
      });
      document.querySelectorAll('.account').forEach(card => card.classList.remove('selected'));
      selectedAccounts.clear();
      updateBulkActionsBar();
    }
    
    function updateBulkActionsBar() {
      const countEl = document.getElementById('bulkCount');
      if (countEl) {
        countEl.textContent = selectedAccounts.size.toString();
      }
    }
    
    function exportSelectedAccounts() {
      if (selectedAccounts.size === 0) return;
      vscode.postMessage({ command: 'exportSelectedAccounts', filenames: Array.from(selectedAccounts) });
    }
    
    function refreshSelectedTokens() {
      if (selectedAccounts.size === 0) return;
      vscode.postMessage({ command: 'refreshSelectedTokens', filenames: Array.from(selectedAccounts) });
      showToast(T.refreshingTokens || 'Refreshing tokens...', 'success');
    }
    
    function deleteSelectedAccounts() {
      if (selectedAccounts.size === 0) return;
      pendingAction = { type: 'deleteSelected', filenames: Array.from(selectedAccounts) };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = (T.deleteSelectedConfirm || 'Delete {count} selected accounts?').replace('{count}', selectedAccounts.size);
      // Reset button to Delete style
      const btn = document.getElementById('dialogConfirmBtn');
      btn.textContent = T.delete;
      btn.className = 'btn btn-danger';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    // === Init ===
    
    document.addEventListener('DOMContentLoaded', () => {
      // Scroll logs to bottom
      const logsContent = document.getElementById('logsContent');
      if (logsContent) logsContent.scrollTop = logsContent.scrollHeight;
      
      // Load patch status on init
      vscode.postMessage({ command: 'getPatchStatus' });

      const savedTab = getState()?.activeTab;
      if (savedTab && typeof savedTab === 'string') {
        switchTab(savedTab);
      }
    });
    
    // Export functions to window for onclick handlers
    window.switchTab = switchTab;
    window.openSettings = openSettings;
    window.closeSettings = closeSettings;
    window.toggleLogs = toggleLogs;
    window.toggleBatchReg = toggleBatchReg;
    window.clearConsole = clearConsole;
    window.filterConsole = filterConsole;
    window.copyLogs = copyLogs;
    window.toggleAutoSwitch = toggleAutoSwitch;
    window.toggleSetting = toggleSetting;
    window.toggleSpoofing = toggleSpoofing;
    window.changeLanguage = changeLanguage;
    window.checkUpdates = checkUpdates;
    window.exportAllAccounts = exportAllAccounts;
    window.importAccounts = importAccounts;
    window.confirmResetMachineId = confirmResetMachineId;
    window.confirmPatchKiro = confirmPatchKiro;
    window.confirmUnpatchKiro = confirmUnpatchKiro;
    window.generateNewMachineId = generateNewMachineId;
    window.openProfilesPanel = openProfilesPanel;
    window.closeProfilesPanel = closeProfilesPanel;
    window.createProfile = createProfile;
    window.editProfile = editProfile;
    window.deleteProfile = deleteProfile;
    window.selectProfile = selectProfile;
    window.closeProfileEditor = closeProfileEditor;
    window.selectStrategy = selectStrategy;
    window.onEmailInput = onEmailInput;
    window.testImapConnection = testImapConnection;
    window.addEmailToPool = addEmailToPool;
    window.removeEmailFromPool = removeEmailFromPool;
    window.importEmailsFromFile = importEmailsFromFile;
    window.pasteEmails = pasteEmails;
    window.handlePoolPaste = handlePoolPaste;
    window.saveProfile = saveProfile;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.switchAccount = switchAccount;
    window.refreshToken = refreshToken;
    window.confirmDelete = confirmDelete;
    window.copyToken = copyToken;
    window.startAutoReg = startAutoReg;
    window.stopAutoReg = stopAutoReg;
    window.togglePauseAutoReg = togglePauseAutoReg;
    window.openSsoModal = openSsoModal;
    window.closeSsoModal = closeSsoModal;
    window.importSsoToken = importSsoToken;
    window.refreshAllExpired = refreshAllExpired;
    window.confirmDeleteExhausted = confirmDeleteExhausted;
    window.confirmDeleteBanned = confirmDeleteBanned;
    window.checkAllAccountsHealth = checkAllAccountsHealth;
    window.showToast = showToast;
    window.dialogAction = dialogAction;
    window.closeDialog = closeDialog;
    window.searchAccounts = searchAccounts;
    window.clearSearch = clearSearch;
    window.refresh = refresh;
    window.refreshUsage = refreshUsage;
    window.openUpdateUrl = openUpdateUrl;
    window.openVsCodeSettings = openVsCodeSettings;
    window.renderActiveProfile = renderActiveProfile;
    window.toggleSelectionMode = toggleSelectionMode;
    window.toggleAccountSelection = toggleAccountSelection;
    window.selectAllAccounts = selectAllAccounts;
    window.deselectAllAccounts = deselectAllAccounts;
    window.exportSelectedAccounts = exportSelectedAccounts;
    window.refreshSelectedTokens = refreshSelectedTokens;
    window.deleteSelectedAccounts = deleteSelectedAccounts;
    window.selectStrategy = selectStrategy;
    window.selectRegistrationStrategy = selectRegistrationStrategy;
    window.updateSetting = updateSetting;
    window.showSkeletonLoading = showSkeletonLoading;
    window.hideSkeletonLoading = hideSkeletonLoading;
    window.renderSkeletonCards = renderSkeletonCards;
    window.focusAccount = focusAccount;
    window.switchTab = switchTab;
    window.filterByTokens = filterByTokens;
    window.filterConsole = filterConsole;
    window.handleConsoleScroll = handleConsoleScroll;
    window.scrollConsoleToBottom = scrollConsoleToBottom;
    
    // === Toolbar More Dropdown ===
    
    function toggleToolbarMore() {
      const menu = document.getElementById('toolbarMoreMenu');
      if (menu) {
        menu.classList.toggle('visible');
        
        // Close on click outside
        if (menu.classList.contains('visible')) {
          setTimeout(() => {
            document.addEventListener('click', closeToolbarMoreOnClickOutside);
          }, 10);
        }
      }
    }
    
    function closeToolbarMoreOnClickOutside(e) {
      const menu = document.getElementById('toolbarMoreMenu');
      const btn = document.querySelector('.toolbar-more-btn');
      if (menu && !menu.contains(e.target) && !btn?.contains(e.target)) {
        menu.classList.remove('visible');
        document.removeEventListener('click', closeToolbarMoreOnClickOutside);
      }
    }
    
    window.toggleToolbarMore = toggleToolbarMore;
    
    // === Initialization ===
    // Load profiles after DOM is ready so they're available when user switches to profiles tab
    document.addEventListener('DOMContentLoaded', function() {
      // Small delay to ensure webview message handler is ready
      setTimeout(function() {
        vscode.postMessage({ command: 'loadProfiles' });
      }, 100);
    });
    
    // Fallback if DOMContentLoaded already fired
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(function() {
        vscode.postMessage({ command: 'loadProfiles' });
      }, 100);
    }
    
    // === Batch Registration ===
    
    let scheduledRegTimer = null;
    
    function updateScheduledRegSetting(key, value) {
      vscode.postMessage({ command: 'updateScheduledRegSetting', key, value });
      
      // Refresh preview when name mode changes
      if (key === 'useCustomName' || key === 'customNamePrefix') {
        vscode.postMessage({ command: 'refresh' });
      }
    }
    
    function adjustBatchCount(delta) {
      const input = document.getElementById('maxAccountsInput');
      if (input) {
        const current = parseInt(input.value) || 5;
        const newVal = Math.max(1, Math.min(100, current + delta));
        input.value = newVal;
        updateScheduledRegSetting('maxAccounts', newVal);
      }
    }
    
    function setBatchInterval(minutes) {
      updateScheduledRegSetting('interval', minutes);
      // Update pill buttons visually
      document.querySelectorAll('.interval-pill').forEach(pill => {
        pill.classList.toggle('active', parseInt(pill.getAttribute('onclick').match(/\\d+/)?.[0] || '0') === minutes);
      });
      // Update hint
      vscode.postMessage({ command: 'refresh' });
    }
    
    function startScheduledReg() {
      // Auto-enable when starting
      updateScheduledRegSetting('enabled', true);
      vscode.postMessage({ command: 'startScheduledReg' });
    }
    
    function stopScheduledReg() {
      vscode.postMessage({ command: 'stopScheduledReg' });
      if (scheduledRegTimer) {
        clearInterval(scheduledRegTimer);
        scheduledRegTimer = null;
      }
    }
    
    function resetScheduledReg() {
      vscode.postMessage({ command: 'resetScheduledReg' });
    }
    
    function updateScheduledRegTimer(nextRunAt) {
      const timerEl = document.getElementById('scheduledRegTimer');
      if (!timerEl || !nextRunAt) return;
      
      if (scheduledRegTimer) {
        clearInterval(scheduledRegTimer);
      }
      
      scheduledRegTimer = setInterval(() => {
        const now = Date.now();
        const next = new Date(nextRunAt).getTime();
        const diff = Math.max(0, next - now);
        
        if (diff <= 0) {
          timerEl.textContent = '00:00';
          clearInterval(scheduledRegTimer);
          scheduledRegTimer = null;
          return;
        }
        
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        timerEl.textContent = minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
      }, 1000);
    }
    
    function updateScheduledRegState(state) {
      const card = document.getElementById('scheduledRegCard');
      if (!card) return;
      
      // Toggle running class on card
      card.classList.toggle('running', state.isRunning);
      
      // Update progress ring if running
      const progressFill = card.querySelector('.progress-fill');
      if (progressFill && state.maxAccounts > 0) {
        const percent = Math.round((state.registeredCount / state.maxAccounts) * 100);
        progressFill.setAttribute('stroke-dasharray', Math.min(100, percent) + ', 100');
      }
      
      // Update progress text
      const progressText = card.querySelector('.progress-text');
      if (progressText) {
        progressText.textContent = state.registeredCount + '/' + state.maxAccounts;
      }
      
      // Update timer countdown
      if (state.nextRunAt && state.isRunning && state.interval > 0) {
        updateScheduledRegTimer(state.nextRunAt);
      } else if (scheduledRegTimer) {
        clearInterval(scheduledRegTimer);
        scheduledRegTimer = null;
        const timerEl = document.getElementById('scheduledRegTimer');
        if (timerEl) timerEl.textContent = '--:--';
      }
      
      // Full refresh for state changes (running/stopped)
      if (state._refresh) {
        vscode.postMessage({ command: 'refresh' });
      }
    }
    
    // Export batch reg functions
    window.updateScheduledRegSetting = updateScheduledRegSetting;
    window.adjustBatchCount = adjustBatchCount;
    window.setBatchInterval = setBatchInterval;
    window.startScheduledReg = startScheduledReg;
    window.stopScheduledReg = stopScheduledReg;
    window.resetScheduledReg = resetScheduledReg;
    window.updateScheduledRegState = updateScheduledRegState;
  `;
}
