/**
 * Kiro Account Manager - Frontend Application
 */

// State
let accounts = [];
let ws = null;
let pendingConfirm = null;

// API Helper
async function api(endpoint, options = {}) {
  const response = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  
  return response.json();
}

// WebSocket
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
  
  ws.onopen = () => console.log('WebSocket connected');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleWsMessage(data);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting...');
    setTimeout(connectWebSocket, 2000);
  };
}

function handleWsMessage(data) {
  switch (data.type) {
    case 'log':
      appendLog(data.message, data.level);
      break;
    case 'progress':
      updateProgress(data);
      break;
    case 'status':
      if (!data.running) {
        hideProgress();
        loadAccounts();
      }
      break;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  connectWebSocket();
  loadAccounts();
  loadPatchStatus();
  loadSystemInfo();
  
  // Collapse logs by default
  document.getElementById('logsPanel').classList.add('collapsed');
});

// Accounts
async function loadAccounts() {
  try {
    const data = await api('/accounts');
    accounts = data.accounts;
    renderAccounts();
    updateBadge(data.valid, data.total);
    updateHero(data);
  } catch (error) {
    showToast('Failed to load accounts', 'error');
  }
}

function renderAccounts() {
  const list = document.getElementById('accountList');
  
  if (accounts.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">No accounts found</div>
        <button class="btn btn-primary" onclick="startAutoReg()">⚡ Create First Account</button>
      </div>
    `;
    return;
  }
  
  // Group accounts
  const active = accounts.filter(a => a.isActive);
  const ready = accounts.filter(a => !a.isActive && !a.isExpired);
  const bad = accounts.filter(a => a.isExpired);
  
  let html = '';
  
  if (active.length > 0) {
    html += `<div class="list-group"><span>Active</span><span class="list-group-count">${active.length}</span></div>`;
    html += active.map(renderAccountCard).join('');
  }
  
  if (ready.length > 0) {
    html += `<div class="list-group"><span>Ready</span><span class="list-group-count">${ready.length}</span></div>`;
    html += ready.map(renderAccountCard).join('');
  }
  
  if (bad.length > 0) {
    html += `<div class="list-group danger"><span>Expired</span><span class="list-group-count">${bad.length}</span></div>`;
    html += bad.map(renderAccountCard).join('');
  }
  
  list.innerHTML = html;
}

function renderAccountCard(account) {
  const avatar = (account.accountName || account.email || 'U').charAt(0).toUpperCase();
  const classes = ['account-card'];
  if (account.isActive) classes.push('active');
  if (account.isExpired) classes.push('expired');
  
  return `
    <div class="${classes.join(' ')}" onclick="switchAccount('${account.filename}')">
      <div class="account-avatar">${avatar}</div>
      <div class="account-info">
        <div class="account-name">${account.accountName || account.filename}</div>
        <div class="account-meta">
          <span>📊 ${account.expiresIn || '—'}</span>
          <span>🌍 ${account.region}</span>
        </div>
      </div>
      <div class="account-actions">
        <button class="account-btn" onclick="event.stopPropagation(); refreshAccount('${account.filename}')" title="Refresh">🔄</button>
        <button class="account-btn danger" onclick="event.stopPropagation(); confirmDeleteAccount('${account.filename}')" title="Delete">🗑️</button>
      </div>
    </div>
  `;
}

function updateBadge(valid, total) {
  document.getElementById('accountBadge').textContent = `${valid}/${total}`;
}

function updateHero(data) {
  const heroEmail = document.getElementById('heroEmail');
  const heroStats = document.getElementById('heroStats');
  
  if (data.activeAccount) {
    const active = accounts.find(a => a.isActive);
    heroEmail.textContent = active?.accountName || active?.email || data.activeAccount;
    heroStats.innerHTML = `
      <span>Provider: <span class="stat-value">${active?.provider || '—'}</span></span>
      <span>Expires: <span class="stat-value">${active?.expiresIn || '—'}</span></span>
    `;
  } else {
    heroEmail.textContent = 'No active account';
    heroStats.innerHTML = '';
  }
}

async function switchAccount(filename) {
  try {
    await api(`/accounts/${filename}/switch`, { method: 'POST' });
    showToast('Account switched', 'success');
    loadAccounts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function refreshAccount(filename) {
  try {
    await api(`/accounts/${filename}/refresh`, { method: 'POST' });
    showToast('Token refreshed', 'success');
    loadAccounts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteAccount(filename) {
  try {
    await api(`/accounts/${filename}`, { method: 'DELETE' });
    showToast('Account deleted', 'success');
    loadAccounts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function confirmDeleteAccount(filename) {
  pendingConfirm = { action: 'deleteAccount', filename };
  document.getElementById('confirmTitle').textContent = 'Delete Account';
  document.getElementById('confirmText').textContent = 'Are you sure you want to delete this account?';
  document.getElementById('confirmModal').classList.add('visible');
}

function filterAccounts(query) {
  const cards = document.querySelectorAll('.account-card');
  const q = query.toLowerCase();
  
  cards.forEach(card => {
    const name = card.querySelector('.account-name').textContent.toLowerCase();
    card.style.display = name.includes(q) ? '' : 'none';
  });
}

function refresh() {
  loadAccounts();
  loadPatchStatus();
}

// Auto-Registration
async function startAutoReg() {
  const config = {
    headless: document.getElementById('settingHeadless')?.checked || false,
    spoofing: document.getElementById('settingSpoofing')?.checked ?? true,
    imapServer: document.getElementById('imapServer')?.value,
    imapUser: document.getElementById('imapUser')?.value,
    imapPassword: document.getElementById('imapPassword')?.value,
    emailDomain: document.getElementById('emailDomain')?.value,
    emailStrategy: document.getElementById('emailStrategy')?.value || 'catch_all'
  };
  
  if (!config.imapServer || !config.imapUser || !config.imapPassword) {
    showToast('Please configure IMAP settings first', 'warning');
    openSettings();
    switchTab('imap');
    return;
  }
  
  try {
    const btn = document.getElementById('autoRegBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Starting...';
    
    showProgress();
    await api('/autoreg/start', { method: 'POST', body: config });
    
    btn.innerHTML = '⏹️ Running...';
  } catch (error) {
    hideProgress();
    document.getElementById('autoRegBtn').disabled = false;
    document.getElementById('autoRegBtn').innerHTML = '⚡ Auto-Reg';
    showToast(error.message, 'error');
  }
}

async function stopAutoReg() {
  try {
    await api('/autoreg/stop', { method: 'POST' });
    hideProgress();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function showProgress() {
  document.getElementById('heroProgress').style.display = 'block';
}

function hideProgress() {
  document.getElementById('heroProgress').style.display = 'none';
  document.getElementById('autoRegBtn').disabled = false;
  document.getElementById('autoRegBtn').innerHTML = '⚡ Auto-Reg';
}

function updateProgress(data) {
  const percent = Math.round((data.step / data.totalSteps) * 100);
  document.getElementById('progressFill').style.width = `${percent}%`;
  document.getElementById('progressText').textContent = `${data.stepName}: ${data.detail} (${data.step}/${data.totalSteps})`;
}

// SSO Import
function openSsoModal() {
  document.getElementById('ssoModal').classList.add('visible');
}

function closeSsoModal() {
  document.getElementById('ssoModal').classList.remove('visible');
  document.getElementById('ssoToken').value = '';
}

async function importSso() {
  const token = document.getElementById('ssoToken').value.trim();
  if (!token) {
    showToast('Please enter the cookie value', 'warning');
    return;
  }
  
  try {
    await api('/autoreg/sso-import', { method: 'POST', body: { token } });
    closeSsoModal();
    showToast('Account imported', 'success');
    loadAccounts();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Patch
async function loadPatchStatus() {
  try {
    const status = await api('/patch/status');
    updatePatchUI(status);
  } catch (error) {
    console.error('Failed to load patch status:', error);
  }
}

function updatePatchUI(status) {
  const indicator = document.getElementById('patchIndicator');
  const icon = document.getElementById('patchStatusIcon');
  const title = document.getElementById('patchStatusTitle');
  const version = document.getElementById('patchStatusVersion');
  const machineId = document.getElementById('patchMachineId');
  const applyBtn = document.getElementById('patchApplyBtn');
  const removeBtn = document.getElementById('patchRemoveBtn');
  
  indicator.classList.add('visible');
  
  if (status.error) {
    indicator.className = 'patch-indicator visible not-patched';
    indicator.textContent = '⚠';
    icon.textContent = '❌';
    title.textContent = 'Error';
    version.textContent = status.error;
  } else if (status.isPatched) {
    indicator.className = 'patch-indicator visible patched';
    indicator.textContent = '🔧';
    icon.textContent = '✅';
    title.textContent = 'Patched';
    version.textContent = `Kiro ${status.kiroVersion} • Patch v${status.patchVersion}`;
    applyBtn.style.display = 'none';
    removeBtn.style.display = '';
  } else {
    indicator.className = 'patch-indicator visible not-patched';
    indicator.textContent = '⚠';
    icon.textContent = '⚠️';
    title.textContent = 'Not Patched';
    version.textContent = status.kiroVersion ? `Kiro ${status.kiroVersion}` : '';
    applyBtn.style.display = '';
    removeBtn.style.display = 'none';
  }
  
  if (status.currentMachineId) {
    machineId.textContent = `Machine ID: ${status.currentMachineId}`;
    machineId.style.display = 'block';
  } else {
    machineId.style.display = 'none';
  }
}

async function applyPatch() {
  try {
    await api('/patch/apply', { method: 'POST' });
    showToast('Patch applied! Restart Kiro.', 'success');
    loadPatchStatus();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function removePatch() {
  try {
    await api('/patch/remove', { method: 'POST' });
    showToast('Patch removed', 'success');
    loadPatchStatus();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function generateMachineId() {
  try {
    const result = await api('/patch/generate-id', { method: 'POST' });
    showToast('New Machine ID generated', 'success');
    loadPatchStatus();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function resetTelemetry() {
  try {
    await api('/patch/reset-telemetry', { method: 'POST' });
    showToast('Telemetry IDs reset! Restart Kiro.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// System
async function loadSystemInfo() {
  try {
    const info = await api('/system/info');
    document.getElementById('infoPlatform').textContent = info.platform;
    document.getElementById('infoKiroVersion').textContent = info.kiroVersion;
    document.getElementById('infoMachineId').textContent = info.machineId.substring(0, 32) + '...';
    document.getElementById('infoTokensPath').textContent = info.tokensPath;
    
    const kiroStatus = await api('/system/kiro/status');
    updateKiroStatus(kiroStatus);
  } catch (error) {
    console.error('Failed to load system info:', error);
  }
}

function updateKiroStatus(status) {
  const dot = document.getElementById('kiroStatusDot');
  const text = document.getElementById('kiroStatusText');
  
  if (status.running) {
    dot.className = 'status-dot running';
    text.textContent = 'Running';
  } else if (status.installed) {
    dot.className = 'status-dot stopped';
    text.textContent = 'Stopped';
  } else {
    dot.className = 'status-dot';
    text.textContent = 'Not installed';
  }
}

async function startKiro() {
  try {
    await api('/system/kiro/start', { method: 'POST' });
    showToast('Kiro started', 'success');
    setTimeout(loadSystemInfo, 2000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function stopKiro() {
  try {
    await api('/system/kiro/stop', { method: 'POST' });
    showToast('Kiro stopped', 'success');
    setTimeout(loadSystemInfo, 1000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function restartKiro() {
  try {
    await api('/system/kiro/restart', { method: 'POST' });
    showToast('Kiro restarted', 'success');
    setTimeout(loadSystemInfo, 3000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// Settings
function openSettings() {
  document.getElementById('settingsModal').classList.add('visible');
  loadPatchStatus();
  loadSystemInfo();
}

function closeSettings() {
  document.getElementById('settingsModal').classList.remove('visible');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Logs
function toggleLogs() {
  document.getElementById('logsPanel').classList.toggle('collapsed');
}

function appendLog(message, level = 'info') {
  const content = document.getElementById('logsContent');
  const line = document.createElement('div');
  line.className = `log-line ${level}`;
  line.textContent = message;
  content.appendChild(line);
  
  // Keep max 200 lines
  while (content.children.length > 200) {
    content.removeChild(content.firstChild);
  }
  
  content.scrollTop = content.scrollHeight;
  updateLogsCount();
  
  // Auto-expand on new logs
  document.getElementById('logsPanel').classList.remove('collapsed');
}

function updateLogsCount() {
  const content = document.getElementById('logsContent');
  const count = document.getElementById('logsCount');
  count.textContent = content.children.length;
  count.classList.toggle('has-errors', content.querySelector('.error') !== null);
}

function clearLogs() {
  document.getElementById('logsContent').innerHTML = '';
  updateLogsCount();
}

function copyLogs() {
  const content = document.getElementById('logsContent');
  const text = Array.from(content.children).map(el => el.textContent).join('\n');
  navigator.clipboard.writeText(text);
  showToast('Logs copied', 'success');
}

// Confirm Dialog
function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('visible');
  pendingConfirm = null;
}

function confirmAction() {
  if (!pendingConfirm) return;
  
  switch (pendingConfirm.action) {
    case 'deleteAccount':
      deleteAccount(pendingConfirm.filename);
      break;
  }
  
  closeConfirm();
}

// Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = { success: '✓', error: '✗', warning: '⚠️' };
  toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${message}</span>`;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSettings();
    closeSsoModal();
    closeConfirm();
  }
});
