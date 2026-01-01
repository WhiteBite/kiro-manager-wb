/**
 * Scheduled Registration Component
 * 
 * Allows users to set up automatic account registration at intervals.
 * Features:
 * - Custom login name template with {N} placeholder
 * - Configurable interval (15/30/60 min or no timer)
 * - Progress tracking with upcoming names preview
 * - Start/Stop controls
 */

import { Translations } from '../i18n/types';

export interface ScheduledRegSettings {
  enabled: boolean;
  loginTemplate: string;
  currentNumber: number;
  interval: number; // minutes, 0 = no timer (manual trigger)
  maxAccounts: number;
  registeredCount: number;
  isRunning: boolean;
  nextRunAt?: string; // ISO timestamp
}

export interface ScheduledRegProps {
  settings: ScheduledRegSettings;
  t: Translations;
  collapsed?: boolean;
}

function formatTimeRemaining(nextRunAt: string | undefined): string {
  if (!nextRunAt) return '--:--';
  const now = Date.now();
  const next = new Date(nextRunAt).getTime();
  const diff = Math.max(0, next - now);
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function generatePreview(template: string, number: number): string {
  const padded = number.toString().padStart(3, '0');
  return template.replace('{N}', padded).replace('{n}', number.toString());
}

function generateUpcomingNames(template: string, startNum: number, count: number = 3): string[] {
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(generatePreview(template, startNum + i));
  }
  return names;
}

