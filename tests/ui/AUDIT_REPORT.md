# UI Test Framework Audit Report

**Дата аудита:** 2024
**Версия фреймворка:** Playwright + pytest-asyncio + Page Object Model

---

## 📊 Общая оценка

| Категория | Оценка | Комментарий |
|-----------|--------|-------------|
| Архитектура POM | ⭐⭐⭐⭐ | Хорошая структура, есть дублирование |
| Fixtures | ⭐⭐⭐ | Работают, но есть проблемы |
| Покрытие тестами | ⭐⭐ | Много TODO, низкое покрытие |
| Качество кода | ⭐⭐⭐⭐ | Type hints есть, docstrings хорошие |
| CI/CD готовность | ⭐⭐⭐ | Headless возможен, нет retry |

---

## 🔴 Критические проблемы

### 1. ~~ProfilesPage: Несоответствие методов между Page Object и тестами~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/pages/profiles_page.py` и `tests/ui/test_profiles.py`

**Проблема:** Тесты вызывали методы, которых не было в ProfilesPage.

**Решение:** Добавлены alias методы в ProfilesPage для совместимости с тестами.

### 2. ~~ConsolePage fixture отсутствует~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/conftest.py`

**Проблема:** В conftest.py не было fixture `console_page`.

**Решение:** Добавлен `console_page` fixture.

### 3. ~~Screenshot on failure - race condition~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/conftest.py`

**Проблема:** Использование `asyncio.ensure_future()` могло привести к потере скриншотов.

**Решение:** Теперь используется отдельный event loop для синхронного сохранения скриншота.

### 4. ~~BasePage: отсутствует метод `count()`~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/pages/base_page.py`

**Проблема:** ProfilesPage использовал `self.count()`, но метод не был определён.

**Решение:** Добавлен метод `count()` и другие полезные методы в BasePage.

---

## 🟡 Средние проблемы

### 5. ~~Дублирование тестовых файлов~~ ✅ ИСПРАВЛЕНО

**Файлы:** `test_profiles.py` и `test_profiles_page.py`

**Решение:** Удалён `test_profiles_page.py` (содержал только TODO).

### 6. ~~Smoke тесты не реализованы~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/test_smoke.py`

**Решение:** Реализованы 7 smoke тестов.

### 7. ~~Main page тесты не реализованы~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/test_main_page.py`

**Решение:** Реализованы 14 тестов в 6 классах.

### 8. ~~Hardcoded headless=False~~ ✅ ИСПРАВЛЕНО

**Файл:** `tests/ui/conftest.py`

**Решение:** Добавлена переменная окружения `HEADLESS`:
```bash
HEADLESS=true pytest tests/ui/
```

### 9. Отсутствует retry механизм для flaky тестов

**Файл:** `tests/ui/pytest.ini`

**Проблема:** UI тесты часто бывают flaky из-за анимаций, сетевых задержек. Нет механизма retry.

**Рекомендация:** Добавить `pytest-rerunfailures`:
```bash
pip install pytest-rerunfailures
```
```ini
# В pytest.ini:
addopts = -v --tb=short --reruns=2 --reruns-delay=1
```

### 10. Нет генерации отчётов

**Проблема:** Не настроена генерация HTML/Allure отчётов для CI/CD.

**Рекомендация:**
```bash
pip install pytest-html
```
```ini
# В pytest.ini:
addopts = -v --tb=short --html=reports/report.html --self-contained-html
```

---

## 🟢 Низкие проблемы / Улучшения

### 11. Селекторы не вынесены в отдельный файл

**Проблема:** Селекторы определены как class attributes в каждом Page Object. При изменении UI нужно искать по всем файлам.

**Рекомендация:** Создать `tests/ui/selectors.py` с централизованными селекторами.

### 12. Нет тестов на негативные сценарии

**Проблема:** Отсутствуют тесты на:
- Невалидные данные в формах
- Сетевые ошибки
- Таймауты
- Пустые состояния

### 13. Нет accessibility тестов

