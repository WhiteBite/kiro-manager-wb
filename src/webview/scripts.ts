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
    
    ${generateStateScript()}
    
    // === UI Actions ===
    
    function openSettings() {
      document.getElementById('settingsOverlay')?.classList.add('visible');
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
    }
    
    function toggleSetting(key, value) {
      vscode.postMessage({ command: 'updateSetting', key, value });
    }
    
    function changeLanguage(lang) {
      vscode.postMessage({ command: 'setLanguage', language: lang });
    }
    
    function checkUpdates() {
      vscode.postMessage({ command: 'checkForUpdates' });
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
    
    function refreshAllExpired() {
      vscode.postMessage({ command: 'refreshAllExpired' });
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
      document.querySelectorAll('.account').forEach(acc => {
        const email = (acc.querySelector('.account-email')?.textContent || '').toLowerCase();
        const match = !searchQuery || email.includes(searchQuery);
        acc.style.display = match ? '' : 'none';
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
      }
    });
    
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
      
      if (!status) {
        // Registration finished
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚡ ' + T.autoReg;
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
      
      // Update hero with progress
      try {
        const progress = JSON.parse(status);
        if (progress && hero) {
          const percent = Math.round((progress.step / progress.totalSteps) * 100);
          hero.className = 'hero progress';
          hero.innerHTML = \`
            <div class="hero-header">
              <span class="hero-email">\${progress.stepName || ''}</span>
              <span class="hero-step">\${progress.step}/\${progress.totalSteps}</span>
            </div>
            <div class="hero-progress">
              <div class="hero-progress-fill low" style="width: \${percent}%"></div>
            </div>
            <div class="hero-stats">
              <span class="hero-usage">\${progress.detail || ''}</span>
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
      document.getElementById('profilesPanel')?.classList.add('visible');
      vscode.postMessage({ command: 'loadProfiles' });
    }
    
    function closeProfilesPanel() {
      document.getElementById('profilesPanel')?.classList.remove('visible');
    }
    
    function createProfile() {
      editingProfileId = null;
      currentPoolEmails = [];
      document.getElementById('profileEditor')?.classList.add('visible');
      // Reset form
      document.getElementById('profileName').value = '';
      document.getElementById('imapUser').value = '';
      document.getElementById('imapServer').value = '';
      document.getElementById('imapPort').value = '993';
      document.getElementById('imapPassword').value = '';
      selectStrategy('single');
    }
    
    function editProfile(profileId) {
      editingProfileId = profileId;
      vscode.postMessage({ command: 'getProfile', profileId });
    }
    
    function closeProfileEditor() {
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
      if (catchAllConfig) catchAllConfig.style.display = strategy === 'catch_all' ? 'block' : 'none';
      if (poolConfig) poolConfig.style.display = strategy === 'pool' ? 'block' : 'none';
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
      const email = input?.value?.trim();
      if (!email || !email.includes('@')) return;
      if (!currentPoolEmails.includes(email.toLowerCase())) {
        currentPoolEmails.push(email);
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
      list.innerHTML = currentPoolEmails.map((email, i) => 
        '<div class="pool-item pending" data-index="' + i + '">' +
          '<span class="pool-status">⬜</span>' +
          '<span class="pool-email">' + email + '</span>' +
          '<button class="pool-remove" onclick="removeEmailFromPool(' + i + ')">✕</button>' +
        '</div>'
      ).join('');
    }
    
    function importEmailsFromFile() {
      vscode.postMessage({ command: 'importEmailsFromFile' });
    }
    
    function pasteEmails() {
      navigator.clipboard.readText().then(text => {
        const emails = text.split(/[\\n,;\\s]+/).filter(e => e.includes('@'));
        emails.forEach(email => {
          const e = email.trim().toLowerCase();
          if (e && !currentPoolEmails.includes(e)) {
            currentPoolEmails.push(email.trim());
          }
        });
        renderPoolList();
      }).catch(() => {
        showToast(T.clipboardError, 'error');
      });
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
        strategy.emails = currentPoolEmails.map(email => ({ email, status: 'pending' }));
      }
      
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
        currentPoolEmails = profile.strategy.emails.map(e => e.email);
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
    
    // === Init ===
    
    document.addEventListener('DOMContentLoaded', () => {
      // Scroll logs to bottom
      const logsContent = document.getElementById('logsContent');
      if (logsContent) logsContent.scrollTop = logsContent.scrollHeight;
      
      // Load patch status on init
      vscode.postMessage({ command: 'getPatchStatus' });
    });
  `;
}
