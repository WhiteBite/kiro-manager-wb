/**
 * Usage Card Component
 */

import { KiroUsageData } from '../../utils';
import { ICONS } from '../icons';
import { Language, getTranslations } from '../i18n';

export interface UsageCardProps {
  usage: KiroUsageData | null | undefined;
  language?: Language;
  isStale?: boolean;  // Flag for stale/outdated data
  accountName?: string;  // Current account name for display
}

export function renderUsageCard({ usage, language = 'en', isStale = false, accountName }: UsageCardProps): string {
  // Show placeholder if no usage data
  if (!usage) {
    const noDataText = language === 'ru' ? 'Нет данных об использовании' : 'No usage data';
    const hintText = language === 'ru' ? 'Переключитесь на аккаунт для загрузки' : 'Switch to an account to load';
    return `
      <div class="usage-card empty" data-account="${accountName || ''}">
        <div class="usage-header">
          <div class="usage-title">${ICONS.bolt} ${noDataText}</div>
        </div>
        <div class="usage-hint">${hintText}</div>
      </div>
    `;
  }

  const t = getTranslations(language);
  const percentage = usage.percentageUsed;
  const fillClass = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';
  
  // Handle unknown days remaining (-1)
  let resetText: string;
  if (usage.daysRemaining === -1) {
    resetText = language === 'ru' ? 'Неизвестно' : 'Unknown';
  } else if (usage.daysRemaining > 0) {
    resetText = `${usage.daysRemaining} ${t.daysLeft}`;
  } else {
    resetText = t.resetsAtMidnight;
  }
  
  // Add stale indicator if data might be outdated
  const staleClass = isStale ? 'stale' : '';
  const staleIndicator = isStale ? '<span class="stale-indicator" title="' + (language === 'ru' ? 'Данные могут быть устаревшими' : 'Data may be outdated') + '">⟳</span>' : '';

  return `
    <div class="usage-card ${staleClass}" onclick="vscode.postMessage({command:'refreshUsage'})" data-account="${accountName || ''}" title="${language === 'ru' ? 'Нажмите для обновления' : 'Click to refresh'}">
      <div class="usage-header">
        <div class="usage-title">${ICONS.bolt} ${t.todaysUsage} ${staleIndicator}</div>
        <div class="usage-value">${usage.currentUsage.toLocaleString()} / ${usage.usageLimit.toLocaleString()}</div>
      </div>
      <div class="usage-bar">
        <div class="usage-fill ${fillClass}" style="width: ${Math.min(percentage, 100)}%"></div>
      </div>
      <div class="usage-footer">
        <span>${percentage.toFixed(1)}% ${t.used}</span>
        <span>${resetText}</span>
      </div>
    </div>
  `;
}

// Skeleton loading for usage card
export function renderUsageSkeleton(): string {
  return '<div class="skeleton skeleton-usage"></div>';
}
