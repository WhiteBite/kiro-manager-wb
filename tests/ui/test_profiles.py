"""
Tests for the profiles panel and profile editor.

Tests cover:
- Profiles panel opening
- Create profile button
- Profile editor opening/closing
- Strategy selection (single, pool, catch_all)
"""

import pytest
from playwright.async_api import Page

from .pages import MainPage, ProfilesPage


async def test_profiles_panel_opens(app: MainPage, profiles_page: ProfilesPage):
    """Profiles panel should open when triggered.
    
    Verifies:
    - Profiles panel becomes visible
    - Panel has proper structure
    """
    # Open profiles panel
    await profiles_page.open_panel()
    
    assert await profiles_page.is_panel_visible(), (
        "Profiles panel should be visible after opening"
    )


async def test_create_profile_button(app: MainPage, profiles_page: ProfilesPage):
    """Create profile button should be present and clickable.
    
    Verifies:
    - Profiles panel can be opened
    - Create profile button exists
    - Clicking button opens editor
    """
    # Open profiles panel
    await profiles_page.open_panel()
    
    # Click create profile button
    await profiles_page.click_create_profile()
    
    # Editor should open
    assert await profiles_page.is_editor_visible(), (
        "Profile editor should open after clicking create profile button"
    )


async def test_profile_editor_opens(app: MainPage, profiles_page: ProfilesPage):
    """Profile editor should open correctly.
    
    Verifies:
    - Editor can be opened
    - Editor has profile name input
    - Editor has strategy selector
    """
    # Open profiles panel first
    await profiles_page.open_panel()
    
    # Open editor via create button
    await profiles_page.click_create_profile()
    
    assert await profiles_page.is_editor_visible(), (
        "Profile editor should be visible"
    )
    
    # Check for profile name input
    name_input_visible = await app.is_visible(profiles_page.PROFILE_NAME_INPUT)
    assert name_input_visible, (
        "Profile name input should be visible in editor"
    )
    
    # Check for strategy selector
    strategy_selector_visible = await app.is_visible(profiles_page.STRATEGY_SELECTOR)
    assert strategy_selector_visible, (
        "Strategy selector should be visible in editor"
    )


async def test_strategy_selection(app: MainPage, profiles_page: ProfilesPage):
    """Strategy selection should work for all strategy types.
    
    Verifies:
    - All three strategies are available (single, pool, catch_all)
    - Strategies can be selected
    - Selection is reflected in UI
    """
    # Open profiles panel and editor
    await profiles_page.open_panel()
    await profiles_page.click_create_profile()
    
    # Check all strategy options are visible
    strategies = ["single", "catch_all", "pool"]
    
    for strategy in strategies:
        is_visible = await profiles_page.is_strategy_option_visible(strategy)
        assert is_visible, (
            f"Strategy option '{strategy}' should be visible"
        )
    
    # Test selecting each strategy
    for strategy in strategies:
        await profiles_page.select_strategy(strategy)
        
        selected = await profiles_page.get_selected_strategy()
        assert selected == strategy, (
            f"Selected strategy should be '{strategy}', got '{selected}'"
        )


async def test_profile_editor_closes(app: MainPage, profiles_page: ProfilesPage):
    """Profile editor should close when back button is clicked.
    
    Verifies:
    - Editor can be opened
    - Editor can be closed
    - Editor is hidden after closing
    """
    # Open profiles panel and editor
    await profiles_page.open_panel()
    await profiles_page.click_create_profile()
    
    assert await profiles_page.is_editor_visible(), (
        "Editor should be visible before closing"
    )
    
    # Close editor
    await profiles_page.close_editor()
    
    assert not await profiles_page.is_editor_visible(), (
        "Profile editor should be hidden after closing"
    )


async def test_strategy_options_count(app: MainPage, profiles_page: ProfilesPage):
    """Should have exactly 3 strategy options.
    
    Verifies:
    - Three strategy options exist (single, catch_all, pool)
    """
    # Open profiles panel and editor
    await profiles_page.open_panel()
    await profiles_page.click_create_profile()
    
    count = await profiles_page.get_strategy_options_count()
    assert count == 3, (
        f"Should have exactly 3 strategy options, found {count}"
    )


async def test_pool_config_visibility(app: MainPage, profiles_page: ProfilesPage):
    """Pool config should be visible only when pool strategy is selected.
    
    Verifies:
    - Pool config is hidden for single strategy
    - Pool config is visible for pool strategy
    """
    # Open profiles panel and editor
    await profiles_page.open_panel()
    await profiles_page.click_create_profile()
    
    # Select single strategy
    await profiles_page.select_strategy("single")
    
    # Pool config should be hidden
    pool_visible = await profiles_page.is_pool_config_visible()
    assert not pool_visible, (
        "Pool config should be hidden when single strategy is selected"
    )
    
    # Select pool strategy
    await profiles_page.select_strategy("pool")
    
    # Pool config should be visible
    pool_visible = await profiles_page.is_pool_config_visible()
    assert pool_visible, (
        "Pool config should be visible when pool strategy is selected"
    )


async def test_profile_name_input(app: MainPage, profiles_page: ProfilesPage):
    """Profile name input should accept text.
    
    Verifies:
    - Can type in profile name input
    - Input value is stored
    """
    # Open profiles panel and editor
    await profiles_page.open_panel()
    await profiles_page.click_create_profile()
    
    # Set profile name
    test_name = "Test Profile"
    await profiles_page.set_profile_name(test_name)
    
    # Verify name is set (используем метод для получения значения из input)
    name = await profiles_page.get_profile_name_input()
    assert name == test_name, (
        f"Profile name should be '{test_name}', got '{name}'"
    )


async def test_profiles_panel_closes(app: MainPage, profiles_page: ProfilesPage):
    """Profiles panel should close when back button is clicked.
    
    Verifies:
    - Panel can be opened
    - Panel can be closed
    - Panel is hidden after closing
    """
    # Open profiles panel
    await profiles_page.open_panel()
    
    assert await profiles_page.is_panel_visible(), (
        "Panel should be visible before closing"
    )
    
    # Close panel
    await profiles_page.close_panel()
    
    assert not await profiles_page.is_panel_visible(), (
        "Profiles panel should be hidden after closing"
    )


async def test_default_strategy_is_single(app: MainPage, profiles_page: ProfilesPage):
    """Default strategy should be 'single' when opening editor.
    
    Verifies:
    - Single strategy is selected by default
    """
    # Open profiles panel and editor
    await profiles_page.open_panel()
    await profiles_page.click_create_profile()
    
    # Check default strategy
    selected = await profiles_page.get_selected_strategy()
    assert selected == "single", (
        f"Default strategy should be 'single', got '{selected}'"
    )
