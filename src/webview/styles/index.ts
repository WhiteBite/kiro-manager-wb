/**
 * Styles Index - Combines all style modules
 * 
 * Responsive Architecture (100px - 1000px):
 * - variables.ts: CSS custom properties with fluid scaling
 * - base.ts: Reset, typography, utilities
 * - components.ts: Buttons, inputs, toggles (touch-friendly)
 * - layout/: Layout modules with breakpoint-specific styles
 * - profiles.ts: IMAP profiles specific styles
 */

import { variables } from './variables';
import { base } from './base';
import { components } from './components';
import { 
  getLayoutStyles,
  autoRegStyles, 
  settingsCardStyles, 
  statsStyles, 
  responsiveStyles,
  strategyStyles,
  batchRegStyles
} from './layout/index';
import { profiles } from './profiles';

// Re-export individual modules
export { variables, base, components, profiles };

// Re-export layout modules
export { 
  getLayoutStyles,
  autoRegStyles, 
  settingsCardStyles, 
  statsStyles, 
  responsiveStyles,
  strategyStyles,
  batchRegStyles
} from './layout/index';

// Legacy export for backward compatibility
export const layout = getLayoutStyles();

/**
 * Combines all style modules into a single CSS string.
 * Includes fluid variables, base styles, components, layout, and responsive overrides.
 * @returns Complete CSS string containing all styles
 */
export function getAllStyles(): string {
  return `
    ${variables}
    ${base}
    ${components}
    ${getLayoutStyles()}
    ${profiles}
  `;
}

// Alias for backward compatibility
export const getStyles = getAllStyles;

/**
 * Gets only profile-related styles for isolated rendering.
 * @returns CSS string containing profile-related styles only
 */
export function getProfileStyles(): string {
  return `
    ${variables}
    ${base}
    ${components}
    ${profiles}
  `;
}
