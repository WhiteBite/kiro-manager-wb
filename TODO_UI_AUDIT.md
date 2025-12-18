# UI Audit TODO

## 🔴 Critical Bugs (Priority 1)

- [x] **Memory Leak in AccountsProvider** - Add dispose() method and cleanup subscription
- [x] **Sync Calls Blocking Event Loop** - Replace spawnSync with async spawn in autoreg.ts
- [ ] **Virtual List + Groups Conflict** - Fix height calculation for mixed content

## 🟡 Architecture (Priority 2)

- [x] **Schema Versioning** - Add version field to imap-profiles.json (v2 with migrations)
- [ ] **SecretStorage Integration** - Store tokens in VS Code SecretStorage (optional)
- [x] **Performance Audit** - Limit DOM logs to 100 lines (already 200 in scripts.ts)

## 🟢 UI/UX Improvements (Priority 3)

- [ ] **Tab Navigation** - Replace overlays with tabs (Accounts | Profiles | Stats | Settings)
- [x] **Skeleton Screens** - Add loading skeletons for account list
- [x] **Switching Feedback** - Show loader when switching accounts
- [x] **Contextual Toolbars** - Bulk actions already hidden until selection mode
- [x] **Auto-Switch Rules UI** - Add threshold setting (usageThreshold: 10-490)

## 🔵 Design Polish (Priority 4)

- [ ] **Hero Redesign** - Radial progress, larger numbers
- [ ] **FAB for Auto-reg** - Floating action button
- [x] **Hover Actions** - Account buttons already show only on hover
- [ ] **Settings Cards** - Group settings into visual cards
- [ ] **Stats Dashboard** - New tab with usage charts

## 📝 i18n & Cleanup

- [ ] **Full i18n Audit** - Remove hardcoded strings
- [ ] **CSS Variables Cleanup** - Centralize color palette

## ✅ Completed in this session

1. Ban status persistence to disk
2. Memory leak fix (dispose pattern)
3. Async spawn instead of spawnSync
4. Skeleton loading states
5. Switching feedback (spinner)
6. Schema versioning for profiles
7. Auto-switch threshold setting
8. Webview message handlers for incremental updates
