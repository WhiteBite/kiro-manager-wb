"""
Tests for the console/logs drawer.

Tests cover:
- Console opening
- Console clearing
- Console filters (all, error, warning, success)
"""

import pytest
from playwright.async_api import Page

from .pages import MainPage, ConsolePage


async def test_console_opens(app: MainPage, console_page: ConsolePage):
    """Console drawer should open when header is clicked.
    
    Verifies:
    - Console drawer exists
    - Console can be expanded
    - Console header is clickable
    """
    # Console should exist
    assert await console_page.is_visible(), (
        "Console drawer should exist in DOM"
    )
    
    # Expand console
    await console_page.expand()
    
    assert await console_page.is_expanded(), (
        "Console drawer should be expanded after clicking header"
    )


async def test_console_clear(app: MainPage, console_page: ConsolePage):
    """Console clear button should clear all logs.
    
    Verifies:
    - Clear button exists
    - Clicking clear removes log entries
    """
    # Expand console first
    await console_page.expand()
    
    # Clear console
    await console_page.clear()
    
    # Wait for clear to take effect
    await app.page.wait_for_timeout(200)
    
    # Get log entries count after clear
    entries_count = await console_page.get_log_entries_count()
    
    # After clear, should have 0 or very few entries
    # (some system messages might appear immediately)
    assert entries_count <= 1, (
        f"Console should be cleared, but has {entries_count} entries"
    )


async def test_console_filters(app: MainPage, console_page: ConsolePage):
    """Console filters should work correctly.
    
    Verifies:
    - All filter buttons exist (all, error, warning, success)
    - Filters can be selected
    - Active filter changes
    """
    # Expand console
    await console_page.expand()
    
    # Check all filters exist
    filters = ["all", "error", "warning", "success"]
    
    for filter_type in filters:
        is_visible = await console_page.is_filter_visible(filter_type)
        assert is_visible, (
            f"Filter button '{filter_type}' should be visible"
        )
    
    # Test selecting each filter
    for filter_type in filters:
        await console_page.set_filter(filter_type)
        
        active = await console_page.get_active_filter()
        assert active == filter_type, (
            f"Active filter should be '{filter_type}', got '{active}'"
        )


async def test_console_filter_all(app: MainPage, console_page: ConsolePage):
    """'All' filter should show all log types.
    
    Verifies:
    - All filter can be selected
    - All filter is active after selection
    """
    # Expand console
    await console_page.expand()
    
    # Select 'all' filter
    await console_page.filter_all()
    
    active = await console_page.get_active_filter()
    assert active == "all", (
        f"Active filter should be 'all', got '{active}'"
    )


async def test_console_filter_errors(app: MainPage, console_page: ConsolePage):
    """'Error' filter should filter to error logs only.
    
    Verifies:
    - Error filter can be selected
    - Error filter is active after selection
    """
    # Expand console
    await console_page.expand()
    
    # Select 'error' filter
    await console_page.filter_errors()
    
    active = await console_page.get_active_filter()
    assert active == "error", (
        f"Active filter should be 'error', got '{active}'"
    )


async def test_console_filter_warnings(app: MainPage, console_page: ConsolePage):
    """'Warning' filter should filter to warning logs only.
    
    Verifies:
    - Warning filter can be selected
    - Warning filter is active after selection
    """
    # Expand console
    await console_page.expand()
    
    # Select 'warning' filter
    await console_page.filter_warnings()
    
    active = await console_page.get_active_filter()
    assert active == "warning", (
        f"Active filter should be 'warning', got '{active}'"
    )


async def test_console_filter_success(app: MainPage, console_page: ConsolePage):
    """'Success' filter should filter to success logs only.
    
    Verifies:
    - Success filter can be selected
    - Success filter is active after selection
    """
    # Expand console
    await console_page.expand()
    
    # Select 'success' filter
    await console_page.filter_success()
    
    active = await console_page.get_active_filter()
    assert active == "success", (
        f"Active filter should be 'success', got '{active}'"
    )


async def test_console_filters_count(app: MainPage, console_page: ConsolePage):
    """Should have exactly 4 filter buttons.
    
    Verifies:
    - Four filter buttons exist (all, error, warning, success)
    """
    # Expand console
    await console_page.expand()
    
    count = await console_page.get_filters_count()
    assert count == 4, (
        f"Should have exactly 4 filter buttons, found {count}"
    )


async def test_console_toggle(app: MainPage, console_page: ConsolePage):
    """Console should toggle between expanded and collapsed states.
    
    Verifies:
    - Console can be expanded
    - Console can be collapsed
    - State changes correctly
    """
    # Get initial state
    initial_expanded = await console_page.is_expanded()
    
    # Toggle
    await console_page.toggle()
    
    # State should change
    new_expanded = await console_page.is_expanded()
    assert new_expanded != initial_expanded, (
        "Console state should change after toggle"
    )
    
    # Toggle back
    await console_page.toggle()
    
    # Should return to initial state
    final_expanded = await console_page.is_expanded()
    assert final_expanded == initial_expanded, (
        "Console should return to initial state after double toggle"
    )


async def test_console_logs_count_badge(app: MainPage, console_page: ConsolePage):
    """Console should display logs count badge.
    
    Verifies:
    - Logs count badge exists
    - Badge shows a number
    """
    # Get logs count
    count = await console_page.get_logs_count()
    
    # Count should be a non-negative number
    assert count >= 0, (
        f"Logs count should be non-negative, got {count}"
    )


async def test_console_content_area(app: MainPage, console_page: ConsolePage):
    """Console should have a content area for logs.
    
    Verifies:
    - Logs content area exists
    - Content area is accessible
    """
    # Expand console
    await console_page.expand()
    
    # Check content area exists
    content_visible = await app.is_visible(console_page.LOGS_CONTENT)
    assert content_visible, (
        "Console logs content area should be visible when expanded"
    )


async def test_console_scroll_to_bottom(app: MainPage, console_page: ConsolePage):
    """Scroll to bottom button should work.
    
    Verifies:
    - Scroll to bottom functionality exists
    - Can be triggered without error
    """
    # Expand console
    await console_page.expand()
    
    # Scroll to bottom (should not throw error)
    await console_page.scroll_to_bottom()
    
    # If we got here without error, test passes
    assert True, "Scroll to bottom should work without error"
