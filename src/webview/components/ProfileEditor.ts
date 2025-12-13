/**
 * Profile Editor Component
 * Form for creating/editing IMAP profiles
 */

import { ImapProfile, EmailStrategyType, ProviderHint } from '../../types';
import { ICONS } from '../icons';

export interface ProfileEditorProps {
  profile?: Partial<ImapProfile>;
  providerHints: ProviderHint[];
  mode: 'create' | 'edit';
}

const STRATEGY_OPTIONS: { type: EmailStrategyType; icon: string; label: string; desc: string }[] = [
  {
    type: 'single',
    icon: '📧',
    label: 'Single Email',
    desc: 'Use your IMAP email directly. One registration per email.'
  },
  {
    type: 'plus_alias',
    icon: '➕',
    label: 'Plus Alias',
    desc: 'Generate user+random@domain. Unlimited registrations. Works with Gmail, Outlook, etc.'
  },
  {
    type: 'catch_all',
    icon: '🌐',
    label: 'Catch-All Domain',
    desc: 'Generate random@your-domain. Requires catch-all configured on your domain.'
  },
  {
    type: 'pool',
    icon: '📋',
    label: 'Email Pool',
    desc: 'Use your own list of emails. One registration per email in the list.'
  }
];

export function renderProfileEditor({ profile, providerHints, mode }: ProfileEditorProps): string {
  const isEdit = mode === 'edit';
  const title = isEdit ? 'Edit Profile' : 'New IMAP Profile';
  
  const currentStrategy = profile?.strategy?.type || 'single';
  const currentDomain = profile?.strategy?.domain || '';
  const emails = profile?.strategy?.emails || [];
  
  return `
    <div class="profile-editor" id="profileEditor">
      <div class="editor-header">
        <button class="overlay-back" onclick="closeProfileEditor()">
          ${ICONS.chevronLeft} Back
        </button>
        <span class="editor-title">${title}</span>
      </div>
      
      <div class="editor-content">
        <!-- Profile Name -->
        <div class="form-group">
          <label class="form-label">Profile Name</label>
          <input type="text" 
                 class="form-input" 
                 id="profileName" 
                 placeholder="e.g., Gmail Personal"
                 value="${escapeHtml(profile?.name || '')}">
        </div>
        
        <!-- IMAP Settings -->
        <div class="form-section">
          <div class="form-section-title">IMAP Connection</div>
          
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" 
                   class="form-input" 
                   id="imapUser" 
                   placeholder="your@email.com"
                   value="${escapeHtml(profile?.imap?.user || '')}"
                   oninput="onEmailInput(this.value)">
            <div class="form-hint" id="providerHint"></div>
          </div>
          
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">IMAP Server</label>
              <input type="text" 
                     class="form-input" 
                     id="imapServer" 
                     placeholder="imap.gmail.com"
                     value="${escapeHtml(profile?.imap?.server || '')}">
            </div>
            <div class="form-group flex-1">
              <label class="form-label">Port</label>
              <input type="number" 
                     class="form-input" 
                     id="imapPort" 
                     placeholder="993"
                     value="${profile?.imap?.port || 993}">
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="password-input-wrapper">
              <input type="password" 
                     class="form-input" 
                     id="imapPassword" 
                     placeholder="••••••••"
                     value="${escapeHtml(profile?.imap?.password || '')}">
              <button class="password-toggle" onclick="togglePasswordVisibility('imapPassword')">
                ${ICONS.eye}
              </button>
            </div>
            <div class="form-hint">For Gmail, use App Password. For others, use your email password.</div>
          </div>
          
          <button class="btn btn-secondary" onclick="testImapConnection()">
            🔌 Test Connection
          </button>
        </div>
        
        <!-- Email Strategy -->
        <div class="form-section">
          <div class="form-section-title">Email Strategy</div>
          <div class="form-section-desc">How to generate emails for registration</div>
          
          <div class="strategy-selector" id="strategySelector">
            ${STRATEGY_OPTIONS.map(opt => `
              <div class="strategy-option ${currentStrategy === opt.type ? 'selected' : ''}"
                   data-strategy="${opt.type}"
                   onclick="selectStrategy('${opt.type}')">
                <div class="strategy-icon">${opt.icon}</div>
                <div class="strategy-content">
                  <div class="strategy-label">${opt.label}</div>
                  <div class="strategy-desc">${opt.desc}</div>
                </div>
                <div class="strategy-check">${ICONS.check}</div>
              </div>
            `).join('')}
          </div>
          
          <!-- Catch-All Domain Input -->
          <div class="strategy-config" id="catchAllConfig" style="display: ${currentStrategy === 'catch_all' ? 'block' : 'none'}">
            <div class="form-group">
              <label class="form-label">Domain for catch-all</label>
              <input type="text" 
                     class="form-input" 
                     id="catchAllDomain" 
                     placeholder="your-domain.com"
                     value="${escapeHtml(currentDomain)}">
              <div class="form-hint">All emails to *@this-domain will arrive in your IMAP inbox</div>
            </div>
          </div>
          
          <!-- Email Pool Editor -->
          <div class="strategy-config" id="poolConfig" style="display: ${currentStrategy === 'pool' ? 'block' : 'none'}">
            <div class="form-group">
              <label class="form-label">Email List</label>
              <div class="email-pool-editor">
                <div class="pool-list" id="poolList">
                  ${emails.map((e, i) => renderPoolItem(e.email, e.status, i)).join('')}
                </div>
                <div class="pool-add">
                  <input type="email" 
                         class="form-input" 
                         id="newPoolEmail" 
                         placeholder="Add email..."
                         onkeypress="if(event.key==='Enter') addEmailToPool()">
                  <button class="btn btn-secondary" onclick="addEmailToPool()">
                    ${ICONS.plus}
                  </button>
                </div>
                <div class="pool-actions">
                  <button class="btn btn-secondary" onclick="importEmailsFromFile()">
                    📁 Import from file
                  </button>
                  <button class="btn btn-secondary" onclick="pasteEmails()">
                    📋 Paste list
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeProfileEditor()">Cancel</button>
        <button class="btn btn-primary" onclick="saveProfile('${profile?.id || ''}')">
          ${isEdit ? 'Save Changes' : 'Create Profile'}
        </button>
      </div>
    </div>
  `;
}

