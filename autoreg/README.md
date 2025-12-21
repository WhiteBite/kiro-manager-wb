# Autoreg - Python Backend

Бэкенд для автоматической регистрации AWS Builder ID аккаунтов.

## Структура

```
autoreg/
├── core/                 # Базовые утилиты
│   ├── config.py         # Конфигурация
│   ├── paths.py          # Пути к файлам
│   ├── exceptions.py     # Исключения
│   └── email_generator.py # Генерация email
│
├── registration/         # Логика регистрации
│   ├── browser.py        # Browser automation (DrissionPage)
│   ├── mail_handler.py   # IMAP для получения кодов
│   ├── oauth_device.py   # OAuth Device Flow
│   ├── oauth_pkce.py     # OAuth PKCE Flow
│   └── register.py       # Главный оркестратор
│
├── spoofers/             # Anti-fingerprint модули
│   ├── cdp_spoofer.py    # CDP-based spoofing
│   ├── navigator.py      # Navigator spoofing
│   ├── canvas.py         # Canvas fingerprint
│   ├── webgl.py          # WebGL fingerprint
│   ├── audio.py          # Audio fingerprint
│   └── ...               # Другие модули
│
├── services/             # Сервисы для Kiro
│   ├── kiro_patcher_service.py  # Патчинг Kiro
│   ├── token_service.py         # Управление токенами
│   ├── quota_service.py         # Отслеживание usage
│   └── machine_id_service.py    # Machine ID
│
├── debugger/             # Инструменты отладки
│   ├── collectors/       # Сборщики данных
│   ├── analyzers/        # Анализаторы
│   ├── exporters/        # Экспортёры (JSON, HAR, HTML)
│   └── run.py            # Запуск debug сессии
│
├── llm/                  # LLM API Server
│   ├── llm_server.py     # FastAPI сервер
│   ├── token_pool.py     # Пул токенов
│   └── codewhisperer_client.py  # AWS API клиент
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
├── run.py                # Standalone entry point
├── spoof.py              # Фасад для spoofers
└── requirements.txt      # Python зависимости
```

## Запуск

### CLI
```bash
cd autoreg
python cli.py register --email user@example.com
```

### Standalone Web App
```bash
cd autoreg
python run.py
# Открыть http://127.0.0.1:8420
```

### LLM API Server
```bash
cd autoreg
python -m llm.run_llm_server
# API на http://127.0.0.1:8421
```

## Зависимости

```bash
pip install -r requirements.txt
```

Основные:
- `DrissionPage` - Browser automation
- `fastapi` + `uvicorn` - Web server
- `websockets` - WebSocket support
- `imapclient` - IMAP для email

## Конфигурация

Настройки в `~/.kiro-extension/config.json` или через переменные окружения.

## Debug

Для отладки регистрации:
```bash
cd autoreg
python -m debugger.run
```

Результаты сохраняются в `debug_sessions/`.
