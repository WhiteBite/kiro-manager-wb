/**
 * Logs Drawer Component
 */

import { escapeHtml } from '../helpers';
import { Translations } from '../i18n/types';

export interface LogsProps {
    logs?: string[];
    t: Translations;
}

function getLogClass(log: string): string {
    if (log.includes('ERROR') || log.includes('FAIL') || log.includes('✗')) return 'error';
    if (log.includes('SUCCESS') || log.includes('✓') || log.includes('✅')) return 'success';
    if (log.includes('WARN') || log.includes('⚠')) return 'warning';
    return '';
}

export function renderLogs({ logs, t }: LogsProps): string {
    const hasErrors = logs?.some(l => l.includes('ERROR') || l.includes('FAIL') || l.includes('✗')) ?? false;
    const logLines = (logs || []).slice(-100).map(log =>
        `<div class="log-line ${getLogClass(log)}">${escapeHtml(log)}</div>`
    ).join('');

    return `
    <div class="logs-drawer" id="logsDrawer">
      <div class="logs-header" onclick="toggleLogs()">
        <div class="logs-header-left">
          <span class="logs-title">${t.console}</span>
          <span class="logs-count${hasErrors ? ' has-errors' : ''}" id="logsCount">${logs?.length || 0}</span>
        </div>
        <span class="logs-toggle">▲</span>
      </div>
      <div class="logs-actions">
        <button class="icon-btn" onclick="clearConsole()" title="${t.clearTip}">🗑</button>
        <button class="icon-btn" onclick="copyLogs()" title="${t.copyLogsTip}">📋</button>
      </div>
      <div class="logs-content" id="logsContent">${logLines}</div>
    </div>
  `;
}
