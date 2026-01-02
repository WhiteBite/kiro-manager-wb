/**
 * Enhanced Console Component
 * - Filters by type (All/Success/Warning/Error/Info)
 * - Timestamps
 * - Icons for log types
 * - Search functionality
 */

import { escapeHtml } from '../helpers';
import { Translations } from '../i18n/types';

export interface LogsProps {
  logs?: string[];
  t: Translations;
}

export type LogType = 'all' | 'success' | 'warning' | 'error' | 'info';

interface ParsedLog {
  time: string;
  type: LogType;
  icon: string;
  message: string;
  raw: string;
}

function parseLog(log: string): ParsedLog {
  // Extract time if present [HH:MM:SS] or generate current
  const timeMatch = log.match(/^\[(\d{1,2}:\d{2}:\d{2})\s*[AP]?M?\]/i);
  const time = timeMatch ? timeMatch[1] : '';
  const message = timeMatch ? log.slice(timeMatch[0].length).trim() : log;

  // Determine type and icon
  let type: LogType = 'info';
  let icon = 'ℹ️';

  if (log.includes('ERROR') || log.includes('FAIL') || log.includes('✗') || log.includes('❌')) {
    type = 'error';
    icon = '❌';
  } else if (log.includes('SUCCESS') || log.includes('✓') || log.includes('✅') || log.includes('[OK]')) {
    type = 'success';
    icon = '✓';
  } else if (log.includes('WARN') || log.includes('⚠') || log.includes('⛔')) {
    type = 'warning';
    icon = '⚠';
  } else if (log.includes('→') || log.includes('...') || log.includes('Starting') || log.includes('Waiting')) {
    type = 'info';
    icon = '→';
  }

  return { time, type, icon, message, raw: log };
}

function getLogCounts(logs: string[]): { all: number; success: number; warning: number; error: number; info: number } {
  const counts = { all: logs.length, success: 0, warning: 0, error: 0, info: 0 };
  logs.forEach(log => {
    const parsed = parseLog(log);
    counts[parsed.type]++;
  });
  return counts;
}

export function renderLogs({ logs, t }: LogsProps): string {
  const allLogs = logs || [];
  const counts = getLogCounts(allLogs);
  const hasErrors = counts.error > 0;
  const hasWarnings = counts.warning > 0;

  // Render log lines with enhanced formatting
  const logLines = allLogs.slice(-200).map(log => {
    const parsed = parseLog(log);
    return `<div class="console-line ${parsed.type}" data-type="${parsed.type}">
            <span class="console-icon">${parsed.icon}</span>
            ${parsed.time ? `<span class="console-time">${parsed.time}</span>` : ''}
            <span class="console-msg">${escapeHtml(parsed.message)}</span>
        </div>`;
  }).join('');

  return `
    <div class="console-drawer" id="logsDrawer">
      <div class="console-header" onclick="toggleLogs()">
        <div class="console-header-left">
          <span class="console-title">${t.console || 'Console'}</span>
          <span class="console-badge${hasErrors ? ' error' : hasWarnings ? ' warning' : ''}" id="logsCount">${counts.all}</span>
        </div>
        <div class="console-header-right">
          <span class="console-toggle-icon">▲</span>
        </div>
      </div>
      
      <div class="console-toolbar">
        <div class="console-filters">
          <button class="console-filter active" data-filter="all" onclick="filterConsole('all')">
            All <span class="filter-count">${counts.all}</span>
          </button>
          <button class="console-filter" data-filter="error" onclick="filterConsole('error')">
            <span class="filter-icon error">❌</span> <span class="filter-count">${counts.error}</span>
          </button>
          <button class="console-filter" data-filter="warning" onclick="filterConsole('warning')">
            <span class="filter-icon warning">⚠</span> <span class="filter-count">${counts.warning}</span>
          </button>
          <button class="console-filter" data-filter="success" onclick="filterConsole('success')">
            <span class="filter-icon success">✓</span> <span class="filter-count">${counts.success}</span>
          </button>
        </div>
        <div class="console-actions">
          <button class="console-btn" onclick="clearConsole()" title="${t.clearTip || 'Clear'}">
            <span>🗑</span>
          </button>
          <button class="console-btn" onclick="copyLogs()" title="${t.copyLogsTip || 'Copy'}">
            <span>📋</span>
          </button>
        </div>
      </div>
      
      <div class="console-body" id="logsContent">${logLines}</div>
    </div>
  `;
}
