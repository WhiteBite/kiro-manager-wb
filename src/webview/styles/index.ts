/**
 * Styles Index - Combines all style modules
 * 
 * Architecture:
 * - variables.ts: CSS custom properties (design tokens)
 * - base.ts: Reset, typography, utilities
 * - components.ts: Buttons, inputs, toggles
 * - layout.ts: Hero, toolbar, list, overlays, modals, logs
 * - profiles.ts: IMAP profiles specific styles
 */

import { variables } from './variables';
import { base } from './base';
import { components } from './components';
import { layout } from './layout';
import { profiles } from './profiles';

// Re-export individual modules for selective imports
export { variables, base, components, layout, profiles };

/**
 * Get all styles combined
 * Used by the main webview
 */
export function getAllStyles(): string {
  return `
    ${variables}
    ${base}
    ${components}
    ${layout}
    ${profiles}
  `;
}

// Alias for backward compatibility
export const getStyles = getAllStyles;

/**
 * Get profile-related styles only
 * Used when rendering profile editor in isolation
 */
export function getProfileStyles(): string {
  return `
    ${variables}
    ${base}
    ${components}
    ${profiles}
  `;
}
