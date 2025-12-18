/**
 * Floating Action Button Component for Auto-Registration
 * Only visible on Accounts tab
 */

import { ICONS } from '../icons';
import { Translations } from '../i18n/types';

export interface FABProps {
  isRunning: boolean;
  t: Translations;
}

export function renderFAB({ isRunning, t }: FABProps): string {
  // FAB is hidden by default, shown only on accounts tab via JS
  if (isRunning) {
    return `
      <div class="fab-container running" id="fabContainer">
        <button class="fab fab-stop" onclick="stopAutoReg()" title="${t.stop || 'Stop'}">
          <span class="fab-icon">⏹</span>
        </button>
        <button class="fab fab-pause" onclick="togglePauseAutoReg()" title="${t.pause || 'Pause'}">
          <span class="fab-icon">⏸</span>
        </button>
        <div class="fab-status">
          <span class="spinner"></span>
          <span class="fab-status-text">${t.running}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="fab-container" id="fabContainer">
      <button class="fab fab-primary pulse" onclick="startAutoReg()" title="${t.autoReg}">
        <span class="fab-icon">${ICONS.bolt}</span>
      </button>
    </div>
  `;
}