function renderPoolItem(email: string, status: string, index: number): string {
  const statusIcon = status === 'used' ? '✅' : status === 'failed' ? '❌' : '⬜';
  const statusClass = status === 'used' ? 'used' : status === 'failed' ? 'failed' : 'pending';
  
  return `
    <div class="pool-item ${statusClass}" data-index="${index}">
      <span class="pool-status">${statusIcon}</span>
      <span class="pool-email">${escapeHtml(email)}</span>
      <button class="pool-remove" onclick="removeEmailFromPool(${index})" ${status === 'used' ? 'disabled' : ''}>
        ${ICONS.x}
      </button>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Export for use in scripts
export const profileEditorScripts = `
  let currentPoolEmails = [];
  
  function onEmailInput(email) {
    // Auto-detect provider and suggest settings
    vscode.postMessage({ type: 'detectProvider', email });
  }
  
  function selectStrategy(strategy) {
    document.querySelectorAll('.strategy-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.strategy === strategy);
    });
    
    // Show/hide strategy-specific config
    document.getElementById('catchAllConfig').style.display = strategy === 'catch_all' ? 'block' : 'none';
    document.getElementById('poolConfig').style.display = strategy === 'pool' ? 'block' : 'none';
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
    list.innerHTML = currentPoolEmails.map((email, i) => 
      '<div class="pool-item pending" data-index="' + i + '">' +
        '<span class="pool-status">⬜</span>' +
        '<span class="pool-email">' + email + '</span>' +
        '<button class="pool-remove" onclick="removeEmailFromPool(' + i + ')">✕</button>' +
      '</div>'
    ).join('');
  }
  
  function importEmailsFromFile() {
    vscode.postMessage({ type: 'importEmailsFromFile' });
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
  
  function testImapConnection() {
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
    
    const selectedStrategy = document.querySelector('.strategy-option.selected');
    const strategyType = selectedStrategy?.dataset.strategy || 'single';
    
    const strategy = { type: strategyType };
    
    if (strategyType === 'catch_all') {
      strategy.domain = document.getElementById('catchAllDomain').value.trim();
    } else if (strategyType === 'pool') {
      strategy.emails = currentPoolEmails.map(email => ({ email, status: 'pending' }));
    }
    
    vscode.postMessage({
      type: existingId ? 'updateProfile' : 'createProfile',
      data: {
        id: existingId || undefined,
        name: name || 'Unnamed Profile',
        imap: { server, user, password, port },
        strategy
      }
    });
  }
  
  function closeProfileEditor() {
    vscode.postMessage({ type: 'closeProfileEditor' });
  }
`;
