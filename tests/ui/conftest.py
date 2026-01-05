"""
Pytest fixtures для UI тестов standalone приложения.
Использует Playwright для browser automation.
"""
import asyncio
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import AsyncGenerator, Generator

import pytest
import pytest_asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright

from .pages import MainPage, SettingsPage, ProfilesPage, ConsolePage

# Пути
PROJECT_ROOT = Path(__file__).parent.parent.parent
AUTOREG_DIR = PROJECT_ROOT / "autoreg"
DEBUG_DIR = AUTOREG_DIR / "debug_sessions"

# Конфигурация
STANDALONE_URL = "http://127.0.0.1:8420"
STANDALONE_PORT = 8420
SERVER_STARTUP_TIMEOUT = 10  # секунд

# Headless режим через переменную окружения (для CI/CD)
HEADLESS = os.environ.get("HEADLESS", "false").lower() in ("true", "1", "yes")

# Таймауты (в миллисекундах)
ANIMATION_TIMEOUT = 300
SHORT_TIMEOUT = 200
DEFAULT_WAIT_TIMEOUT = 5000


# === Pytest Configuration ===

def pytest_configure(config):
    """Создать директорию для debug артефактов."""
    DEBUG_DIR.mkdir(parents=True, exist_ok=True)


# === Event Loop ===

@pytest.fixture(scope="session")
def event_loop():
    """Создать event loop для всей сессии тестов."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# === Playwright Fixtures ===

@pytest_asyncio.fixture(scope="session")
async def playwright() -> AsyncGenerator[Playwright, None]:
    """Playwright instance для всей сессии."""
    async with async_playwright() as p:
        yield p


@pytest_asyncio.fixture(scope="session")
async def browser(playwright: Playwright) -> AsyncGenerator[Browser, None]:
    """
    Browser instance для всей сессии тестов.
    Использует системный Chrome для лучшей совместимости.
    
    Headless режим можно включить через переменную окружения:
        HEADLESS=true pytest tests/ui/
    """
    browser = await playwright.chromium.launch(
        headless=HEADLESS,
        channel="chrome",  # Использовать системный Chrome
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
        ]
    )
    yield browser
    await browser.close()


@pytest_asyncio.fixture
async def context(browser: Browser) -> AsyncGenerator[BrowserContext, None]:
    """
    Browser context для каждого теста.
    Изолирует состояние между тестами.
    """
    context = await browser.new_context(
        viewport={"width": 1400, "height": 900},
        locale="en-US",
    )
    yield context
    await context.close()


@pytest_asyncio.fixture
async def page(context: BrowserContext) -> AsyncGenerator[Page, None]:
    """
    Page instance для каждого теста.
    """
    page = await context.new_page()
    
    # Собираем console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg) if msg.type == "error" else None)
    page.on("pageerror", lambda err: console_errors.append(err))
    
    yield page
    
    # После теста можно проверить console_errors
    await page.close()


# === Server Fixtures ===

def _is_server_running() -> bool:
    """Проверить запущен ли standalone сервер."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", STANDALONE_PORT)) == 0


def _wait_for_server(timeout: int = SERVER_STARTUP_TIMEOUT) -> bool:
    """Ожидать запуска сервера."""
    start = time.time()
    while time.time() - start < timeout:
        if _is_server_running():
            return True
        time.sleep(0.5)
    return False


@pytest.fixture(scope="session")
def standalone_server() -> Generator[str, None, None]:
    """
    Запустить standalone сервер если он не запущен.
    Возвращает URL сервера.
    
    Если сервер уже запущен - использует его.
    Если нет - запускает через `python -m autoreg.app`.
    """
    if _is_server_running():
        # Сервер уже запущен
        yield STANDALONE_URL
        return
    
    # Запускаем сервер
    process = subprocess.Popen(
        [sys.executable, "-m", "autoreg.app"],
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    
    # Ждём запуска
    if not _wait_for_server():
        process.terminate()
        pytest.fail(f"Standalone server failed to start within {SERVER_STARTUP_TIMEOUT}s")
    
    yield STANDALONE_URL
    
    # Останавливаем сервер
    process.terminate()
    process.wait(timeout=5)


@pytest_asyncio.fixture
async def app(page: Page, standalone_server: str) -> AsyncGenerator[MainPage, None]:
    """
    Полностью инициализированное приложение.
    Открывает страницу и ждёт загрузки.
    
    Returns:
        MainPage instance готовый к использованию
    """
    main_page = MainPage(page)
    await main_page.navigate()
    yield main_page


# === Page Object Fixtures ===

@pytest_asyncio.fixture
async def main_page(app: MainPage) -> MainPage:
    """MainPage fixture (alias для app)."""
    return app


@pytest_asyncio.fixture
async def settings_page(app: MainPage) -> SettingsPage:
    """SettingsPage fixture - открывает Settings."""
    settings = SettingsPage(app.page)
    await settings.open()
    return settings


@pytest_asyncio.fixture
async def profiles_page(app: MainPage) -> ProfilesPage:
    """ProfilesPage fixture - открывает Profiles."""
    profiles = ProfilesPage(app.page)
    await profiles.switch_to_profiles_tab()
    return profiles


@pytest_asyncio.fixture
async def console_page(app: MainPage) -> ConsolePage:
    """ConsolePage fixture для тестов консоли."""
    from .pages import ConsolePage
    return ConsolePage(app.page)


# === Screenshot on Failure ===

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook для создания скриншота при падении теста.
    Скриншоты сохраняются в autoreg/debug_sessions/.
    """
    outcome = yield
    report = outcome.get_result()
    
    if report.when == "call" and report.failed:
        # Получаем page из fixtures
        page = item.funcargs.get("page") or item.funcargs.get("app")
        if page and hasattr(page, "page"):
            page = page.page
        
        if page:
            # Создаём скриншот
            test_name = item.name.replace("[", "_").replace("]", "_")
            screenshot_path = DEBUG_DIR / f"failure_{test_name}.png"
            
            # Синхронный вызов через новый event loop
            try:
                screenshot_loop = asyncio.new_event_loop()
                try:
                    screenshot_loop.run_until_complete(
                        page.screenshot(path=str(screenshot_path))
                    )
                    print(f"\n📸 Screenshot saved: {screenshot_path}")
                finally:
                    screenshot_loop.close()
            except Exception as e:
                print(f"\n⚠️ Failed to save screenshot: {e}")


# === Utility Fixtures ===

@pytest.fixture
def debug_dir() -> Path:
    """Путь к директории для debug артефактов."""
    return DEBUG_DIR


@pytest_asyncio.fixture
async def console_errors(page: Page) -> list:
    """
    Собирает console errors во время теста.
    
    Usage:
        async def test_no_errors(app, console_errors):
            # ... do something ...
            assert len(console_errors) == 0
    """
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda err: errors.append(str(err)))
    return errors


# === Markers ===

def pytest_collection_modifyitems(config, items):
    """Добавить маркеры к тестам."""
    for item in items:
        # Все тесты в tests/ui/ помечаем как ui
        if "ui" in str(item.fspath):
            item.add_marker(pytest.mark.ui)
        
        # Async тесты
        if asyncio.iscoroutinefunction(item.obj):
            item.add_marker(pytest.mark.asyncio)
