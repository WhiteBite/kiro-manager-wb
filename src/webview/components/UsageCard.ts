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
  if (!usage) return '';

  const t = getTranslations(language);
  const percentage = usage.percentageUsed;
  const fillClass = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';
  const resetText = usage.daysRemaining > 0 
    ? `${usage.daysRemaining} ${t.daysLeft}` 
    : t.resetsAtMidnight;
  
  // Add stale indicator if data might be outdated
  const staleClass = isStale ? 'stale' : '';
  const staleIndicator = isStale ? '<span class="stale-indicator" title="Data may be outdated">⟳</span>' : '';

  return `
    <div class="usage-card ${staleClass}" onclick="vscode.postMessage({command:'showUsageDetails'})" data-account="${accountName || ''}">
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
