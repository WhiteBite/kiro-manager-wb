"""
Profiles Page Object - панель управления IMAP профилями.
"""
from playwright.async_api import Page

from .base_page import BasePage


class ProfilesPage(BasePage):
    """Page Object для Profiles panel/tab."""
    
    # === Селекторы: Panel ===
    PROFILES_PANEL = "#profilesPanel"
    PROFILES_PANEL_HEADER = ".profiles-panel-header"
    PROFILES_PANEL_TITLE = ".profiles-panel-title"
    PROFILES_CONTENT = "#profilesContent"
    PROFILES_BACK_BTN = ".profiles-panel-header .overlay-back"
    
    # === Селекторы: Tab Mode ===
    PROFILES_TAB = ".profiles-tab"
    PROFILES_LIST_CONTAINER = "#profilesListContainer"
    PROFILES_TITLE = ".profiles-title"
    
    # === Селекторы: Profile Cards ===
    PROFILE_CARD = ".profile-card"
    PROFILE_CARD_ACTIVE = ".profile-card.active"
    PROFILE_NAME = ".profile-name"
    PROFILE_EMAIL = ".profile-email"
    PROFILE_STRATEGY = ".profile-strategy"
    PROFILE_STATS = ".profile-stats"
    PROFILE_ACTIONS = ".profile-actions"

    # === Селекторы: Empty State ===
    PROFILES_EMPTY = ".profiles-empty"
    EMPTY_ICON = ".empty-icon"
    EMPTY_TEXT = ".empty-text"
    
    # === Селекторы: Create Button ===
    CREATE_PROFILE_BTN = "button[onclick*='createProfile']"
    ADD_PROFILE_BTN = ".profiles-header button"
    
    # === Селекторы: Profile Editor ===
    PROFILE_EDITOR = "#profileEditor"
    PROFILE_EDITOR_FORM = "#profileEditorForm"
    EDITOR_HEADER = ".editor-header"
    EDITOR_TITLE = ".editor-title"
    EDITOR_CONTENT = ".editor-content"
    EDITOR_FOOTER = ".editor-footer"
    EDITOR_BACK_BTN = ".editor-header button"
    
    # === Селекторы: Form Fields ===
    PROFILE_NAME_INPUT = "#profileName"
    IMAP_USER_INPUT = "#imapUser"
    IMAP_SERVER_INPUT = "#imapServer"
    IMAP_PORT_INPUT = "#imapPort"
    IMAP_PASSWORD_INPUT = "#imapPassword"
    PROVIDER_HINT = "#providerHint"
    TEST_CONNECTION_BTN = "#testConnectionBtn"
    
    # === Селекторы: Proxy Section ===
    PROXY_SECTION = "#proxySection"
    PROXY_ENABLED_CHECKBOX = "#proxyEnabled"
    PROXY_FIELDS = "#proxyFields"
    PROXY_URLS_INPUT = "#proxyUrls"
    PROXY_STATS = "#proxyStats"

    # === Селекторы: Strategy Selector ===
    STRATEGY_SELECTOR = ".strategy-selector"
    STRATEGY_OPTION = ".strategy-option"
    STRATEGY_OPTION_SELECTED = ".strategy-option.selected"
    STRATEGY_SINGLE = "[data-strategy='single']"
    STRATEGY_PLUS_ALIAS = "[data-strategy='plus_alias']"
    STRATEGY_CATCH_ALL = "[data-strategy='catch_all']"
    STRATEGY_POOL = "[data-strategy='pool']"
    
    # === Селекторы: Strategy Configs ===
    CATCH_ALL_CONFIG = "#catchAllConfig"
    CATCH_ALL_DOMAIN_INPUT = "#catchAllDomain"
    POOL_CONFIG = "#poolConfig"
    POOL_LIST = "#poolList"
    POOL_STATS = "#poolStats"
    NEW_POOL_EMAIL_INPUT = "#newPoolEmail"
    
    # === Селекторы: Form Buttons ===
    SAVE_BTN = ".editor-footer .btn-primary"
    CANCEL_BTN = ".editor-footer .btn-secondary"
    
    def __init__(self, page: Page):
        """Инициализация страницы профилей."""
        super().__init__(page)

    # === Navigation ===
    
    async def open(self) -> None:
        """Открыть панель профилей."""
        await self.page.evaluate("openProfilesPanel()")
        await self.wait_for_element(self.PROFILES_PANEL, state="visible")
    
    async def close(self) -> None:
        """Закрыть панель профилей."""
        await self.click(self.PROFILES_BACK_BTN)
        await self.wait_for_element(self.PROFILES_PANEL, state="hidden")
    
    async def is_open(self) -> bool:
        """Проверить открыта ли панель профилей."""
        return await self.is_visible(self.PROFILES_PANEL)
    
    async def switch_to_profiles_tab(self) -> None:
        """Переключиться на вкладку Profiles (tab mode)."""
        await self.page.evaluate("switchTab('profiles')")
        await self.wait_for_element(self.PROFILES_TAB, state="visible")
    
    # === Profile List ===
    
    async def get_profiles_count(self) -> int:
        """Получить количество профилей."""
        return await self.page.locator(self.PROFILE_CARD).count()
    
    async def is_empty(self) -> bool:
        """Проверить пуст ли список профилей."""
        return await self.is_visible(self.PROFILES_EMPTY)

    async def get_profile_name(self, index: int = 0) -> str:
        """Получить имя профиля по индексу."""
        return await self.page.locator(self.PROFILE_NAME).nth(index).text_content() or ""
    
    async def get_profile_email(self, index: int = 0) -> str:
        """Получить email профиля по индексу."""
        return await self.page.locator(self.PROFILE_EMAIL).nth(index).text_content() or ""
    
    async def select_profile(self, name: str) -> None:
        """Выбрать профиль по имени."""
        card = self.page.locator(f"{self.PROFILE_CARD}:has-text('{name}')")
        await card.click()
    
    async def select_profile_by_index(self, index: int = 0) -> None:
        """Выбрать профиль по индексу."""
        await self.page.locator(self.PROFILE_CARD).nth(index).click()
    
    async def get_active_profile_name(self) -> str | None:
        """Получить имя активного профиля."""
        if await self.count(self.PROFILE_CARD_ACTIVE) == 0:
            return None
        return await self.page.locator(f"{self.PROFILE_CARD_ACTIVE} {self.PROFILE_NAME}").text_content()
    
    async def is_profile_active(self, name: str) -> bool:
        """Проверить активен ли профиль."""
        card = self.page.locator(f"{self.PROFILE_CARD}:has-text('{name}')")
        classes = await card.get_attribute("class") or ""
        return "active" in classes.split()

    # === Profile Editor ===
    
    async def create_profile(self) -> None:
        """Открыть форму создания профиля."""
        await self.click(self.CREATE_PROFILE_BTN)
        await self.wait_for_element(self.PROFILE_EDITOR_FORM, state="visible")
    
    async def close_editor(self) -> None:
        """Закрыть редактор профиля."""
        await self.click(self.EDITOR_BACK_BTN)
        await self.wait_for_element(self.PROFILE_EDITOR_FORM, state="hidden")
    
    async def is_editor_open(self) -> bool:
        """Проверить открыт ли редактор."""
        return await self.is_visible(self.PROFILE_EDITOR_FORM)
    
    async def fill_profile_name(self, name: str) -> None:
        """Заполнить имя профиля."""
        await self.page.fill(self.PROFILE_NAME_INPUT, name)
    
    async def fill_imap_credentials(self, email: str, password: str, 
                                     server: str | None = None, port: int = 993) -> None:
        """Заполнить IMAP данные."""
        await self.page.fill(self.IMAP_USER_INPUT, email)
        await self.page.fill(self.IMAP_PASSWORD_INPUT, password)
        if server:
            await self.page.fill(self.IMAP_SERVER_INPUT, server)
        await self.page.fill(self.IMAP_PORT_INPUT, str(port))

    async def test_connection(self) -> None:
        """Тестировать IMAP соединение."""
        await self.click(self.TEST_CONNECTION_BTN)
    
    async def get_provider_hint(self) -> str:
        """Получить подсказку провайдера."""
        return await self.get_text(self.PROVIDER_HINT)
    
    # === Strategy Selection ===
    
    async def select_strategy(self, strategy: str) -> None:
        """Выбрать стратегию email (single, plus_alias, catch_all, pool)."""
        strategy_map = {
            "single": self.STRATEGY_SINGLE,
            "plus_alias": self.STRATEGY_PLUS_ALIAS,
            "catch_all": self.STRATEGY_CATCH_ALL,
            "pool": self.STRATEGY_POOL,
        }
        selector = strategy_map.get(strategy)
        if selector:
            await self.click(selector)
    
    async def get_selected_strategy(self) -> str | None:
        """Получить выбранную стратегию."""
        selected = self.page.locator(self.STRATEGY_OPTION_SELECTED)
        if await selected.count() == 0:
            return None
        return await selected.get_attribute("data-strategy")
    
    async def fill_catch_all_domain(self, domain: str) -> None:
        """Заполнить домен для catch-all стратегии."""
        await self.page.fill(self.CATCH_ALL_DOMAIN_INPUT, domain)

    async def add_pool_email(self, email: str) -> None:
        """Добавить email в pool."""
        await self.page.fill(self.NEW_POOL_EMAIL_INPUT, email)
        await self.page.keyboard.press("Enter")
    
    async def get_pool_emails_count(self) -> int:
        """Получить количество email в pool."""
        return await self.page.locator(f"{self.POOL_LIST} .pool-email").count()
    
    # === Proxy ===
    
    async def enable_proxy(self, enable: bool = True) -> None:
        """Включить/выключить прокси."""
        is_checked = await self.page.locator(self.PROXY_ENABLED_CHECKBOX).is_checked()
        if is_checked != enable:
            await self.click(self.PROXY_ENABLED_CHECKBOX)
    
    async def fill_proxy_urls(self, urls: str) -> None:
        """Заполнить URL прокси."""
        await self.enable_proxy(True)
        await self.page.fill(self.PROXY_URLS_INPUT, urls)
    
    # === Save/Cancel ===
    
    async def save_profile(self) -> None:
        """Сохранить профиль."""
        await self.click(self.SAVE_BTN)
    
    async def cancel_editing(self) -> None:
        """Отменить редактирование."""
        await self.click(self.CANCEL_BTN)
    
    # === Alias методы для совместимости с тестами ===
    
    async def open_panel(self) -> None:
        """Alias for open() - открыть панель профилей."""
        await self.open()
    
    async def is_panel_visible(self) -> bool:
        """Alias for is_open() - проверить видимость панели."""
        return await self.is_open()
    
    async def click_create_profile(self) -> None:
        """Alias for create_profile() - открыть форму создания."""
        await self.create_profile()
    
    async def is_editor_visible(self) -> bool:
        """Alias for is_editor_open() - проверить открыт ли редактор."""
        return await self.is_editor_open()
    
    async def close_panel(self) -> None:
        """Alias for close() - закрыть панель."""
        await self.close()
    
    async def is_strategy_option_visible(self, strategy: str) -> bool:
        """Проверить видимость опции стратегии.
        
        Args:
            strategy: Название стратегии (single, plus_alias, catch_all, pool)
            
        Returns:
            True если опция видима
        """
        strategy_map = {
            "single": self.STRATEGY_SINGLE,
            "plus_alias": self.STRATEGY_PLUS_ALIAS,
            "catch_all": self.STRATEGY_CATCH_ALL,
            "pool": self.STRATEGY_POOL,
        }
        selector = strategy_map.get(strategy)
        if not selector:
            return False
        return await self.is_visible(selector)
    
    async def get_strategy_options_count(self) -> int:
        """Получить количество опций стратегии.
        
        Returns:
            Количество опций
        """
        return await self.page.locator(self.STRATEGY_OPTION).count()
    
    async def is_pool_config_visible(self) -> bool:
        """Проверить видимость конфига pool.
        
        Returns:
            True если конфиг pool видим
        """
        return await self.is_visible(self.POOL_CONFIG)
    
    async def is_catch_all_config_visible(self) -> bool:
        """Проверить видимость конфига catch-all.
        
        Returns:
            True если конфиг catch-all видим
        """
        return await self.is_visible(self.CATCH_ALL_CONFIG)
    
    async def set_profile_name(self, name: str) -> None:
        """Alias for fill_profile_name() - установить имя профиля.
        
        Args:
            name: Имя профиля
        """
        await self.fill_profile_name(name)
    
    async def get_profile_name_input(self) -> str:
        """Получить значение из input имени профиля.
        
        Returns:
            Значение input
        """
        return await self.page.locator(self.PROFILE_NAME_INPUT).input_value()
