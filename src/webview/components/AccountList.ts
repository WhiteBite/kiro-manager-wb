/**
 * Account List Component
 */

import { AccountInfo } from '../../types';
import { ICONS } from '../icons';
import { escapeHtml, getAccountEmail } from '../helpers';
import { Translations } from '../i18n/types';

export interface AccountListProps {
  accounts: AccountInfo[];
  t: Translations;
  selectionMode?: boolean;
  selectedCount?: number;
  variant?: 'default' | 'banned';
}



/**
 * Truncate email for narrow screens: user@domain.com -> us...@do...com
 */
function truncateEmail(email: string, maxLen: number = 20): string {
  if (email.length <= maxLen) return email;
  
  const atIndex = email.indexOf('@');
  if (atIndex === -1) {
    // Not an email, just truncate
    return email.slice(0, maxLen - 3) + '...';
  }
  
  const localPart = email.slice(0, atIndex);
  const domainPart = email.slice(atIndex + 1);
  
  // For very short maxLen, show minimal
  if (maxLen < 15) {
    return localPart.slice(0, 2) + '..@' + domainPart.slice(-4);
  }
  
  // Show first 4 chars of local, last 6 of domain
  const localShow = Math.min(4, localPart.length);
  const domainShow = Math.min(8, domainPart.length);
  
  if (localPart.length > localShow) {
    return localPart.slice(0, localShow) + '..@' + domainPart.slice(-domainShow);
  }
  
  return email;
}

function renderAccount(acc: AccountInfo, index: number, t: Translations, selectionMode: boolean = false): string {
  const email = getAccountEmail(acc);
  const avatar = email.charAt(0).toUpperCase();
  const usage = acc.usage;
  const hasUsage = usage !== undefined;
  const isUnknown = hasUsage && usage!.currentUsage === -1;
  const isSuspended = hasUsage && usage!.suspended === true;
  const isBanned = hasUsage && usage!.isBanned === true;
  const isExhausted = hasUsage && !isUnknown && !isSuspended && !isBanned && usage!.percentageUsed >= 100;

  const classes = [
    'account',
    acc.isActive ? 'active' : '',
    acc.isExpired ? 'expired' : '',
    isExhausted ? 'exhausted' : '',
    isSuspended ? 'suspended' : '',
    isBanned ? 'banned' : '',
  ].filter(Boolean).join(' ');

  // Priority: banned > suspended > exhausted > expired > active > ready
  const statusClass = isBanned ? 'banned' :
    isSuspended ? 'suspended' :
      isExhausted ? 'exhausted' :
        acc.isExpired ? 'expired' :
          acc.isActive ? 'active' : 'ready';

  // Show remaining tokens instead of used
  const remaining = hasUsage && !isUnknown ? (usage!.usageLimit - usage!.currentUsage) : -1;
  const usageText = isUnknown ? '?' :
    hasUsage ? `${remaining}/${usage!.usageLimit}` :
      '—';
  const expiryText = acc.expiresIn || '—';
  
  // Compact usage badge for narrow screens
  const usageBadge = hasUsage && !isUnknown ? remaining : null;

  // Ban reason tooltip
  const banTooltip = isBanned && usage?.banReason ? ` title="${escapeHtml(usage.banReason)}"` : '';

  // Checkbox for selection mode
  const checkbox = selectionMode ? `
    <label class="account-checkbox" onclick="event.stopPropagation()">
      <input type="checkbox" data-filename="${escapeHtml(acc.filename)}" onchange="toggleAccountSelection('${escapeHtml(acc.filename)}', this.checked)">
      <span class="checkmark"></span>
    </label>
  ` : '';

  // Truncated email for data attribute (used by CSS on narrow screens)
  const truncatedEmail = truncateEmail(email, 18);

  return `
    <div class="${classes}" data-index="${index}" data-filename="${escapeHtml(acc.filename)}" data-email-short="${escapeHtml(truncatedEmail)}" onclick="switchAccount('${escapeHtml(acc.filename)}')"${banTooltip}>
      ${checkbox}
      <div class="account-avatar">
        ${avatar}
        <span class="account-status ${statusClass}"></span>
      </div>
      <div class="account-info">
        <div class="account-email">
          <span class="email-full">${escapeHtml(email)}</span>
          <span class="email-short">${escapeHtml(truncatedEmail)}</span>
          ${isBanned ? '<span class="ban-badge">⛔</span>' : ''}
          ${usageBadge !== null ? `<span class="account-usage-badge">${usageBadge}</span>` : ''}
        </div>
        <div class="account-meta">
          <span class="meta-usage">${ICONS.chart} ${usageText}</span>
          <span class="meta-expiry">${ICONS.clock} ${expiryText}</span>
          ${isBanned ? `<span class="ban-reason">${t.banned || 'BANNED'}</span>` : ''}
        </div>
      </div>
      <div class="account-actions">
        <button class="account-btn" title="${t.copyTokenTip}" onclick="event.stopPropagation(); copyToken('${escapeHtml(acc.filename)}')">${ICONS.copy}</button>
        <button class="account-btn ${acc.isExpired ? 'highlight' : ''}" title="${t.refreshTokenTip}" onclick="event.stopPropagation(); refreshToken('${escapeHtml(acc.filename)}')">${ICONS.refresh}</button>
        <button class="account-btn danger" title="${t.deleteDoubleClick || 'Click twice to delete'}" onclick="event.stopPropagation(); confirmDelete('${escapeHtml(acc.filename)}')">${ICONS.trash}</button>
      </div>
    </div>
  `;
}

