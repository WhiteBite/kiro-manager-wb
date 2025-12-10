/**
 * Console Panel Component
 */

import { ICONS } from '../icons';
import { escapeHtml } from '../helpers';
import { Language, getTranslations } from '../i18n';

export interface ConsolePanelProps {
  logs: string[] | undefined;
  maxLines?: number;
  language?: Language;
}

function getLogClass(log: string): string {
  if (log.includes('ERROR') || log.includes('FAIL') || log.includes('✗')) return 'error';
  if (log.includes('SUCCESS') || log.includes('✓') || log.includes('✅')) return 'success';
  if (log.includes('WARN') || log.includes('⚠')) return 'warning';
  return '';
}

export function renderConsolePanel({ logs, maxLines = 50, language = 'en' }: ConsolePanelProps): string {
  if (!logs || logs.length === 0) return '';

  const t = getTranslations(language);
  const visibleLogs = logs.slice(-maxLines);

  return `
    <div class="console-panel">
      <div class="console-header">
        <span class="console-title">${t.console} (${logs.length})</span>
        <div style="display:flex;gap:4px;">
          <button class="icon-btn tooltip" data-tip="${t.openLogTip}" onclick="vscode.postMessage({command:'openLog'})">${ICONS.file}</button>
          <button class="icon-btn tooltip" data-tip="${t.clearTip}" onclick="clearConsole()">${ICONS.trash}</button>
        </div>
      </div>
      <div class="console-body" id="consoleBody">
        ${visibleLogs.map(log => `<div class="console-line ${getLogClass(log)}">${escapeHtml(log)}</div>`).join('')}
      </div>
    </div>
  `;
}
