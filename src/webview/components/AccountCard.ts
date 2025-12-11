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

export function renderAccountCard({ account, index, language = 'en' }: AccountCardProps): string {
  const t = getTranslations(language);
  const email = getAccountEmail(account);
  const avatar = email.charAt(0).toUpperCase();
  
  const classes = [
    'card',
    account.isActive ? 'active' : '',
    account.isExpired ? 'expired' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}" data-email="${escapeHtml(email)}" data-index="${index}">
      <div class="card-main" onclick="switchAccount('${escapeHtml(account.filename)}')">
        <div class="card-avatar">${avatar}</div>
        <div class="card-info">
          <div class="card-email">${escapeHtml(email)}</div>
          <div class="card-meta">
            <span class="card-meta-item">${ICONS.chart} ${account.usage ? account.usage.currentUsage.toLocaleString() : '—'}</span>
            <span class="card-meta-item">${ICONS.clock} ${account.expiresIn ? formatExpiry(account.expiresIn) : '—'}</span>
          </div>
        </div>
        ${account.isActive ? `<span class="card-status active">${t.active}</span>` : ''}
        ${account.isExpired ? `<span class="card-status expired">${t.expired}</span>` : ''}
        <div class="card-actions">
          <button class="card-btn tooltip" data-tip="${t.copyTokenTip}" onclick="event.stopPropagation(); copyToken('${escapeHtml(account.filename)}')">${ICONS.copy}</button>
          <button class="card-btn tooltip ${account.isExpired ? 'highlight' : ''}" data-tip="${t.refreshTokenTip}" onclick="event.stopPropagation(); refreshToken('${escapeHtml(account.filename)}')">${ICONS.refresh}</button>
          <button class="card-btn tooltip" data-tip="${t.viewQuotaTip}" onclick="event.stopPropagation(); viewQuota('${escapeHtml(account.filename)}')">${ICONS.chart}</button>
          <button class="card-btn danger tooltip" data-tip="${t.deleteTip}" onclick="event.stopPropagation(); confirmDelete('${escapeHtml(account.filename)}')">${ICONS.trash}</button>
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
