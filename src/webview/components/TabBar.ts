/**
 * Tab Bar Component - Navigation between main sections
 */

import { Translations } from '../i18n/types';
import { ICONS } from '../icons';

export type TabId = 'accounts' | 'profiles' | 'stats' | 'settings';

export interface TabBarProps {
  activeTab: TabId;
  t: Translations;
  accountsCount?: number;
  profilesCount?: number;
}

export function renderTabBar({ activeTab, t, accountsCount = 0, profilesCount = 0 }: TabBarProps): string {
  const tabs: Array<{ id: TabId; icon: string; label: string; badge?: number }> = [
    { id: 'accounts', icon: ICONS.users, label: t.accounts || 'Accounts', badge: accountsCount },
    { id: 'profiles', icon: '📧', label: t.profiles || 'Profiles', badge: profilesCount },
    { id: 'stats', icon: '📊', label: t.statistics || 'Stats' },
    { id: 'settings', icon: ICONS.settings, label: t.settings || 'Settings' }
  ];

  return `
    <div class="tab-bar">
      ${tabs.map(tab => `
        <button 
          class="tab-item ${activeTab === tab.id ? 'active' : ''}" 
          onclick="switchTab('${tab.id}')"
          data-tab="${tab.id}"
        >
          <span class="tab-icon">${tab.icon}</span>
          <span class="tab-label">${tab.label}</span>
          ${tab.badge !== undefined ? `<span class="tab-badge">${tab.badge}</span>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}
