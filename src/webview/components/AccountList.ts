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

  const usageText = isUnknown ? '?' : hasUsage ? usage!.currentUsage.toLocaleString() : '—';
  const expiryText = acc.expiresIn || '—';

  // Ban reason tooltip
  const banTooltip = isBanned && usage?.banReason ? ` title="${escapeHtml(usage.banReason)}"` : '';

  // Checkbox for selection mode
  const checkbox = selectionMode ? `
    <label class="account-checkbox" onclick="event.stopPropagation()">
      <input type="checkbox" data-filename="${escapeHtml(acc.filename)}" onchange="toggleAccountSelection('${escapeHtml(acc.filename)}', this.checked)">
      <span class="checkmark"></span>
    </label>
  ` : '';

  return `
    <div class="${classes}" data-index="${index}" data-filename="${escapeHtml(acc.filename)}" onclick="switchAccount('${escapeHtml(acc.filename)}')"${banTooltip}>
      ${checkbox}
      <div class="account-avatar">
        ${avatar}
        <span class="account-status ${statusClass}"></span>
      </div>
      <div class="account-info">
        <div class="account-email">
          ${escapeHtml(email)}
          ${isBanned ? '<span class="ban-badge">⛔</span>' : ''}
        </div>
        <div class="account-meta">
          <span>${ICONS.chart} ${usageText}</span>
          <span>${ICONS.clock} ${expiryText}</span>
          ${isBanned ? `<span class="ban-reason">${t.banned || 'BANNED'}</span>` : ''}
        </div>
      </div>
      <div class="account-actions">
        <button class="account-btn" title="${t.copyTokenTip}" onclick="event.stopPropagation(); copyToken('${escapeHtml(acc.filename)}')">${ICONS.copy}</button>
        <button class="account-btn ${acc.isExpired ? 'highlight' : ''}" title="${t.refreshTokenTip}" onclick="event.stopPropagation(); refreshToken('${escapeHtml(acc.filename)}')">${ICONS.refresh}</button>
        <button class="account-btn danger" title="${t.deleteTip}" onclick="event.stopPropagation(); confirmDelete('${escapeHtml(acc.filename)}')">${ICONS.trash}</button>
      </div>
    </div>
  `;
}

export function renderAccountList({ accounts, t, selectionMode = false, selectedCount = 0 }: AccountListProps): string {
  if (accounts.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">${t.noAccounts}</div>
        <button class="btn btn-primary" onclick="startAutoReg()">${ICONS.bolt} ${t.createFirst}</button>
      </div>
    `;
  }

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

  return html;
}
