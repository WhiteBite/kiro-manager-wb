"""
Smoke тесты - быстрая проверка что приложение работает.

Запуск только smoke тестов:
    pytest tests/ui/test_smoke.py -v
    
Запуск в headless режиме:
    HEADLESS=true pytest tests/ui/test_smoke.py -v
"""
import pytest

from .pages import MainPage, SettingsPage


@pytest.mark.smoke
class TestSmoke:
    """Базовые smoke тесты."""
    
    @pytest.mark.asyncio
    async def test_page_loads(self, app: MainPage):
        """Страница должна загружаться без ошибок.
        
        Verifies:
        - Страница загружается
        - App container присутствует
        - Основные элементы видимы
        """
        # Проверяем что страница загрузилась
        assert await app.is_loaded(), "Страница должна загрузиться"
        
        # Проверяем основные элементы
        assert await app.is_visible(app.APP_CONTAINER), "App container должен быть видим"
        assert await app.is_visible(app.HEADER), "Header должен быть видим"
    
    @pytest.mark.asyncio
    async def test_no_console_errors(self, app: MainPage, console_errors: list):
        """Не должно быть ошибок в консоли при загрузке.
        
        Verifies:
        - Нет JavaScript ошибок при загрузке
        """
        # Даём время на загрузку скриптов
        await app.page.wait_for_timeout(500)
        
        # Проверяем что нет критических ошибок
        critical_errors = [e for e in console_errors if "error" in e.lower() or "exception" in e.lower()]
        
        assert len(critical_errors) == 0, (
            f"Не должно быть JS ошибок при загрузке. Найдено: {critical_errors}"
        )
    
    @pytest.mark.asyncio
    async def test_settings_opens_without_errors(self, app: MainPage, console_errors: list):
        """Settings должен открываться без ошибок.
        
        Verifies:
        - Settings overlay открывается
        - Нет JS ошибок при открытии
        """
        # Открываем settings
        await app.open_settings()
        await app.page.wait_for_timeout(300)
        
        # Проверяем что overlay видим
        settings_visible = await app.is_visible("#settingsOverlay.visible")
        assert settings_visible, "Settings overlay должен открыться"
        
        # Проверяем что нет ошибок
        errors_after = [e for e in console_errors if "toggleSettingsCard" in e or "openSettings" in e]
        assert len(errors_after) == 0, (
            f"Не должно быть ошибок при открытии Settings: {errors_after}"
        )
    
    @pytest.mark.asyncio
    async def test_settings_card_expands(self, settings_page: SettingsPage, console_errors: list):
        """Settings card должен разворачиваться без ошибки toggleSettingsCard.
        
        Verifies:
        - Карточка разворачивается по клику
        - Нет ошибки toggleSettingsCard is not defined
        """
        # Открываем settings
        await settings_page.open()
        
        # Получаем начальное состояние
        initial_collapsed = await settings_page.get_collapsed_cards_count()
        
        # Кликаем по первой карточке
        await settings_page.click_first_card_header()
        
        # Проверяем что состояние изменилось
        new_collapsed = await settings_page.get_collapsed_cards_count()
        
        # Проверяем что нет ошибки toggleSettingsCard
        toggle_errors = [e for e in console_errors if "toggleSettingsCard" in e]
        assert len(toggle_errors) == 0, (
            f"Не должно быть ошибки toggleSettingsCard: {toggle_errors}"
        )
        
        # Состояние должно измениться (карточка развернулась или свернулась)
        total_cards = await settings_page.get_cards_count()
        if total_cards > 0:
            assert new_collapsed != initial_collapsed or total_cards == 1, (
                "Состояние карточки должно измениться после клика"
            )
    
    @pytest.mark.asyncio
    async def test_hero_visible(self, app: MainPage):
        """Hero секция должна быть видима.
        
        Verifies:
        - Hero компонент отображается
        """
        assert await app.is_hero_visible(), "Hero секция должна быть видима"
    
    @pytest.mark.asyncio
    async def test_toolbar_visible(self, app: MainPage):
        """Toolbar должен быть видим.
        
        Verifies:
        - Toolbar отображается
        - Кнопки toolbar видимы
        """
        assert await app.is_toolbar_visible(), "Toolbar должен быть видим"
    
    @pytest.mark.asyncio
    async def test_logs_drawer_exists(self, app: MainPage):
        """Logs drawer должен существовать.
        
        Verifies:
        - Logs drawer присутствует в DOM
        """
        drawer_exists = await app.is_visible(app.LOGS_DRAWER)
        assert drawer_exists, "Logs drawer должен существовать"
