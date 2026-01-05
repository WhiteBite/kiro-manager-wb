"""
Settings Page Object for the settings overlay.
"""

from playwright.async_api import Page
from .base_page import BasePage


class SettingsPage(BasePage):
    """Page Object for the settings overlay."""
    
    # === Selectors ===
    
    # Overlay
    SETTINGS_OVERLAY = "#settingsOverlay"
    SETTINGS_OVERLAY_VISIBLE = "#settingsOverlay.visible"
    OVERLAY_CONTENT = ".overlay-content"
    OVERLAY_HEADER = ".overlay-header"
    
    # Close button
    CLOSE_BTN = ".overlay-close"
    BACK_BTN = ".overlay-back"
    
    # Settings cards
    SETTINGS_CARD = ".settings-card"
    SETTINGS_CARD_HEADER = ".settings-card-header"
    SETTINGS_CARD_BODY = ".settings-card-body"
    SETTINGS_CARD_TITLE = ".settings-card-title"
    SETTINGS_CARD_COLLAPSED = ".settings-card.collapsed"
    
    # Specific cards (by title or content)
    CARD_ACTIVE_PROFILE = ".settings-card:has(.settings-card-title:text('Active Profile'))"
    CARD_AUTO_SWITCH = ".settings-card:has(.settings-card-title:text('Auto-switch'))"
    CARD_REGISTRATION = ".settings-card:has(.settings-card-title:text('Registration'))"
    CARD_PROXY = ".settings-card:has(.settings-card-title:text('Proxy'))"
    CARD_SPOOFING = ".settings-card:has(.settings-card-title:text('Spoofing'))"
    CARD_LANGUAGE = ".settings-card:has(.settings-card-title:text('Language'))"
    CARD_DANGER_ZONE = ".settings-card:has(.settings-card-title:text('Danger Zone'))"
    
    # Spoofing toggle
    SPOOFING_TOGGLE = "#spoofingToggle"
    SPOOF_DETAILS = "#spoofDetails"
    
    # Language selector
    LANGUAGE_SELECT = ".settings-card select"
    
    # Patch status
    PATCH_STATUS_TEXT = "#patchStatusText"
    PATCH_VERSION_INFO = "#patchVersionInfo"
    CURRENT_MACHINE_ID = "#currentMachineId"
    PATCH_KIRO_BTN = "#patchKiroBtn"
    UNPATCH_KIRO_BTN = "#unpatchKiroBtn"
    GENERATE_ID_BTN = "#generateIdBtn"
    
    # Active profile
    ACTIVE_PROFILE_CONTENT = "#activeProfileContent"
    
    # Proxy settings
    PROXY_ADDRESS_INPUT = "#proxyAddressInput"
    TEST_PROXY_BTN = "#testProxyBtn"
    USE_PROXY_TOGGLE = "#useProxyToggle"
    
    # Auto-switch settings
    AUTO_SWITCH_THRESHOLD = "#autoSwitchThreshold"
    AUTO_SWITCH_THRESHOLD_ROW = "#autoSwitchThresholdRow"
    
    # Registration settings
    OAUTH_PROVIDER_SELECT = "#oauthProviderSelect"
    DEFER_QUOTA_CHECK_OPTION = "#deferQuotaCheckOption"
    
    def __init__(self, page: Page) -> None:
        """Initialize settings page."""
        super().__init__(page)
    
    async def is_visible(self) -> bool:
        """Check if settings overlay is visible.
        
        Returns:
            True if settings overlay is visible
        """
        overlay = self.page.locator(self.SETTINGS_OVERLAY)
        if await overlay.count() == 0:
            return False
        
        classes = await overlay.get_attribute("class") or ""
        return "visible" in classes
    
    async def open(self) -> None:
        """Open settings overlay via JavaScript."""
        await self.page.evaluate("""
            const overlay = document.getElementById('settingsOverlay');
            if (overlay) overlay.classList.add('visible');
        """)
        await self.page.wait_for_timeout(300)
    
    async def close(self) -> None:
        """Close settings overlay."""
        close_btn = self.page.locator(self.CLOSE_BTN)
        if await close_btn.count() > 0 and await close_btn.is_visible():
            await close_btn.click()
        else:
            # Fallback: use JavaScript
            await self.page.evaluate("""
                const overlay = document.getElementById('settingsOverlay');
                if (overlay) overlay.classList.remove('visible');
            """)
        await self.page.wait_for_timeout(300)
    
    async def get_cards_count(self) -> int:
        """Get number of settings cards.
        
        Returns:
            Number of settings cards
        """
        return await self.page.locator(self.SETTINGS_CARD).count()
    
    async def get_card_headers_count(self) -> int:
        """Get number of settings card headers.
        
        Returns:
            Number of card headers
        """
        return await self.page.locator(self.SETTINGS_CARD_HEADER).count()
    
    async def get_collapsed_cards_count(self) -> int:
        """Get number of collapsed cards.
        
        Returns:
            Number of collapsed cards
        """
        return await self.page.locator(self.SETTINGS_CARD_COLLAPSED).count()
    
    async def click_first_card_header(self) -> None:
        """Click on the first settings card header to expand/collapse."""
        await self.page.locator(self.SETTINGS_CARD_HEADER).first.click()
        await self.page.wait_for_timeout(300)
    
    async def click_card_header(self, index: int) -> None:
        """Click on a specific card header by index.
        
        Args:
            index: Zero-based index of the card
        """
        await self.page.locator(self.SETTINGS_CARD_HEADER).nth(index).click()
        await self.page.wait_for_timeout(300)
    
    async def is_card_expanded(self, index: int) -> bool:
        """Check if a specific card is expanded.
        
        Args:
            index: Zero-based index of the card
            
        Returns:
            True if card is expanded (not collapsed)
        """
        card = self.page.locator(self.SETTINGS_CARD).nth(index)
        classes = await card.get_attribute("class") or ""
        return "collapsed" not in classes
    
    async def is_card_body_visible(self, index: int) -> bool:
        """Check if card body is visible.
        
        Args:
            index: Zero-based index of the card
            
        Returns:
            True if card body is visible
        """
        body = self.page.locator(self.SETTINGS_CARD_BODY).nth(index)
        return await body.is_visible()
    
    # === Spoofing ===
    
    async def is_spoofing_enabled(self) -> bool:
        """Check if spoofing toggle is enabled.
        
        Returns:
            True if spoofing is enabled
        """
        toggle = self.page.locator(self.SPOOFING_TOGGLE)
        return await toggle.is_checked()
    
    async def toggle_spoofing(self) -> None:
        """Toggle spoofing on/off."""
        await self.page.locator(self.SPOOFING_TOGGLE).click()
        await self.page.wait_for_timeout(200)
    
    async def set_spoofing(self, enabled: bool) -> None:
        """Set spoofing to specific state.
        
        Args:
            enabled: True to enable, False to disable
        """
        current = await self.is_spoofing_enabled()
        if current != enabled:
            await self.toggle_spoofing()
    
    # === Language ===
    
    async def get_selected_language(self) -> str:
        """Get currently selected language.
        
        Returns:
            Selected language value
        """
        select = self.page.locator(self.LANGUAGE_SELECT).first
        return await select.input_value()
    
    async def select_language(self, language: str) -> None:
        """Select a language.
        
        Args:
            language: Language code (e.g., 'en', 'ru', 'de')
        """
        await self.page.locator(self.LANGUAGE_SELECT).first.select_option(language)
        await self.page.wait_for_timeout(300)
    
    # === Patch Status ===
    
    async def get_patch_status(self) -> str:
        """Get patch status text.
        
        Returns:
            Patch status text
        """
        return await self.get_text(self.PATCH_STATUS_TEXT)
    
    async def is_patch_status_visible(self) -> bool:
        """Check if patch status is visible.
        
        Returns:
            True if patch status is visible
        """
        return await self.page.locator(self.PATCH_STATUS_TEXT).is_visible()
    
    async def get_machine_id(self) -> str:
        """Get current machine ID.
        
        Returns:
            Machine ID text
        """
        return await self.get_text(self.CURRENT_MACHINE_ID)
    
    # === Card Titles ===
    
    async def get_card_titles(self) -> list[str]:
        """Get all settings card titles.
        
        Returns:
            List of card titles
        """
        titles = []
        count = await self.page.locator(self.SETTINGS_CARD_TITLE).count()
        for i in range(count):
            title = await self.page.locator(self.SETTINGS_CARD_TITLE).nth(i).text_content()
            if title:
                titles.append(title.strip())
        return titles
    
    async def has_all_expected_cards(self) -> bool:
        """Check if all expected settings cards are present.
        
        Returns:
            True if all expected cards are present
        """
        titles = await self.get_card_titles()
        expected = [
            "Active Profile",
            "Auto-switch",
            "Registration",
            "Proxy",
            "Spoofing",
            "Language",
            "Danger Zone"
        ]
        
        # Check that all expected cards exist (case-insensitive partial match)
        for expected_title in expected:
            found = any(expected_title.lower() in title.lower() for title in titles)
            if not found:
                return False
        return True
