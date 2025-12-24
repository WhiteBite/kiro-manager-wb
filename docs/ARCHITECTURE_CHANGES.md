# Architecture Changes: Registration Strategies

## 📋 Обзор изменений

Добавлена поддержка **нескольких стратегий регистрации** с использованием **Strategy Pattern**.

Старый функционал **полностью сохранён** и работает как раньше. Новый функционал добавлен параллельно.

---

## 🏗️ Новая архитектура

### Strategy Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    RegistrationStrategy                      │
│                      (Abstract Base)                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
┌──────────▼──────────┐         ┌─────────▼──────────┐
│ AutomatedStrategy   │         │  WebViewStrategy   │
│    (Legacy)         │         │   (Anti-Ban)       │
│                     │         │                    │
│ - DrissionPage      │         │ - Real browser     │
│ - Automated input   │         │ - Manual input     │
│ - High ban risk     │         │ - Low ban risk     │
└─────────────────────┘         └────────────────────┘
```

### Структура файлов

```
autoreg/registration/
├── auth_strategy.py              # Базовые классы (NEW)
├── strategy_factory.py           # Фабрика стратегий (NEW)
├── oauth_callback_server.py      # OAuth callback server (NEW)
│
├── strategies/                   # Стратегии (NEW)
│   ├── __init__.py
│   ├── automated_strategy.py    # Обёртка над старым кодом
│   └── webview_strategy.py      # Новая WebView стратегия
│
├── register.py                   # Старый код (UNCHANGED)
├── browser.py                    # Старый код (UNCHANGED)
├── oauth_pkce.py                 # Старый код (UNCHANGED)
└── ...                           # Остальные файлы (UNCHANGED)
```

---

## 🔄 Обратная совместимость

### Старый код работает как раньше:

```python
# ✅ Это всё ещё работает!
from autoreg.registration.register import AWSRegistration

reg = AWSRegistration(headless=False)
result = reg.register_single(email='test@gmail.com')
reg.close()
```

### Новый код использует стратегии:

```python
# ✅ Новый способ
from autoreg.registration.strategy_factory import StrategyFactory

# WebView стратегия
strategy = StrategyFactory.create('webview')
result = strategy.register(email='test@gmail.com')
strategy.cleanup()

# Automated стратегия (обёртка над старым кодом)
strategy = StrategyFactory.create('automated', headless=False)
result = strategy.register(email='test@gmail.com')
strategy.cleanup()
```

---

## 📦 Новые компоненты

### 1. `auth_strategy.py`

Базовые абстрактные классы:
- `AuthStrategy` - для авторизации
- `RegistrationStrategy` - для регистрации

Определяют интерфейс для всех стратегий.

### 2. `strategy_factory.py`

Фабрика для создания стратегий:
- `StrategyFactory.create(name, **kwargs)` - создать стратегию
- `StrategyFactory.list_strategies()` - список доступных стратегий
- `StrategyFactory.get_recommended()` - получить рекомендуемую стратегию

### 3. `oauth_callback_server.py`

Локальный HTTP сервер для OAuth callback:
- Запускается на `http://127.0.0.1:43210`
- Принимает callback от AWS/Google/Github
- Извлекает authorization code
- Красивые success/error страницы

### 4. `strategies/automated_strategy.py`

Обёртка над старым `AWSRegistration`:
- Использует существующий код
- Добавляет метаданные о стратегии
- Поддерживает флаг `check_quota_immediately`

### 5. `strategies/webview_strategy.py`

Новая WebView стратегия:
- Открывает реальный браузер через `subprocess`
- Пользователь вводит данные вручную
- Использует OAuth callback server
- Минимальный риск бана

### 6. `cli_registration.py`

Новые CLI команды:
- `register-strategies` - показать доступные стратегии
- `register-webview` - WebView регистрация
- `register-automated` - Automated регистрация
- `register-auto` - автоматическая регистрация с email стратегией

---

## 🎯 Ключевые особенности

### 1. Старый код не тронут

`register.py`, `browser.py`, `oauth_pkce.py` и другие файлы **не изменены**.

Новый код - это **обёртки и расширения**, не замены.

### 2. Плавная миграция

Пользователи могут:
- Продолжать использовать старый код
- Постепенно переходить на новые стратегии
- Использовать оба подхода одновременно

### 3. Расширяемость

Легко добавить новые стратегии:

```python
# Новая стратегия
class MyCustomStrategy(RegistrationStrategy):
    def register(self, email, **kwargs):
        # Ваша логика
        pass
    
    def get_name(self):
        return "custom"
    
    # ... остальные методы

# Зарегистрировать в фабрике
# (или использовать напрямую)
```

### 4. Метаданные

Каждая стратегия предоставляет метаданные:
- `get_name()` - название
- `get_ban_risk()` - оценка риска бана
- `requires_manual_input()` - требует ли ручного ввода
- `supports_headless()` - поддерживает ли headless
- `supports_immediate_quota_check()` - можно ли проверять quota сразу

---

## 🚀 Использование

### CLI

```bash
# Показать стратегии
python -m autoreg.cli_registration register-strategies

# WebView (рекомендуется)
python -m autoreg.cli_registration register-webview --email test@gmail.com

# Automated (legacy)
python -m autoreg.cli_registration register-automated \
    --email test@gmail.com \
    --no-check-quota
```

### Python API

