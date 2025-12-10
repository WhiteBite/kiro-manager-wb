/**
 * Progress Panel Component
 */

import { escapeHtml } from '../helpers';
import { Language } from '../index';

export interface RegProgress {
  step: number;
  totalSteps: number;
  stepName: string;
  detail: string;
}

export interface ProgressPanelProps {
  progress: RegProgress | null;
  statusText: string;
  language?: Language;
}

const progressI18n = {
  en: { step: 'Step' },
  ru: { step: 'Шаг' },
};

export function renderProgressPanel({ progress, statusText, language = 'en' }: ProgressPanelProps): string {
  const t = progressI18n[language];
  
  if (progress) {
    const percentage = (progress.step / progress.totalSteps) * 100;
    return `
      <div class="progress-panel">
        <div class="progress-header">
          <div class="progress-title">${escapeHtml(progress.stepName)}</div>
          <div class="progress-step">${t.step} ${progress.step}/${progress.totalSteps}</div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-detail">${escapeHtml(progress.detail)}</div>
      </div>
    `;
  }

  if (statusText) {
    return `
      <div class="progress-panel">
        <div class="progress-header">
          <div class="progress-title">${escapeHtml(statusText)}</div>
        </div>
      </div>
    `;
  }

  return '';
}