**Проблема:** Не проверяется доступность UI (ARIA labels, keyboard navigation, contrast).

### 14. Нет visual regression тестов

**Проблема:** Нет проверки визуальных изменений (скриншот-сравнение).

### 15. Нет performance тестов

**Проблема:** Не измеряется время загрузки страницы, время отклика UI.

### 16. Magic numbers в коде

**Файл:** Множественные файлы

```python
await self.page.wait_for_timeout(300)  # Что это за число?
await self.page.wait_for_timeout(200)
```

**Рекомендация:** Вынести в константы с понятными именами.

### 17. Inconsistent naming

**Проблема:** Смешение стилей именования:
- `is_visible()` vs `is_open()` vs `is_expanded()`
- `open()` vs `expand()` vs `open_panel()`

---

## 📋 Список недостающих тестов

### Критические (должны быть реализованы)

1. **Smoke тесты:**
   - [ ] Загрузка страницы без JS ошибок
   - [ ] Отображение основных компонентов
   - [ ] Базовая навигация

2. **Main Page:**
   - [ ] Hero отображается и кликабелен
   - [ ] Toolbar функционирует (поиск, фильтры)
   - [ ] FAB видим и открывает меню
   - [ ] Logs drawer открывается/закрывается

3. **Profiles:**
   - [ ] IMAP валидация (неверный email, пустые поля)
   - [ ] Сохранение профиля
   - [ ] Удаление профиля
   - [ ] Редактирование существующего профиля

4. **Settings:**
   - [ ] Proxy настройки
   - [ ] Auto-switch настройки
   - [ ] Danger Zone действия (patch/unpatch)

### Желательные

5. **Негативные сценарии:**
   - [ ] Ошибка сети при загрузке
   - [ ] Невалидные IMAP credentials
   - [ ] Таймаут операций

6. **Edge cases:**
   - [ ] Очень длинные имена профилей
   - [ ] Специальные символы в полях
   - [ ] Множественные быстрые клики

7. **Accessibility:**
   - [ ] Keyboard navigation
   - [ ] Screen reader compatibility
   - [ ] Focus management

8. **Performance:**
   - [ ] Время загрузки < 3s
   - [ ] Время отклика UI < 100ms

---

## 🔧 Рекомендации по исправлению

### Приоритет 1: Критические исправления

#### 1.1 Добавить console_page fixture

```python
# В conftest.py добавить:
@pytest_asyncio.fixture
async def console_page(app: MainPage) -> ConsolePage:
    """ConsolePage fixture."""
    from .pages import ConsolePage
    return ConsolePage(app.page)
```

#### 1.2 Добавить метод count() в BasePage

```python
# В base_page.py добавить:
async def count(self, selector: str) -> int:
    """Get count of elements matching selector.
    
    Args:
        selector: CSS selector
        
    Returns:
        Number of matching elements
    """
    return await self.page.locator(selector).count()
```

#### 1.3 Добавить недостающие методы в ProfilesPage

```python
# Добавить в profiles_page.py:

async def open_panel(self) -> None:
    """Alias for open() - открыть панель профилей."""
    await self.open()

async def is_panel_visible(self) -> bool:
    """Alias for is_open() - проверить видимость панели."""
    return await self.is_open()

async def click_create_profile(self) -> None:
    """Alias for create_profile()."""
    await self.create_profile()

async def is_editor_visible(self) -> bool:
    """Alias for is_editor_open()."""
    return await self.is_editor_open()

async def close_panel(self) -> None:
    """Alias for close()."""
    await self.close()

async def is_strategy_option_visible(self, strategy: str) -> bool:
    """Проверить видимость опции стратегии."""
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
    """Получить количество опций стратегии."""
    return await self.page.locator(self.STRATEGY_OPTION).count()

async def is_pool_config_visible(self) -> bool:
    """Проверить видимость конфига pool."""
    return await self.is_visible(self.POOL_CONFIG)

async def set_profile_name(self, name: str) -> None:
    """Alias for fill_profile_name()."""
    await self.fill_profile_name(name)

async def get_profile_name_input(self) -> str:
    """Получить значение из input имени профиля."""
    return await self.page.locator(self.PROFILE_NAME_INPUT).input_value()
```

