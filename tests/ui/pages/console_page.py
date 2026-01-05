"""
Console Page Object for the logs drawer/console.
"""

from playwright.async_api import Page
from .base_page import BasePage


class ConsolePage(BasePage):
    """Page Object for the console/logs drawer."""
    
    # === Selectors ===
    
    # Console drawer
    LOGS_DRAWER = "#logsDrawer"
    LOGS_DRAWER_EXPANDED = "#logsDrawer.expanded"
    CONSOLE_HEADER = ".console-header"
    CONSOLE_TITLE = ".console-title"
    
    # Console content
    LOGS_CONTENT = "#logsContent"
    LOGS_COUNT = "#logsCount"
    NEW_LOGS_INDICATOR = "#newLogsIndicator"
    NEW_MESSAGES_BAR = "#newMessagesBar"
    
    # Console actions
    SCROLL_TO_BOTTOM_BTN = "#scrollToBottomBtn"
    CLEAR_CONSOLE_BTN = "button[onclick*='clearConsole']"
    
    # Console filters
    CONSOLE_FILTERS = ".console-filters"
    CONSOLE_FILTER = ".console-filter"
    CONSOLE_FILTER_ACTIVE = ".console-filter.active"
    FILTER_ALL = ".console-filter[data-filter='all']"
    FILTER_ERROR = ".console-filter[data-filter='error']"
    FILTER_WARNING = ".console-filter[data-filter='warning']"
    FILTER_SUCCESS = ".console-filter[data-filter='success']"
    
    # Log entries
    LOG_ENTRY = ".log-entry"
    LOG_ENTRY_ERROR = ".log-entry.error"
    LOG_ENTRY_WARNING = ".log-entry.warning"
    LOG_ENTRY_SUCCESS = ".log-entry.success"
    
    def __init__(self, page: Page) -> None:
        """Initialize console page."""
        super().__init__(page)
    
    async def is_expanded(self) -> bool:
        """Check if console drawer is expanded.
        
        Returns:
            True if console is expanded
        """
        drawer = self.page.locator(self.LOGS_DRAWER)
        if await drawer.count() == 0:
            return False
        
        classes = await drawer.get_attribute("class") or ""
        return "expanded" in classes
    
    async def is_visible(self) -> bool:
        """Check if console drawer is visible (exists in DOM).
        
        Returns:
            True if console drawer exists
        """
        return await self.page.locator(self.LOGS_DRAWER).count() > 0
    
    async def expand(self) -> None:
        """Expand the console drawer."""
        if not await self.is_expanded():
            await self.page.locator(self.CONSOLE_HEADER).click()
            await self.page.wait_for_timeout(300)
    
    async def collapse(self) -> None:
        """Collapse the console drawer."""
        if await self.is_expanded():
            await self.page.locator(self.CONSOLE_HEADER).click()
            await self.page.wait_for_timeout(300)
    
    async def toggle(self) -> None:
        """Toggle console drawer open/closed."""
        await self.page.locator(self.CONSOLE_HEADER).click()
        await self.page.wait_for_timeout(300)
    
    async def get_logs_count(self) -> int:
        """Get the logs count from badge.
        
        Returns:
            Number of logs
        """
        text = await self.page.locator(self.LOGS_COUNT).text_content() or "0"
        try:
            return int(text.strip())
        except ValueError:
            return 0
    
    async def get_log_entries_count(self) -> int:
        """Get number of log entries in console.
        
        Returns:
            Number of log entries
        """
        return await self.page.locator(self.LOG_ENTRY).count()
    
    async def get_logs_content(self) -> str:
        """Get all logs content text.
        
        Returns:
            Logs content text
        """
        return await self.page.locator(self.LOGS_CONTENT).text_content() or ""
    
    # === Clear Console ===
    
    async def clear(self) -> None:
        """Clear the console."""
        clear_btn = self.page.locator(self.CLEAR_CONSOLE_BTN)
        if await clear_btn.count() > 0 and await clear_btn.is_visible():
            await clear_btn.click()
        else:
            # Fallback: use JavaScript
            await self.page.evaluate("clearConsole()")
        await self.page.wait_for_timeout(200)
    
    async def is_clear_button_visible(self) -> bool:
        """Check if clear button is visible.
        
        Returns:
            True if clear button is visible
        """
        return await self.page.locator(self.CLEAR_CONSOLE_BTN).is_visible()
    
    # === Filters ===
    
    async def get_active_filter(self) -> str:
        """Get currently active filter.
        
        Returns:
            Active filter name (all, error, warning, success)
        """
        active = self.page.locator(self.CONSOLE_FILTER_ACTIVE)
        if await active.count() > 0:
            return await active.get_attribute("data-filter") or "all"
        return "all"
    
    async def set_filter(self, filter_type: str) -> None:
        """Set console filter.
        
        Args:
            filter_type: Filter type (all, error, warning, success)
        """
        selector = f".console-filter[data-filter='{filter_type}']"
        await self.page.locator(selector).click()
        await self.page.wait_for_timeout(200)
    
    async def filter_all(self) -> None:
        """Show all logs."""
        await self.set_filter("all")
    
    async def filter_errors(self) -> None:
        """Show only error logs."""
        await self.set_filter("error")
    
    async def filter_warnings(self) -> None:
        """Show only warning logs."""
        await self.set_filter("warning")
    
    async def filter_success(self) -> None:
        """Show only success logs."""
        await self.set_filter("success")
    
    async def is_filter_visible(self, filter_type: str) -> bool:
        """Check if filter button is visible.
        
        Args:
            filter_type: Filter type
            
        Returns:
            True if filter button is visible
        """
        selector = f".console-filter[data-filter='{filter_type}']"
        return await self.page.locator(selector).is_visible()
    
    async def get_filters_count(self) -> int:
        """Get number of filter buttons.
        
        Returns:
            Number of filter buttons
        """
        return await self.page.locator(self.CONSOLE_FILTER).count()
    
    # === Scroll ===
    
    async def scroll_to_bottom(self) -> None:
        """Scroll console to bottom."""
        btn = self.page.locator(self.SCROLL_TO_BOTTOM_BTN)
        if await btn.count() > 0 and await btn.is_visible():
            await btn.click()
        else:
            await self.page.evaluate("scrollConsoleToBottom()")
        await self.page.wait_for_timeout(100)
    
    async def is_new_messages_bar_visible(self) -> bool:
        """Check if new messages bar is visible.
        
        Returns:
            True if new messages bar is visible
        """
        bar = self.page.locator(self.NEW_MESSAGES_BAR)
        if await bar.count() == 0:
            return False
        
        # Check if not hidden
        classes = await bar.get_attribute("class") or ""
        return "visible" in classes or await bar.is_visible()
