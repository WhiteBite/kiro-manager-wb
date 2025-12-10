/**
 * Console Panel Component
 */

import { ICONS } from '../icons';
import { escapeHtml } from '../helpers';

export interface ConsolePanelProps {
  logs: string[] | undefined;
  maxLines?: number;
}

function getLogClass(log: string): string {
  if (log.includes('ERROR') || log.includes('FAIL')) return 'error';
  if (log.includes('SUCCESS') || log.includes('✓')) return 'success';
  if (log.includes('WARN') || log.includes('⚠')) return 'warning';
  return '';
}

export function renderConsolePanel({ logs, maxLines = 50 }: ConsolePanelProps): string {
  if (!logs || logs.length === 0) return '';

  const visibleLogs = logs.slice(-maxLines);

  return `
    <div class="console-panel">
      <div class="console-header">
        <span class="console-title">Console (${logs.length})</span>
        <button class="icon-btn tooltip" data-tip="Clear" onclick="clearConsole()">${ICONS.trash}</button>
      </div>
      <div class="console-body" id="consoleBody">
        ${visibleLogs.map(log => `<div class="console-line ${getLogClass(log)}">${escapeHtml(log)}</div>`).join('')}
      </div>
    </div>
  `;
}
