/**
 * Tab Bar Component - Navigation between main sections
 */

import { Translations } from '../i18n/types';
import { ICONS } from '../icons';

export type TabId = 'accounts' | 'profiles' | 'banned' | 'stats' | 'settings' | 'llm';

export interface TabBarProps {
  activeTab: TabId;
  t: Translations;
  accountsCount?: number;
  profilesCount?: number;
  bannedCount?: number;
}

export function renderTabBar({ activeTab, t, accountsCount = 0, profilesCount = 0, bannedCount = 0 }: TabBarProps): string {
  const tabs: Array<{ id: TabId; icon: string; label: string; badge?: number }> = [
    { id: 'accounts', icon: ICONS.users, label: t?.accounts ?? 'Accounts', badge: accountsCount },
    { id: 'profiles', icon: '📧', label: t?.profiles ?? 'Profiles', badge: profilesCount },
    { id: 'banned', icon: '⛔', label: t?.bannedGroup ?? 'Banned', badge: bannedCount },
    { id: 'stats', icon: '📊', label: t?.statistics ?? 'Stats' },
    { id: 'settings', icon: ICONS.settings, label: t?.settings ?? 'Settings' },
    { id: 'llm', icon: ICONS.bolt, label: t?.llmSettings ?? 'LLM' }
  ];

  return `
    <nav class="tab-bar">
      ${tabs.map(tab => `
        <button class="tab-item ${tab.id === activeTab ? 'active' : ''}" data-tab="${tab.id}" onclick="switchTab('${tab.id}')">
          <span class="tab-icon">${tab.icon}</span>
          <span class="tab-label">${tab.label}</span>
          ${tab.badge ? `<span class="tab-badge">${tab.badge}</span>` : ''}
        </button>
      `).join('')}
    </nav>
  `;
}
