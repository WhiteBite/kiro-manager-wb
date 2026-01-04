/**
 * Layout Styles Index - Combines all layout modules
 * 
 * Responsive Architecture (100px - 1000px):
 * - Narrow (100-250px): Stream Deck mode - icons only, vertical stack
 * - Medium (250-500px): Standard sidebar - icons + text
 * - Wide (500-1000px): Dashboard - multi-column grid
 */

// Export individual modules
export { headerStyles } from './header';
export { heroStyles } from './hero';
export { toolbarStyles } from './toolbar';
export { accountListStyles } from './account-list';
export { modalsStyles } from './modals';
export { settingsStyles } from './settings';
export { logsStyles } from './logs';
export { tabsStyles } from './tabs';
export { toastStyles } from './toast';
export { skeletonStyles } from './skeleton';
export { autoRegStyles } from './autoreg';
export { settingsCardStyles } from './settings-card';
export { statsStyles } from './stats';
export { strategyStyles } from './strategy';
export { batchRegStyles } from './batch-reg';
export { responsiveStyles } from './responsive';

// Import for combining
import { headerStyles } from './header';
import { heroStyles } from './hero';
import { toolbarStyles } from './toolbar';
import { accountListStyles } from './account-list';
import { modalsStyles } from './modals';
import { settingsStyles } from './settings';
import { logsStyles } from './logs';
import { tabsStyles } from './tabs';
import { toastStyles } from './toast';
import { skeletonStyles } from './skeleton';
import { autoRegStyles } from './autoreg';
import { settingsCardStyles } from './settings-card';
import { statsStyles } from './stats';
import { strategyStyles } from './strategy';
import { batchRegStyles } from './batch-reg';
import { responsiveStyles } from './responsive';

/**
 * Combines all layout style modules into a single CSS string.
 * @returns Complete CSS string containing all layout styles
 */
export function getLayoutStyles(): string {
  return `
    ${headerStyles}
    ${heroStyles}
    ${toolbarStyles}
    ${accountListStyles}
    ${modalsStyles}
    ${settingsStyles}
    ${logsStyles}
    ${tabsStyles}
    ${toastStyles}
    ${skeletonStyles}
    ${autoRegStyles}
    ${settingsCardStyles}
    ${statsStyles}
    ${strategyStyles}
    ${batchRegStyles}
    ${responsiveStyles}
  `;
}

// Legacy export
export const layout = getLayoutStyles();
