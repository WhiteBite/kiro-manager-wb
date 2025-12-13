/**
 * Client-side scripts for webview
 */

import { generateStateScript } from './state';
import { generateVirtualListScript } from './virtualList';

export function generateWebviewScript(totalAccounts: number): string {
  return `
    const vscode = acquireVsCodeApi();
    let pendingAction = null;
    
    ${generateStateScript()}
    ${generateVirtualListScript()}
    
    // UI Actions
    function toggleCompact() {
      document.body.classList.toggle('compact');
      setState({ compact: document.body.classList.contains('compact') });
      vscode.postMessage({ command: 'toggleCompact' });
    }
    
    function openSettings() {
      const panel = document.getElementById('settingsPanel');
      panel.classList.toggle('visible');
      setState({ settingsOpen: panel.classList.contains('visible') });
    }
    
    function toggleAutoSwitch(enabled) {
      vscode.postMessage({ command: 'toggleAutoSwitch', enabled });
    }
    
    function toggleHideExpired(hide) {
      setState({ hideExpired: hide });
      // Hide exhausted accounts (usage >= 100%), not just expired tokens
      document.querySelectorAll('.card.exhausted').forEach(card => {
        card.style.display = hide ? 'none' : '';
      });
    }
    
    function updateSetting(key, value) {
      vscode.postMessage({ command: 'updateSetting', key, value });
    }
    
    function changeLanguage(lang) {
      vscode.postMessage({ command: 'setLanguage', language: lang });
    }
    
    function startAutoReg() {
      console.log('startAutoReg clicked');
      vscode.postMessage({ command: 'startAutoReg' });
    }
    
    function importToken() {
      vscode.postMessage({ command: 'importToken' });
    }
    
    function showSsoImport() {
      document.getElementById('ssoImportPanel')?.classList.add('visible');
    }
    
    function hideSsoImport() {
      document.getElementById('ssoImportPanel')?.classList.remove('visible');
      document.getElementById('ssoTokenInput').value = '';
    }
    
    function importSsoToken() {
      const input = document.getElementById('ssoTokenInput');
      const token = input?.value?.trim();
      if (token) {
        vscode.postMessage({ command: 'importSsoToken', token: token });
        hideSsoImport();
      }
    }
    
    function refresh() {
      const btn = document.querySelector('.btn-icon[title]');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span>';
      }
      vscode.postMessage({ command: 'refresh' });
      // Button will be restored when webview re-renders
    }
    
    function exportAccounts() {
      vscode.postMessage({ command: 'exportAccounts' });
    }
    
    function switchAccount(filename) {
      // Show loading state immediately
      showUsageLoading();
      vscode.postMessage({ command: 'switchAccount', email: filename });
    }
    
    function showUsageLoading() {
      const usageCard = document.querySelector('.usage-card');
      if (!usageCard) return;
      
      const lang = document.body.dataset.lang || 'en';
      const loadingText = { en: 'Loading...', ru: 'Загрузка...', zh: '加载中...' };
      
      // Add loading class and update display
      usageCard.classList.add('loading');
      
      const valueEl = usageCard.querySelector('.usage-value');
      if (valueEl) {
        valueEl.innerHTML = '<span class="usage-loading">' + (loadingText[lang] || loadingText.en) + '</span>';
      }
      
      const fillEl = usageCard.querySelector('.usage-fill');
      if (fillEl) {
        fillEl.style.width = '0%';
        fillEl.className = 'usage-fill';
      }
      
      const footerSpans = usageCard.querySelectorAll('.usage-footer span');
      if (footerSpans[0]) footerSpans[0].textContent = '—';
      if (footerSpans[1]) footerSpans[1].textContent = '—';
    }
    
    function openUpdateUrl(url) {
      vscode.postMessage({ command: 'openUrl', url: url });
    }
    
    function checkForUpdates() {
      vscode.postMessage({ command: 'checkForUpdates' });
    }
    
    function stopAutoReg() {
      vscode.postMessage({ command: 'stopAutoReg' });
    }
    
    function togglePauseAutoReg() {
      vscode.postMessage({ command: 'togglePauseAutoReg' });
    }
    
    function copyToken(filename) {
      vscode.postMessage({ command: 'copyToken', email: filename });
    }
    
    function viewQuota(filename) {
      vscode.postMessage({ command: 'viewQuota', email: filename });
    }
    
    function refreshToken(filename) {
      vscode.postMessage({ command: 'refreshToken', email: filename });
    }
    
    function clearConsole() {
      const consoleBody = document.getElementById('consoleBody');
      if (consoleBody) consoleBody.innerHTML = '';
      updateConsoleCount();
      vscode.postMessage({ command: 'clearConsole' });
    }
    
    function copyLogs() {
      const consoleBody = document.getElementById('consoleBody');
      if (consoleBody) {
        const logs = Array.from(consoleBody.querySelectorAll('.console-line'))
          .map(el => el.textContent)
          .join('\\n');
        vscode.postMessage({ command: 'copyLogs', logs: logs });
      }
    }
    
    function toggleConsole() {
      const console = document.getElementById('consoleFloating');
      if (console) {
        console.classList.toggle('collapsed');
        setState({ consoleCollapsed: console.classList.contains('collapsed') });
      }
    }
    
    function updateConsoleCount() {
      const consoleBody = document.getElementById('consoleBody');
      const countEl = document.getElementById('consoleCount');
      if (consoleBody && countEl) {
        const count = consoleBody.children.length;
        const hasErrors = consoleBody.querySelector('.console-line.error') !== null;
        countEl.textContent = count.toString();
        countEl.classList.toggle('has-errors', hasErrors);
      }
    }
    
    // Toast notifications
    function showToast(message, type = 'success', action = null) {
      let container = document.querySelector('.toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      const icons = { success: '✓', error: '✗', warning: '⚠️', info: 'ℹ️' };
      toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span class="toast-message">' + message + '</span>';
      
      if (action) {
        const btn = document.createElement('button');
        btn.className = 'toast-action';
        btn.textContent = action.text;
        btn.onclick = () => { action.callback(); removeToast(toast); };
        toast.appendChild(btn);
      }
      
      container.appendChild(toast);
      
      // Auto remove after 4s (or 6s if has action)
      setTimeout(() => removeToast(toast), action ? 6000 : 4000);
      return toast;
    }
    
    function removeToast(toast) {
      if (!toast || !toast.parentNode) return;
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
    
    // Dialog
    function confirmDelete(filename) {
      pendingAction = { type: 'delete', filename };
      const lang = document.body.dataset.lang || 'en';
      const titles = { 
        en: 'Delete Account', ru: 'Удалить аккаунт', zh: '删除账户', 
        es: 'Eliminar cuenta', pt: 'Excluir conta', ja: 'アカウントを削除',
        de: 'Konto löschen', fr: 'Supprimer le compte', ko: '계정 삭제', hi: 'खाता हटाएं'
      };
      const texts = { 
        en: 'Are you sure you want to delete this account?', 
        ru: 'Вы уверены, что хотите удалить этот аккаунт?',
        zh: '您确定要删除此账户吗？', es: '¿Está seguro de que desea eliminar esta cuenta?',
        pt: 'Tem certeza de que deseja excluir esta conta?', ja: 'このアカウントを削除してもよろしいですか？',
        de: 'Sind Sie sicher, dass Sie dieses Konto löschen möchten?', 
        fr: 'Êtes-vous sûr de vouloir supprimer ce compte ?',
        ko: '이 계정을 삭제하시겠습니까?', hi: 'क्या आप वाकई इस खाते को हटाना चाहते हैं?'
      };
      document.getElementById('dialogTitle').textContent = titles[lang] || titles.en;
      document.getElementById('dialogText').textContent = texts[lang] || texts.en;
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    // Double-click confirmation for delete exhausted
    let deleteExhaustedPending = false;
    let deleteExhaustedTimeout = null;
    
    function confirmDeleteExhausted() {
      const exhaustedCards = document.querySelectorAll('.card.exhausted, .card.suspended');
      const count = exhaustedCards.length;
      if (count === 0) return;
      
      const btn = document.querySelector('.stat-exhausted');
      const lang = document.body.dataset.lang || 'en';
      
      if (deleteExhaustedPending) {
        // Second click - actually delete
        deleteExhaustedPending = false;
        if (deleteExhaustedTimeout) clearTimeout(deleteExhaustedTimeout);
        if (btn) btn.classList.remove('confirm-pending');
        vscode.postMessage({ command: 'deleteExhaustedAccounts' });
      } else {
        // First click - show confirmation state
        deleteExhaustedPending = true;
        if (btn) {
          btn.classList.add('confirm-pending');
          const originalText = btn.querySelector('span:nth-child(2)').textContent;
          btn.querySelector('span:nth-child(2)').textContent = lang === 'ru' ? 'Удалить?' : 'Delete?';
          btn.querySelector('.stat-delete').textContent = '⚠️';
          
          // Reset after 3 seconds
          deleteExhaustedTimeout = setTimeout(() => {
            deleteExhaustedPending = false;
            btn.classList.remove('confirm-pending');
            btn.querySelector('span:nth-child(2)').textContent = originalText;
            btn.querySelector('.stat-delete').textContent = '🗑';
          }, 3000);
        }
      }
    }
    
    function closeDialog() {
      document.getElementById('dialogOverlay').classList.remove('visible');
      pendingAction = null;
    }
    
    function dialogAction() {
      if (pendingAction?.type === 'delete') {
        const filename = pendingAction.filename;
        const lang = document.body.dataset.lang || 'en';
        
        // Find and animate card removal
        const cards = document.querySelectorAll('.card');
        let deletedCard = null;
        let deletedEmail = '';
        
        cards.forEach(card => {
          const cardEmail = card.dataset.email || '';
          if (filename === cardEmail || filename.includes(cardEmail.split('@')[0]) || cardEmail.includes(filename.split('@')[0])) {
            deletedCard = card;
            deletedEmail = cardEmail;
            card.classList.add('removing');
          }
        });
        
        // Send delete command after animation
        setTimeout(() => {
          vscode.postMessage({ command: 'deleteAccount', email: filename });
          
          // Show success toast
          const msg = lang === 'ru' ? 'Аккаунт удалён' : 'Account deleted';
          showToast(msg, 'success');
        }, 250);
      }
      closeDialog();
    }
    
    // Search
    let searchQuery = '';
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
    
    // Filtering & Sorting
    function filterAccounts(filter) {
      setState({ filter });
      document.querySelectorAll('.filter-tab').forEach((tab, i) => {
        const filters = ['all', 'valid', 'expired'];
        tab.classList.toggle('active', filters[i] === filter);
      });
      applyFilters();
    }
    
    function applyFilters() {
      const filter = getState().filter || 'all';
      document.querySelectorAll('.card').forEach(card => {
        const isExpired = card.classList.contains('expired');
        const email = (card.dataset.email || '').toLowerCase();
        
        // Filter check
        const filterMatch = filter === 'all' || (filter === 'valid' && !isExpired) || (filter === 'expired' && isExpired);
        
        // Search check
        const searchMatch = !searchQuery || email.includes(searchQuery);
        
        card.style.display = (filterMatch && searchMatch) ? '' : 'none';
      });
    }
    
    function sortAccounts(sort) {
      setState({ sort });
      const list = document.getElementById('accountList');
      if (!list) return;
      
      const cards = Array.from(list.querySelectorAll('.card'));
      
      cards.sort((a, b) => {
        if (sort === 'date') {
          const dateA = a.dataset.created || '';
          const dateB = b.dataset.created || '';
          return dateB.localeCompare(dateA); // Newest first
        } else if (sort === 'usage') {
          const usageA = parseFloat(a.dataset.usagePercent) || 0;
          const usageB = parseFloat(b.dataset.usagePercent) || 0;
          return usageA - usageB; // Lowest usage first
        } else if (sort === 'expiry') {
          // Get expiry from card meta
          const getExpiry = (card) => {
            const meta = card.querySelector('.card-meta-item:last-child');
            const text = meta?.textContent || '';
            const match = text.match(/(\\d+)/);
            return match ? parseInt(match[1]) : 999;
          };
          return getExpiry(a) - getExpiry(b);
        }
        return 0;
      });
      
      // Re-append in sorted order with animation
      cards.forEach((card, i) => {
        card.style.animationDelay = (i * 0.02) + 's';
        list.appendChild(card);
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.getElementById('settingsPanel')?.classList.remove('visible');
        clearSearch();
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'r') { e.preventDefault(); refresh(); }
        if (e.key === 'n') { e.preventDefault(); startAutoReg(); }
        if (e.key === 'f') { e.preventDefault(); document.getElementById('searchInput')?.focus(); }
      }
    });
    
    // Focus search on / key
    document.addEventListener('keypress', (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    });
    
    // Handle messages from extension
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'appendLog':
          appendLogLine(msg.log);
          break;
        case 'updateStatus':
          updateAutoRegStatus(msg.status);
          break;
        case 'updateUsage':
          updateUsageCard(msg.usage);
          break;
        case 'updateAccounts':
          updateAccountCards(msg.accounts);
          break;
      }
    });
    
    // Incremental account cards update
    function updateAccountCards(accounts) {
      if (!accounts || !accounts.length) return;
      
      const list = document.getElementById('accountList');
      if (!list) return;
      
      accounts.forEach(acc => {
        const email = acc.tokenData?.email || acc.tokenData?.accountName || acc.filename;
        const card = list.querySelector('[data-email="' + email + '"]');
        if (!card) return;
        
        // Update active state
        card.classList.toggle('active', acc.isActive);
        card.classList.toggle('expired', acc.isExpired);
        
        // Update usage display
        const usageEl = card.querySelector('.card-usage');
        if (usageEl && acc.usage) {
          const usage = acc.usage;
          const isUnknown = usage.currentUsage === -1;
          const isExhausted = !isUnknown && usage.percentageUsed >= 100;
          
          card.classList.toggle('exhausted', isExhausted);
          card.classList.toggle('unknown-usage', isUnknown);
          
          // Update usage text
          const usageText = isUnknown ? '?' : usage.currentUsage.toLocaleString();
          usageEl.innerHTML = usageEl.innerHTML.replace(/>[^<]*<\\/span>|>\\d+|>\\?|>—/, '>' + usageText);
        }
        
        // Update status badges
        const statusBadges = card.querySelectorAll('.card-status');
        statusBadges.forEach(badge => badge.remove());
        
        const cardMain = card.querySelector('.card-main');
        const actionsDiv = card.querySelector('.card-actions');
        if (cardMain && actionsDiv) {
          const lang = document.body.dataset.lang || 'en';
          if (acc.isActive) {
            const badge = document.createElement('span');
            badge.className = 'card-status active';
            badge.textContent = lang === 'ru' ? 'АКТИВЕН' : 'ACTIVE';
            cardMain.insertBefore(badge, actionsDiv);
          }
          if (acc.usage && acc.usage.percentageUsed >= 100) {
            const badge = document.createElement('span');
            badge.className = 'card-status exhausted';
            badge.textContent = lang === 'ru' ? 'ЛИМИТ' : 'LIMIT';
            cardMain.insertBefore(badge, actionsDiv);
          }
          if (acc.isExpired && (!acc.usage || acc.usage.percentageUsed < 100)) {
            const badge = document.createElement('span');
            badge.className = 'card-status expired';
            badge.textContent = lang === 'ru' ? 'ИСТЁК' : 'EXPIRED';
            cardMain.insertBefore(badge, actionsDiv);
          }
        }
      });
      
      // Update stats bar
      updateStatsBar(accounts);
    }
    
    // Update stats bar with new account data
    function updateStatsBar(accounts) {
      const validCount = accounts.filter(a => !a.isExpired).length;
      const expiredCount = accounts.filter(a => a.isExpired).length;
      const activeAccount = accounts.find(a => a.isActive);
      const totalUsage = accounts.reduce((sum, acc) => {
        const usage = acc.usage?.currentUsage;
        return sum + (usage && usage !== -1 ? usage : 0);
      }, 0);
      
      const statsBar = document.querySelector('.stats-bar');
      if (!statsBar) return;
      
      const statItems = statsBar.querySelectorAll('.stat-item');
      const lang = document.body.dataset.lang || 'en';
      
      // Update active account
      if (statItems[0]) {
        const dot = statItems[0].querySelector('.stat-dot');
        const text = statItems[0].querySelector('span:last-child');
        if (dot) dot.className = 'stat-dot ' + (activeAccount ? 'active' : 'valid');
        if (text) {
          const email = activeAccount?.tokenData?.email || activeAccount?.tokenData?.accountName || '';
          text.textContent = activeAccount ? email.split('@')[0] : (lang === 'ru' ? 'Нет активного' : 'No active');
        }
      }
      
      // Update valid count
      if (statItems[1]) {
        const text = statItems[1].querySelector('span:last-child');
        if (text) text.textContent = validCount + ' ' + (lang === 'ru' ? 'активных' : 'valid');
      }
      
      // Update total usage
      const totalEl = statsBar.querySelector('.stat-total');
      if (totalEl) {
        totalEl.innerHTML = totalEl.innerHTML.replace(/\\d[\\d,]*/, totalUsage.toLocaleString());
      }
    }
    
    // Incremental usage card update
    function updateUsageCard(usage) {
      if (!usage) return;
      
      const usageCard = document.querySelector('.usage-card');
      if (!usageCard) return;
      
      // Remove loading state
      usageCard.classList.remove('loading', 'empty');
      
      const percentage = usage.percentageUsed;
      const fillClass = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';
      const lang = document.body.dataset.lang || 'en';
      
      // Update values without full re-render
      const valueEl = usageCard.querySelector('.usage-value');
      if (valueEl) {
        valueEl.textContent = usage.currentUsage.toLocaleString() + ' / ' + usage.usageLimit.toLocaleString();
      }
      
      const fillEl = usageCard.querySelector('.usage-fill');
      if (fillEl) {
        fillEl.style.width = Math.min(percentage, 100) + '%';
        fillEl.className = 'usage-fill ' + fillClass;
      }
      
      const footerSpans = usageCard.querySelectorAll('.usage-footer span');
      if (footerSpans[0]) {
        const usedText = { en: 'used', ru: 'использовано', zh: '已使用' };
        footerSpans[0].textContent = percentage.toFixed(1) + '% ' + (usedText[lang] || usedText.en);
      }
      if (footerSpans[1] && usage.daysRemaining !== undefined) {
        const daysText = { en: 'days left', ru: 'дней осталось', zh: '天剩余' };
        footerSpans[1].textContent = usage.daysRemaining + ' ' + (daysText[lang] || daysText.en);
      }
      
      // Remove stale indicator if present
      usageCard.classList.remove('stale');
      const staleIndicator = usageCard.querySelector('.stale-indicator');
      if (staleIndicator) staleIndicator.remove();
    }
    
    function appendLogLine(logLine) {
      const consoleBody = document.getElementById('consoleBody');
      if (!consoleBody) {
        console.warn('consoleBody not found');
        return;
      }
      
      // Expand console when new log arrives
      const consoleFloating = document.getElementById('consoleFloating');
      if (consoleFloating && consoleFloating.classList.contains('collapsed')) {
        consoleFloating.classList.remove('collapsed');
      }
      
      const line = document.createElement('div');
      line.className = 'console-line';
      if (logLine.includes('✓') || logLine.includes('[OK]') || logLine.includes('✅')) line.classList.add('success');
      else if (logLine.includes('✗') || logLine.includes('Error') || logLine.includes('❌') || logLine.includes('FAIL')) line.classList.add('error');
      else if (logLine.includes('⚠️') || logLine.includes('[!]') || logLine.includes('WARN')) line.classList.add('warning');
      line.textContent = logLine;
      consoleBody.appendChild(line);
      
      // Update count badge
      updateConsoleCount();
      
      // Keep max 200 lines
      while (consoleBody.children.length > 200) {
        consoleBody.removeChild(consoleBody.firstChild);
      }
      
      // Auto-scroll to bottom
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }
    
    function updateAutoRegStatus(status) {
      const autoRegBtn = document.querySelector('.btn-primary');
      const lang = document.body.dataset.lang || 'en';
      const runningText = { en: 'Running...', ru: 'Запуск...', zh: '运行中...' };
      const autoRegText = { en: 'Auto-Reg', ru: 'Авто-рег', zh: '自动注册' };
      
      if (!status) {
        // Hide progress panel when status is empty
        const panel = document.querySelector('.progress-panel');
        if (panel) panel.style.display = 'none';
        
        // Enable button and restore text
        if (autoRegBtn) {
          autoRegBtn.disabled = false;
          autoRegBtn.innerHTML = '⚡ ' + (autoRegText[lang] || autoRegText.en);
        }
        return;
      }
      
      // Disable button and show running state
      if (autoRegBtn) {
        autoRegBtn.disabled = true;
        autoRegBtn.innerHTML = '<span class="spinner"></span> ' + (runningText[lang] || runningText.en);
      }
      
      // Helper to create progress panel if it doesn't exist
      function ensureProgressPanel() {
        let panel = document.querySelector('.progress-panel');
        if (!panel) {
          const actions = document.querySelector('.actions');
          if (actions) {
            const newPanel = document.createElement('div');
            newPanel.className = 'progress-panel';
            newPanel.innerHTML = \`
              <div class="progress-header">
                <div class="progress-title"></div>
                <div class="progress-actions">
                  <button class="progress-btn" onclick="togglePauseAutoReg()" title="Pause">⏸</button>
                  <button class="progress-btn danger" onclick="stopAutoReg()" title="Cancel">✕</button>
                </div>
              </div>
              <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
              <div class="progress-footer">
                <div class="progress-detail"></div>
                <div class="progress-step"></div>
              </div>
            \`;
            actions.insertAdjacentElement('afterend', newPanel);
            panel = newPanel;
          }
        }
        return panel;
      }
      
      // Try to parse as JSON progress
      try {
        const progress = JSON.parse(status);
        if (progress && progress.step !== undefined) {
          const panel = ensureProgressPanel();
          if (panel) {
            panel.style.display = '';
            const percentage = (progress.step / progress.totalSteps) * 100;
            const fill = panel.querySelector('.progress-fill');
            const title = panel.querySelector('.progress-title');
            const detail = panel.querySelector('.progress-detail');
            const step = panel.querySelector('.progress-step');
            
            if (fill) fill.style.width = percentage + '%';
            if (title) title.textContent = progress.stepName || '';
            if (detail) detail.textContent = progress.detail || '';
            if (step) step.textContent = 'Step ' + progress.step + '/' + progress.totalSteps;
          }
        }
      } catch (e) {
        // Plain text status - show progress panel with text
        const panel = ensureProgressPanel();
        if (panel) {
          panel.style.display = '';
          const title = panel.querySelector('.progress-title');
          if (title) title.textContent = status;
        }
      }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      // Restore state
      const state = getState();
      if (state.compact) document.body.classList.add('compact');
      if (state.settingsOpen) document.getElementById('settingsPanel')?.classList.add('visible');
      if (state.filter !== 'all') filterAccounts(state.filter);
      if (state.hideExpired) {
        toggleHideExpired(true);
        const checkbox = document.getElementById('hideExhausted');
        if (checkbox) checkbox.checked = true;
      }
      
      // Restore console state (collapsed by default)
      const consoleFloating = document.getElementById('consoleFloating');
      if (consoleFloating) {
        if (state.consoleCollapsed !== false) {
          consoleFloating.classList.add('collapsed');
        }
      }
      
      // Auto-scroll console
      const consoleBody = document.getElementById('consoleBody');
      if (consoleBody) consoleBody.scrollTop = consoleBody.scrollHeight;
      
      // Init virtual list if needed
      initVirtualList(${totalAccounts});
    });
  `;
}
