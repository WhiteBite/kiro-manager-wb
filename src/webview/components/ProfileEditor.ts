/**
 * Profile Editor & Profiles Panel Components
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface ProfileEditorProps {
  t: Translations;
  inline?: boolean; // Render for tab navigation (no overlay wrapper)
}

function renderProfilesPanel(t: Translations): string {
  return `
    <div class="profiles-panel" id="profilesPanel">
      <div class="profiles-panel-header">
        <button class="overlay-back" onclick="closeProfilesPanel()">← ${t.back}</button>
        <span class="profiles-panel-title">${t.emailProfiles}</span>
      </div>
      <div class="profiles-panel-content" id="profilesContent">
        <div class="profiles-empty">
          <div class="empty-icon">📧</div>
          <div class="empty-text">${t.noProfiles}</div>
          <button class="btn btn-primary" onclick="createProfile()">
            ${ICONS.plus} ${t.addProfile}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderStrategySelector(t: Translations): string {
  return `
    <div class="strategy-selector">
      <div class="strategy-option selected" data-strategy="single" onclick="selectStrategy('single')">
        <div class="strategy-icon">📧</div>
        <div class="strategy-content">
          <div class="strategy-label">${t.strategySingleName}</div>
          <div class="strategy-desc">${t.strategySingleDesc}</div>
          <div class="strategy-example">${t.example}: ${t.strategySingleExample}</div>
        </div>
        <div class="strategy-check">✓</div>
      </div>
      <div class="strategy-option" data-strategy="plus_alias" onclick="selectStrategy('plus_alias')">
        <div class="strategy-icon">➕</div>
        <div class="strategy-content">
          <div class="strategy-label">${t.strategyPlusAliasName}</div>
          <div class="strategy-desc">${t.strategyPlusAliasDesc}</div>
          <div class="strategy-example">${t.example}: ${t.strategyPlusAliasExample}</div>
        </div>
        <div class="strategy-check">✓</div>
      </div>
      <div class="strategy-option" data-strategy="catch_all" onclick="selectStrategy('catch_all')">
        <div class="strategy-icon">🌐</div>
        <div class="strategy-content">
          <div class="strategy-label">${t.strategyCatchAllName}</div>
          <div class="strategy-desc">${t.strategyCatchAllDesc}</div>
          <div class="strategy-example">${t.example}: ${t.strategyCatchAllExample}</div>
        </div>
        <div class="strategy-check">✓</div>
      </div>
      <div class="strategy-option" data-strategy="pool" onclick="selectStrategy('pool')">
        <div class="strategy-icon">📋</div>
        <div class="strategy-content">
          <div class="strategy-label">${t.strategyPoolName}</div>
          <div class="strategy-desc">${t.strategyPoolDesc}</div>
        </div>
        <div class="strategy-check">✓</div>
      </div>
    </div>
    
    <div class="strategy-config" id="catchAllConfig" style="display: none;">
      <div class="config-hint">${t.strategyCatchAllHint}</div>
      <div class="form-group">
        <label class="form-label">${t.strategyCatchAllDomain}</label>
        <input type="text" class="form-input" id="catchAllDomain" placeholder="your-domain.com">
      </div>
    </div>
    
    <div class="strategy-config" id="poolConfig" style="display: none;">
      <div class="config-hint">${t.strategyPoolHint}</div>
      <div class="email-pool-editor">
        <div class="pool-stats" id="poolStats"></div>
        <div class="pool-list" id="poolList"></div>
        <div class="pool-add">
          <input type="text" class="form-input" id="newPoolEmail" placeholder="${t.strategyPoolAdd}" onkeypress="if(event.key==='Enter') addEmailToPool()" onpaste="handlePoolPaste(event)">
          <button class="btn btn-secondary" onclick="addEmailToPool()">${ICONS.plus}</button>
        </div>
        <div class="pool-actions">
          <button class="btn btn-secondary" onclick="importEmailsFromFile()">📁 ${t.strategyPoolFromFile}</button>
          <button class="btn btn-secondary" onclick="pasteEmails()">📋 ${t.strategyPoolPaste}</button>
        </div>
      </div>
    </div>
  `;
}

function renderProfilesList(t: Translations): string {
  return `
    <div class="profiles-list-container" id="profilesListContainer">
      <div class="profiles-header">
        <h3 class="profiles-title">${t.emailProfiles}</h3>
        <button class="btn btn-primary btn-sm" onclick="createProfile()">
          ${ICONS.plus} ${t.addProfile}
        </button>
      </div>
      <div class="profiles-content" id="profilesContent">
        <div class="profiles-empty">
          <div class="empty-icon">📧</div>
          <div class="empty-text">${t.noProfiles}</div>
          <button class="btn btn-primary" onclick="createProfile()">
            ${ICONS.plus} ${t.addProfile}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderEditorForm(t: Translations): string {
  return `
    <div class="profile-editor-form" id="profileEditorForm" style="display: none;">
      <div class="editor-header">
        <button class="btn btn-secondary btn-sm" onclick="closeProfileEditor()">← ${t.back}</button>
        <span class="editor-title">${t.newProfile}</span>
      </div>
      <div class="editor-content">
        <div class="form-group">
          <label class="form-label">${t.profileName}</label>
          <input type="text" class="form-input" id="profileName" placeholder="${t.profileNamePlaceholder}">
        </div>
        
        <div class="form-section" id="imapSection">
          <div class="form-section-title">IMAP</div>
          <div class="form-group" id="imapEmailGroup">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="imapUser" placeholder="your@email.com" oninput="onEmailInput(this.value)">
            <div class="form-hint" id="providerHint"></div>
          </div>
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">${t.server}</label>
              <input type="text" class="form-input" id="imapServer" placeholder="imap.gmail.com">
            </div>
            <div class="form-group flex-1">
              <label class="form-label">${t.port}</label>
              <input type="number" class="form-input" id="imapPort" value="993">
            </div>
          </div>
          <div class="form-group" id="imapPasswordGroup">
            <label class="form-label">${t.password}</label>
            <div class="password-input-wrapper">
              <input type="password" class="form-input" id="imapPassword" placeholder="••••••••">
              <button class="password-toggle" onclick="togglePasswordVisibility('imapPassword')">${ICONS.eye || '👁'}</button>
            </div>
          </div>
          <button class="btn btn-secondary" id="testConnectionBtn" onclick="testImapConnection()">🔌 ${t.testConnection}</button>
        </div>
        
        <div class="form-section" id="proxySection">
          <div class="form-section-title">${t.proxySettings}</div>
          <div class="form-section-desc">${t.proxySettingsDesc}</div>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" id="proxyEnabled" onchange="toggleProxyFields()">
              <span class="toggle-text">${t.proxyEnabled}</span>
            </label>
          </div>
          <div class="form-group proxy-fields" id="proxyFields" style="display: none;">
            <label class="form-label">${t.proxyUrl}</label>
            <textarea class="form-input form-textarea" id="proxyUrls" rows="4" placeholder="${t.proxyUrlPlaceholder}"></textarea>
            <div class="form-hint">${t.proxyUrlHint}</div>
            <div class="proxy-stats" id="proxyStats"></div>
          </div>
        </div>
        
        <div class="form-section">
          <div class="form-section-title">${t.emailStrategy}</div>
          <div class="form-section-desc">${t.emailStrategyDesc}</div>
          ${renderStrategySelector(t)}
        </div>
      </div>
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeProfileEditor()">${t.cancel}</button>
        <button class="btn btn-primary" onclick="saveProfile()">${t.save}</button>
      </div>
    </div>
  `;
}

export function renderProfileEditor({ t, inline = false }: ProfileEditorProps): string {
  if (inline) {
    // Tab mode: profiles list + inline editor
    return `
      <div class="profiles-tab">
        ${renderProfilesList(t)}
        ${renderEditorForm(t)}
      </div>
    `;
  }

  // Legacy overlay mode
  return `
    ${renderProfilesPanel(t)}
    
    <div class="profile-editor" id="profileEditor">
      <div class="editor-header">
        <button class="overlay-back" onclick="closeProfileEditor()">← ${t.back}</button>
        <span class="editor-title">${t.newProfile}</span>
      </div>
      <div class="editor-content">
        <div class="form-group">
          <label class="form-label">${t.profileName}</label>
          <input type="text" class="form-input" id="profileName" placeholder="${t.profileNamePlaceholder}">
        </div>
        
        <div class="form-section" id="imapSection">
          <div class="form-section-title">IMAP</div>
          <div class="form-group" id="imapEmailGroup">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="imapUser" placeholder="your@email.com" oninput="onEmailInput(this.value)">
            <div class="form-hint" id="providerHint"></div>
          </div>
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">${t.server}</label>
              <input type="text" class="form-input" id="imapServer" placeholder="imap.gmail.com">
            </div>
            <div class="form-group flex-1">
              <label class="form-label">${t.port}</label>
              <input type="number" class="form-input" id="imapPort" value="993">
            </div>
          </div>
          <div class="form-group" id="imapPasswordGroup">
            <label class="form-label">${t.password}</label>
            <div class="password-input-wrapper">
              <input type="password" class="form-input" id="imapPassword" placeholder="••••••••">
              <button class="password-toggle" onclick="togglePasswordVisibility('imapPassword')">${ICONS.eye || '👁'}</button>
            </div>
          </div>
          <button class="btn btn-secondary" id="testConnectionBtn" onclick="testImapConnection()">🔌 ${t.testConnection}</button>
        </div>
        
        <div class="form-section" id="proxySection">
          <div class="form-section-title">${t.proxySettings}</div>
          <div class="form-section-desc">${t.proxySettingsDesc}</div>
          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" id="proxyEnabled" onchange="toggleProxyFields()">
              <span class="toggle-text">${t.proxyEnabled}</span>
            </label>
          </div>
          <div class="form-group proxy-fields" id="proxyFields" style="display: none;">
            <label class="form-label">${t.proxyUrl}</label>
            <textarea class="form-input form-textarea" id="proxyUrls" rows="4" placeholder="${t.proxyUrlPlaceholder}"></textarea>
            <div class="form-hint">${t.proxyUrlHint}</div>
            <div class="proxy-stats" id="proxyStats"></div>
          </div>
        </div>
        
        <div class="form-section">
          <div class="form-section-title">${t.emailStrategy}</div>
          <div class="form-section-desc">${t.emailStrategyDesc}</div>
          ${renderStrategySelector(t)}
        </div>
      </div>
      <div class="editor-footer">
        <button class="btn btn-secondary" onclick="closeProfileEditor()">${t.cancel}</button>
        <button class="btn btn-primary" onclick="saveProfile()">${t.save}</button>
      </div>
    </div>
  `;
}
