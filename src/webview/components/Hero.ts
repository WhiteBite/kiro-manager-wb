/**
 * Hero Dashboard Component
 */

import { AccountInfo } from '../../types';
import { KiroUsageData } from '../../utils';
import { escapeHtml, getAccountEmail } from '../helpers';
import { Translations } from '../i18n/types';
import { RegProgress } from '../types';

export interface HeroProps {
    activeAccount?: AccountInfo;
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

export function renderHero({ activeAccount, usage, progress, isRunning, t }: HeroProps): string {
    // Registration in progress
    if (isRunning && progress) {
        const percent = Math.round((progress.step / progress.totalSteps) * 100);
        return `
      <div class="hero progress">
        <div class="hero-header">
          <span class="hero-email">${escapeHtml(progress.stepName)}</span>
          <span class="hero-step">${progress.step}/${progress.totalSteps}</span>
        </div>
        <div class="hero-progress">
          <div class="hero-progress-fill low" style="width: ${percent}%"></div>
        </div>
        <div class="hero-stats">
          <span class="hero-usage">${escapeHtml(progress.detail || '')}</span>
          <span class="hero-percent">${percent}%</span>
        </div>
      </div>
    `;
    }

    // No active account
    if (!activeAccount) {
        return `
      <div class="hero empty">
        <div class="hero-email">${t.noActive}</div>
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
