/**
 * Auto-Registration Controls Component
 */

import { ICONS } from '../icons';
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
        <button class="btn btn-danger" onclick="stopAutoReg()" title="${t.stop || 'Stop'}">
          ⏹ <span class="btn-text">${t.stop || 'Stop'}</span>
        </button>
        <button class="btn btn-secondary" onclick="togglePauseAutoReg()" title="${t.pause || 'Pause'}">
          ⏸ <span class="btn-text">${t.pause || 'Pause'}</span>
        </button>
      </div>
    `;
  }

  const isAuto = strategy === 'automated';

  return `
    <div class="autoreg-controls">
      <div class="autoreg-row">
        <div class="strategy-switch" title="${t.registrationStrategyDesc || 'Registration method'}">
          <button class="strategy-sw-btn ${isAuto ? 'active' : ''}" onclick="selectRegistrationStrategy('automated')" title="${t.strategyAutomatedFeature1 || 'Fully automatic'}">
            🤖 ${t.auto || 'Auto'}
          </button>
          <button class="strategy-sw-btn ${!isAuto ? 'active' : ''}" onclick="selectRegistrationStrategy('webview')" title="${t.strategyWebViewFeature1 || 'Manual input, low ban risk'}">
            🌐 ${t.manual || 'Manual'}
          </button>
        </div>
        <span class="strategy-hint ${isAuto ? 'high' : 'low'}" title="${isAuto ? (t.highBanRisk || 'High ban risk') : (t.lowBanRisk || 'Low ban risk')}">${isAuto ? '⚠' : '✓'}</span>
        <div class="form-group compact">
          <input type="number" id="regCountInput" class="form-control" value="1" min="1" max="100" title="${t.autoRegCountLabel || 'Count'}">
        </div>
        <button class="btn btn-primary pulse" onclick="startAutoReg()" title="${t.autoRegTip || t.autoReg}">
          ▶️ <span class="btn-text">${t.autoReg}</span>
        </button>
      </div>
    </div>
  `;
}
