"""
Base Page Object with common functionality.
"""

from typing import Optional
from playwright.async_api import Page, Locator, expect


class BasePage:
    """Base class for all Page Objects."""
    
    # Base URL for standalone app
    BASE_URL = "http://127.0.0.1:8420"
    
    def __init__(self, page: Page) -> None:
        """Initialize base page.
        
        Args:
            page: Playwright page instance
        """
        self.page = page
    
    async def navigate(self) -> None:
        """Navigate to the base URL."""
        await self.page.goto(self.BASE_URL, wait_until="networkidle")
    
    async def wait_for_scripts(self, timeout: int = 5000) -> bool:
        """Wait for page scripts to be loaded.
        
        Args:
            timeout: Maximum time to wait in milliseconds
            
        Returns:
            True if scripts loaded, False otherwise
        """
        try:
            await self.page.wait_for_function(
                "typeof window.openSettings === 'function'",
                timeout=timeout
            )
            return True
        except Exception:
            return False
    
    async def get_element(self, selector: str) -> Locator:
        """Get element by selector.
        
        Args:
            selector: CSS selector
            
        Returns:
            Playwright Locator
        """
        return self.page.locator(selector)
    
    async def is_visible(self, selector: str) -> bool:
        """Check if element is visible.
        
        Args:
            selector: CSS selector
            
        Returns:
            True if visible, False otherwise
        """
        try:
            return await self.page.locator(selector).is_visible()
        except Exception:
            return False
    
    async def click(self, selector: str) -> None:
        """Click on element.
        
        Args:
            selector: CSS selector
        """
        await self.page.locator(selector).click()
    
    async def get_text(self, selector: str) -> str:
        """Get text content of element.
        
        Args:
            selector: CSS selector
            
        Returns:
            Text content
        """
        return await self.page.locator(selector).text_content() or ""
    
    async def wait_for_element(
        self, 
        selector: str, 
        state: str = "visible",
        timeout: int = 5000
    ) -> bool:
        """Wait for element to reach specified state.
        
        Args:
            selector: CSS selector
            state: Expected state (visible, hidden, attached, detached)
            timeout: Maximum time to wait
            
        Returns:
            True if element reached state, False otherwise
        """
        try:
            await self.page.locator(selector).wait_for(state=state, timeout=timeout)
            return True
        except Exception:
            return False
    
    async def get_console_errors(self) -> list[str]:
        """Get JavaScript console errors.
        
        Returns:
            List of error messages
        """
        errors = []
        self.page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        return errors
    
    async def screenshot(self, path: str) -> None:
        """Take screenshot.
        
        Args:
            path: Path to save screenshot
        """
        await self.page.screenshot(path=path, full_page=True)
    
    async def count(self, selector: str) -> int:
        """Get count of elements matching selector.
        
        Args:
            selector: CSS selector
            
        Returns:
            Number of matching elements
        """
        return await self.page.locator(selector).count()
    
    async def fill(self, selector: str, value: str) -> None:
        """Fill input field with value.
        
        Args:
            selector: CSS selector
            value: Value to fill
        """
        await self.page.fill(selector, value)
    
    async def get_attribute(self, selector: str, attribute: str) -> str | None:
        """Get attribute value of element.
        
        Args:
            selector: CSS selector
            attribute: Attribute name
            
        Returns:
            Attribute value or None
        """
        element = self.page.locator(selector)
        if await element.count() == 0:
            return None
        return await element.get_attribute(attribute)
    
    async def has_class(self, selector: str, class_name: str) -> bool:
        """Check if element has specific class.
        
        Args:
            selector: CSS selector
            class_name: Class name to check
            
        Returns:
            True if element has the class
        """
        classes = await self.get_attribute(selector, "class") or ""
        return class_name in classes.split()
