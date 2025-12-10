/**
 * Helper functions for webview
 */

import { AccountInfo } from '../types';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getAccountEmail(acc: AccountInfo): string {
  return acc.tokenData?.email || acc.tokenData?.accountName || acc.filename.replace('.json', '');
}

export function formatExpiry(expiresIn: string): string {
  return expiresIn || 'Unknown';
}

export function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
