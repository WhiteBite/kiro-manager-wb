/**
 * Build Standalone Web App
 * 
 * Generates standalone HTML from the same components as VS Code extension.
 * Uses the SAME scripts as extension, just replaces vscode API with WebSocket.
 * 
 * Run with: npx ts-node scripts/build-standalone.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Import webview components - SAME as extension uses
import { getStyles } from '../src/webview/styles';
import { getTranslations } from '../src/webview/i18n';
import { renderHeader } from '../src/webview/components/Header';
import { renderHero } from '../src/webview/components/Hero';
import { renderToolbar } from '../src/webview/components/Toolbar';
import { renderSettings } from '../src/webview/components/Settings';
import { renderLogs } from '../src/webview/components/Logs';
import { renderModals } from '../src/webview/components/Modals';
import { renderProfileEditor } from '../src/webview/components/ProfileEditor';
import { generateWebviewScript } from '../src/webview/scripts';

const OUTPUT_DIR = path.join(__dirname, '../autoreg/app/static');

/**
 * Generate WebSocket adapter that replaces vscode.postMessage
 */
function generateWebSocketAdapter(): string {
  return `
    // === WebSocket Adapter for Standalone ===
    // Replaces vscode.postMessage with WebSocket
    
    let ws = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT = 5;
    
    function connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
      
      ws.onopen = () => {
        console.log('[WS] Connected');
        reconnectAttempts = 0;
        // Initial data load
        vscode.postMessage({ command: 'refresh' });
        vscode.postMessage({ command: 'getPatchStatus' });
        vscode.postMessage({ command: 'getActiveProfile' });
      };
      
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Dispatch to window.postMessage so extension script handles it
          window.dispatchEvent(new MessageEvent('message', { data: msg }));
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('[WS] Disconnected');
        if (reconnectAttempts < MAX_RECONNECT) {
          reconnectAttempts++;
          setTimeout(connectWebSocket, 1000 * reconnectAttempts);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    }
    
    // Mock vscode API - sends via WebSocket instead
    const vscode = {
      postMessage: (msg) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        } else {
          console.warn('[WS] Not connected, queuing:', msg.command);
        }
      },
      getState: () => {
        try {
          return JSON.parse(localStorage.getItem('kiro-state') || '{}');
        } catch { return {}; }
      },
      setState: (state) => {
        localStorage.setItem('kiro-state', JSON.stringify(state));
      }
    };
    
    // Override acquireVsCodeApi to return our mock
    function acquireVsCodeApi() {
      return vscode;
    }
    
    // Connect on load
    document.addEventListener('DOMContentLoaded', connectWebSocket);
  `;
}

function generateStandaloneHtml(): string {
  const t = getTranslations('en');
  
  // Get the SAME script that extension uses
  let extensionScript = generateWebviewScript(0, 0, t);
  
  // Remove the vscode API initialization line - we provide our own mock
  extensionScript = extensionScript.replace(
    /const vscode = acquireVsCodeApi\(\);?\s*/g,
    '// vscode API provided by WebSocket adapter above\n'
  );
  
  // Prepend WebSocket adapter (which provides mock vscode API)
  const fullScript = generateWebSocketAdapter() + '\n' + extensionScript;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kiro Account Manager</title>
  <style>${getStyles()}</style>
</head>
<body data-lang="en">
  <div class="app">
    ${renderHeader({ validCount: 0, totalCount: 0, t })}
    ${renderHero({ activeAccount: undefined, activeProfile: null, usage: null, progress: null, isRunning: false, t })}
    ${renderToolbar({ isRunning: false, t })}
    
    <div class="list" id="accountList">
      <div class="loading">Loading accounts...</div>
    </div>

    ${renderLogs({ logs: [], t })}
    ${renderSettings({ autoSwitchEnabled: false, settings: undefined, lang: 'en', t, version: 'standalone' })}
    ${renderModals({ t })}
    ${renderProfileEditor({ t })}
  </div>
  <div id="toastContainer" class="toast-container"></div>
  <script>${fullScript}</script>
</body>
</html>`;
}

// Main
function main() {
  console.log('Building standalone web app...');
  console.log('Using SAME scripts as VS Code extension (100% UI parity)');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Generate HTML
  const html = generateStandaloneHtml();
  const htmlPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✓ Generated: ${htmlPath}`);

  console.log('Done!');
}

main();