export function renderScheduledReg({ settings, t, collapsed = true }: ScheduledRegProps): string {
  const {
    enabled,
    loginTemplate,
    currentNumber,
    interval,
    maxAccounts,
    registeredCount,
    isRunning,
    nextRunAt
  } = settings;

  const template = loginTemplate || 'Account_{N}';
  const num = currentNumber || 1;
  const upcomingNames = generateUpcomingNames(template, num, 3);
  const progress = maxAccounts > 0 ? Math.min(100, (registeredCount / maxAccounts) * 100) : 0;
  const timeRemaining = formatTimeRemaining(nextRunAt);
  const isComplete = maxAccounts > 0 && registeredCount >= maxAccounts;
  const hasProgress = registeredCount > 0;

  // Interval labels
  const noTimerLabel = t.noTimer || 'No timer';
  const customLabel = t.custom || 'Custom';

  return `
    <div class="scheduled-reg-card ${collapsed ? 'collapsed' : ''}" id="scheduledRegCard">
      <div class="scheduled-reg-header" onclick="toggleScheduledReg()">
        <div class="scheduled-reg-title">
          <span class="scheduled-reg-icon">${isRunning ? '🔄' : '⏰'}</span>
          <span>${t.scheduledRegistration || 'Scheduled Registration'}</span>
          ${isRunning ? `<span class="scheduled-reg-badge running">${t.running || 'Running'}</span>` : ''}
          ${isComplete ? `<span class="scheduled-reg-badge complete">✓ ${t.complete || 'Complete'}</span>` : ''}
        </div>
        <div class="scheduled-reg-toggle-wrap">
          <label class="toggle" onclick="event.stopPropagation()">
            <input type="checkbox" id="scheduledRegEnabled" ${enabled ? 'checked' : ''} 
              onchange="toggleScheduledRegEnabled(this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="scheduled-reg-chevron">▼</span>
        </div>
      </div>
      
      <div class="scheduled-reg-body">
        <!-- Name Template with Preview -->
        <div class="scheduled-reg-row">
          <div class="scheduled-reg-field">
            <label class="scheduled-reg-label">${t.loginTemplate || 'Login Template'}</label>
            <input type="text" class="scheduled-reg-input" id="loginTemplateInput"
              value="${template}"
              placeholder="Account_{N}"
              onchange="updateScheduledRegSetting('loginTemplate', this.value)">
            <div class="scheduled-reg-hint">${t.loginTemplateHint || 'Use {N} for number (001, 002...)'}</div>
          </div>
          <div class="scheduled-reg-field small">
            <label class="scheduled-reg-label">${t.startFrom || 'Start #'}</label>
            <input type="number" class="scheduled-reg-input number" id="currentNumberInput"
              value="${num}" min="1" max="9999"
              onchange="updateScheduledRegSetting('currentNumber', parseInt(this.value))">
          </div>
        </div>

        <!-- Upcoming Names Preview -->
        <div class="scheduled-reg-preview-section">
          <span class="scheduled-reg-preview-label">${t.upcoming || 'Upcoming'}:</span>
          <div class="scheduled-reg-preview-names">
            ${upcomingNames.map((name, i) => `
              <span class="scheduled-reg-preview-name ${i === 0 ? 'next' : ''}">${name}</span>
            `).join('<span class="scheduled-reg-preview-arrow">→</span>')}
            <span class="scheduled-reg-preview-more">...</span>
          </div>
        </div>

        <!-- Interval & Max -->
        <div class="scheduled-reg-row">
          <div class="scheduled-reg-field">
            <label class="scheduled-reg-label">${t.interval || 'Interval'}</label>
            <div class="scheduled-reg-interval-group">
              <select class="scheduled-reg-select" id="intervalSelect"
                onchange="handleIntervalChange(this.value)">
                <option value="0" ${interval === 0 ? 'selected' : ''}>${noTimerLabel}</option>
                <option value="5" ${interval === 5 ? 'selected' : ''}>5 ${t.minutes || 'min'}</option>
                <option value="15" ${interval === 15 ? 'selected' : ''}>15 ${t.minutes || 'min'}</option>
                <option value="30" ${interval === 30 ? 'selected' : ''}>30 ${t.minutes || 'min'}</option>
                <option value="60" ${interval === 60 ? 'selected' : ''}>1 ${t.hour || 'hour'}</option>
                <option value="120" ${interval === 120 ? 'selected' : ''}>2 ${t.hours || 'hours'}</option>
                <option value="custom" ${![0, 5, 15, 30, 60, 120].includes(interval) && interval > 0 ? 'selected' : ''}>${customLabel}</option>
              </select>
              ${![0, 5, 15, 30, 60, 120].includes(interval) && interval > 0 ? `
                <input type="number" class="scheduled-reg-input number custom-interval" 
                  id="customIntervalInput" value="${interval}" min="1" max="1440"
                  onchange="updateScheduledRegSetting('interval', parseInt(this.value))">
                <span class="scheduled-reg-interval-unit">${t.minutes || 'min'}</span>
              ` : ''}
            </div>
            ${interval === 0 ? `<div class="scheduled-reg-hint">${t.noTimerHint || 'Click Start for each registration'}</div>` : ''}
          </div>
          <div class="scheduled-reg-field small">
            <label class="scheduled-reg-label">${t.maxAccounts || 'Limit'}</label>
            <input type="number" class="scheduled-reg-input number" id="maxAccountsInput"
              value="${maxAccounts || 10}" min="1" max="999"
              onchange="updateScheduledRegSetting('maxAccounts', parseInt(this.value))">
          </div>
        </div>

        <!-- Progress (only show if started) -->
        ${hasProgress || isRunning ? `
          <div class="scheduled-reg-progress-section">
            <div class="scheduled-reg-progress-header">
              <span class="scheduled-reg-progress-text">
                ${registeredCount}/${maxAccounts} ${t.accounts || 'accounts'}
              </span>
              ${interval > 0 && isRunning && !isComplete ? `
                <span class="scheduled-reg-timer">
                  <span class="timer-icon">⏱</span>
                  <span class="timer-value" id="scheduledRegTimer">${timeRemaining}</span>
                </span>
              ` : ''}
            </div>
            <div class="scheduled-reg-progress-bar">
              <div class="scheduled-reg-progress-fill ${isComplete ? 'complete' : ''}" style="width: ${progress}%"></div>
            </div>
          </div>
        ` : ''}

        <!-- Action Buttons -->
        <div class="scheduled-reg-actions">
          ${!isRunning ? `
            <button class="btn btn-primary scheduled-reg-btn" onclick="startScheduledReg()" ${!enabled ? 'disabled title="' + (t.enableFirst || 'Enable toggle first') + '"' : ''}>
              ▶ ${interval === 0 ? (t.registerOne || 'Register') : (t.startScheduled || 'Start')}
            </button>
          ` : `
            <button class="btn btn-danger scheduled-reg-btn" onclick="stopScheduledReg()">
              ⏹ ${t.stop || 'Stop'}
            </button>
          `}
          ${hasProgress ? `
            <button class="btn btn-secondary scheduled-reg-btn" onclick="resetScheduledReg()" 
              ${isRunning ? 'disabled' : ''} title="${t.resetProgress || 'Reset counter to start'}">
              ↺ ${t.reset || 'Reset'}
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}
