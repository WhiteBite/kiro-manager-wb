/**
 * LLM Settings Component
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface LLMSettingsProps {
  t: Translations;
}

export function renderLLMSettings({ t }: LLMSettingsProps): string {
  return `
    <div class="settings-content">
      <div class="settings-card collapsed">
        <div class="settings-card-header" onclick="toggleSettingsCard(this, event)">
          <span class="settings-card-icon">🤖</span>
          <span class="settings-card-title">${t.llmServer}</span>
          <div class="llm-status-badge">
             <span id="llmServerStatus" class="patch-status">${t.serverStatusStopped}</span>
          </div>
          <span class="settings-card-toggle">${ICONS.chevronLeft}</span>
        </div>
        <div class="settings-card-body">
          <p class="setting-desc" style="margin-bottom: 12px;">${t.llmServerDesc}</p>
          <div class="danger-zone-actions">
            <button id="llmStartBtn" class="btn btn-primary btn-sm" onclick="startLLMServer()">${t.startServer}</button>
            <button id="llmStopBtn" class="btn btn-danger btn-sm" onclick="stopLLMServer()">${t.stopServer}</button>
            <button id="llmRestartBtn" class="btn btn-secondary btn-sm" onclick="restartLLMServer()">${t.restartServer}</button>
          </div>
        </div>
      </div>

      <div class="settings-card collapsed">
        <div class="settings-card-header" onclick="toggleSettingsCard(this, event)">
          <span class="settings-card-icon">⚙️</span>
          <span class="settings-card-title">${t.llmSettings}</span>
          <span class="settings-card-toggle">${ICONS.chevronLeft}</span>
        </div>
        <div class="settings-card-body">
          <div class="form-group">
            <label class="form-label" for="llmBaseUrl">${t.llmBaseUrl}</label>
            <input type="text" id="llmBaseUrl" class="form-input" placeholder="http://127.0.0.1">
          </div>
          <div class="form-group">
            <label class="form-label" for="llmPort">${t.llmPort}</label>
            <input type="number" id="llmPort" class="form-input" placeholder="8421">
          </div>
          <div class="form-group">
            <label class="form-label" for="llmApiKey">${t.llmApiKey}</label>
            <input type="password" id="llmApiKey" class="form-input">
            <p class="setting-desc">${t.llmApiKeyDesc}</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="llmModel">${t.llmModel}</label>
            <select id="llmModel" class="form-input">
              <option value="claude-sonnet-4-20250514">claude-sonnet-4-20250514 (1.3x)</option>
              <option value="claude-sonnet-4.5">claude-sonnet-4.5 (1.3x)</option>
              <option value="claude-opus-4.5">claude-opus-4.5 (2.2x)</option>
              <option value="claude-haiku-4.5">claude-haiku-4.5 (0.4x)</option>
              <option value="auto">auto (1x)</option>
            </select>
            <p class="setting-desc">${t.llmModelDesc}</p>
          </div>
          <div class="setting-row">
            <button class="btn btn-primary btn-full" onclick="saveLLMSettings()">${t.save}</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
