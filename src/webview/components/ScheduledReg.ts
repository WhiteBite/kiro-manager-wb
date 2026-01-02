/**
 * Batch Registration Component
 * 
 * Simplified UX for registering multiple accounts.
 * - Quick single registration with auto-generated name
 * - Batch mode with count and interval
 * - No confusing toggles or templates
 */

import { Translations } from '../i18n/types';

export interface ScheduledRegSettings {
  // Legacy fields (kept for compatibility)
  enabled: boolean;
  loginTemplate: string;
  currentNumber: number;
  // Active fields
  interval: number; // minutes between registrations
  maxAccounts: number; // total to register
  registeredCount: number; // completed
  isRunning: boolean;
  nextRunAt?: string; // ISO timestamp for countdown
  // New fields
  useCustomName: boolean; // false = auto-generate realistic names
  customNamePrefix: string; // prefix for custom names
}

export interface ScheduledRegProps {
  settings: ScheduledRegSettings;
  t: Translations;
  collapsed?: boolean;
}

// Realistic name generator
const FIRST_NAMES = [
  'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Parker', 'Blake'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green'
];

function generateRandomName(): string {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function generatePreviewNames(count: number = 3): string[] {
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    names.push(generateRandomName());
  }
  return names;
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

export function renderScheduledReg({ settings, t, collapsed = false }: ScheduledRegProps): string {
  const {
    interval,
    maxAccounts,
    registeredCount,
    isRunning,
    nextRunAt,
    useCustomName = false,
    customNamePrefix = ''
  } = settings;

  const progress = maxAccounts > 0 ? Math.min(100, (registeredCount / maxAccounts) * 100) : 0;
  const timeRemaining = formatTimeRemaining(nextRunAt);
  const isComplete = maxAccounts > 0 && registeredCount >= maxAccounts;
  const remaining = Math.max(0, maxAccounts - registeredCount);

  // Preview names
  const previewNames = useCustomName && customNamePrefix
    ? [`${customNamePrefix} 1`, `${customNamePrefix} 2`, `${customNamePrefix} 3`]
    : generatePreviewNames(3);

  return `
    <div class="batch-reg-card ${isRunning ? 'running' : ''}" id="scheduledRegCard">
      <div class="batch-reg-header">
        <div class="batch-reg-title">
          <span class="batch-reg-icon">${isRunning ? '🔄' : '📋'}</span>
          <span>${t.batchRegistration || 'Batch Registration'}</span>
          ${isRunning ? `<span class="batch-reg-badge running">${t.running || 'Running'}</span>` : ''}
          ${isComplete ? `<span class="batch-reg-badge complete">✓</span>` : ''}
        </div>
      </div>
      
      <div class="batch-reg-body">
        <!-- Quick Stats when running -->
        ${isRunning ? `
          <div class="batch-reg-status">
            <div class="batch-reg-progress-ring">
              <svg viewBox="0 0 36 36">
                <path class="progress-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                <path class="progress-fill" stroke-dasharray="${progress}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              </svg>
              <div class="progress-text">${registeredCount}/${maxAccounts}</div>
            </div>
            <div class="batch-reg-status-info">
              <div class="status-line">
                <span class="status-label">${t.completed || 'Completed'}:</span>
                <span class="status-value">${registeredCount}</span>
              </div>
              <div class="status-line">
                <span class="status-label">${t.remaining || 'Remaining'}:</span>
                <span class="status-value">${remaining}</span>
              </div>
              ${interval > 0 ? `
                <div class="status-line timer">
                  <span class="status-label">${t.nextIn || 'Next in'}:</span>
                  <span class="status-value timer-value" id="scheduledRegTimer">${timeRemaining}</span>
                </div>
              ` : ''}
            </div>
          </div>
          
          <button class="btn btn-danger btn-block" onclick="stopScheduledReg()">
            ⏹ ${t.stopRegistration || 'Stop Registration'}
          </button>
        ` : `
          <!-- Settings when not running -->
          <div class="batch-reg-settings">
            <!-- Count -->
            <div class="batch-reg-field">
              <label>${t.accountsToRegister || 'Accounts to register'}</label>
              <div class="batch-reg-count-group">
                <button class="count-btn" onclick="adjustBatchCount(-1)" ${maxAccounts <= 1 ? 'disabled' : ''}>−</button>
                <input type="number" class="count-input" id="maxAccountsInput"
                  value="${maxAccounts || 5}" min="1" max="100"
                  onchange="updateScheduledRegSetting('maxAccounts', parseInt(this.value))">
                <button class="count-btn" onclick="adjustBatchCount(1)" ${maxAccounts >= 100 ? 'disabled' : ''}>+</button>
              </div>
            </div>

            <!-- Interval -->
            <div class="batch-reg-field">
              <label>${t.intervalBetween || 'Interval between registrations'}</label>
              <div class="batch-reg-interval-pills">
                <button class="interval-pill ${interval === 0 ? 'active' : ''}" onclick="setBatchInterval(0)">
                  ${t.noDelay || 'No delay'}
                </button>
                <button class="interval-pill ${interval === 5 ? 'active' : ''}" onclick="setBatchInterval(5)">
                  5m
                </button>
                <button class="interval-pill ${interval === 15 ? 'active' : ''}" onclick="setBatchInterval(15)">
                  15m
                </button>
                <button class="interval-pill ${interval === 30 ? 'active' : ''}" onclick="setBatchInterval(30)">
                  30m
                </button>
                <button class="interval-pill ${interval === 60 ? 'active' : ''}" onclick="setBatchInterval(60)">
                  1h
                </button>
              </div>
              ${interval === 0 ? `
                <div class="batch-reg-hint">${t.noDelayHint || 'Registrations will run one after another'}</div>
              ` : `
                <div class="batch-reg-hint">${t.withDelayHint || 'Safer for avoiding rate limits'}</div>
              `}
            </div>

            <!-- Name Mode -->
            <div class="batch-reg-field">
              <label>${t.accountNames || 'Account names'}</label>
              <div class="batch-reg-name-mode">
                <label class="name-mode-option ${!useCustomName ? 'active' : ''}">
                  <input type="radio" name="nameMode" value="auto" ${!useCustomName ? 'checked' : ''}
                    onchange="updateScheduledRegSetting('useCustomName', false)">
                  <span class="name-mode-label">
                    <span class="name-mode-title">🎲 ${t.randomNames || 'Random names'}</span>
                    <span class="name-mode-desc">${t.randomNamesDesc || 'Realistic first + last names'}</span>
                  </span>
                </label>
                <label class="name-mode-option ${useCustomName ? 'active' : ''}">
                  <input type="radio" name="nameMode" value="custom" ${useCustomName ? 'checked' : ''}
                    onchange="updateScheduledRegSetting('useCustomName', true)">
                  <span class="name-mode-label">
                    <span class="name-mode-title">✏️ ${t.customPrefix || 'Custom prefix'}</span>
                    <span class="name-mode-desc">${t.customPrefixDesc || 'Your prefix + number'}</span>
                  </span>
                </label>
              </div>
              ${useCustomName ? `
                <input type="text" class="batch-reg-input" id="customNamePrefixInput"
                  value="${customNamePrefix}"
                  placeholder="${t.enterPrefix || 'Enter prefix (e.g. MyAcc)'}"
                  oninput="updateScheduledRegSetting('customNamePrefix', this.value)">
              ` : ''}
            </div>

            <!-- Preview -->
            <div class="batch-reg-preview">
              <span class="preview-label">${t.exampleNames || 'Example names'}:</span>
              <div class="preview-names">
                ${previewNames.map(name => `<span class="preview-name">${name}</span>`).join('')}
              </div>
            </div>
          </div>

          <!-- Start Button -->
          <button class="btn btn-primary btn-block btn-large" onclick="startScheduledReg()">
            ▶ ${t.startBatchReg || 'Start Registration'} (${maxAccounts} ${t.accounts || 'accounts'})
          </button>
        `}
      </div>
    </div>
  `;
}
