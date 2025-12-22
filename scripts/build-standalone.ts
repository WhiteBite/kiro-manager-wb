/**
 * Build Standalone Web App
 * 
 * Generates standalone HTML from the same components as VS Code extension.
 * Run with: npx ts-node scripts/build-standalone.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Import webview components
import { getStyles } from '../src/webview/styles';
import { getTranslations } from '../src/webview/i18n';
import { renderHeader } from '../src/webview/components/Header';
import { renderHero } from '../src/webview/components/Hero';
import { renderToolbar } from '../src/webview/components/Toolbar';
import { renderSettings } from '../src/webview/components/Settings';
import { renderLogs } from '../src/webview/components/Logs';
import { renderModals } from '../src/webview/components/Modals';
import { renderProfileEditor } from '../src/webview/components/ProfileEditor';

const OUTPUT_DIR = path.join(__dirname, '../autoreg/app/static');

function generateStandaloneScript(): string {
  // Generate client-side script that uses WebSocket instead of vscode API
  return `
    // Standalone Web App Script
    // Auto-generated from VS Code extension components
    
    const T = ${JSON.stringify(getTranslations('en'))};
    
    // WebSocket connection
    let ws = null;
    let reconnectAttempts = 0;
    
    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        sendCommand('refresh');
        sendCommand('getPatchStatus');
        sendCommand('getActiveProfile');
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleMessage(msg);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (reconnectAttempts < 5) {
          reconnectAttempts++;
          setTimeout(connectWebSocket, 1000 * reconnectAttempts);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    }
    
    function sendCommand(command, data = {}) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ command, ...data }));
      }
    }
    
    // Message handler - same as extension
    function handleMessage(msg) {
      switch (msg.type) {
        case 'accountsLoaded':
          renderAccounts(msg.accounts);
          break;
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
        case 'patchStatus':
          updatePatchStatus(msg);
          break;
      }
    }
    
    // UI Functions (same as extension, but using sendCommand instead of vscode.postMessage)
    let pendingAction = null;
    let currentPoolEmails = [];
    let editingProfileId = null;
    
    function openSettings() {
      document.getElementById('settingsOverlay')?.classList.add('visible');
      sendCommand('getActiveProfile');
      sendCommand('getPatchStatus');
    }
    
    function closeSettings() {
      document.getElementById('settingsOverlay')?.classList.remove('visible');
    }
    
    function toggleLogs() {
      document.getElementById('logsDrawer')?.classList.toggle('open');
    }
    
    function startAutoReg() {
      sendCommand('startAutoReg');
    }
    
    function stopAutoReg() {
      sendCommand('stopAutoReg');
    }
    
    function refresh() {
      sendCommand('refresh');
    }
    
    function switchAccount(filename) {
      sendCommand('switchAccount', { email: filename });
    }
    
    function copyToken(filename) {
      sendCommand('copyToken', { email: filename });
    }
    
    function refreshToken(filename) {
      sendCommand('refreshToken', { email: filename });
    }
    
    function confirmDelete(filename) {
      pendingAction = { type: 'delete', filename };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.areYouSure;
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function closeDialog() {
      document.getElementById('dialogOverlay').classList.remove('visible');
      pendingAction = null;
    }
    
    function dialogAction() {
      if (pendingAction?.type === 'delete') {
        sendCommand('deleteAccount', { email: pendingAction.filename });
        showToast(T.accountDeleted, 'success');
      } else if (pendingAction?.type === 'deleteExhausted') {
        sendCommand('deleteExhaustedAccounts');
        showToast(T.badAccountsDeleted || 'Bad accounts deleted', 'success');
      } else if (pendingAction?.type === 'deleteBanned') {
        sendCommand('deleteBannedAccounts');
        showToast(T.bannedAccountsDeleted || 'Banned accounts deleted', 'success');
      } else if (pendingAction?.type === 'deleteSelected') {
        sendCommand('deleteSelectedAccounts', { filenames: pendingAction.filenames });
        showToast((T.selectedAccountsDeleted || '{count} accounts deleted').replace('{count}', pendingAction.filenames.length), 'success');
        selectionMode = false;
        selectedAccounts.clear();
        const bar = document.getElementById('bulkActionsBar');
        if (bar) bar.classList.add('hidden');
      }
      closeDialog();
    }
    
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
    
    function appendLogLine(log) {
      const content = document.getElementById('logsContent');
      if (!content) return;
      
      document.getElementById('logsDrawer')?.classList.add('open');
      
      const line = document.createElement('div');
      line.className = 'log-line';
      if (log.includes('✓') || log.includes('SUCCESS') || log.includes('[OK]')) line.classList.add('success');
      else if (log.includes('✗') || log.includes('ERROR') || log.includes('[X]')) line.classList.add('error');
      else if (log.includes('⚠') || log.includes('WARN') || log.includes('[!]')) line.classList.add('warning');
      line.textContent = log;
      content.appendChild(line);
      
      while (content.children.length > 200) content.removeChild(content.firstChild);
      content.scrollTop = content.scrollHeight;
      
      const countEl = document.getElementById('logsCount');
      if (countEl) countEl.textContent = content.children.length.toString();
    }
    
    function updateStatus(status) {
      const btn = document.querySelector('.btn-primary');
      if (!status) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '⚡ ' + T.autoReg;
        }
        sendCommand('refresh');
        return;
      }
      
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> ' + T.running;
      }
    }
    
    function renderAccounts(accounts) {
      const list = document.getElementById('accountList');
      if (!list || !accounts) return;
      
      // Group accounts
      const active = accounts.filter(a => a.isActive);
      const ready = accounts.filter(a => !a.isActive && !a.isExpired);
      const expired = accounts.filter(a => a.isExpired);
      
      let html = '';
      
      if (active.length > 0) {
        html += '<div class="account-group"><div class="account-group-header"><span class="account-group-title">Active</span><span class="account-group-count">' + active.length + '</span></div>';
        active.forEach(a => { html += renderAccountCard(a); });
        html += '</div>';
      }
      
      if (ready.length > 0) {
        html += '<div class="account-group"><div class="account-group-header"><span class="account-group-title">Ready</span><span class="account-group-count">' + ready.length + '</span></div>';
        ready.forEach(a => { html += renderAccountCard(a); });
        html += '</div>';
      }
      
      if (expired.length > 0) {
        html += '<div class="account-group collapsed"><div class="account-group-header"><span class="account-group-title">Expired</span><span class="account-group-count">' + expired.length + '</span></div>';
        expired.forEach(a => { html += renderAccountCard(a); });
        html += '</div>';
      }
      
      list.innerHTML = html;
    }
    
    function renderAccountCard(account) {
      const initial = (account.email || account.filename || '?')[0].toUpperCase();
      const name = account.email?.split('@')[0] || account.filename?.replace('.json', '') || 'Unknown';
      const status = account.isExpired ? 'expired' : (account.isActive ? 'active' : 'ready');
      
      return '<div class="account ' + status + '" onclick="switchAccount(\\'' + account.filename + '\\')">' +
        '<div class="account-avatar">' + initial + '</div>' +
        '<div class="account-info">' +
          '<div class="account-email">' + name + '</div>' +
          '<div class="account-meta">' +
            '<span class="account-usage">📊 ' + (account.isExpired ? 'expired' : '0h') + '</span>' +
            '<span class="account-region">🌍 ' + (account.region || 'us-east-1') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="account-actions">' +
          '<button class="icon-btn" onclick="event.stopPropagation(); refreshToken(\\'' + account.filename + '\\')">🔄</button>' +
          '<button class="icon-btn danger" onclick="event.stopPropagation(); confirmDelete(\\'' + account.filename + '\\')">🗑️</button>' +
        '</div>' +
      '</div>';
    }
    
    // Profile functions
    function openProfilesPanel() {
      // Close settings first to avoid overlap
      document.getElementById('settingsOverlay')?.classList.remove('visible');
      document.getElementById('profilesPanel')?.classList.add('visible');
      sendCommand('loadProfiles');
    }
    
    function closeProfilesPanel() {
      document.getElementById('profilesPanel')?.classList.remove('visible');
      // Reopen settings
      document.getElementById('settingsOverlay')?.classList.add('visible');
    }
    
    function createProfile() {
      editingProfileId = null;
      currentPoolEmails = [];
      // Close profiles panel first
      document.getElementById('profilesPanel')?.classList.remove('visible');
      document.getElementById('profileEditor')?.classList.add('visible');
      document.getElementById('profileName').value = '';
      document.getElementById('imapUser').value = '';
      document.getElementById('imapServer').value = '';
      document.getElementById('imapPort').value = '993';
      document.getElementById('imapPassword').value = '';
      selectStrategy('single');
    }
    
    function selectStrategy(strategy) {
      document.querySelectorAll('.strategy-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.strategy === strategy);
      });
      const catchAllConfig = document.getElementById('catchAllConfig');
      const poolConfig = document.getElementById('poolConfig');
      const imapEmailGroup = document.getElementById('imapEmailGroup');
      const imapPasswordGroup = document.getElementById('imapPasswordGroup');
      
      if (catchAllConfig) catchAllConfig.style.display = strategy === 'catch_all' ? 'block' : 'none';
      if (poolConfig) poolConfig.style.display = strategy === 'pool' ? 'block' : 'none';
      
      const isPool = strategy === 'pool';
      if (imapEmailGroup) imapEmailGroup.style.display = isPool ? 'none' : 'block';
      if (imapPasswordGroup) imapPasswordGroup.style.display = isPool ? 'none' : 'block';
    }
    
    function closeProfileEditor() {
      document.getElementById('profileEditor')?.classList.remove('visible');
      editingProfileId = null;
      // Reopen profiles panel
      document.getElementById('profilesPanel')?.classList.add('visible');
      sendCommand('loadProfiles');
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
        strategy.emails = currentPoolEmails.map(item => ({
          email: item.email || item,
          password: item.password,
          status: 'pending'
        }));
      }
      
      const isPool = strategyType === 'pool';
      
      if (isPool) {
        if (!currentPoolEmails || currentPoolEmails.length === 0) {
          showToast(T.poolEmpty || 'Add at least one email to pool', 'error');
          return;
        }
        const firstEntry = currentPoolEmails[0];
        sendCommand(editingProfileId ? 'updateProfile' : 'createProfile', {
          profile: {
            id: editingProfileId,
            name,
            imap: { server, user: firstEntry.email || firstEntry, password: firstEntry.password || '', port },
            strategy
          }
        });
      } else {
        if (!server || !user || !password) {
          showToast(T.fillAllFields, 'error');
          return;
        }
        sendCommand(editingProfileId ? 'updateProfile' : 'createProfile', {
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
    
    function renderProfilesList(profiles, activeId) {
      const container = document.getElementById('profilesContent');
      if (!container) return;
      
      if (!profiles || profiles.length === 0) {
        container.innerHTML = '<div class="profiles-empty"><div class="empty-icon">📧</div><div class="empty-text">' + T.noProfiles + '</div><button class="btn btn-primary" onclick="createProfile()">+ ' + T.addProfile + '</button></div>';
        return;
      }
      
      let html = '<div class="profiles-list">';
      profiles.forEach(profile => {
        const isActive = profile.id === activeId;
        html += '<div class="profile-card ' + (isActive ? 'active' : '') + '">' +
          '<div class="profile-card-header">' +
            '<div class="profile-card-radio" onclick="selectProfile(\\'' + profile.id + '\\')">' +
              '<span class="radio-dot ' + (isActive ? 'checked' : '') + '"></span>' +
            '</div>' +
            '<div class="profile-card-info">' +
              '<div class="profile-card-name">' + (profile.name || T.unnamed) + '</div>' +
              '<div class="profile-card-email">' + (profile.imap?.user || '') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      html += '<button class="btn btn-primary profiles-add-btn" onclick="createProfile()">+ ' + T.addProfile + '</button>';
      container.innerHTML = html;
    }
    
    function selectProfile(profileId) {
      sendCommand('setActiveProfile', { profileId });
    }
    
    // Store current active profile for Hero display
    let currentActiveProfile = null;
    
    function renderActiveProfile(profile) {
      currentActiveProfile = profile;
      
      // Update Settings panel
      const container = document.getElementById('activeProfileContent');
      if (container) {
        if (!profile) {
          container.innerHTML = '<div class="active-profile-empty"><span class="empty-icon">📧</span><span class="empty-text">' + T.noProfileConfigured + '</span><button class="btn btn-primary btn-sm" onclick="openProfilesPanel()">' + T.configure + '</button></div>';
        } else {
          container.innerHTML = '<div class="active-profile-info"><div class="active-profile-name">' + (profile.name || T.unnamed) + '</div><div class="active-profile-email">' + (profile.imap?.user || '') + '</div></div>';
        }
      }
      
      // Update Hero section to show profile info
      updateHeroWithProfile(profile);
    }
    
    function updateHeroWithProfile(profile) {
      const hero = document.querySelector('.hero');
      if (!hero) return;
      
      // Don't update if registration is running (hero shows progress)
      if (hero.classList.contains('progress')) return;
      
      if (!profile) {
        hero.className = 'hero empty';
        hero.setAttribute('onclick', 'openSettings()');
        hero.innerHTML = '<div class="hero-email">' + T.noActive + '</div><div class="hero-hint">' + (T.clickToConfigure || 'Click to configure') + '</div>';
        return;
      }
      
      const profileName = profile.name || T.unnamed || 'Unnamed';
      const email = profile.imap?.user || '';
      const strategyType = profile.strategy?.type || 'single';
      const strategyIcon = strategyType === 'pool' ? '📦' : strategyType === 'catch_all' ? '🎯' : '📧';
      const registered = profile.stats?.registered || 0;
      const failed = profile.stats?.failed || 0;
      
      hero.className = 'hero profile';
      hero.setAttribute('onclick', 'openSettings()');
      hero.innerHTML = 
        '<div class="hero-header">' +
          '<span class="hero-email" title="' + email + '">' + strategyIcon + ' ' + profileName + '</span>' +
          '<span class="hero-days">' + (T.ready || 'Ready') + '</span>' +
        '</div>' +
        '<div class="hero-profile-info">' +
          '<span class="hero-profile-email">' + email + '</span>' +
        '</div>' +
        '<div class="hero-stats">' +
          '<span class="hero-usage font-mono">✅ ' + registered + ' / ❌ ' + failed + '</span>' +
          '<span class="hero-percent">' + (T.clickToConfigure || 'Click to configure') + '</span>' +
        '</div>';
    }
    
    function updatePatchStatus(status) {
      const statusEl = document.getElementById('patchStatusText');
      if (statusEl) {
        if (status.isPatched) {
          statusEl.textContent = T.patchStatusActive + ' ✓';
          statusEl.className = 'patch-status success';
        } else {
          statusEl.textContent = T.patchStatusNotPatched;
          statusEl.className = 'patch-status warning';
        }
      }
    }
    
    // Settings toggles
    function toggleAutoSwitch(enabled) {
      sendCommand('toggleAutoSwitch', { enabled });
    }
    
    function toggleSetting(key, value) {
      sendCommand('updateSetting', { key, value });
    }
    
    function changeLanguage(lang) {
      sendCommand('setLanguage', { language: lang });
    }
    
    // Pool email functions
    function addEmailToPool() {
      const input = document.getElementById('newPoolEmail');
      const value = input?.value?.trim();
      if (!value || !value.includes('@')) return;
      
      let email, password;
      if (value.includes(':') && value.indexOf(':') > value.indexOf('@')) {
        const colonPos = value.lastIndexOf(':');
        email = value.substring(0, colonPos);
        password = value.substring(colonPos + 1);
      } else {
        email = value;
      }
      
      if (!currentPoolEmails.find(e => (e.email || e).toLowerCase() === email.toLowerCase())) {
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
        return '<div class="pool-item pending"><span class="pool-status">⬜</span><span class="pool-email">' + email + hasPassword + '</span><button class="pool-remove" onclick="removeEmailFromPool(' + i + ')">✕</button></div>';
      }).join('');
    }
    
    function pasteEmails() {
      navigator.clipboard.readText().then(text => {
        const lines = text.split(/[\\r\\n]+/).filter(e => e.includes('@'));
        lines.forEach(line => {
          const trimmed = line.trim();
          let email, password;
          if (trimmed.includes(':') && trimmed.indexOf(':') > trimmed.indexOf('@')) {
            const colonPos = trimmed.lastIndexOf(':');
            email = trimmed.substring(0, colonPos);
            password = trimmed.substring(colonPos + 1);
          } else {
            email = trimmed;
          }
          if (!currentPoolEmails.find(e => (e.email || e).toLowerCase() === email.toLowerCase())) {
            currentPoolEmails.push(password ? { email, password } : { email });
          }
        });
        renderPoolList();
      }).catch(() => showToast('Clipboard error', 'error'));
    }
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', () => {
      connectWebSocket();
    });
    
    // Additional functions
    function editProfile(profileId) {
      editingProfileId = profileId;
      sendCommand('getProfile', { profileId });
    }
    
    function deleteProfile(profileId) {
      if (confirm(T.deleteProfileConfirm || 'Delete this profile?')) {
        sendCommand('deleteProfile', { profileId });
      }
    }
    
    function populateProfileEditor(profile) {
      if (!profile) return;
      
      editingProfileId = profile.id;
      
      const nameEl = document.getElementById('profileName');
      const userEl = document.getElementById('imapUser');
      const serverEl = document.getElementById('imapServer');
      const portEl = document.getElementById('imapPort');
      const passwordEl = document.getElementById('imapPassword');
      
      if (nameEl) nameEl.value = profile.name || '';
      if (userEl) userEl.value = profile.imap?.user || '';
      if (serverEl) serverEl.value = profile.imap?.server || '';
      if (portEl) portEl.value = profile.imap?.port || 993;
      if (passwordEl) passwordEl.value = profile.imap?.password || '';
      
      const strategyType = profile.strategy?.type || 'single';
      selectStrategy(strategyType);
      
      if (strategyType === 'catch_all' && profile.strategy?.domain) {
        const domainEl = document.getElementById('catchAllDomain');
        if (domainEl) domainEl.value = profile.strategy.domain;
      }
      
      if (strategyType === 'pool' && profile.strategy?.emails) {
        currentPoolEmails = profile.strategy.emails.map(e => 
          typeof e === 'string' ? { email: e } : e
        );
        renderPoolList();
      }
      
      document.getElementById('profileEditor')?.classList.add('visible');
    }
    
    function clearConsole() {
      const content = document.getElementById('logsContent');
      if (content) content.innerHTML = '';
      const countEl = document.getElementById('logsCount');
      if (countEl) countEl.textContent = '0';
    }
    
    function copyLogs() {
      const content = document.getElementById('logsContent');
      if (content) {
        const logs = Array.from(content.querySelectorAll('.log-line'))
          .map(el => el.textContent)
          .join('\\n');
        navigator.clipboard.writeText(logs).then(() => {
          showToast('Logs copied', 'success');
        });
      }
    }
    
    function togglePasswordVisibility(inputId) {
      const input = document.getElementById(inputId);
      if (input) input.type = input.type === 'password' ? 'text' : 'password';
    }
    
    function testImapConnection() {
      const server = document.getElementById('imapServer')?.value?.trim();
      const user = document.getElementById('imapUser')?.value?.trim();
      const password = document.getElementById('imapPassword')?.value;
      const port = document.getElementById('imapPort')?.value || '993';
      
      // Validate fields before testing
      if (!server || !user || !password) {
        showToast('Please fill all IMAP fields', 'error');
        return;
      }
      
      sendCommand('testImap', { server, user, password, port: parseInt(port) });
    }
    
    function importEmailsFromFile() {
      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.csv';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const text = ev.target.result;
            const lines = text.split(/[\\r\\n]+/).filter(e => e.includes('@'));
            lines.forEach(line => {
              const trimmed = line.trim();
              let email, password;
              if (trimmed.includes(':') && trimmed.indexOf(':') > trimmed.indexOf('@')) {
                const colonPos = trimmed.lastIndexOf(':');
                email = trimmed.substring(0, colonPos);
                password = trimmed.substring(colonPos + 1);
              } else {
                email = trimmed;
              }
              if (!currentPoolEmails.find(e => (e.email || e).toLowerCase() === email.toLowerCase())) {
                currentPoolEmails.push(password ? { email, password } : { email });
              }
            });
            renderPoolList();
            showToast('Imported ' + lines.length + ' emails', 'success');
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
    
    function refreshUsage() {
      sendCommand('refreshUsage');
    }
    
    function onEmailInput(email) {
      // Auto-detect provider (simplified for standalone)
      if (email.includes('@gmail.com')) {
        document.getElementById('imapServer').value = 'imap.gmail.com';
      } else if (email.includes('@gmx.')) {
        document.getElementById('imapServer').value = 'imap.gmx.com';
      } else if (email.includes('@outlook.') || email.includes('@hotmail.')) {
        document.getElementById('imapServer').value = 'outlook.office365.com';
      }
    }
    
    function confirmDeleteExhausted() {
      pendingAction = { type: 'deleteExhausted' };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.deleteBadAccountsConfirm || 'Delete all exhausted accounts?';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function confirmDeleteBanned() {
      pendingAction = { type: 'deleteBanned' };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = T.deleteBannedAccountsConfirm || 'Delete all banned accounts?';
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function refreshAllExpired() {
      sendCommand('refreshAllExpired');
    }
    
    function checkAllAccountsHealth() {
      sendCommand('checkAllAccountsHealth');
      showToast(T.checkingHealth || 'Checking accounts health...', 'success');
    }
    
    function exportAllAccounts() {
      sendCommand('exportAccounts');
    }
    
    function importAccounts() {
      sendCommand('importAccounts');
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
      sendCommand('exportSelectedAccounts', { filenames: Array.from(selectedAccounts) });
    }
    
    function refreshSelectedTokens() {
      if (selectedAccounts.size === 0) return;
      sendCommand('refreshSelectedTokens', { filenames: Array.from(selectedAccounts) });
      showToast(T.refreshingTokens || 'Refreshing tokens...', 'success');
    }
    
    function deleteSelectedAccounts() {
      if (selectedAccounts.size === 0) return;
      pendingAction = { type: 'deleteSelected', filenames: Array.from(selectedAccounts) };
      document.getElementById('dialogTitle').textContent = T.deleteTitle;
      document.getElementById('dialogText').textContent = (T.deleteSelectedConfirm || 'Delete {count} selected accounts?').replace('{count}', selectedAccounts.size);
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    // Export to window
    window.openSettings = openSettings;
    window.closeSettings = closeSettings;
    window.toggleLogs = toggleLogs;
    window.startAutoReg = startAutoReg;
    window.stopAutoReg = stopAutoReg;
    window.refresh = refresh;
    window.switchAccount = switchAccount;
    window.copyToken = copyToken;
    window.refreshToken = refreshToken;
    window.confirmDelete = confirmDelete;
    window.closeDialog = closeDialog;
    window.dialogAction = dialogAction;
    window.showToast = showToast;
    window.openProfilesPanel = openProfilesPanel;
    window.closeProfilesPanel = closeProfilesPanel;
    window.createProfile = createProfile;
    window.selectStrategy = selectStrategy;
    window.closeProfileEditor = closeProfileEditor;
    window.saveProfile = saveProfile;
    window.selectProfile = selectProfile;
    window.toggleAutoSwitch = toggleAutoSwitch;
    window.toggleSetting = toggleSetting;
    window.changeLanguage = changeLanguage;
    window.addEmailToPool = addEmailToPool;
    window.removeEmailFromPool = removeEmailFromPool;
    window.pasteEmails = pasteEmails;
    window.editProfile = editProfile;
    window.deleteProfile = deleteProfile;
    window.clearConsole = clearConsole;
    window.copyLogs = copyLogs;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.testImapConnection = testImapConnection;
    window.importEmailsFromFile = importEmailsFromFile;
    window.refreshUsage = refreshUsage;
    window.onEmailInput = onEmailInput;
    window.confirmDeleteExhausted = confirmDeleteExhausted;
    window.confirmDeleteBanned = confirmDeleteBanned;
    window.checkAllAccountsHealth = checkAllAccountsHealth;
    window.refreshAllExpired = refreshAllExpired;
    window.exportAllAccounts = exportAllAccounts;
    window.importAccounts = importAccounts;
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

function generateStandaloneHtml(): string {
  const t = getTranslations('en');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kiro Account Manager</title>
  <style>${getStyles()}</style>
</head>
<body data-lang="en">
  <div class="app">
    ${renderHeader({ validCount: 0, totalCount: 0, t })}
    ${renderHero({ activeAccount: undefined, activeProfile: null, usage: null, progress: null, isRunning: false, t })}
    ${renderToolbar({ isRunning: false, t })}
    
    <div class="list" id="accountList">
      <div class="loading">Loading accounts...</div>
    </div>

    ${renderLogs({ logs: [], t })}
    ${renderSettings({ autoSwitchEnabled: false, settings: undefined, lang: 'en', t, version: 'standalone' })}
    ${renderModals({ t })}
    ${renderProfileEditor({ t })}
  </div>
  <div id="toastContainer" class="toast-container"></div>
  <script>${generateStandaloneScript()}</script>
</body>
</html>`;
}

// Main
function main() {
  console.log('Building standalone web app...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate HTML
  const html = generateStandaloneHtml();
  const htmlPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✓ Generated: ${htmlPath}`);

  console.log('Done!');
}

main();
