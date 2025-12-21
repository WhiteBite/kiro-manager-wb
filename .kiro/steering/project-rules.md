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

- `src/` - VS Code extension source
- `autoreg/` - Python backend (registration, IMAP, browser automation)
- `scripts/` - Build and release scripts
- `autoreg/app/` - Standalone web app (FastAPI + WebSocket)

## Code Style

- TypeScript для расширения
- Python 3.11+ для backend
- Все UI тексты должны быть переведены (10 языков в `src/webview/i18n/`)
- Тёмная тема по умолчанию (#1e1e1e)

## Testing

- Standalone сервер: `http://127.0.0.1:8420`
- Pool strategy test email: `edwardporter0563@gmx.com`

## Scripts & Automation

**НИКОГДА** не пиши интерактивные скрипты с `input()`, `Press Enter`, etc.!
- Все скрипты должны быть полностью автономными
- Никаких ожиданий пользовательского ввода
- Браузер закрывается автоматически после завершения
- Результаты сохраняются в файлы, не требуют подтверждения
