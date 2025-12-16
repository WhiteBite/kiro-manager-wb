/**
 * Hero Dashboard Component
 */

import { AccountInfo } from '../../types';
import { KiroUsageData } from '../../utils';
import { escapeHtml, getAccountEmail } from '../helpers';
import { Translations } from '../i18n/types';
import { RegProgress } from '../types';

export interface ImapProfile {
  id: string;
  name: string;
  imap?: {
    server?: string;
    user?: string;
    port?: number;
  };
  strategy?: {
    type: 'single' | 'catch_all' | 'pool';
    emails?: Array<{ email: string; status?: string }>;
  };
  stats?: {
    registered: number;
    failed: number;
  };
}

export interface HeroProps {
  activeAccount?: AccountInfo;
  activeProfile?: ImapProfile | null;
  usage?: KiroUsageData | null;
  progress: RegProgress | null;
  isRunning: boolean;
  t: Translations;
}

function getUsageClass(percent: number): string {
  if (percent < 80) return 'low';
  if (percent < 95) return 'medium';
  return 'high';
}

// Registration step definitions
const REG_STEPS = [
  { id: 'setup', icon: '⚙️', name: 'Setup' },
  { id: 'email', icon: '📧', name: 'Email' },
  { id: 'browser', icon: '🌐', name: 'Browser' },
  { id: 'signup', icon: '📝', name: 'Sign Up' },
  { id: 'verify', icon: '✉️', name: 'Verify' },
  { id: 'auth', icon: '🔐', name: 'Auth' },
  { id: 'token', icon: '🎫', name: 'Token' },
  { id: 'done', icon: '✅', name: 'Done' }
];

function renderStepIndicators(currentStep: number, totalSteps: number, error?: boolean): string {
  const steps = REG_STEPS.slice(0, totalSteps);

  return `
        <div class="step-indicators">
            ${steps.map((step, i) => {
    const stepNum = i + 1;
    let status = 'pending';
    if (stepNum < currentStep) status = 'done';
    else if (stepNum === currentStep) status = error ? 'error' : 'active';

    return `
                    <div class="step-indicator ${status}" title="${step.name}">
                        <span class="step-icon">${step.icon}</span>
                        <span class="step-dot"></span>
                    </div>
                `;
  }).join('<div class="step-line"></div>')}
        </div>
    `;
}

export function renderHero({ activeAccount, activeProfile, usage, progress, isRunning, t }: HeroProps): string {
  // Registration in progress
  if (isRunning && progress) {
    const percent = Math.round((progress.step / progress.totalSteps) * 100);
    const hasError = progress.detail?.toLowerCase().includes('error') ||
      progress.detail?.toLowerCase().includes('fail');

    return `
      <div class="hero progress">
        <div class="hero-header">
          <span class="hero-email">${escapeHtml(progress.stepName)}</span>
          <span class="hero-step">${progress.step}/${progress.totalSteps}</span>
        </div>
        ${renderStepIndicators(progress.step, progress.totalSteps, hasError)}
        <div class="hero-progress">
          <div class="hero-progress-fill ${hasError ? 'high' : 'low'}" style="width: ${percent}%"></div>
        </div>
        <div class="hero-stats">
          <span class="hero-usage ${hasError ? 'text-danger' : ''}">${escapeHtml(progress.detail || '')}</span>
          <span class="hero-percent">${percent}%</span>
        </div>
      </div>
    `;
  }

  // No active Kiro account - show IMAP profile if available
  if (!activeAccount) {
    // Show active IMAP profile info
    if (activeProfile) {
      const profileName = activeProfile.name || t.unnamed || 'Unnamed';
      const email = activeProfile.imap?.user || '';
      const strategyType = activeProfile.strategy?.type || 'single';
      const strategyIcon = strategyType === 'pool' ? '📦' : strategyType === 'catch_all' ? '🎯' : '📧';
      const registered = activeProfile.stats?.registered || 0;
      const failed = activeProfile.stats?.failed || 0;

      return `
        <div class="hero profile" onclick="openSettings()">
          <div class="hero-header">
            <span class="hero-email" title="${escapeHtml(email)}">${strategyIcon} ${escapeHtml(profileName)}</span>
            <span class="hero-days">${t.ready || 'Ready'}</span>
          </div>
          <div class="hero-profile-info">
            <span class="hero-profile-email">${escapeHtml(email)}</span>
          </div>
          <div class="hero-stats">
            <span class="hero-usage font-mono">✅ ${registered} / ❌ ${failed}</span>
            <span class="hero-percent">${t.clickToConfigure || 'Click to configure'}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="hero empty" onclick="openSettings()">
        <div class="hero-email">${t.noActive}</div>
        <div class="hero-hint">${t.clickToConfigure || 'Click to configure'}</div>
      </div>
    `;
  }

  const email = getAccountEmail(activeAccount);
  const current = usage?.currentUsage ?? 0;
  const limit = usage?.usageLimit ?? 500;
  const percent = usage?.percentageUsed ?? 0;
  const daysLeft = usage?.daysRemaining ?? '?';
  const usageClass = getUsageClass(percent);

  return `
    <div class="hero" onclick="refreshUsage()">
      <div class="hero-header">
        <span class="hero-email" title="${escapeHtml(email)}">${escapeHtml(email)}</span>
        <span class="hero-days">${daysLeft}${typeof daysLeft === 'number' ? 'd' : ''} ${t.daysLeft}</span>
      </div>
      <div class="hero-progress">
        <div class="hero-progress-fill ${usageClass}" style="width: ${Math.min(percent, 100)}%"></div>
      </div>
      <div class="hero-stats">
        <span class="hero-usage font-mono">${current.toLocaleString()} / ${limit}</span>
        <span class="hero-percent">${percent.toFixed(1)}%</span>
      </div>
    </div>
  `;
}
