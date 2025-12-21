# Project Rules

## КРИТИЧЕСКИЕ ПРАВИЛА

**НИКОГДА** не завершай процессы Kiro (taskkill, Stop-Process, pkill и т.д.) без явного согласия пользователя!
- Всегда спрашивай разрешение перед закрытием Kiro
- Если нужно закрыть Kiro для патча/обновления - сначала спроси

## Versioning & Releases

**ВАЖНО:** При создании нового релиза ВСЕГДА используй release скрипт:

```bash
npm run release:patch   # 6.1.0 -> 6.1.1 (багфиксы)
npm run release:minor   # 6.1.0 -> 6.2.0 (новые фичи)
npm run release:major   # 6.1.0 -> 7.0.0 (breaking changes)
npm run release 6.5.0   # конкретная версия
```

Скрипт автоматически:
1. Обновляет версию в `package.json`
2. Коммитит изменение
3. Создаёт git tag
4. Пушит на GitHub

**НИКОГДА** не создавай теги вручную через `git tag` - версия в package.json не обновится!

## Build Commands

- `npm run build` - собрать VS Code расширение
- `npm run build:standalone` - собрать standalone HTML
- `npm run build:all` - собрать всё
- `npm run package` - создать .vsix файл

## Project Structure

```
kiro-manager-wb/
├── src/                      # VS Code Extension (TypeScript)
│   ├── commands/             # Команды расширения
│   ├── providers/            # Tree providers
│   ├── services/             # Бизнес-логика TS
│   ├── state/                # State management
│   ├── webview/              # UI компоненты
│   │   ├── components/       # React-like компоненты
│   │   ├── styles/           # CSS-in-JS стили
│   │   ├── i18n/             # Переводы (10 языков)
│   │   └── index.ts          # Entry point
│   └── extension.ts          # Main entry
│
├── autoreg/                  # Python Backend
│   ├── core/                 # Конфиги, пути, исключения
│   ├── registration/         # AWS регистрация
│   │   ├── browser.py        # Browser automation (DrissionPage)
│   │   ├── mail_handler.py   # IMAP handler
│   │   ├── oauth_*.py        # OAuth flows
│   │   └── register.py       # Main orchestrator
│   ├── spoofers/             # Anti-fingerprint модули
│   ├── services/             # Kiro services
│   │   ├── kiro_patcher_service.py
│   │   ├── token_service.py
│   │   ├── quota_service.py
│   │   └── machine_id_service.py
│   ├── debugger/             # Debug tools
│   │   ├── collectors/       # Data collectors
│   │   ├── analyzers/        # Analysis tools
│   │   └── exporters/        # Export formats
│   ├── llm/                  # LLM API Server (будет переименовано из api/)
│   ├── app/                  # Standalone Web App
│   └── cli.py                # Single CLI entry point
│
├── scripts/                  # Build & Release scripts
├── docs/                     # Documentation
└── tests/                    # Tests
```

## Code Style

### TypeScript (src/)
- Строгая типизация, никаких `any`
- Компоненты webview - функциональные, возвращают строки HTML
- Стили - CSS-in-JS в `src/webview/styles/`
- Все UI тексты через `Translations` интерфейс

### Python (autoreg/)
- Python 3.11+
- Type hints обязательны
- Docstrings для публичных функций
- Модули группируются по функциональности:
  - `core/` - базовые утилиты, конфиги
  - `registration/` - логика регистрации
  - `spoofers/` - anti-fingerprint
  - `services/` - сервисы для Kiro
  - `debugger/` - инструменты отладки

### Куда класть новый код:
| Тип кода | Расположение |
|----------|--------------|
| Новый spoofer | `autoreg/spoofers/` |
| Новый collector | `autoreg/debugger/collectors/` |
| Новый analyzer | `autoreg/debugger/analyzers/` |
| Новый exporter | `autoreg/debugger/exporters/` |
| Kiro service | `autoreg/services/` |
| UI компонент | `src/webview/components/` |
| UI стили | `src/webview/styles/` |
| Переводы | `src/webview/i18n/locales/` |
| Dev скрипт | `autoreg/scripts/` |
| Build скрипт | `scripts/` |

### НЕ КЛАСТЬ в корень autoreg/:
- Одноразовые скрипты → `autoreg/scripts/`
- Тестовые файлы → `tests/`
- Debug артефакты → `autoreg/debug_sessions/` (в .gitignore)
- PNG/HAR файлы → `autoreg/debug_sessions/`

## UI & Translations

- Все UI тексты должны быть переведены (10 языков в `src/webview/i18n/`)
- Тёмная тема по умолчанию (#1e1e1e)
- При добавлении нового текста:
  1. Добавить ключ в `src/webview/i18n/types.ts`
  2. Добавить перевод во все локали в `src/webview/i18n/locales/`

## Testing

- Standalone сервер: `http://127.0.0.1:8420`
- Pool strategy test email: `edwardporter0563@gmx.com`
- LLM API сервер: `http://127.0.0.1:8421`

## Scripts & Automation

**НИКОГДА** не пиши интерактивные скрипты с `input()`, `Press Enter`, etc.!
- Все скрипты должны быть полностью автономными
- Никаких ожиданий пользовательского ввода
- Браузер закрывается автоматически после завершения
- Результаты сохраняются в файлы, не требуют подтверждения

## Data Paths

Все пользовательские данные хранятся в `~/.kiro-manager-wb/`:
- `tokens/` - токены аккаунтов
- `machine-id.txt` - кастомный machine ID
- `profiles/` - IMAP профили
- `autoreg.log` - логи
- `backups/` - бэкапы патчей
