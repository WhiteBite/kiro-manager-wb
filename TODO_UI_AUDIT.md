# UI Audit TODO

## 🔴 Critical Bugs (Priority 1)

- [x] **Memory Leak in AccountsProvider** - Add dispose() method and cleanup subscription
- [x] **Sync Calls Blocking Event Loop** - Replace spawnSync with async spawn in autoreg.ts
- [ ] **Virtual List + Groups Conflict** - Fix height calculation for mixed content

## 🟡 Architecture (Priority 2)

- [ ] **Schema Versioning** - Add version field to imap-profiles.json
- [ ] **SecretStorage Integration** - Store tokens in VS Code SecretStorage (optional)
- [ ] **Performance Audit** - Limit DOM logs to 100 lines

## 🟢 UI/UX Improvements (Priority 3)

- [ ] **Tab Navigation** - Replace overlays with tabs (Accounts | Profiles | Stats | Settings)
- [x] **Skeleton Screens** - Add loading skeletons for account list
- [x] **Switching Feedback** - Show loader when switching accounts
- [ ] **Contextual Toolbars** - Hide bulk actions until selection mode
- [ ] **Auto-Switch Rules UI** - Add threshold slider in settings

## 🔵 Design Polish (Priority 4)

- [ ] **Hero Redesign** - Radial progress, larger numbers
- [ ] **FAB for Auto-reg** - Floating action button
- [ ] **Hover Actions** - Show account buttons only on hover
- [ ] **Settings Cards** - Group settings into visual cards
- [ ] **Stats Dashboard** - New tab with usage charts

## 📝 i18n & Cleanup

- [ ] **Full i18n Audit** - Remove hardcoded strings
- [ ] **CSS Variables Cleanup** - Centralize color palette
