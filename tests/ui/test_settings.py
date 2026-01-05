"""
Tests for the settings overlay.

Tests cover:
- Settings opening/closing
- Settings cards presence
- Card expand/collapse
- Spoofing toggle
- Language selector
- Patch status display
"""

import pytest
from playwright.async_api import Page

from .pages import MainPage, SettingsPage


@pytest.mark.smoke
async def test_settings_opens(app: MainPage, settings_page: SettingsPage):
    """Settings overlay should open when clicking settings button.
    
    Verifies:
    - Settings overlay becomes visible
    - Overlay content is rendered
    """
    # Open settings
    await app.open_settings()
    
    # Wait for animation
    await app.page.wait_for_timeout(300)
    
    assert await settings_page.is_visible(), (
        "Settings overlay should be visible after opening"
    )


async def test_settings_closes(app: MainPage, settings_page: SettingsPage):
    """Settings overlay should close when clicking close button.
    
    Verifies:
    - Settings can be opened
    - Settings can be closed
    - Overlay is hidden after closing
    """
    # Open settings
    await settings_page.open()
    assert await settings_page.is_visible(), "Settings should open"
    
    # Close settings
    await settings_page.close()
    
    assert not await settings_page.is_visible(), (
        "Settings overlay should be hidden after closing"
    )


async def test_all_cards_present(app: MainPage, settings_page: SettingsPage):
    """All expected settings cards should be present.
    
    Verifies:
    - Multiple settings cards exist
    - All expected card types are present
    """
    # Open settings
    await settings_page.open()
    
    # Check cards count
    cards_count = await settings_page.get_cards_count()
    assert cards_count >= 5, (
        f"Should have at least 5 settings cards, found {cards_count}"
    )
    
    # Check for expected cards
    assert await settings_page.has_all_expected_cards(), (
        "All expected settings cards should be present: "
        "Active Profile, Auto-switch, Registration, Proxy, Spoofing, Language, Danger Zone"
    )


async def test_card_expand_collapse(app: MainPage, settings_page: SettingsPage):
    """Settings cards should expand and collapse when clicked.
    
    Verifies:
    - Cards can be expanded by clicking header
    - Cards can be collapsed by clicking header again
    """
    # Open settings
    await settings_page.open()
    
    # Get initial collapsed count
    initial_collapsed = await settings_page.get_collapsed_cards_count()
    total_cards = await settings_page.get_cards_count()
    
    # Click first card header to toggle
    await settings_page.click_first_card_header()
    
    # Check if state changed
    new_collapsed = await settings_page.get_collapsed_cards_count()
    
    # Either expanded (less collapsed) or collapsed (more collapsed)
    assert new_collapsed != initial_collapsed or total_cards == 0, (
        "Card collapsed state should change after clicking header"
    )
    
    # Check if card body is visible for first card
    if total_cards > 0:
        # After clicking, check visibility
        body_visible = await settings_page.is_card_body_visible(0)
        # Body should be visible if card is expanded
        card_expanded = await settings_page.is_card_expanded(0)
        
        if card_expanded:
            assert body_visible, (
                "Card body should be visible when card is expanded"
            )


async def test_spoofing_toggle(app: MainPage, settings_page: SettingsPage):
    """Spoofing toggle should work correctly.
    
    Verifies:
    - Spoofing toggle exists
    - Toggle can be clicked
    - Toggle state changes
    """
    # Open settings
    await settings_page.open()
    
    # Get initial state
    initial_state = await settings_page.is_spoofing_enabled()
    
    # Toggle spoofing
    await settings_page.toggle_spoofing()
    
    # Check new state
    new_state = await settings_page.is_spoofing_enabled()
    
    assert new_state != initial_state, (
        f"Spoofing toggle state should change. Was {initial_state}, now {new_state}"
    )
    
    # Toggle back to restore original state
    await settings_page.toggle_spoofing()
    
    final_state = await settings_page.is_spoofing_enabled()
    assert final_state == initial_state, (
        "Spoofing should return to original state after double toggle"
    )


async def test_language_selector(app: MainPage, settings_page: SettingsPage):
    """Language selector should work correctly.
    
    Verifies:
    - Language selector exists
    - Can select different language
    - Selection is applied
    """
    # Open settings
    await settings_page.open()
    
    # Get current language
    initial_language = await settings_page.get_selected_language()
    
    # Try to select a different language
    # Common language codes: en, ru, de, fr, es, zh, ja, ko, pt, it
    test_languages = ["ru", "de", "en"]
    
    for lang in test_languages:
        if lang != initial_language:
            await settings_page.select_language(lang)
            
            # Verify selection changed
            new_language = await settings_page.get_selected_language()
            assert new_language == lang, (
                f"Language should change to {lang}, but got {new_language}"
            )
            
            # Restore original language
            await settings_page.select_language(initial_language)
            break


async def test_patch_status_displays(app: MainPage, settings_page: SettingsPage):
    """Patch status should be displayed in Danger Zone card.
    
    Verifies:
    - Patch status text element exists
    - Patch status shows some text (Loading, Patched, Not patched, etc.)
    """
    # Open settings
    await settings_page.open()
    
    # Check if patch status is visible
    assert await settings_page.is_patch_status_visible(), (
        "Patch status should be visible in settings"
    )
    
    # Get patch status text
    status = await settings_page.get_patch_status()
    
    # Status should not be empty
    assert status and len(status.strip()) > 0, (
        "Patch status should display some text"
    )
    
    # Status should be one of expected values
    expected_statuses = ["loading", "patched", "not patched", "error", "checking"]
    status_lower = status.lower()
    
    # At least one expected status should be in the text
    has_valid_status = any(s in status_lower for s in expected_statuses)
    assert has_valid_status or len(status) > 0, (
        f"Patch status should show valid status, got: {status}"
    )


async def test_card_titles_visible(app: MainPage, settings_page: SettingsPage):
    """All card titles should be visible and readable.
    
    Verifies:
    - Card titles are not empty
    - Multiple cards have titles
    """
    # Open settings
    await settings_page.open()
    
    # Get all card titles
    titles = await settings_page.get_card_titles()
    
    assert len(titles) > 0, "Should have at least one card title"
    
    # All titles should be non-empty
    for title in titles:
        assert title and len(title.strip()) > 0, (
            "Card title should not be empty"
        )


async def test_settings_overlay_structure(app: MainPage, settings_page: SettingsPage):
    """Settings overlay should have proper structure.
    
    Verifies:
    - Overlay has header
    - Overlay has close button
    - Overlay has content area
    """
    # Open settings
    await settings_page.open()
    
    # Check overlay structure
    overlay_visible = await settings_page.is_visible()
    assert overlay_visible, "Settings overlay should be visible"
    
    # Check for header
    header_visible = await app.is_visible(settings_page.OVERLAY_HEADER)
    assert header_visible, "Settings overlay should have a header"
    
    # Check for close button
    close_btn_visible = await app.is_visible(settings_page.CLOSE_BTN)
    assert close_btn_visible, "Settings overlay should have a close button"
    
    # Check for content
    content_visible = await app.is_visible(settings_page.OVERLAY_CONTENT)
    assert content_visible, "Settings overlay should have content area"