```python
from autoreg.registration.strategy_factory import StrategyFactory

# Создать стратегию
strategy = StrategyFactory.create('webview')

# Зарегистрировать
result = strategy.register(email='test@gmail.com')

# Проверить результат
if result['success']:
    print(f"Token: {result['token_file']}")
    print(f"Ban risk: {result['ban_risk']}")

# Очистить ресурсы
strategy.cleanup()
```

---

## 📊 Сравнение подходов

### Старый подход (всё ещё работает):

```python
from autoreg.registration.register import AWSRegistration

reg = AWSRegistration(headless=False)
result = reg.register_single(email='test@gmail.com')
reg.close()
```

**Плюсы:**
- Привычный API
- Работает как раньше

**Минусы:**
- Нет выбора стратегии
- Нет метаданных о ban risk
- Сложнее расширять

### Новый подход (рекомендуется):

```python
from autoreg.registration.strategy_factory import StrategyFactory

strategy = StrategyFactory.create('webview')
result = strategy.register(email='test@gmail.com')
strategy.cleanup()
```

**Плюсы:**
- Выбор стратегии
- Метаданные о ban risk
- Легко расширять
- Архитектурно правильно

**Минусы:**
- Новый API (но простой)

---

## 🔧 Интеграция в существующий код

### Минимальные изменения:

```python
# Было:
from autoreg.registration.register import AWSRegistration
reg = AWSRegistration(headless=False)
result = reg.register_single(email='test@gmail.com')

# Стало (для WebView):
from autoreg.registration.strategy_factory import StrategyFactory
strategy = StrategyFactory.create('webview')
result = strategy.register(email='test@gmail.com')

# Стало (для Automated - аналог старого):
strategy = StrategyFactory.create('automated', headless=False)
result = strategy.register(email='test@gmail.com')
```

### Без изменений:

Если не хотите менять код - ничего не меняйте! Старый код работает.

---

## 📝 Чеклист для разработчиков

### Добавление новой стратегии:

1. ✅ Создать класс, наследующий `RegistrationStrategy`
2. ✅ Реализовать методы: `register()`, `get_name()`, `requires_manual_input()`, etc.
3. ✅ Добавить в `strategy_factory.py`
4. ✅ Добавить CLI команду в `cli_registration.py`
5. ✅ Обновить документацию

### Использование существующих стратегий:

1. ✅ Импортировать `StrategyFactory`
2. ✅ Создать стратегию: `StrategyFactory.create(name, **kwargs)`
3. ✅ Вызвать `strategy.register(email, **kwargs)`
4. ✅ Проверить `result['success']`
5. ✅ Вызвать `strategy.cleanup()`

---

## 🎓 Примеры

### Пример 1: WebView регистрация

```python
from autoreg.registration.strategy_factory import StrategyFactory

strategy = StrategyFactory.create(
    'webview',
    browser_path='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    proxy='proxy.com:8080'
)

result = strategy.register(
    email='test@gmail.com',
    provider='Google',
    timeout=300
)

if result['success']:
    print(f"✅ Success! Token: {result['token_file']}")
    print(f"Ban risk: {result['ban_risk']}")  # "low"
else:
    print(f"❌ Failed: {result['error']}")

strategy.cleanup()
```

### Пример 2: Automated регистрация (anti-ban)

```python
from autoreg.registration.strategy_factory import StrategyFactory

strategy = StrategyFactory.create(
    'automated',
    headless=False,
    check_quota_immediately=False,  # ВАЖНО!
    human_delays=True
)

result = strategy.register(
    email='test@gmail.com',
    name='John Doe',
    password='SecurePass123!'
)

if result['success']:
    print(f"✅ Success!")
    print(f"Ban risk: {result['ban_risk']}")  # "medium"
    print(f"Quota check deferred: {result['quota_check_deferred']}")  # True
else:
    print(f"❌ Failed: {result['error']}")

strategy.cleanup()
```

### Пример 3: Выбор стратегии динамически

```python
from autoreg.registration.strategy_factory import StrategyFactory

# Пользователь выбирает
user_choice = input("Strategy (webview/automated): ")

# Создаём стратегию
if user_choice == 'webview':
    strategy = StrategyFactory.create('webview')
else:
    strategy = StrategyFactory.create('automated', check_quota_immediately=False)

# Регистрация
result = strategy.register(email='test@gmail.com')

# Результат
print(f"Strategy: {result['strategy']}")
print(f"Ban risk: {result['ban_risk']}")
print(f"Success: {result['success']}")

strategy.cleanup()
```

---

## 🔮 Будущие улучшения

### Возможные новые стратегии:

1. **KiroWebPortalStrategy** - использует CBOR API вместо JSON
2. **ProxyPoolStrategy** - автоматическая ротация прокси
3. **DelayedCheckStrategy** - автоматическая отложенная проверка quota
4. **HybridStrategy** - комбинация нескольких стратегий

### Возможные улучшения:

1. Async поддержка для параллельной регистрации
2. Retry механизм с экспоненциальным backoff
3. Метрики и статистика по стратегиям
4. A/B тестирование стратегий

---

## 📚 Документация

- [README_STRATEGIES.md](../autoreg/registration/README_STRATEGIES.md) - подробное руководство по стратегиям
- [WHY_THEY_DONT_BAN.md](WHY_THEY_DONT_BAN.md) - анализ причин банов
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) - план имплементации
- [ANTI_BAN_SUMMARY.md](ANTI_BAN_SUMMARY.md) - краткая сводка
