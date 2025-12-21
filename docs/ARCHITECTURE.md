# Kiro Extension Architecture

## Overview

Kiro Extension - это VS Code расширение для управления множественными AWS Builder ID аккаунтами с автоматической регистрацией.

```
┌─────────────────────────────────────────────────────────────────┐
│                     VS Code Extension                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Commands   │  │   Webview    │  │     Providers        │  │
│  │  (autoreg,   │  │  (UI Panel)  │  │  (AccountsProvider)  │  │
│  │   switch)    │  │              │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           │                                      │
│                    ┌──────▼───────┐                             │
│                    │    State     │                             │
│                    │   Manager    │                             │
│                    └──────┬───────┘                             │
└───────────────────────────┼─────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│  Python Backend │ │  Kiro DB     │ │  Token Files │
│   (autoreg/)    │ │ (state.vscdb)│ │ (~/.kiro-ext)│
└─────────────────┘ └──────────────┘ └──────────────┘
```

## Components

### 1. VS Code Extension (`src/`)

TypeScript расширение для VS Code/Kiro.

```
src/
├── extension.ts          # Entry point, активация расширения
├── commands/             # Команды расширения
│   ├── autoreg.ts        # Авторегистрация, патчинг
│   ├── webview-handler.ts # Обработка сообщений от UI
│   └── index.ts
├── providers/            # VS Code providers
│   ├── AccountsProvider.ts  # Главный webview provider
│   └── ImapProfileProvider.ts
├── services/             # Бизнес-логика
│   ├── LogService.ts     # Логирование
│   └── UsageService.ts   # Отслеживание usage
├── state/                # State management
│   └── StateManager.ts   # Централизованное состояние
├── webview/              # UI компоненты
│   ├── components/       # Компоненты (AccountList, Settings, etc.)
│   ├── styles/           # CSS-in-JS стили
│   ├── i18n/             # Переводы (10 языков)
│   └── index.ts          # HTML генерация
└── utils.ts              # Утилиты (пути, usage)
```

### 2. Python Backend (`autoreg/`)

Python бэкенд для автоматизации.

```
autoreg/
├── core/                 # Базовые модули
│   ├── config.py         # Конфигурация из JSON/env
│   ├── paths.py          # Пути к файлам
│   └── exceptions.py     # Кастомные исключения
├── registration/         # Логика регистрации
│   ├── browser.py        # DrissionPage automation
│   ├── mail_handler.py   # IMAP для кодов верификации
│   ├── oauth_device.py   # OAuth Device Flow
│   └── register.py       # Оркестратор регистрации
├── spoofers/             # Anti-fingerprint
│   ├── cdp_spoofer.py    # CDP-based spoofing
│   ├── navigator.py      # Navigator properties
│   ├── canvas.py         # Canvas fingerprint
│   └── ...               # 20+ модулей
├── services/             # Сервисы для Kiro
│   ├── kiro_patcher_service.py  # Патчинг extension.js
│   ├── token_service.py         # CRUD токенов
│   └── machine_id_service.py    # Machine ID rotation
├── debugger/             # Debug инструменты
│   ├── collectors/       # Network, DOM, Cookies collectors
│   ├── analyzers/        # Request, Timing analyzers
│   └── exporters/        # JSON, HAR, HTML export
├── llm/                  # LLM API Server
│   ├── llm_server.py     # OpenAI-compatible API
│   └── token_pool.py     # Token pool management
└── app/                  # Standalone Web App
    ├── main.py           # FastAPI server
    └── websocket.py      # Real-time updates
```

## Data Flow

### Account Switch
```
User clicks account → Webview sends 'switchAccount'
    → AccountsProvider.handleMessage()
    → accounts.switchToAccount()
    → Write token to Kiro DB (state.vscdb)
    → Update machine-id.txt (if patched)
    → Kiro picks up new token
```

### Auto Registration
```
User clicks 'Auto Reg' → Webview sends 'startAutoReg'
    → autoreg.runAutoReg()
    → Spawn Python process (cli.py)
    → registration/register.py orchestrates:
        1. Generate email (email_generator.py)
        2. Open browser (browser.py + spoofers/)
        3. Fill AWS signup form
        4. Get verification code (mail_handler.py)
        5. Complete OAuth (oauth_device.py)
        6. Save token to ~/.kiro-manager-wb/tokens/
    → Extension refreshes account list
```

### Kiro Patching
```
User clicks 'Patch Kiro' → Webview sends 'patchKiro'
    → autoreg.patchKiro()
    → kiro_patcher_service.py:
        1. Find Kiro extension.js
        2. Backup original
        3. Inject getMachineId() override
        4. Machine ID now reads from file
    → Each account switch rotates machine ID
```

## Key Files

| File | Purpose |
|------|---------|
| `~/.kiro-manager-wb/tokens/` | Saved account tokens |
| `~/.kiro-manager-wb/machine-id.txt` | Current machine ID |
| `~/.kiro-manager-wb/profiles/` | IMAP profiles |
| `~/.aws/sso/cache/kiro-auth-token.json` | Active Kiro token |
| `%APPDATA%/Kiro/.../state.vscdb` | Kiro internal DB |

## Security

- Tokens stored locally, never sent to external servers
- Machine ID rotation prevents AWS tracking
- Anti-fingerprint spoofing for browser automation
- IMAP credentials stored in local profiles

## Extension Points

### Adding new spoofer
1. Create `autoreg/spoofers/my_spoofer.py`
2. Implement `BaseSpoofModule` interface
3. Register in `spoofers/__init__.py`

### Adding new UI component
1. Create `src/webview/components/MyComponent.ts`
2. Export render function returning HTML string
3. Add translations to all locales in `i18n/locales/`

### Adding new analyzer
1. Create `autoreg/debugger/analyzers/my_analyzer.py`
2. Implement `analyze(session_data)` method
3. Register in `analyzers/__init__.py`
