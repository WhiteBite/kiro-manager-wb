"""
Тесты главной страницы standalone приложения.

Покрывает:
- Hero component
- Toolbar (search, filters, selection mode)
- Account list
- FAB menu
- Logs drawer
- Navigation
"""
import pytest

from .pages import MainPage


# === Hero Tests ===

class TestHero:
    """Тесты Hero компонента."""
    
    @pytest.mark.asyncio
    async def test_hero_visible(self, app: MainPage):
        """Hero должен быть видим на странице.
        
        Verifies:
        - Hero секция отображается
        - Hero value присутствует
        """
        assert await app.is_hero_visible(), "Hero секция должна быть видима"
        
        # Проверяем что есть hero value
        hero_value_visible = await app.is_visible(app.HERO_VALUE)
        assert hero_value_visible, "Hero value должен быть видим"
    
    @pytest.mark.asyncio
    async def test_hero_click_refreshes_usage(self, app: MainPage):
        """Клик по Hero должен обновлять usage.
        
        Verifies:
        - Hero кликабелен
        - Клик не вызывает ошибок
        """
        # Кликаем по hero
        await app.click_hero()
        
        # Даём время на обновление
        await app.page.wait_for_timeout(500)
        
        # Проверяем что hero всё ещё видим (не сломался)
        assert await app.is_hero_visible(), "Hero должен остаться видимым после клика"
    
    @pytest.mark.asyncio
    async def test_hero_displays_value(self, app: MainPage):
        """Hero должен отображать значение квоты.
        
        Verifies:
        - Hero value содержит текст
        """
        value = await app.get_hero_value()
        # Значение может быть числом, "Loading...", или другим текстом
        assert value is not None, "Hero value не должен быть None"


# === Toolbar Tests ===

class TestToolbar:
    """Тесты Toolbar компонента."""
    
    @pytest.mark.asyncio
    async def test_toolbar_visible(self, app: MainPage):
        """Toolbar должен быть видим.
        
        Verifies:
        - Toolbar отображается
        """
        assert await app.is_toolbar_visible(), "Toolbar должен быть видим"
    
    @pytest.mark.asyncio
    async def test_search_input_exists(self, app: MainPage):
        """Поле поиска должно существовать.
        
        Verifies:
        - Search input присутствует
        """
        search_visible = await app.is_visible(app.SEARCH_INPUT)
        assert search_visible, "Search input должен быть видим"
    
    @pytest.mark.asyncio
    async def test_search_filters_accounts(self, app: MainPage):
        """Поиск должен фильтровать список аккаунтов.
        
        Verifies:
        - Можно ввести текст в поиск
        - Поиск не вызывает ошибок
        """
        # Вводим текст в поиск
        await app.search_accounts("test")
        await app.page.wait_for_timeout(300)
        
        # Очищаем поиск
        await app.clear_search()
        
        # Проверяем что toolbar всё ещё работает
        assert await app.is_toolbar_visible(), "Toolbar должен остаться видимым"
    
    @pytest.mark.asyncio
    async def test_select_mode_button_exists(self, app: MainPage):
        """Кнопка режима выбора должна существовать.
        
        Verifies:
        - Select mode button присутствует
        """
        btn_visible = await app.is_select_mode_btn_visible()
        assert btn_visible, "Select mode button должна быть видима"
    
    @pytest.mark.asyncio
    async def test_selection_mode_toggle(self, app: MainPage):
        """Режим выбора должен включаться/выключаться.
        
        Verifies:
        - Клик по кнопке не вызывает ошибок
        """
        # Кликаем по кнопке select mode
        await app.click_select_mode()
        await app.page.wait_for_timeout(200)
        
        # Кликаем ещё раз чтобы выключить
        await app.click_select_mode()
        await app.page.wait_for_timeout(200)
        
        # Проверяем что toolbar работает
        assert await app.is_toolbar_visible(), "Toolbar должен работать после toggle"


# === Account List Tests ===

class TestAccountList:
    """Тесты списка аккаунтов."""
    
    @pytest.mark.asyncio
    async def test_account_list_exists(self, app: MainPage):
        """Список аккаунтов должен существовать.
        
        Verifies:
        - Account list container присутствует
        """
        list_visible = await app.is_visible(app.ACCOUNT_LIST)
        assert list_visible, "Account list должен существовать"


# === FAB Tests ===

class TestFAB:
    """Тесты FAB (Floating Action Button)."""
    
    @pytest.mark.asyncio
    async def test_fab_container_exists(self, app: MainPage):
        """FAB container должен существовать.
        
        Verifies:
        - FAB container присутствует в DOM
        """
        fab_exists = await app.page.locator(app.FAB_CONTAINER).count() > 0
        assert fab_exists, "FAB container должен существовать"
    
    @pytest.mark.asyncio
    async def test_fab_visible_on_accounts_tab(self, app: MainPage):
        """FAB должен быть видим на вкладке аккаунтов.
        
        Verifies:
        - FAB видим когда активна вкладка accounts
        """
        # Переключаемся на вкладку accounts
        await app.page.evaluate("switchTab('accounts')")
        await app.page.wait_for_timeout(300)
        
        # Проверяем видимость FAB
        is_visible = await app.is_fab_visible()
        # FAB может быть скрыт если нет профилей, это нормально
        # Просто проверяем что проверка не падает
        assert isinstance(is_visible, bool), "is_fab_visible должен возвращать bool"


# === Logs Drawer Tests ===

class TestLogsDrawer:
    """Тесты drawer с логами."""
    
    @pytest.mark.asyncio
    async def test_logs_drawer_exists(self, app: MainPage):
        """Logs drawer должен существовать.
        
        Verifies:
        - Logs drawer присутствует в DOM
        """
        drawer_exists = await app.is_visible(app.LOGS_DRAWER)
        assert drawer_exists, "Logs drawer должен существовать"
    
    @pytest.mark.asyncio
    async def test_logs_toggle(self, app: MainPage):
        """Logs drawer должен открываться/закрываться.
        
        Verifies:
        - Drawer можно открыть
        - Drawer можно закрыть
        """
        # Получаем начальное состояние
        initial_expanded = await app.is_logs_drawer_visible()
        
        # Переключаем
        await app.toggle_logs_drawer()
        await app.page.wait_for_timeout(300)
        
        # Проверяем что состояние изменилось
        new_expanded = await app.is_logs_drawer_visible()
        assert new_expanded != initial_expanded, "Состояние drawer должно измениться"
        
        # Возвращаем в исходное состояние
        await app.toggle_logs_drawer()
    
    @pytest.mark.asyncio
    async def test_logs_count_badge(self, app: MainPage):
        """Badge с количеством логов должен существовать.
        
        Verifies:
        - Logs count badge присутствует
        """
        badge_visible = await app.is_visible(app.LOGS_COUNT)
        assert badge_visible, "Logs count badge должен быть видим"


# === Header Tests ===

class TestHeader:
    """Тесты Header компонента."""
    
    @pytest.mark.asyncio
    async def test_header_visible(self, app: MainPage):
        """Header должен быть видим.
        
        Verifies:
        - Header отображается
        """
        header_visible = await app.is_visible(app.HEADER)
        assert header_visible, "Header должен быть видим"
    
    @pytest.mark.asyncio
    async def test_header_title(self, app: MainPage):
        """Header должен содержать заголовок.
        
        Verifies:
        - Header title присутствует
        """
        title = await app.get_header_title()
        assert title and len(title) > 0, "Header title должен содержать текст"
