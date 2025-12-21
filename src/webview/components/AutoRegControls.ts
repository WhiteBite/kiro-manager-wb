/**
 * Auto-Registration Controls Component
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface AutoRegControlsProps {
  isRunning: boolean;
  t: Translations;
}

export function renderAutoRegControls({ isRunning, t }: AutoRegControlsProps): string {
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

  return `
    <div class="autoreg-controls">
      <div class="form-group">
        <label for="regCountInput">${t.autoRegCountLabel || 'Count'}</label>
        <input type="number" id="regCountInput" class="form-control" value="1" min="1" max="100" placeholder="${t.autoRegCountPlaceholder || '1'}">
      </div>
      <button class="btn btn-primary pulse" onclick="startAutoReg()" title="${t.autoRegTip || t.autoReg}">
        ▶️ <span class="btn-text">${t.autoReg}</span>
      </button>
    </div>
  `;
}
