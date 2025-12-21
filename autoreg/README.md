# Autoreg - Python Backend

Бэкенд для автоматической регистрации AWS Builder ID аккаунтов и управления Kiro.

## Структура

```
autoreg/
├── core/                 # Базовые утилиты
│   ├── config.py         # Конфигурация из JSON/env
│   ├── paths.py          # Пути к файлам
│   ├── exceptions.py     # Исключения
│   └── email_generator.py # Генерация email по стратегиям
│
├── registration/         # Логика регистрации
│   ├── browser.py        # Browser automation (DrissionPage)
│   ├── mail_handler.py   # IMAP для получения кодов
│   ├── oauth_device.py   # OAuth Device Flow
│   ├── oauth_pkce.py     # OAuth PKCE Flow
│   ├── register.py       # Главный оркестратор
│   └── register_auto.py  # Авто-регистрация с email стратегиями
│
├── spoofers/             # Anti-fingerprint модули (20+)
│   ├── cdp_spoofer.py    # CDP-based spoofing
│   ├── navigator.py      # Navigator spoofing
│   ├── canvas.py         # Canvas fingerprint
│   ├── webgl.py          # WebGL fingerprint
│   ├── audio.py          # Audio fingerprint
│   ├── screen.py         # Screen resolution
│   ├── timezone.py       # Timezone sync
│   ├── fonts.py          # Font list
│   ├── behavior.py       # Human-like behavior
│   └── ...               # И другие
│
├── services/             # Сервисы для Kiro
│   ├── kiro_patcher_service.py  # Патчинг extension.js
│   ├── kiro_service.py          # Управление Kiro IDE
│   ├── token_service.py         # CRUD токенов
│   ├── quota_service.py         # Отслеживание usage
│   ├── machine_id_service.py    # Machine ID rotation
│   └── sso_import_service.py    # Импорт из SSO cookie
│
├── debugger/             # Инструменты отладки
│   ├── collectors/       # Network, DOM, Cookies, Console, CDP
│   ├── analyzers/        # Request, Timing, Fingerprint, Redirect
│   ├── exporters/        # JSON, HAR, HTML
│   ├── core.py           # DebugSession class
│   └── run.py            # Запуск debug сессии
│
├── llm/                  # LLM API Server
│   ├── llm_server.py     # FastAPI OpenAI-compatible server
│   ├── token_pool.py     # Token pool management
│   ├── codewhisperer_client.py  # AWS API client
│   └── run_llm_server.py # Entry point
│
├── app/                  # Standalone Web App
│   ├── main.py           # FastAPI entry point
│   ├── websocket.py      # WebSocket handler
│   └── api/              # REST API endpoints
│
├── scripts/              # Dev утилиты
│   ├── test_fingerprint.py
│   ├── test_strategy.py
│   └── ...
│
├── cli.py                # CLI entry point
├── run.py                # Standalone app entry point
├── spoof.py              # Фасад для spoofers
└── requirements.txt      # Python зависимости
```

## Быстрый старт

### Установка зависимостей

```bash
pip install -r requirements.txt
```

### Настройка

Создай `.env` файл:

```env
# IMAP
IMAP_SERVER=imap.gmail.com
IMAP_USER=your@gmail.com
IMAP_PASSWORD=app-password

# Email стратегия: single, plus_alias, catch_all, pool
EMAIL_STRATEGY=plus_alias

# Для catch_all
EMAIL_DOMAIN=mydomain.com

# Для pool
EMAIL_POOL=["user1@mail.ru", "user2@mail.ru:password"]
```

## Запуск

### CLI

```bash
# Статус системы
python cli.py status

# Список токенов
python cli.py tokens list

# Переключить аккаунт
python cli.py tokens switch <name>

# Квоты всех аккаунтов
python cli.py quota --all

# Статус патча
python cli.py patch status

# Применить патч
python cli.py patch apply

# Сгенерировать новый Machine ID
python cli.py patch generate-id

# Импорт из SSO cookie
python cli.py sso-import <cookie> -a
```

### Регистрация

```bash
# Авто-регистрация (использует EMAIL_STRATEGY)
python -m registration.register_auto

# С конкретным email
python -m registration.register --email user@domain.com

# Batch (5 аккаунтов)
python -m registration.register --count 5

# Headless
python -m registration.register --email user@domain.com --headless
```

### Standalone Web App

```bash
python run.py
# Открыть http://127.0.0.1:8420
```

### LLM API Server

```bash
python -m llm.run_llm_server
# API на http://127.0.0.1:8421
```

### Debug Session

```bash
python -m debugger.run
# Результаты в debug_sessions/
```

## Email стратегии

| Стратегия | Описание | Пример |
|-----------|----------|--------|
| `single` | Один email = один аккаунт | `user@gmail.com` |
| `plus_alias` | Gmail/Outlook алиасы | `user+kiro123@gmail.com` |
| `catch_all` | Catch-all домен | `random123@mydomain.com` |
| `pool` | Пул готовых email'ов | `["user1@mail.ru", "user2@mail.ru:password"]` |

## Anti-Fingerprint

Встроенные модули спуфинга:

- Canvas, WebGL, Audio fingerprint
- Navigator (userAgent, platform, languages)
- Screen resolution
- Timezone (синхронизация с IP)
- WebRTC (скрытие локального IP)
- Fonts list
- Behavior (человеческие задержки)

Профили сохраняются для каждого email в `~/.kiro-manager-wb/profiles/`.

## Конфигурация

Настройки в `~/.kiro-manager-wb/config.json` или через `.env`.

### Основные параметры

```python
# Browser
browser.headless = False
browser.realistic_typing = True
browser.human_delays = True

# Timeouts
timeouts.page_load = 2
timeouts.element_wait = 1
timeouts.verification_code = 60
timeouts.allow_access_wait = 90

# Debug
debug.verbose = False
debug.save_html_on_error = False
```

## Данные

Все данные в `~/.kiro-manager-wb/`:

```
~/.kiro-manager-wb/
├── tokens/           # Токены аккаунтов
├── profiles/         # IMAP профили и fingerprint profiles
├── backups/          # Бэкапы патчей
├── machine-id.txt    # Кастомный Machine ID
├── config.json       # Конфигурация
└── autoreg.log       # Логи
```