/**
 * Render skeleton loading state for account list
 */
export function renderAccountListSkeleton(count: number = 3): string {
  let html = '<div class="account-list-skeleton">';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="account skeleton">
        <div class="account-avatar skeleton-pulse"></div>
        <div class="account-info">
          <div class="skeleton-line skeleton-pulse" style="width: 70%"></div>
          <div class="skeleton-line skeleton-pulse" style="width: 40%"></div>
        </div>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

/**
 * SVG illustrations for empty states
 */
const EMPTY_ILLUSTRATIONS = {
  // Account illustration - person with circle
  accounts: `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="28" r="14" fill="var(--accent-dim)" stroke="var(--accent)" stroke-width="2"/>
      <path d="M18 62c0-12.15 9.85-22 22-22s22 9.85 22 22" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="40" cy="28" r="6" fill="var(--accent)" opacity="0.6"/>
    </svg>
  `,
  // Search illustration - magnifying glass
  search: `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <circle cx="34" cy="34" r="18" fill="var(--accent-dim)" stroke="var(--accent)" stroke-width="2"/>
      <line x1="47" y1="47" x2="62" y2="62" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="34" cy="34" r="8" stroke="var(--accent)" stroke-width="1.5" opacity="0.5" fill="none"/>
    </svg>
  `,
  // Banned illustration - shield with X
  banned: `
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <path d="M40 8L12 20v20c0 16.57 11.93 32.08 28 36 16.07-3.92 28-19.43 28-36V20L40 8z" fill="var(--accent-dim)" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="40" cy="38" r="12" fill="var(--accent)" opacity="0.3"/>
      <path d="M40 30v12M40 46v2" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `
};

export function renderAccountList({ accounts, t, selectionMode = false, selectedCount = 0, variant = 'default' }: AccountListProps): string {
  if (accounts.length === 0) {
    // Different empty states based on variant
    if (variant === 'banned') {
      return `
        <div class="empty-state">
          <div class="empty-illustration">${EMPTY_ILLUSTRATIONS.banned}</div>
          <h3 class="empty-title">${t.emptyBannedTitle || 'No banned accounts'}</h3>
          <p class="empty-desc">${t.emptyBannedDesc || 'All your accounts are in good standing'}</p>
        </div>
      `;
    }

    // Default empty state - no accounts
    return `
      <div class="empty-state">
        <div class="empty-illustration">${EMPTY_ILLUSTRATIONS.accounts}</div>
        <h3 class="empty-title">${t.noAccounts || 'No accounts yet'}</h3>
        <p class="empty-desc">${t.addFirstAccount || 'Add your first account to get started'}</p>
        <button class="btn btn-primary" onclick="startQuickAutoReg()">➕ ${t.addAccount || 'Add Account'}</button>
      </div>
    `;
  }

  if (variant === 'banned') {
    let html = `
      <div class="list-group banned">
        <span>⛔ ${t.bannedGroup}</span>
        <button class="list-group-action" onclick="confirmDeleteBanned()">${t.deleteAll}</button>
        <span class="list-group-count">${accounts.length}</span>
      </div>
    `;

    accounts.forEach((acc, index) => {
      html += renderAccount(acc, index, t, selectionMode);
    });

    return html;
  }

  // Empty search state (hidden by default, shown via JS when search has no results)
  const emptySearchHtml = `
    <div class="empty-state empty-search" id="emptySearchState" style="display: none;">
      <div class="empty-illustration">${EMPTY_ILLUSTRATIONS.search}</div>
      <h3 class="empty-title">${t.emptySearchTitle || 'No results found'}</h3>
      <p class="empty-desc">${t.emptySearchDesc || 'Try a different search term'}</p>
      <button class="btn btn-secondary btn-sm" onclick="clearSearch()">${t.clearSearch || 'Clear search'}</button>
    </div>
  `;

  // Group accounts into 5 categories
  const active: AccountInfo[] = [];
  const ready: AccountInfo[] = [];
  const expired: AccountInfo[] = [];
  const exhausted: AccountInfo[] = [];
  const banned: AccountInfo[] = [];

  accounts.forEach(acc => {
    const usage = acc.usage;
    const isBanned = usage?.isBanned === true;
    const isSuspended = usage?.suspended === true;
    const isExhausted = usage && usage.currentUsage !== -1 && usage.percentageUsed >= 100;

    if (isBanned) {
      banned.push(acc);
    } else if (isSuspended || isExhausted) {
      exhausted.push(acc);
    } else if (acc.isExpired) {
      expired.push(acc);
    } else if (acc.isActive) {
      active.push(acc);
    } else {
      ready.push(acc);
    }
  });

  let html = '';
  let globalIndex = 0;

  if (active.length > 0) {
    html += `<div class="list-group"><span>${t.activeGroup}</span><span class="list-group-count">${active.length}</span></div>`;
    active.forEach(acc => { html += renderAccount(acc, globalIndex++, t, selectionMode); });
  }

  if (ready.length > 0) {
    html += `<div class="list-group"><span>${t.readyGroup}</span><span class="list-group-count">${ready.length}</span></div>`;
    ready.forEach(acc => { html += renderAccount(acc, globalIndex++, t, selectionMode); });
  }

  if (expired.length > 0) {
    html += `
      <div class="list-group warning">
        <span>${t.expiredGroup}</span>
        <button class="list-group-action" onclick="refreshAllExpired()">${t.refreshAll}</button>
        <span class="list-group-count">${expired.length}</span>
      </div>
    `;
    expired.forEach(acc => { html += renderAccount(acc, globalIndex++, t, selectionMode); });
  }

  if (exhausted.length > 0) {
    html += `
      <div class="list-group danger">
        <span>${t.exhaustedGroup}</span>
        <button class="list-group-action" onclick="confirmDeleteExhausted()">${t.deleteAll}</button>
        <span class="list-group-count">${exhausted.length}</span>
      </div>
    `;
    exhausted.forEach(acc => { html += renderAccount(acc, globalIndex++, t, selectionMode); });
  }

  // Banned accounts - separate group with skull icon
  if (banned.length > 0) {
    html += `
      <div class="list-group banned">
        <span>⛔ ${t.bannedGroup}</span>
        <button class="list-group-action" onclick="confirmDeleteBanned()">${t.deleteAll}</button>
        <span class="list-group-count">${banned.length}</span>
      </div>
    `;
    banned.forEach(acc => { html += renderAccount(acc, globalIndex++, t, selectionMode); });
  }

  // Add empty search state at the end (hidden by default)
  html += emptySearchHtml;

  return html;
}
