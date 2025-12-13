/**
 * Account Card Component
 */

import { AccountInfo } from '../../types';
import { ICONS } from '../icons';
import { escapeHtml, getAccountEmail, formatExpiry } from '../helpers';
import { Language, getTranslations } from '../i18n';

export interface AccountCardProps {
  account: AccountInfo;
  index: number;
  language?: Language;
}

// Check if account was created within last 24 hours
function isNewAccount(account: AccountInfo): boolean {
  const tokenData = account.tokenData as { createdAt?: string };
  const accData = account as { createdAt?: string };
  const createdAt = tokenData?.createdAt || accData.createdAt;
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return (now - created) < dayMs;
}

export function renderAccountCard({ account, index, language = 'en' }: AccountCardProps): string {
  const t = getTranslations(language);
  const email = getAccountEmail(account);
  const avatar = email.charAt(0).toUpperCase();
  
  // Check usage state
  const hasUsage = account.usage !== undefined;
  const isUnknownUsage = hasUsage && account.usage!.currentUsage === -1;
  const isSuspended = hasUsage && account.usage!.suspended === true;
  const isExhausted = hasUsage && !isUnknownUsage && !isSuspended && account.usage!.percentageUsed >= 100;
  const isLoading = hasUsage && account.usage!.loading;
  const isNew = isNewAccount(account);
  
  const classes = [
    'card',
    account.isActive ? 'active' : '',
    account.isExpired ? 'expired' : '',
    isExhausted ? 'exhausted' : '',
    isSuspended ? 'suspended' : '',
    isUnknownUsage ? 'unknown-usage' : '',
  ].filter(Boolean).join(' ');

  // Usage display logic
  let usageDisplay: string;
  let usagePercent = 0;
  if (!hasUsage || isUnknownUsage) {
    usageDisplay = '<span class="usage-unknown" title="' + (language === 'ru' ? 'Переключитесь на аккаунт для загрузки' : 'Switch to account to load') + '">?</span>';
  } else if (isLoading) {
    usageDisplay = '<span class="usage-loading">...</span>';
  } else {
    usageDisplay = account.usage!.currentUsage.toLocaleString();
    usagePercent = account.usage!.percentageUsed || 0;
  }

  // Mini usage bar
  const usageBarClass = usagePercent < 50 ? 'low' : usagePercent < 80 ? 'medium' : 'high';
  const usageBar = hasUsage && !isUnknownUsage && !isLoading 
    ? `<div class="card-usage-bar"><div class="card-usage-fill ${usageBarClass}" style="width: ${Math.min(usagePercent, 100)}%"></div></div>` 
    : '';

  // Get created timestamp for sorting
  const tokenData = account.tokenData as { createdAt?: string };
  const accData = account as { createdAt?: string };
  const createdAt = tokenData?.createdAt || accData.createdAt || '';

  return `
    <div class="${classes}" data-email="${escapeHtml(email)}" data-index="${index}" data-usage-loaded="${hasUsage}" data-created="${createdAt}" data-usage-percent="${usagePercent}">
      <div class="card-main" onclick="switchAccount('${escapeHtml(account.filename)}')">
        <div class="card-avatar">${avatar}</div>
        <div class="card-info">
          <div class="card-email">${escapeHtml(email)}</div>
          <div class="card-meta">
            <span class="card-meta-item card-usage">${ICONS.chart} ${usageDisplay}${usageBar}</span>
            <span class="card-meta-item">${ICONS.clock} ${account.expiresIn ? formatExpiry(account.expiresIn) : '—'}</span>
          </div>
        </div>
        ${isNew && !account.isActive ? `<span class="card-status new">${t.newBadge}</span>` : ''}
        ${account.isActive ? `<span class="card-status active">${t.active}</span>` : ''}
        ${isSuspended ? `<span class="card-status suspended">${language === 'ru' ? 'БАН' : 'BAN'}</span>` : ''}
        ${isExhausted && !isSuspended ? `<span class="card-status exhausted">${language === 'ru' ? 'ЛИМИТ' : 'LIMIT'}</span>` : ''}
        ${account.isExpired && !isExhausted && !isSuspended ? `<span class="card-status expired">${t.expired}</span>` : ''}
        <div class="card-actions">
          <button class="card-btn" title="${t.copyTokenTip}" onclick="event.stopPropagation(); copyToken('${escapeHtml(account.filename)}')">${ICONS.copy}</button>
          <button class="card-btn ${account.isExpired ? 'highlight' : ''}" title="${t.refreshTokenTip}" onclick="event.stopPropagation(); refreshToken('${escapeHtml(account.filename)}')">${ICONS.refresh}</button>
          <button class="card-btn danger" title="${t.deleteTip}" onclick="event.stopPropagation(); confirmDelete('${escapeHtml(account.filename)}')">${ICONS.trash}</button>
        </div>
      </div>
    </div>
  `;
}

export function renderAccountList(accounts: AccountInfo[], language: Language = 'en'): string {
  const t = getTranslations(language);
  if (accounts.length === 0) {
    return `
      <div class="list-empty">
        <div class="list-empty-icon">📭</div>
        <div class="list-empty-text">${t.noAccounts}</div>
        <button class="btn btn-primary" onclick="startAutoReg()">${ICONS.bolt} ${t.createFirst}</button>
      </div>
    `;
  }
  
  return accounts.map((acc, i) => renderAccountCard({ account: acc, index: i, language })).join('');
}

// Skeleton loading for accounts
export function renderAccountSkeleton(count: number = 3): string {
  return Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
}