#### 1.4 Исправить screenshot on failure

```python
# Заменить проблемный код в conftest.py:
@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Hook для создания скриншота при падении теста."""
    outcome = yield
    report = outcome.get_result()
    
    if report.when == "call" and report.failed:
        page = item.funcargs.get("page") or item.funcargs.get("app")
        if page and hasattr(page, "page"):
            page = page.page
        
        if page:
            test_name = item.name.replace("[", "_").replace("]", "_")
            screenshot_path = DEBUG_DIR / f"failure_{test_name}.png"
            
            try:
                # Синхронный screenshot через новый event loop
                import asyncio
                loop = asyncio.new_event_loop()
                try:
                    loop.run_until_complete(page.screenshot(path=str(screenshot_path)))
                    print(f"\n📸 Screenshot saved: {screenshot_path}")
                finally:
                    loop.close()
            except Exception as e:
                print(f"\n⚠️ Failed to save screenshot: {e}")
```

### Приоритет 2: Средние улучшения

#### 2.1 Добавить headless через env variable

```python
# В conftest.py:
import os

HEADLESS = os.environ.get("HEADLESS", "false").lower() == "true"

@pytest_asyncio.fixture(scope="session")
async def browser(playwright: Playwright) -> AsyncGenerator[Browser, None]:
    browser = await playwright.chromium.launch(
        headless=HEADLESS,
        channel="chrome",
        args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
    )
    yield browser
    await browser.close()
```

#### 2.2 Добавить retry для flaky тестов

```ini
# В pytest.ini добавить:
addopts = -v --tb=short --reruns=2 --reruns-delay=1
```

И установить: `pip install pytest-rerunfailures`

#### 2.3 Добавить генерацию отчётов

```ini
# В pytest.ini:
addopts = -v --tb=short --html=reports/report.html --self-contained-html
```

---

## 📁 Рекомендуемая структура после рефакторинга

```
tests/ui/
├── pages/
│   ├── __init__.py
│   ├── base_page.py          # + метод count()
│   ├── main_page.py
│   ├── settings_page.py
│   ├── profiles_page.py      # + недостающие методы
│   └── console_page.py
│
├── selectors/                 # NEW: централизованные селекторы
│   ├── __init__.py
│   ├── main_selectors.py
│   ├── settings_selectors.py
│   └── profiles_selectors.py
│
├── conftest.py               # + console_page fixture, исправленный screenshot
├── pytest.ini                # + retry, reports
│
├── test_smoke.py             # Реализовать!
├── test_main_page.py         # Реализовать!
├── test_settings.py          # ✓ Готов
├── test_profiles.py          # Исправить методы
├── test_console.py           # ✓ Готов (после добавления fixture)
│
├── test_negative.py          # NEW: негативные сценарии
├── test_accessibility.py     # NEW: a11y тесты
│
├── reports/                  # NEW: директория для отчётов
│   └── .gitkeep
│
├── AUDIT_REPORT.md           # Этот файл
└── README.md
```

---

## ✅ Что сделано хорошо

1. **Чёткая структура POM** - каждый компонент UI имеет свой Page Object
2. **Type hints везде** - код хорошо типизирован
3. **Docstrings** - методы документированы
4. **Изоляция тестов** - каждый тест получает свой context
5. **Автозапуск сервера** - fixture проверяет и запускает сервер
6. **Сбор console errors** - есть механизм отслеживания JS ошибок
7. **Маркеры pytest** - smoke тесты помечены

---

## 📈 Метрики покрытия

| Компонент | Тестов написано | Тестов реализовано | Покрытие |
|-----------|-----------------|-------------------|----------|
| Main Page | 14 | 14 | 100% ✅ |
| Settings | 9 | 9 | 100% ✅ |
| Profiles | 11 | 11 | 100% ✅ |
| Console | 12 | 12 | 100% ✅ |
| Smoke | 7 | 7 | 100% ✅ |
| **Итого** | **53** | **53** | **100%** |

