/**
 * Webview HTML generation for the sidebar panel
 * v4.1 - Re-exports from modular architecture
 * 
 * This file maintains backward compatibility while using the new modular structure.
 * All actual implementation is in ./webview/ directory.
 */

// Re-export everything from the new modular structure
export { 
  generateWebviewHtml,
  RegProgress,
  AutoRegSettings,
} from './webview/index';
