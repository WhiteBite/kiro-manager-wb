/**
 * Tab Bar Component - Navigation between main sections
 * 
 * Compact 4-tab navigation:
 * - accounts (main)
 * - profiles
 * - settings (includes stats & llm)
 * - banned (conditional - only shown if bannedCount > 0)
 */

import { Translations } from '../i18n/types';
import { ICONS } from '../icons';

export type TabId = 'accounts' | 'registration' | 'llm' | 'profiles' | 'settings' | 'banned';

export interface TabBarProps {
  activeTab: TabId;
  t: Translations;
  accountsCount?: number;
  bannedCount?: number;
}

interface TabConfig {
  id: TabId;
  icon: string;
  label: string;
  badge?: number;
  showBadge?: boolean;
  hidden?: boolean;
}

export function renderTabBar({ activeTab, t, accountsCount = 0, bannedCount = 0 }: TabBarProps): string {
  const tabs: TabConfig[] = [
    {
      id: 'accounts',
      icon: ICONS.users,
      label: t?.accounts ?? 'Accounts',
      badge: accountsCount,
      showBadge: true
    },
    {
        id: 'registration',
        icon: ICONS.plus,
        label: t?.registration ?? 'Registration',
        showBadge: false
      },
      {
        id: 'llm',
        icon: '🤖',
        label: t?.llm || 'LLM',
        showBadge: false
      },
    {
      id: 'profiles',
      icon: '📧',
      label: t?.profiles ?? 'Profiles',
      showBadge: false
    },
    {
      id: 'settings',
      icon: ICONS.settings,
      label: t?.settings ?? 'Settings',
      showBadge: false
    },
    {
      id: 'banned',
      icon: '⛔',
      label: t?.banned ?? 'Banned',
      badge: bannedCount,
      showBadge: true,
      hidden: bannedCount === 0
    }
  ];

  // Filter out hidden tabs
  const visibleTabs = tabs.filter(tab => !tab.hidden);

  return `
    <nav class="tab-bar" role="tablist" aria-label="Main navigation">
      ${visibleTabs.map(tab => {
    const isActive = tab.id === activeTab;
    const hasBadge = tab.showBadge && tab.badge && tab.badge > 0;

    return `
        <button 
          class="tab-item ${isActive ? 'active' : ''}" 
          data-tab="${tab.id}"
          data-has-badge="${hasBadge ? 'true' : 'false'}"
          role="tab"
          aria-selected="${isActive}"
          aria-controls="tab-${tab.id}"
          aria-label="${tab.label}${hasBadge ? ` (${tab.badge})` : ''}"
          onclick="switchTab('${tab.id}')"
        >
          <span class="tab-icon" aria-hidden="true">${tab.icon}</span>
          <span class="tab-label">${tab.label}</span>
          ${hasBadge ? `<span class="tab-badge" aria-label="${tab.badge} items">${tab.badge}</span>` : ''}
        </button>
      `;
  }).join('')}
    </nav>
  `;
}