*Примечание: "реализовано" означает тесты без `pass` или `TODO`*

---

## 🎯 План действий

### Немедленно (блокеры):
1. ✅ Добавить `count()` в BasePage - **ИСПРАВЛЕНО**
2. ✅ Добавить `console_page` fixture - **ИСПРАВЛЕНО**
3. ✅ Добавить недостающие методы в ProfilesPage - **ИСПРАВЛЕНО**
4. ✅ Исправить screenshot on failure - **ИСПРАВЛЕНО**

### Краткосрочно (1-2 дня):
5. ✅ Реализовать smoke тесты - **ИСПРАВЛЕНО**
6. ✅ Реализовать main page тесты - **ИСПРАВЛЕНО**
7. ✅ Удалить дублирующий `test_profiles_page.py` - **ИСПРАВЛЕНО**
8. ✅ Добавить headless через env - **ИСПРАВЛЕНО**

### Среднесрочно (неделя):
9. Добавить retry механизм
10. Настроить генерацию отчётов
11. Добавить негативные тесты
12. Вынести селекторы в отдельные файлы

### Долгосрочно:
13. Добавить accessibility тесты
14. Добавить visual regression
15. Добавить performance тесты

---

## 📝 Выполненные исправления

### 1. BasePage - добавлены методы
**Файл:** `tests/ui/pages/base_page.py`

Добавлены методы:
- `count(selector)` - подсчёт элементов
- `fill(selector, value)` - заполнение input
- `get_attribute(selector, attribute)` - получение атрибута
- `has_class(selector, class_name)` - проверка класса

### 2. ProfilesPage - добавлены alias методы
**Файл:** `tests/ui/pages/profiles_page.py`

Добавлены методы для совместимости с тестами:
- `open_panel()` → alias для `open()`
- `is_panel_visible()` → alias для `is_open()`
- `click_create_profile()` → alias для `create_profile()`
- `is_editor_visible()` → alias для `is_editor_open()`
- `close_panel()` → alias для `close()`
- `is_strategy_option_visible(strategy)`
- `get_strategy_options_count()`
- `is_pool_config_visible()`
- `is_catch_all_config_visible()`
- `set_profile_name(name)` → alias для `fill_profile_name()`
- `get_profile_name_input()` - получение значения из input

### 3. conftest.py - исправления
**Файл:** `tests/ui/conftest.py`

- Добавлен `console_page` fixture
- Исправлен `pytest_runtest_makereport` - теперь использует отдельный event loop
- Добавлена поддержка `HEADLESS` через переменную окружения
- Добавлены константы для таймаутов

### 4. Smoke тесты - реализованы
**Файл:** `tests/ui/test_smoke.py`

Реализованы тесты:
- `test_page_loads` - загрузка страницы
- `test_no_console_errors` - отсутствие JS ошибок
- `test_settings_opens_without_errors` - открытие Settings
- `test_settings_card_expands` - разворачивание карточек
- `test_hero_visible` - видимость Hero
- `test_toolbar_visible` - видимость Toolbar
- `test_logs_drawer_exists` - существование Logs drawer

### 5. Main Page тесты - реализованы
**Файл:** `tests/ui/test_main_page.py`

Реализованы классы тестов:
- `TestHero` - тесты Hero компонента
- `TestToolbar` - тесты Toolbar
- `TestAccountList` - тесты списка аккаунтов
- `TestFAB` - тесты FAB
- `TestLogsDrawer` - тесты Logs drawer
- `TestHeader` - тесты Header

### 6. Удалён дублирующий файл
**Файл:** `tests/ui/test_profiles_page.py` - удалён

Все тесты были пустыми (TODO), функциональность покрыта в `test_profiles.py`.

---

*Отчёт сгенерирован автоматически при аудите UI тестового фреймворка.*
