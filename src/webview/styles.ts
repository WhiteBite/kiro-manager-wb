/**
 * Webview Styles
 * All CSS styles for the sidebar panel
 * 
 * Architecture:
 * - Modular styles are in ./styles/ folder
 * - This file re-exports getAllStyles for backward compatibility
 */

import { getAllStyles } from './styles/index';

export function getStyles(): string {
  return getAllStyles();
}
