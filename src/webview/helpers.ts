/**
 * Helper functions for webview
 */

import { AccountInfo } from '../types';

/* === HTML Escaping === */

/**
 * Escapes HTML special characters to prevent XSS attacks.
 * Server-side version using string replacement.
 * @param text - The raw text to escape
 * @returns HTML-safe string with special characters escaped
 * @example
 * escapeHtml('<script>alert("xss")</script>') // => '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* === Account Helpers === */

/**
 * Extracts the display email from an account info object.
 * Falls back to account name or filename if email is not available.
 * @param acc - The account info object
 * @returns The email address or fallback identifier
 * @example
 * getAccountEmail({ tokenData: { email: 'user@example.com' }, filename: 'acc.json' }) // => 'user@example.com'
 */
export function getAccountEmail(acc: AccountInfo): string {
  return acc.tokenData?.email || acc.tokenData?.accountName || acc.filename.replace('.json', '');
}

/* === Formatting Helpers === */

/**
 * Formats an expiry time string for display.
 * Returns 'Unknown' if the expiry string is empty or undefined.
 * @param expiresIn - The expiry time string
 * @returns Formatted expiry string or 'Unknown'
 * @example
 * formatExpiry('2 days') // => '2 days'
 * formatExpiry('') // => 'Unknown'
 */
export function formatExpiry(expiresIn: string): string {
  return expiresIn || 'Unknown';
}

/**
 * Formats a number with locale-specific thousand separators.
 * @param num - The number to format
 * @returns Locale-formatted number string
 * @example
 * formatNumber(1234567) // => '1,234,567' (in en-US locale)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/* === CSS Utilities === */

/**
 * Combines CSS class names, filtering out falsy values.
 * Useful for conditional class application.
 * @param classes - Class names or falsy values to filter
 * @returns Space-separated string of truthy class names
 * @example
 * classNames('btn', isActive && 'active', null, 'primary') // => 'btn active primary'
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
