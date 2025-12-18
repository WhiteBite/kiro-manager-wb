# UI Audit TODO

## 🔴 Critical Bugs (Priority 1)

- [x] **Memory Leak in AccountsProvider** - Add dispose() method and cleanup subscription
- [x] **Sync Calls Blocking Event Loop** - Replace spawnSync with async spawn in autoreg.ts
- [x] **Virtual List + Groups Conflict** - Disabled for grouped lists (threshold=200)

## 🟡 Architecture (Priority 2)

- [x] **Schema Versioning** - Add version field to imap-profiles.json (v2 with migrations)
- [x] **SecretStorage Integration** - Store tokens in VS Code SecretStorage (optional)
- [x] **Performance Audit** - Limit DOM logs to 100 lines (already 200 in scripts.ts)

## 🟢 UI/UX Improvements (Priority 3)

- [x] **Tab Navigation** - Replace overlays with tabs (Accounts | Profiles | Settings)
- [x] **Skeleton Screens** - Add loading skeletons for account list
- [x] **Switching Feedback** - Show loader when switching accounts
- [x] **Contextual Toolbars** - Bulk actions already hidden until selection mode
- [x] **Auto-Switch Rules UI** - Add threshold setting (usageThreshold: 10-490)

## 🔵 Design Polish (Priority 4)

- [x] **Hero Redesign** - Large remaining counter with warning/critical states
- [x] **FAB for Auto-reg** - Floating action button
- [x] **Hover Actions** - Account buttons already show only on hover
- [x] **Settings Cards** - Group settings into visual cards
- [x] **Stats Dashboard** - New tab with usage charts

## 📝 i18n & Cleanup

- [x] **Add 'remaining' translation** - Added to all 10 locales
- [x] **Full i18n Audit** - All new strings translated to 10 languages
- [x] **CSS Variables Cleanup** - Centralized color palette with shadows and z-index

## ✅ Completed in v6.2.0 release

1. Ban status persistence to disk
2. Memory leak fix (dispose pattern)
3. Async spawn instead of spawnSync
4. Skeleton loading states
5. Switching feedback (spinner)
6. Schema versioning for profiles (v2)
7. Auto-switch threshold setting
8. Webview message handlers for incremental updates
9. Hero redesign with large remaining counter
10. Warning/critical states with animations
11. Patcher v5.0 - patch all getMachineId functions
12. Registration flow fixes (cookies, window size, input)


## ✅ Completed in v6.3.0 release

1. Tab Navigation - Accounts | Profiles | Stats | Settings
2. FAB (Floating Action Button) for auto-registration
3. Settings Cards - grouped into Automation/Interface sections
4. Stats Dashboard - usage overview, weekly chart, account health
5. SecretStorage module for secure token storage
6. Virtual List conflict fix (disabled for grouped lists)
7. CSS Variables cleanup - shadows, z-index layers
8. Full i18n - all new strings translated to 10 languages

## ✅ Completed in v6.3.2 release

1. Fix "undefined" in TabBar labels (nullish coalescing)
2. FAB visibility - only on Accounts tab
3. FAB pulse animation when idle, glow when running
4. Incremental Hero updates (no full refresh during registration)
5. Empty search state with "No accounts found" message
6. Auto-switch threshold input in Settings
7. Stats skeleton loading state
8. Console drawer state preserved during updates

## ✅ Completed in v6.3.3 release

1. CAPTCHA detection on password page (_check_captcha, _check_captcha_error)
2. CAPTCHA handling with manual solving support (_handle_captcha)
3. Debug recorder integration in browser.py (navigate, enter_*, click_allow_access)
4. Debug session recording with screenshots and HTML (DEBUG_RECORDING=1)
5. Check Health button already works - uses CodeWhisperer API to detect bans
6. Ban status persisted to disk via markAccountAsBanned -> saveAccountUsage
