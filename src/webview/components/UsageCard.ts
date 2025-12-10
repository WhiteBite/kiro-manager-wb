/**
 * Usage Card Component
 */

import { KiroUsageData } from '../../utils';
import { ICONS } from '../icons';
import { Language, getTranslations } from '../i18n';

export interface UsageCardProps {
  usage: KiroUsageData | null | undefined;
  language?: Language;
}

export function renderUsageCard({ usage, language = 'en' }: UsageCardProps): string {
  if (!usage) return '';

  const t = usageI18n[language];
  const percentage = usage.percentageUsed;
  const fillClass = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';
  const resetText = usage.daysRemaining > 0 
    ? `${usage.daysRemaining} ${t.daysLeft}` 
    : t.resetsAtMidnight;

  return `
    <div class="usage-card" onclick="vscode.postMessage({command:'showUsageDetails'})">
      <div class="usage-header">
        <div class="usage-title">${ICONS.bolt} ${t.todaysUsage}</div>
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
