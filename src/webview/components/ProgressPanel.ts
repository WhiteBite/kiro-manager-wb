/**
 * Progress Panel Component
 */

import { escapeHtml } from '../helpers';
import { Language, getTranslations } from '../i18n';

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

export function renderProgressPanel({ progress, statusText, language = 'en' }: ProgressPanelProps): string {
  const t = getTranslations(language);
  
  // Localized button labels
  const cancelLabel = language === 'ru' ? 'Отмена' : language === 'zh' ? '取消' : 'Cancel';
  const pauseLabel = language === 'ru' ? 'Пауза' : language === 'zh' ? '暂停' : 'Pause';
  const resumeLabel = language === 'ru' ? 'Продолжить' : language === 'zh' ? '继续' : 'Resume';
  
  if (progress) {
    const percentage = (progress.step / progress.totalSteps) * 100;
    const isPaused = progress.detail?.includes('Paused') || progress.detail?.includes('Пауза') || progress.detail?.includes('暂停');
    
    return `
      <div class="progress-panel">
        <div class="progress-header">
          <div class="progress-title">${escapeHtml(progress.stepName)}</div>
          <div class="progress-actions">
            <button class="progress-btn ${isPaused ? 'paused' : ''}" onclick="togglePauseAutoReg()" title="${isPaused ? resumeLabel : pauseLabel}">
              ${isPaused ? '▶' : '⏸'}
            </button>
            <button class="progress-btn danger" onclick="stopAutoReg()" title="${cancelLabel}">
              ✕
            </button>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${isPaused ? 'paused' : ''}" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-footer">
          <div class="progress-detail">${escapeHtml(progress.detail)}</div>
          <div class="progress-step">${t.step} ${progress.step}/${progress.totalSteps}</div>
        </div>
      </div>
    `;
  }

  if (statusText) {
    const isRunning = statusText.includes('Installing') || statusText.includes('Initializing') || statusText.includes('Установка') || statusText.includes('安装');
    return `
      <div class="progress-panel">
        <div class="progress-header">
          <div class="progress-title">${escapeHtml(statusText)}</div>
          ${isRunning ? `
            <div class="progress-actions">
              <button class="progress-btn danger" onclick="stopAutoReg()" title="${cancelLabel}">
                ✕
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return '';
}
