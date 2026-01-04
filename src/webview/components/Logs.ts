/**
 * Enhanced Console Component v2
 * - Compact header with unified title/badge
 * - Icon-only filters (All | ❌ | ⚠ | ✓)
 * - Syntax highlighting for different log types
 * - Compact timestamps
 * - Message grouping for repeated logs
 * - Scroll to bottom button
 * - New messages indicator
 * - Smooth animations
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
  highlightedMessage: string;
}

/**
 * Apply syntax highlighting to log message
 */
function highlightMessage(message: string): string {
  let highlighted = escapeHtml(message);

  // Highlight paths (e.g., /path/to/file or C:\path\to\file)
  highlighted = highlighted.replace(
    /([A-Za-z]:)?[\/\\][\w\-\.\/\\]+/g,
    '<span class="hl-path">$&</span>'
  );

  // Highlight URLs
  highlighted = highlighted.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<span class="hl-url">$1</span>'
  );

  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+(?:\.\d+)?)\b/g,
    '<span class="hl-number">$1</span>'
  );

  // Highlight quoted strings
  highlighted = highlighted.replace(
    /(&quot;[^&]*&quot;|&#39;[^&]*&#39;|"[^"]*"|'[^']*')/g,
    '<span class="hl-string">$1</span>'
  );

  // Highlight keywords
  highlighted = highlighted.replace(
    /\b(SUCCESS|FAIL|ERROR|WARN|OK|DONE|START|STOP|TRUE|FALSE|NULL|NONE)\b/gi,
    '<span class="hl-keyword">$1</span>'
  );

  // Highlight email addresses
  highlighted = highlighted.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<span class="hl-email">$1</span>'
  );

  return highlighted;
}

function parseLog(log: string): ParsedLog {
  // Extract time if present [HH:MM:SS] or generate current
  const timeMatch = log.match(/^\[(\d{1,2}:\d{2}:\d{2})\s*[AP]?M?\]/i);
  const time = timeMatch ? timeMatch[1] : '';
  const message = timeMatch ? log.slice(timeMatch[0].length).trim() : log;

  // Determine type and icon
  let type: LogType = 'info';
  let icon = '→';

  if (log.includes('ERROR') || log.includes('FAIL') || log.includes('✗') || log.includes('❌')) {
    type = 'error';
    icon = '✗';
  } else if (log.includes('SUCCESS') || log.includes('✓') || log.includes('✅') || log.includes('[OK]')) {
    type = 'success';
    icon = '✓';
  } else if (log.includes('WARN') || log.includes('⚠') || log.includes('⛔')) {
    type = 'warning';
    icon = '!';
  } else if (log.includes('→') || log.includes('...') || log.includes('Starting') || log.includes('Waiting')) {
    type = 'info';
    icon = '›';
  }

  return {
    time,
    type,
    icon,
    message,
    raw: log,
    highlightedMessage: highlightMessage(message)
  };
}

interface GroupedLog extends ParsedLog {
  count: number;
}

/**
 * Group consecutive identical messages
 */
function groupLogs(logs: string[]): GroupedLog[] {
  const grouped: GroupedLog[] = [];

  logs.forEach(log => {
    const parsed = parseLog(log);
    const lastGroup = grouped[grouped.length - 1];

    // Group if same message (ignoring time)
    if (lastGroup && lastGroup.message === parsed.message && lastGroup.type === parsed.type) {
      lastGroup.count++;
      lastGroup.time = parsed.time; // Update to latest time
    } else {
      grouped.push({ ...parsed, count: 1 });
    }
  });

  return grouped;
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

  // Group and render log lines
  const groupedLogs = groupLogs(allLogs.slice(-200));
  const logLines = groupedLogs.map((log, index) => {
    const countBadge = log.count > 1
      ? `<span class="console-count">${log.count}</span>`
      : '';

    return `<div class="console-line ${log.type}" data-type="${log.type}" style="animation-delay: ${index * 0.02}s">
      <span class="console-icon">${log.icon}</span>
      ${log.time ? `<span class="console-time">${log.time}</span>` : ''}
      <span class="console-msg">${log.highlightedMessage}</span>
      ${countBadge}
    </div>`;
  }).join('');

  // Status indicator class
  const statusClass = hasErrors ? 'has-errors' : hasWarnings ? 'has-warnings' : '';

  return `
    <div class="console-drawer ${statusClass}" id="logsDrawer">
      <div class="console-header" onclick="toggleLogs()">
        <div class="console-header-left">
          <span class="console-title-group">
            <span class="console-icon-indicator ${statusClass}">⬤</span>
            <span class="console-title">${t.console || 'Console'}</span>
            <span class="console-badge ${hasErrors ? 'error' : hasWarnings ? 'warning' : ''}" id="logsCount">${counts.all}</span>
          </span>
          <span class="console-new-indicator" id="newLogsIndicator">● New</span>
        </div>
        <div class="console-header-right">
          <span class="console-toggle-icon">▲</span>
        </div>
      </div>
      
      <div class="console-toolbar">
        <div class="console-filters">
          <button class="console-filter active" data-filter="all" onclick="filterConsole('all')" title="All logs">
            <span class="filter-label">All</span>
            <span class="filter-count">${counts.all}</span>
          </button>
          <button class="console-filter ${counts.error > 0 ? 'has-items' : ''}" data-filter="error" onclick="filterConsole('error')" title="Errors">
            <span class="filter-icon error">✗</span>
            ${counts.error > 0 ? `<span class="filter-count">${counts.error}</span>` : ''}
          </button>
          <button class="console-filter ${counts.warning > 0 ? 'has-items' : ''}" data-filter="warning" onclick="filterConsole('warning')" title="Warnings">
            <span class="filter-icon warning">!</span>
            ${counts.warning > 0 ? `<span class="filter-count">${counts.warning}</span>` : ''}
          </button>
          <button class="console-filter ${counts.success > 0 ? 'has-items' : ''}" data-filter="success" onclick="filterConsole('success')" title="Success">
            <span class="filter-icon success">✓</span>
            ${counts.success > 0 ? `<span class="filter-count">${counts.success}</span>` : ''}
          </button>
        </div>
        <div class="console-actions">
          <button class="console-btn scroll-btn" onclick="scrollConsoleToBottom()" title="${t.scrollToBottom || 'Scroll to bottom'}" id="scrollToBottomBtn">
            <span>↓</span>
          </button>
          <button class="console-btn" onclick="clearConsole()" title="${t.clearTip || 'Clear'}">
            <span>🗑</span>
          </button>
          <button class="console-btn" onclick="copyLogs()" title="${t.copyLogsTip || 'Copy'}">
            <span>📋</span>
          </button>
        </div>
      </div>
      
      <div class="console-body" id="logsContent" onscroll="handleConsoleScroll()">${logLines}</div>
      
      <div class="console-new-messages" id="newMessagesBar" onclick="scrollConsoleToBottom()">
        <span>↓ New messages below</span>
      </div>
    </div>
  `;
}
