/**
 * Client-side scripts for webview v5.0
 */

import { generateStateScript } from './state';
import { Translations } from './i18n/types';

export function generateWebviewScript(totalAccounts: number, t: Translations): string {
  // Serialize translations for client-side use
  const T = JSON.stringify(t);

  return `
    const T = ${T};
   
    const vscode = acquireVsCodeApi();
    let pendingAction = null;
    
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
      currentTab = tabId;
      
      // Update tab buttons
      document.querySelectorAll('.tab-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
      });
      
      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === 'tab-' + tabId);
      });
      
      // FAB visibility - only show on accounts tab
      const fab = document.getElementById('fabContainer');
      if (fab) {
        fab.classList.toggle('hidden', tabId !== 'accounts');
      }
      
      // Load data for specific tabs
      if (tabId === 'profiles') {
        vscode.postMessage({ command: 'loadProfiles' });
        vscode.postMessage({ command: 'getActiveProfile' });
      } else if (tabId === 'settings') {
        vscode.postMessage({ command: 'getPatchStatus' });
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
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function confirmUnpatchKiro() {
      pendingAction = { type: 'unpatchKiro' };
      document.getElementById('dialogTitle').textContent = T.removePatchTitle;
      document.getElementById('dialogText').textContent = T.removePatchConfirm;
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
    
    function startAutoReg() {
      vscode.postMessage({ command: 'startAutoReg' });
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
    
    // === Logs Drawer ===
    
    function toggleLogs() {
      const drawer = document.getElementById('logsDrawer');
      drawer?.classList.toggle('open');
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
        const logs = Array.from(content.querySelectorAll('.log-line'))
          .map(el => el.textContent)
          .join('\\n');
        vscode.postMessage({ command: 'copyLogs', logs });
      }
    }
    
    function updateLogsCount() {
      const content = document.getElementById('logsContent');
      const countEl = document.getElementById('logsCount');
      if (content && countEl) {
        const count = content.children.length;
        const hasErrors = content.querySelector('.log-line.error') !== null;
        countEl.textContent = count.toString();
        countEl.classList.toggle('has-errors', hasErrors);
      }
    }
    
    function appendLogLine(log) {
      const content = document.getElementById('logsContent');
      if (!content) return;
      
      // Open drawer on new log
      document.getElementById('logsDrawer')?.classList.add('open');
      
      const line = document.createElement('div');
      line.className = 'log-line';
      if (log.includes('✓') || log.includes('SUCCESS') || log.includes('✅')) line.classList.add('success');
      else if (log.includes('✗') || log.includes('ERROR') || log.includes('❌')) line.classList.add('error');
      else if (log.includes('⚠') || log.includes('WARN')) line.classList.add('warning');
      line.textContent = log;
      content.appendChild(line);
      
      // Keep max 200 lines
      while (content.children.length > 200) content.removeChild(content.firstChild);
      
      content.scrollTop = content.scrollHeight;
      updateLogsCount();
    }

    // === Delete Dialog ===
    
    function confirmDelete(filename) {
      pendingAction = { type: 'delete', filename };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.areYouSure;
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function confirmDeleteExhausted() {
      pendingAction = { type: 'deleteExhausted' };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.deleteBadAccountsConfirm;
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function confirmDeleteBanned() {
      pendingAction = { type: 'deleteBanned' };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.deleteBannedAccountsConfirm || 'Delete all banned accounts?';
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
    
    // === Search ===
    
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
    
    function applyFilters() {
      let visibleCount = 0;
      document.querySelectorAll('.account').forEach(acc => {
        const email = (acc.querySelector('.account-email')?.textContent || '').toLowerCase();
        const match = !searchQuery || email.includes(searchQuery);
        acc.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      
      // Show/hide empty search state
      const emptySearch = document.getElementById('emptySearchState');
      if (emptySearch) {
        emptySearch.style.display = (searchQuery && visibleCount === 0) ? 'block' : 'none';
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
      const container = document.getElementById('toastContainer');
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = 'toast ' + type;
      const icons = { success: '✓', error: '✗', warning: '⚠️' };
      toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '•') + '</span><span class="toast-message">' + message + '</span>';
      container.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 200);
      }, 3000);
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
          // Incremental account list update - just update the list without full refresh
          // Don't send refresh command - it resets the view to main tab
          break;
        case 'updateUsage':
          // Incremental usage update - refresh hero section
          if (msg.usage) {
            updateHeroUsage(msg.usage);
          }
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
        case 'emailsImported':
          addImportedEmails(msg.emails);
          break;
        case 'patchStatus':
          updatePatchStatus(msg);
          break;
        case 'imapTestResult':
          updateImapTestResult(msg);
          break;
      }
    });
    
    function updateHeroUsage(usage) {
      const hero = document.querySelector('.hero');
      if (!hero || hero.classList.contains('progress')) return;
      
      const usageEl = hero.querySelector('.hero-usage');
      const percentEl = hero.querySelector('.hero-percent');
      const fillEl = hero.querySelector('.hero-progress-fill');
      
      if (usageEl) usageEl.textContent = usage.currentUsage + ' / ' + usage.usageLimit;
      if (percentEl) percentEl.textContent = usage.percentageUsed + '%';
      if (fillEl) {
        fillEl.style.width = usage.percentageUsed + '%';
        fillEl.className = 'hero-progress-fill ' + (usage.percentageUsed >= 90 ? 'high' : usage.percentageUsed >= 50 ? 'medium' : 'low');
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
      const patchBtn = document.getElementById('patchKiroBtn');
      const unpatchBtn = document.getElementById('unpatchKiroBtn');
      const generateBtn = document.getElementById('generateIdBtn');
      const statusEl = document.getElementById('patchStatusText');
      const machineIdEl = document.getElementById('currentMachineId');
      const indicator = document.getElementById('patchIndicator');
      
      // Update settings panel status
      if (statusEl) {
        if (status.error) {
          statusEl.textContent = status.error;
          statusEl.className = 'patch-status error';
        } else if (status.isPatched) {
          statusEl.textContent = T.patchStatusActive + ' ✓';
          statusEl.className = 'patch-status success';
        } else {
          statusEl.textContent = T.patchStatusNotPatched;
          statusEl.className = 'patch-status warning';
        }
      }
      
      // Update machine ID preview
      if (machineIdEl && status.currentMachineId) {
        machineIdEl.textContent = status.currentMachineId.substring(0, 16) + '...';
        machineIdEl.title = status.currentMachineId;
      }
      
      // Update header indicator
      if (indicator) {
        indicator.className = 'patch-indicator visible';
        if (status.error) {
          indicator.classList.add('error');
          indicator.title = status.error;
        } else if (status.isPatched) {
          indicator.classList.add('patched');
          indicator.title = T.patchStatusActive + ' (v' + status.patchVersion + ')';
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
      if (patchBtn) patchBtn.style.display = status.isPatched ? 'none' : '';
      if (unpatchBtn) unpatchBtn.style.display = status.isPatched ? '' : 'none';
    }
    
    function updateStatus(status) {
      const btn = document.querySelector('.btn-primary');
      const hero = document.querySelector('.hero');
      const fab = document.getElementById('fabContainer');
      
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
        // Refresh to show new account
        vscode.postMessage({ command: 'refresh' });
        return;
      }
      
      // Show running state
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> ' + T.running;
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
      if (e.key === 'Escape') {
        closeDialog();
        closeSettings();
        closeSsoModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
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
      if (nameEl) nameEl.value = '';
      if (userEl) userEl.value = '';
      if (serverEl) serverEl.value = '';
      if (portEl) portEl.value = '993';
      if (passwordEl) passwordEl.value = '';
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
    
    function selectProfile(profileId) {
      vscode.postMessage({ command: 'setActiveProfile', profileId });
    }
    
    function deleteProfile(profileId) {
      if (confirm(T.deleteProfileConfirm)) {
        vscode.postMessage({ command: 'deleteProfile', profileId });
      }
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
      const server = document.getElementById('imapServer')?.value;
      const user = document.getElementById('imapUser')?.value;
      const password = document.getElementById('imapPassword')?.value;
      const port = document.getElementById('imapPort')?.value || '993';
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
            strategy
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
            strategy
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
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    // === Init ===
    
    document.addEventListener('DOMContentLoaded', () => {
      // Scroll logs to bottom
      const logsContent = document.getElementById('logsContent');
      if (logsContent) logsContent.scrollTop = logsContent.scrollHeight;
      
      // Load patch status on init
      vscode.postMessage({ command: 'getPatchStatus' });
    });
    
    // Export functions to window for onclick handlers
    window.switchTab = switchTab;
    window.openSettings = openSettings;
    window.closeSettings = closeSettings;
    window.toggleLogs = toggleLogs;
    window.clearConsole = clearConsole;
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
  `;
}
