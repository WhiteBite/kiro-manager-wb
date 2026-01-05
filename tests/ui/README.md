# UI Tests for Kiro Account Manager

UI tests for the standalone web application using Playwright and Page Object Model pattern.

## Structure

```
tests/ui/
├── pages/                    # Page Object Model classes
│   ├── __init__.py
│   ├── base_page.py         # Base class with common methods
│   ├── main_page.py         # Main application page
│   ├── settings_page.py     # Settings overlay
│   ├── profiles_page.py     # Profiles panel & editor
│   └── console_page.py      # Console/logs drawer
│
├── conftest.py              # Pytest fixtures
├── pytest.ini               # Pytest configuration
│
├── test_smoke.py            # Smoke tests (quick sanity checks)
├── test_main_page.py        # Main page tests
├── test_settings.py         # Settings tests
├── test_profiles.py         # Profiles tests
├── test_console.py          # Console tests
│
├── AUDIT_REPORT.md          # Framework audit report
└── README.md                # This file
```

## Prerequisites

1. Install dependencies:
```bash
pip install pytest pytest-asyncio playwright
playwright install chromium
```

2. Start the standalone server:
```bash
cd autoreg
python -m app.main
# Server runs at http://127.0.0.1:8420
```

## Running Tests

### Run all tests
```bash
cd tests/ui
pytest
```

### Run in headless mode (for CI/CD)
```bash
HEADLESS=true pytest
```

### Run specific test file
```bash
pytest test_main_page.py
pytest test_settings.py
pytest test_profiles.py
pytest test_console.py
```

### Run smoke tests only
```bash
pytest -m smoke
```

### Run with verbose output
```bash
pytest -v
```

### Run single test
```bash
pytest test_main_page.py::TestHero::test_hero_visible
```

## Test Coverage

### test_smoke.py (Smoke Tests)
- `test_page_loads` - Page loads without errors
- `test_no_console_errors` - No JS errors on load
- `test_settings_opens_without_errors` - Settings opens correctly
- `test_settings_card_expands` - Settings cards expand/collapse
- `test_hero_visible` - Hero section is visible
- `test_toolbar_visible` - Toolbar is visible
- `test_logs_drawer_exists` - Logs drawer exists

### test_main_page.py
- **TestHero**: Hero visibility, click refresh, value display
- **TestToolbar**: Toolbar visibility, search, select mode
- **TestAccountList**: Account list existence
- **TestFAB**: FAB container and visibility
- **TestLogsDrawer**: Drawer toggle, count badge
- **TestHeader**: Header visibility and title

### test_settings.py
- `test_settings_opens` - Settings overlay opens
- `test_settings_closes` - Settings closes on button click
- `test_all_cards_present` - All settings cards are present
- `test_card_expand_collapse` - Cards expand/collapse
- `test_spoofing_toggle` - Spoofing toggle works
- `test_language_selector` - Language selection works
- `test_patch_status_displays` - Patch status is displayed
- `test_card_titles_visible` - Card titles are visible
- `test_settings_overlay_structure` - Overlay has proper structure

### test_profiles.py
- `test_profiles_panel_opens` - Profiles panel opens
- `test_create_profile_button` - Create profile button works
- `test_profile_editor_opens` - Profile editor opens
- `test_strategy_selection` - Strategy selection works
- `test_profile_editor_closes` - Profile editor closes
- `test_strategy_options_count` - Has 3 strategy options
- `test_pool_config_visibility` - Pool config visibility
- `test_profile_name_input` - Profile name input works
- `test_profiles_panel_closes` - Panel closes correctly
- `test_default_strategy_is_single` - Default strategy is single

### test_console.py
- `test_console_opens` - Console opens
- `test_console_clear` - Console clear works
- `test_console_filters` - All filters work
- `test_console_filter_*` - Individual filter tests
- `test_console_toggle` - Toggle expand/collapse
- `test_console_logs_count_badge` - Logs count badge
- `test_console_content_area` - Content area exists
- `test_console_scroll_to_bottom` - Scroll functionality

## Page Object Model

Each page object encapsulates:
- **Selectors**: CSS selectors for UI elements
- **Actions**: Methods to interact with the page
- **Assertions**: Methods to verify page state

Example usage:
```python
async def test_settings_opens(app, settings_page):
    """Settings overlay should open when clicking settings button."""
    await app.open_settings()
    assert await settings_page.is_visible(), "Settings overlay should be visible"
```

## Writing New Tests

1. Use existing Page Objects or create new ones in `pages/`
2. Use fixtures from `conftest.py` (`app`, `settings_page`, etc.)
3. Add docstrings describing what the test verifies
4. Use descriptive assertion messages

Example:
```python
async def test_my_feature(app: MainPage, settings_page: SettingsPage):
    """Description of what this test verifies.
    
    Verifies:
    - First condition
    - Second condition
    """
    # Arrange
    await settings_page.open()
    
    # Act
    await settings_page.some_action()
    
    # Assert
    assert await settings_page.some_condition(), "Descriptive error message"
```

## Debugging

### Take screenshots
```python
await app.screenshot("debug_screenshot.png")
```

### Print page content
```python
content = await app.page.content()
print(content)
```

### Slow down execution
```python
await app.page.wait_for_timeout(2000)  # 2 seconds
```
