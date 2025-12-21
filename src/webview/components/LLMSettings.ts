/**
 * LLM Settings Component
 */

import { Translations } from '../i18n/types';

export interface LLMSettingsProps {
  t: Translations;
}

export function renderLLMSettings({ t }: LLMSettingsProps): string {
  return `
    <div class="settings-content">
      <div class="settings-card">
        <div class="settings-card-header">
          <h3 class="settings-card-title">${t.llmServer}</h3>
        </div>
        <div class="settings-card-body">
          <p class="setting-desc">${t.llmServerDesc}</p>
          <div class="setting-row">
            <div class="setting-label">${t.serverStatus}</div>
            <div class="setting-control">
              <span id="llmServerStatus" class="patch-status">${t.serverStatusStopped}</span>
            </div>
          </div>
          <div class="danger-zone-actions">
            <button class="btn btn-primary" onclick="startLLMServer()">${t.startServer}</button>
            <button class="btn btn-danger" onclick="stopLLMServer()">${t.stopServer}</button>
            <button class="btn btn-secondary" onclick="restartLLMServer()">${t.restartServer}</button>
          </div>
        </div>
      </div>

      <div class="settings-card">
        <div class="settings-card-header">
          <h3 class="settings-card-title">${t.llmSettings}</h3>
        </div>
        <div class="settings-card-body">
          <div class="form-group">
            <label for="llmBaseUrl">${t.llmBaseUrl}</label>
            <input type="text" id="llmBaseUrl" class="form-control" placeholder="http://127.0.0.1">
          </div>
          <div class="form-group">
            <label for="llmPort">${t.llmPort}</label>
            <input type="number" id="llmPort" class="form-control" placeholder="8421">
          </div>
          <div class="form-group">
            <label for="llmApiKey">${t.llmApiKey}</label>
            <input type="password" id="llmApiKey" class="form-control">
            <p class="setting-desc">${t.llmApiKeyDesc}</p>
          </div>
          <div class="form-group">
            <label for="llmModel">${t.llmModel}</label>
            <input type="text" id="llmModel" class="form-control" placeholder="claude-sonnet-4-20250514">
             <p class="setting-desc">${t.llmModelDesc}</p>
          </div>
        </div>
        <div class="settings-card-footer">
            <button class="btn btn-primary" onclick="saveLLMSettings()">${t.save}</button>
        </div>
      </div>
    </div>
  `;
}
