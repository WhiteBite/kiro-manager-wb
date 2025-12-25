/**
 * Modal Components (SSO, Dialog, Toast)
 */

import { Translations } from '../i18n/types';

export interface ModalsProps {
  t: Translations;
}

function renderSsoModal(t: Translations): string {
  return `
    <div class="modal-overlay" id="ssoModal" onclick="if(event.target === this) closeSsoModal()">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${t.ssoImport}</span>
          <button class="modal-close" onclick="closeSsoModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-hint">${t.ssoHint}</div>
          <textarea class="modal-textarea" id="ssoTokenInput" placeholder="${t.pasteCookie}"></textarea>
          <button class="btn btn-primary" style="width:100%" onclick="importSsoToken()">${t.import}</button>
        </div>
      </div>
    </div>
  `;
}

function renderDeleteDialog(t: Translations): string {
  return `
    <div class="dialog-overlay" id="dialogOverlay" onclick="if(event.target === this) closeDialog()">
      <div class="dialog">
        <div class="dialog-title" id="dialogTitle">${t.deleteTitle}</div>
        <div class="dialog-text" id="dialogText">${t.deleteConfirm}</div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" onclick="closeDialog()">${t.cancel}</button>
          <button class="btn btn-danger" id="dialogConfirmBtn" onclick="dialogAction()">${t.delete}</button>
        </div>
      </div>
    </div>
  `;
}

function renderToastContainer(): string {
  return `<div class="toast-container" id="toastContainer"></div>`;
}

export function renderModals({ t }: ModalsProps): string {
  return `
    ${renderSsoModal(t)}
    ${renderDeleteDialog(t)}
    ${renderToastContainer()}
  `;
}
