/**
 * Usage Card Component
 */

import { KiroUsageData } from '../../utils';
import { ICONS } from '../icons';

export interface UsageCardProps {
  usage: KiroUsageData | null | undefined;
}

export function renderUsageCard({ usage }: UsageCardProps): string {
  if (!usage) return '';

  const percentage = usage.percentageUsed;
  const fillClass = percentage < 50 ? 'low' : percentage < 80 ? 'medium' : 'high';
  const resetText = usage.daysRemaining > 0 
    ? `${usage.daysRemaining} days left` 
    : 'Resets at midnight';

  return `
    <div class="usage-card" onclick="vscode.postMessage({command:'showUsageDetails'})">
      <div class="usage-header">
        <div class="usage-title">${ICONS.bolt} Today's Usage</div>
        <div class="usage-value">${usage.currentUsage.toLocaleString()} / ${usage.usageLimit.toLocaleString()}</div>
      </div>
      <div class="usage-bar">
        <div class="usage-fill ${fillClass}" style="width: ${Math.min(percentage, 100)}%"></div>
      </div>
      <div class="usage-footer">
        <span>${percentage.toFixed(1)}% used</span>
        <span>${resetText}</span>
      </div>
    </div>
  `;
}

// Skeleton loading for usage card
export function renderUsageSkeleton(): string {
  return '<div class="skeleton skeleton-usage"></div>';
}
