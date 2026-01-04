/**
 * Auto-Registration Controls Component
 * Compact iOS-style segmented control with inline actions
 */

import { Translations } from '../i18n/types';

export interface AutoRegControlsProps {
  isRunning: boolean;
  t: Translations;
  strategy?: 'automated' | 'webview';
}

export function renderAutoRegControls({ isRunning, t, strategy = 'automated' }: AutoRegControlsProps): string {
  if (isRunning) {
    return `
      <div class="autoreg-controls running">
        <button class="btn btn-danger btn-icon" onclick="stopAutoReg()" title="${t.stop || 'Stop'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>
          <span class="btn-text">${t.stop || 'Stop'}</span>
        </button>
        <button class="btn btn-secondary btn-icon" onclick="togglePauseAutoReg()" title="${t.pause || 'Pause'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          <span class="btn-text">${t.pause || 'Pause'}</span>
        </button>
      </div>
    `;
  }

  const isAuto = strategy === 'automated';

  return `
    <div class="autoreg-controls">
      <div class="strategy-switch" title="${t.registrationStrategyDesc || 'Registration method'}">
        <button class="strategy-sw-btn ${isAuto ? 'active' : ''}" onclick="selectRegistrationStrategy('automated')" title="${t.strategyAutomatedFeature1 || 'Fully automatic'}">
          <span class="sw-icon">🤖</span><span class="sw-label">${t.auto || 'Auto'}</span>
        </button>
        <button class="strategy-sw-btn ${!isAuto ? 'active' : ''}" onclick="selectRegistrationStrategy('webview')" title="${t.strategyWebViewFeature1 || 'Manual input, low ban risk'}">
          <span class="sw-icon">🌐</span><span class="sw-label">${t.manual || 'Manual'}</span>
        </button>
      </div>
      <input type="number" id="regCountInput" class="autoreg-count" value="1" min="1" max="100" title="${t.autoRegCountLabel || 'Count'}">
      <button class="btn btn-primary btn-start" onclick="startAutoReg()" title="${t.autoRegTip || t.autoReg}">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        <span class="btn-text">${t.autoReg}</span>
      </button>
    </div>
  `;
}
