"""
Main Page Object for the standalone application.
"""

from playwright.async_api import Page
from .base_page import BasePage


class MainPage(BasePage):
    """Page Object for the main application page."""
    
    # === Selectors ===
    
    # App container
    APP_CONTAINER = ".app"
    
    # Header
    HEADER = ".header"
    HEADER_TITLE = ".header-title"
    HEADER_BADGE = ".header-badge"
    PATCH_INDICATOR = "#patchIndicator"
    
    # Hero section
    HERO = ".hero"
    HERO_VALUE = ".hero-value"
    HERO_LABEL = ".hero-label"
    HERO_PROGRESS = ".hero-progress"
    HERO_FOOTER = ".hero-footer"
    
    # Toolbar
    TOOLBAR = ".toolbar"
    TOOLBAR_BUTTONS = ".toolbar-buttons"
    SELECT_MODE_BTN = "#selectModeBtn"
    SEARCH_INPUT = "#searchInput"
    TOKEN_FILTER_SELECT = "#tokenFilterSelect"
    
    # Bulk actions
    BULK_ACTIONS_BAR = "#bulkActionsBar"
    BULK_COUNT = "#bulkCount"
    
    # Account list
    ACCOUNT_LIST = "#accountList"
    
    # FAB (Floating Action Button)
    FAB_CONTAINER = "#fabContainer"
    FAB_BUTTON = ".fab"
    FAB_PRIMARY = ".fab-primary"
    
    # Logs drawer
    LOGS_DRAWER = "#logsDrawer"
    LOGS_COUNT = "#logsCount"
    LOGS_CONTENT = "#logsContent"
    NEW_LOGS_INDICATOR = "#newLogsIndicator"
    CONSOLE_HEADER = ".console-header"
    
    # Settings button (in header actions)
    SETTINGS_BTN = ".header-actions .icon-btn[onclick*='openSettings']"
    SETTINGS_BTN_ALT = "button[onclick*='openSettings']"
    
    # Profiles button
    PROFILES_BTN = "button[onclick*='openProfilesPanel']"
    
    # Modals
    SSO_MODAL = "#ssoModal"
    DIALOG_OVERLAY = "#dialogOverlay"
    TOAST_CONTAINER = "#toastContainer"
    
    def __init__(self, page: Page) -> None:
        """Initialize main page."""
        super().__init__(page)
    
    async def load(self) -> bool:
        """Load the main page and wait for it to be ready.
        
        Returns:
            True if page loaded successfully
        """
        try:
            response = await self.page.goto(self.BASE_URL, wait_until="networkidle", timeout=15000)
            if response and response.status != 200:
                return False
            
            # Wait for scripts to load
            await self.wait_for_scripts()
            
            # Wait for app container
            await self.wait_for_element(self.APP_CONTAINER)
            
            return True
        except Exception:
            return False
    
    async def is_loaded(self) -> bool:
        """Check if page is fully loaded.
        
        Returns:
            True if page is loaded
        """
        return await self.is_visible(self.APP_CONTAINER)
    
    # === Hero Section ===
    
    async def is_hero_visible(self) -> bool:
        """Check if hero section is visible.
        
        Returns:
            True if hero is visible
        """
        return await self.is_visible(self.HERO)
    
    async def get_hero_value(self) -> str:
        """Get the main hero value (quota remaining).
        
        Returns:
            Hero value text
        """
        return await self.get_text(self.HERO_VALUE)
    
    async def click_hero(self) -> None:
        """Click on hero section to refresh quota."""
        await self.click(self.HERO)
    
    # === Toolbar ===
    
    async def is_toolbar_visible(self) -> bool:
        """Check if toolbar is visible.
        
        Returns:
            True if toolbar is visible
        """
        return await self.is_visible(self.TOOLBAR)
    
    async def is_select_mode_btn_visible(self) -> bool:
        """Check if select mode button is visible.
        
        Returns:
            True if button is visible
        """
        return await self.is_visible(self.SELECT_MODE_BTN)
    
    async def click_select_mode(self) -> None:
        """Click select mode button."""
        await self.click(self.SELECT_MODE_BTN)
    
    async def search_accounts(self, query: str) -> None:
        """Search for accounts.
        
        Args:
            query: Search query
        """
        await self.page.fill(self.SEARCH_INPUT, query)
    
    async def clear_search(self) -> None:
        """Clear search input."""
        await self.page.fill(self.SEARCH_INPUT, "")
    
    # === FAB ===
    
    async def is_fab_visible(self) -> bool:
        """Check if FAB container is visible.
        
        Returns:
            True if FAB is visible
        """
        # FAB is only visible on accounts tab
        fab = self.page.locator(self.FAB_CONTAINER)
        if await fab.count() == 0:
            return False
        
        # Check if not hidden via display:none
        style = await fab.get_attribute("style") or ""
        return "display: none" not in style and "display:none" not in style
    
    async def click_fab(self) -> None:
        """Click the FAB button to start autoreg."""
        await self.click(self.FAB_PRIMARY)
    
    # === Logs Drawer ===
    
    async def is_logs_drawer_visible(self) -> bool:
        """Check if logs drawer is visible (expanded).
        
        Returns:
            True if drawer is expanded
        """
        drawer = self.page.locator(self.LOGS_DRAWER)
        classes = await drawer.get_attribute("class") or ""
        return "expanded" in classes
    
    async def toggle_logs_drawer(self) -> None:
        """Toggle logs drawer open/closed."""
        await self.click(self.CONSOLE_HEADER)
    
    async def get_logs_count(self) -> str:
        """Get the logs count badge value.
        
        Returns:
            Logs count text
        """
        return await self.get_text(self.LOGS_COUNT)
    
    # === Settings ===
    
    async def open_settings(self) -> None:
        """Open settings overlay."""
        # Try to find settings button
        settings_btn = self.page.locator(self.SETTINGS_BTN)
        if await settings_btn.count() > 0:
            await settings_btn.click()
        else:
            # Fallback: use JavaScript
            await self.page.evaluate("""
                const overlay = document.getElementById('settingsOverlay');
                if (overlay) overlay.classList.add('visible');
            """)
    
    # === Profiles ===
    
    async def open_profiles_panel(self) -> None:
        """Open profiles panel."""
        profiles_btn = self.page.locator(self.PROFILES_BTN)
        if await profiles_btn.count() > 0:
            await profiles_btn.click()
        else:
            # Fallback: use JavaScript
            await self.page.evaluate("openProfilesPanel()")
    
    # === Header ===
    
    async def get_header_title(self) -> str:
        """Get header title text.
        
        Returns:
            Header title
        """
        return await self.get_text(self.HEADER_TITLE)
    
    async def get_account_count_badge(self) -> str:
        """Get account count from header badge.
        
        Returns:
            Badge text (e.g., "5/10")
        """
        return await self.get_text(self.HEADER_BADGE)
