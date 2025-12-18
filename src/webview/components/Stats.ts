/**
 * Stats Dashboard Component
 * Shows usage statistics and charts
 */

import { Translations } from '../i18n/types';
import { AccountInfo } from '../../types';

export interface StatsProps {
  accounts: AccountInfo[];
  t: Translations;
  loading?: boolean;
}

interface DailyStats {
  date: string;
  usage: number;
  registrations: number;
}

/**
 * Render skeleton loading state for stats
 */
export function renderStatsSkeleton(t: Translations): string {
  return `
    <div class="stats-dashboard">
      <div class="stats-header">
        <h3 class="stats-title">📊 ${t.statistics || 'Statistics'}</h3>
      </div>
      <div class="stats-cards">
        ${[1, 2, 3, 4].map(() => `
          <div class="stat-card skeleton">
            <div class="skeleton-line skeleton-pulse" style="width: 60%; height: 24px; margin: 0 auto 8px;"></div>
            <div class="skeleton-line skeleton-pulse" style="width: 40%; height: 12px; margin: 0 auto;"></div>
          </div>
        `).join('')}
      </div>
      <div class="stats-section skeleton">
        <div class="skeleton-line skeleton-pulse" style="width: 30%; height: 12px; margin-bottom: 12px;"></div>
        <div class="skeleton-line skeleton-pulse" style="width: 100%; height: 8px; border-radius: 4px;"></div>
      </div>
      <div class="stats-section skeleton">
        <div class="skeleton-line skeleton-pulse" style="width: 30%; height: 12px; margin-bottom: 12px;"></div>
        <div class="mini-chart">
          ${[30, 45, 60, 80, 55, 40, 25].map(h => `
            <div class="chart-bar skeleton-pulse" style="height: ${h}%; background: var(--bg-elevated);"></div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function renderStats({ accounts, t, loading = false }: StatsProps): string {
  if (loading) {
    return renderStatsSkeleton(t);
  }
  const totalAccounts = accounts.length;
  const activeAccounts = accounts.filter(a => !a.isExpired && !a.usage?.isBanned).length;
  const bannedAccounts = accounts.filter(a => a.usage?.isBanned).length;
  const expiredAccounts = accounts.filter(a => a.isExpired).length;

  // Calculate total usage
  const totalUsage = accounts.reduce((sum, a) => sum + (a.usage?.currentUsage || 0), 0);
  const totalLimit = accounts.reduce((sum, a) => sum + (a.usage?.usageLimit || 500), 0);
  const avgUsage = totalAccounts > 0 ? Math.round(totalUsage / totalAccounts) : 0;

  // Generate mini chart data (last 7 days placeholder)
  const chartBars = generateChartBars();

  return `
    <div class="stats-dashboard">
      <div class="stats-header">
        <h3 class="stats-title">📊 ${t.statistics || 'Statistics'}</h3>
      </div>

      <!-- Summary Cards -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">${totalAccounts}</div>
          <div class="stat-label">${t.total}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${activeAccounts}</div>
          <div class="stat-label">${t.active}</div>
        </div>
        <div class="stat-card danger">
          <div class="stat-value">${bannedAccounts}</div>
          <div class="stat-label">${t.banned}</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${expiredAccounts}</div>
          <div class="stat-label">${t.expired}</div>
        </div>
      </div>

      <!-- Usage Overview -->
      <div class="stats-section">
        <div class="stats-section-title">${t.todaysUsage}</div>
        <div class="usage-overview">
          <div class="usage-bar-container">
            <div class="usage-bar-fill" style="width: ${totalLimit > 0 ? (totalUsage / totalLimit * 100) : 0}%"></div>
          </div>
          <div class="usage-numbers">
            <span class="usage-current">${totalUsage}</span>
            <span class="usage-separator">/</span>
            <span class="usage-limit">${totalLimit}</span>
          </div>
        </div>
        <div class="usage-avg">
          ${t.avgPerAccount || 'Avg per account'}: <strong>${avgUsage}</strong>
        </div>
      </div>

      <!-- Mini Chart -->
      <div class="stats-section">
        <div class="stats-section-title">${t.weeklyUsage || 'Weekly Usage'}</div>
        <div class="mini-chart">
          ${chartBars}
        </div>
        <div class="chart-labels">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
      </div>

      <!-- Account Health -->
      <div class="stats-section">
        <div class="stats-section-title">${t.accountHealth || 'Account Health'}</div>
        <div class="health-bars">
          <div class="health-row">
            <span class="health-label">✅ ${t.active}</span>
            <div class="health-bar">
              <div class="health-fill success" style="width: ${totalAccounts > 0 ? (activeAccounts / totalAccounts * 100) : 0}%"></div>
            </div>
            <span class="health-percent">${totalAccounts > 0 ? Math.round(activeAccounts / totalAccounts * 100) : 0}%</span>
          </div>
          <div class="health-row">
            <span class="health-label">⛔ ${t.banned}</span>
            <div class="health-bar">
              <div class="health-fill danger" style="width: ${totalAccounts > 0 ? (bannedAccounts / totalAccounts * 100) : 0}%"></div>
            </div>
            <span class="health-percent">${totalAccounts > 0 ? Math.round(bannedAccounts / totalAccounts * 100) : 0}%</span>
          </div>
          <div class="health-row">
            <span class="health-label">⏰ ${t.expired}</span>
            <div class="health-bar">
              <div class="health-fill warning" style="width: ${totalAccounts > 0 ? (expiredAccounts / totalAccounts * 100) : 0}%"></div>
            </div>
            <span class="health-percent">${totalAccounts > 0 ? Math.round(expiredAccounts / totalAccounts * 100) : 0}%</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function generateChartBars(): string {
  // Generate placeholder data for 7 days
  const heights = [30, 45, 60, 80, 55, 40, 25];
  return heights.map((h, i) => `
    <div class="chart-bar" style="height: ${h}%"></div>
  `).join('');
}
