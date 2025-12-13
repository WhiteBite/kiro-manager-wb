/**
 * IMAP Profile Card Component
 * Displays an IMAP profile with its strategy and stats
 */

import { ImapProfile, EmailStrategyType } from '../../types';
import { ICONS } from '../icons';

const STRATEGY_INFO: Record<EmailStrategyType, { icon: string; label: string; desc: string }> = {
  single: {
    icon: '📧',
    label: 'Single Email',
    desc: 'One account per email'
  },
  plus_alias: {
    icon: '➕',
    label: 'Plus Alias',
    desc: 'user+tag@domain'
  },
  catch_all: {
    icon: '🌐',
    label: 'Catch-All',
    desc: 'Any email on domain'
  },
  pool: {
    icon: '📋',
    label: 'Email Pool',
    desc: 'List of emails'
  }
};

const STATUS_INFO: Record<ImapProfile['status'], { color: string; label: string }> = {
  active: { color: 'var(--accent)', label: 'Active' },
  paused: { color: 'var(--warning)', label: 'Paused' },
  exhausted: { color: 'var(--danger)', label: 'Exhausted' },
  error: { color: 'var(--danger)', label: 'Error' }
};

export interface ImapProfileCardProps {
  profile: ImapProfile;
  isActive: boolean;
  isExpanded?: boolean;
}

export function renderImapProfileCard({ profile, isActive, isExpanded }: ImapProfileCardProps): string {
  const strategy = STRATEGY_INFO[profile.strategy.type];
  const status = STATUS_INFO[profile.status];
  
  // Pool stats
  let poolStats = '';
  if (profile.strategy.type === 'pool' && profile.strategy.emails) {
    const pending = profile.strategy.emails.filter(e => e.status === 'pending').length;
    const used = profile.strategy.emails.filter(e => e.status === 'used').length;
    const total = profile.strategy.emails.length;
    poolStats = `<span class="profile-pool-stats">${pending}/${total} available</span>`;
  }
  
  // Provider badge
  const providerBadge = profile.provider 
    ? `<span class="profile-provider">${profile.provider.name}</span>`
    : '';
  
  return `
    <div class="imap-profile ${isActive ? 'active' : ''} ${profile.status}" 
         data-profile-id="${profile.id}"
         onclick="selectProfile('${profile.id}')">
      
      <div class="profile-header">
        <div class="profile-avatar">
          <span class="profile-strategy-icon">${strategy.icon}</span>
          <span class="profile-status-dot" style="background: ${status.color}"></span>
        </div>
        
        <div class="profile-info">
          <div class="profile-name-row">
            <span class="profile-name">${escapeHtml(profile.name)}</span>
            ${providerBadge}
          </div>
          <div class="profile-email">${escapeHtml(profile.imap.user)}</div>
        </div>
        
        <div class="profile-actions">
          <button class="profile-btn" onclick="event.stopPropagation(); editProfile('${profile.id}')" title="Edit">
            ${ICONS.edit}
          </button>
          <button class="profile-btn danger" onclick="event.stopPropagation(); deleteProfile('${profile.id}')" title="Delete">
            ${ICONS.trash}
          </button>
        </div>
      </div>
      
      <div class="profile-details">
        <div class="profile-strategy">
          <span class="strategy-label">${strategy.label}</span>
          <span class="strategy-desc">${strategy.desc}</span>
          ${poolStats}
        </div>
        
        <div class="profile-stats">
          <span class="stat">
            <span class="stat-value">${profile.stats.registered}</span>
            <span class="stat-label">registered</span>
          </span>
          <span class="stat">
            <span class="stat-value">${profile.stats.failed}</span>
            <span class="stat-label">failed</span>
          </span>
        </div>
      </div>
      
      ${profile.stats.lastError ? `
        <div class="profile-error">
          ${ICONS.warning} ${escapeHtml(profile.stats.lastError)}
        </div>
      ` : ''}
    </div>
  `;
}

export function renderImapProfileList(profiles: ImapProfile[], activeProfileId?: string): string {
  if (profiles.length === 0) {
    return `
      <div class="profiles-empty">
        <div class="empty-icon">📧</div>
        <div class="empty-text">No IMAP profiles configured</div>
        <button class="btn btn-primary" onclick="createProfile()">
          ${ICONS.plus} Add Profile
        </button>
      </div>
    `;
  }
  
  return `
    <div class="profiles-list">
      ${profiles.map(p => renderImapProfileCard({
        profile: p,
        isActive: p.id === activeProfileId
      })).join('')}
    </div>
    <button class="btn btn-secondary profiles-add" onclick="createProfile()">
      ${ICONS.plus} Add Profile
    </button>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
