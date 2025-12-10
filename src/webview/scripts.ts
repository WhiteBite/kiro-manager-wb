/**
 * Client-side scripts for webview
 */

import { generateStateScript } from './state';
import { generateVirtualListScript } from './virtualList';

export function generateWebviewScript(totalAccounts: number): string {
  return `
    const vscode = acquireVsCodeApi();
    let pendingAction = null;
    
    ${generateStateScript()}
    ${generateVirtualListScript()}
    
    // UI Actions
    function toggleCompact() {
      document.body.classList.toggle('compact');
      setState({ compact: document.body.classList.contains('compact') });
      vscode.postMessage({ command: 'toggleCompact' });
    }
    
    function openSettings() {
      const panel = document.getElementById('settingsPanel');
      panel.classList.toggle('visible');
      setState({ settingsOpen: panel.classList.contains('visible') });
    }
    
    function toggleAutoSwitch(enabled) {
      vscode.postMessage({ command: 'toggleAutoSwitch', enabled });
    }
    
    function updateSetting(key, value) {
      vscode.postMessage({ command: 'updateSetting', key, value });
    }
    
    function changeLanguage(lang) {
      vscode.postMessage({ command: 'setLanguage', language: lang });
    }
    
    function startAutoReg() {
      vscode.postMessage({ command: 'startAutoReg' });
    }
    
    function importToken() {
      vscode.postMessage({ command: 'importToken' });
    }
    
    function refresh() {
      vscode.postMessage({ command: 'refresh' });
    }
    
    function exportAccounts() {
      vscode.postMessage({ command: 'exportAccounts' });
    }
    
    function switchAccount(filename) {
      vscode.postMessage({ command: 'switchAccount', email: filename });
    }
    
    function copyToken(filename) {
      vscode.postMessage({ command: 'copyToken', email: filename });
    }
    
    function viewQuota(filename) {
      vscode.postMessage({ command: 'viewQuota', email: filename });
    }
    
    function clearConsole() {
      vscode.postMessage({ command: 'clearConsole' });
    }
    
    // Dialog
    function confirmDelete(filename) {
      pendingAction = { type: 'delete', filename };
      const lang = document.body.dataset.lang || 'en';
      const titles = { en: 'Delete Account', ru: 'Удалить аккаунт' };
      const texts = { en: 'Are you sure you want to delete this account?', ru: 'Вы уверены, что хотите удалить этот аккаунт?' };
      document.getElementById('dialogTitle').textContent = titles[lang] || titles.en;
      document.getElementById('dialogText').textContent = texts[lang] || texts.en;
      document.getElementById('dialogOverlay').classList.add('visible');
    }
    
    function closeDialog() {
      document.getElementById('dialogOverlay').classList.remove('visible');
      pendingAction = null;
    }
    
    function dialogAction() {
      if (pendingAction?.type === 'delete') {
        vscode.postMessage({ command: 'deleteAccount', email: pendingAction.filename });
      }
      closeDialog();
    }
    
    // Filtering & Sorting
    function filterAccounts(filter) {
      setState({ filter });
      document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.toLowerCase() === filter);
      });
      document.querySelectorAll('.card').forEach(card => {
        const isExpired = card.classList.contains('expired');
        const show = filter === 'all' || (filter === 'valid' && !isExpired) || (filter === 'expired' && isExpired);
        card.style.display = show ? '' : 'none';
      });
    }
    
    function sortAccounts(sort) {
      setState({ sort });
      vscode.postMessage({ command: 'sortAccounts', sort });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.getElementById('settingsPanel')?.classList.remove('visible');
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'r') { e.preventDefault(); refresh(); }
        if (e.key === 'n') { e.preventDefault(); startAutoReg(); }
        if (e.key === 'f') { e.preventDefault(); document.getElementById('searchInput')?.focus(); }
      }
    });
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      // Restore state
      const state = getState();
      if (state.compact) document.body.classList.add('compact');
      if (state.settingsOpen) document.getElementById('settingsPanel')?.classList.add('visible');
      if (state.filter !== 'all') filterAccounts(state.filter);
      
      // Auto-scroll console
      const consoleBody = document.getElementById('consoleBody');
      if (consoleBody) consoleBody.scrollTop = consoleBody.scrollHeight;
      
      // Init virtual list if needed
      initVirtualList(${totalAccounts});
    });
  `;
}
