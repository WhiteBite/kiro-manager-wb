# ⚡ Kiro Manager WB

[![Build](https://github.com/WhiteBite/kiro-manager-wb/actions/workflows/build.yml/badge.svg)](https://github.com/WhiteBite/kiro-manager-wb/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/WhiteBite/kiro-manager-wb?label=version)](https://github.com/WhiteBite/kiro-manager-wb/releases)
[![License](https://img.shields.io/github/license/WhiteBite/kiro-manager-wb)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/WhiteBite/kiro-manager-wb/total)](https://github.com/WhiteBite/kiro-manager-wb/releases)
[![Telegram](https://img.shields.io/badge/Telegram-Channel-blue?logo=telegram)](https://t.me/whitebite_devsoft)

Русский | [English](README.en.md) | [中文](README.zh.md)

![Screenshot](images/screenshot.png)

Расширение для тех, кто устал ебаться с лимитами Kiro.

> ⚠️ **ДИСКЛЕЙМЕР**
>
> Это учебный проект, написанный в образовательных целях для изучения работы с VS Code Extension API, OAuth потоками и автоматизацией браузера.
>
> Автор не несёт никакой ответственности за использование этого кода. Всё что вы делаете — вы делаете на свой страх и риск. Если вас забанят, заблокируют, отключат, уволят или случится что-то ещё — это ваши проблемы. Я предупредил.
>
> Используя этот код вы подтверждаете что понимаете что делаете и принимаете все последствия.

---

## 🎯 Что это такое

Полноценный менеджер аккаунтов для Kiro IDE:

- **Мульти-аккаунт** — храни сколько угодно аккаунтов, переключайся в один клик
- **Usage мониторинг** — видишь сколько запросов потрачено, сколько осталось, когда рефреш
- **Авторег** — автоматическая регистрация новых AWS Builder ID аккаунтов
- **Machine ID патчинг** — обход бана по hardware fingerprint
- **LLM API сервер** — OpenAI-совместимый API для использования Claude через Kiro токены
- **10 языков** — EN, RU, DE, ES, FR, PT, ZH, JA, KO, HI

---

## 🚀 Быстрый старт

### Установка

1. Скачать `.vsix` из [Releases](../../releases)
2. Открыть Kiro → `Ctrl+Shift+P` → `Extensions: Install from VSIX`
3. Выбрать скачанный файл
4. Перезапустить Kiro

### Из исходников

```bash
git clone https://github.com/WhiteBite/kiro-manager-wb
cd kiro-manager-wb
npm install
npm run package
```

---

## 📦 Возможности

### Переключение аккаунтов

Kiro хранит токен в `state.vscdb`. Расширение:
1. Читает токены из `~/.kiro-manager-wb/tokens/`
2. При переключении записывает выбранный токен в базу Kiro
3. Kiro подхватывает новый токен без перезапуска

### Usage Tracking

Показывает для каждого аккаунта:
- Текущий расход / лимит
- Процент использования
- Время до сброса лимита
- Тип подписки (Free/Pro)

### Machine ID Патчинг

AWS банит по `machineId` если видит много аккаунтов с одного компьютера. Патч позволяет:
- Использовать уникальный `machineId` для каждого аккаунта
- Автоматически менять ID при переключении
- Обходить баны за "unusual activity"

```bash
# Применить патч
python -m autoreg.cli patch

# Сгенерировать новый machine ID
python -m autoreg.cli machine-id generate
```

---

## 🤖 Авторег

Автоматическая регистрация AWS Builder ID аккаунтов.

### Требования

- Python 3.11+
- Chrome/Chromium браузер
- Почтовый сервер с IMAP

### Стратегии Email

| Стратегия | Описание | Пример |
|-----------|----------|--------|
| `single` | Один email = один аккаунт | `user@gmail.com` |
| `plus_alias` | Gmail/Outlook алиасы | `user+kiro123@gmail.com` |
| `catch_all` | Catch-all домен | `random123@mydomain.com` |
| `pool` | Пул готовых email'ов | Список из файла/env |

### Настройка

Создай `.env` в папке `autoreg/`:

```env
# IMAP настройки
IMAP_SERVER=imap.gmail.com
IMAP_USER=your@gmail.com
IMAP_PASSWORD=app-password

# Стратегия email
EMAIL_STRATEGY=plus_alias

# Для catch_all
EMAIL_DOMAIN=mydomain.com

# Для pool (JSON массив)
EMAIL_POOL=["user1@mail.ru", "user2@mail.ru:password"]
```

### Запуск

```bash
cd autoreg

# Авто-регистрация (использует настроенную стратегию email)
python -m registration.register_auto

# С конкретным email
python -m registration.register --email user@domain.com

# Batch регистрация (5 аккаунтов)
python -m registration.register --count 5

# Headless режим (без GUI)
python -m registration.register --email user@domain.com --headless

# Через VS Code расширение - кнопка "Auto-Reg" в панели
```

### Anti-Fingerprint

Встроенная система спуфинга для обхода детекта AWS:

- **Canvas** — рандомизация canvas fingerprint
- **WebGL** — подмена vendor/renderer
- **Audio** — модификация audio fingerprint
- **Navigator** — спуфинг userAgent, platform, languages
- **Screen** — рандомизация разрешения
- **Timezone** — синхронизация с IP
- **WebRTC** — скрытие локального IP
- **Fonts** — рандомизация списка шрифтов
- **Behavior** — человеческие задержки при вводе

Профили спуфинга сохраняются для каждого email — при повторной регистрации используется тот же fingerprint.

---

## 🌐 LLM API Server

OpenAI-совместимый API сервер для использования Claude через Kiro токены.

### Запуск

```bash
cd autoreg
python -m llm.run_llm_server
# API на http://127.0.0.1:8421
```

### Использование

```bash
curl http://127.0.0.1:8421/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Доступные модели

| Model | Credit | Описание |
|-------|--------|----------|
| `claude-opus-4.5` | 2.2x | Самая мощная |
| `claude-sonnet-4.5` | 1.3x | Последний Sonnet |
| `claude-sonnet-4` | 1.3x | Hybrid reasoning |
| `claude-haiku-4.5` | 0.4x | Быстрая и дешёвая |
| `auto` | 1x | Авто-выбор |

### Endpoints

- `GET /v1/models` — список моделей
- `POST /v1/chat/completions` — чат (streaming поддерживается)
- `GET /health` — health check
- `GET /pool/status` — статус пула токенов
- `GET /pool/quotas` — квоты всех токенов

---

## 🖥️ Standalone Web App

Веб-интерфейс для управления без VS Code.

```bash
cd autoreg
python run.py
# Откроется http://127.0.0.1:8420
```

Функции:
- Просмотр и переключение аккаунтов
- Мониторинг квот в реальном времени
- Запуск авторега через UI
- Управление патчем Kiro
- WebSocket для live логов

---

## 🔧 Debugger

Инструменты для отладки регистрации и анализа трафика.

### Debug Session

```bash
cd autoreg
python -m debugger.run
```

Собирает:
- Все сетевые запросы (HAR формат)
- Cookies на каждом шаге
- DOM snapshots
- Console логи
- CDP события

### Анализаторы

- **RequestAnalyzer** — анализ API запросов к AWS
- **FingerprintAnalyzer** — детект fingerprint проверок
- **TimingAnalyzer** — анализ таймингов
- **RedirectAnalyzer** — цепочки редиректов

### Экспорт

- JSON — сырые данные
- HAR — для Chrome DevTools
- HTML — красивый отчёт

---

## 📁 Структура проекта

```
kiro-manager-wb/
├── src/                      # VS Code Extension (TypeScript)
│   ├── commands/             # Команды расширения
│   ├── providers/            # Tree providers
│   ├── services/             # Бизнес-логика
│   ├── webview/              # UI компоненты
│   │   ├── components/       # React-like компоненты
│   │   ├── styles/           # CSS-in-JS
│   │   └── i18n/             # 10 языков
│   └── extension.ts          # Entry point
│
├── autoreg/                  # Python Backend
│   ├── core/                 # Конфиги, пути, exceptions
│   ├── registration/         # AWS регистрация
│   │   ├── browser.py        # DrissionPage automation
│   │   ├── mail_handler.py   # IMAP handler
│   │   └── oauth_*.py        # OAuth flows
│   ├── spoofers/             # Anti-fingerprint (20+ модулей)
│   ├── services/             # Kiro services
│   │   ├── kiro_patcher_service.py
│   │   ├── token_service.py
│   │   └── quota_service.py
│   ├── debugger/             # Debug tools
│   │   ├── collectors/       # Data collectors
│   │   ├── analyzers/        # Analysis tools
│   │   └── exporters/        # JSON/HAR/HTML
│   ├── llm/                  # LLM API Server
│   └── app/                  # Standalone Web App
│
├── scripts/                  # Build & Release
└── tests/                    # Tests
```

---

## ⚙️ Настройки

### VS Code Settings

| Настройка | Описание | Default |
|-----------|----------|---------|
| `kiroAccountSwitcher.tokensPath` | Путь к токенам | `~/.kiro-manager-wb/tokens` |
| `kiroAccountSwitcher.autoSwitch.enabled` | Авто-рефреш токена | `false` |
| `kiroAccountSwitcher.autoSwitch.usageThreshold` | Порог переключения | `50` |
| `kiroAccountSwitcher.autoreg.headless` | Headless браузер | `false` |
| `kiroAccountSwitcher.autoreg.spoofing` | Fingerprint spoofing | `true` |

### Формат токенов

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "eyJjdHkiOiJKV1QiLCJl...",
  "expiresAt": "2024-12-10T20:00:00.000Z",
  "accountName": "user@example.com",
  "email": "user@example.com",
  "idToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

---

## 🛠️ CLI Reference

```bash
cd autoreg

# ═══════════════════════════════════════════════════════════════
# СТАТУС
# ═══════════════════════════════════════════════════════════════
python cli.py status                      # Общий статус системы

# ═══════════════════════════════════════════════════════════════
# ТОКЕНЫ
# ═══════════════════════════════════════════════════════════════
python cli.py tokens                      # Список токенов (алиас для list)
python cli.py tokens list                 # Список всех токенов
python cli.py tokens switch <name>        # Переключить на аккаунт
python cli.py tokens switch <name> -r     # Переключить с принудительным refresh
python cli.py tokens refresh              # Обновить лучший токен
python cli.py tokens refresh <name>       # Обновить конкретный токен
python cli.py tokens refresh <name> -a    # Обновить и активировать

# ═══════════════════════════════════════════════════════════════
# КВОТЫ
# ═══════════════════════════════════════════════════════════════
python cli.py quota                       # Квота текущего аккаунта
python cli.py quota --all                 # Квоты ВСЕХ аккаунтов
python cli.py quota --all --refresh       # Квоты всех с обновлением токенов
python cli.py quota --json                # JSON формат

# ═══════════════════════════════════════════════════════════════
# MACHINE ID
# ═══════════════════════════════════════════════════════════════
python cli.py machine                     # Статус Machine ID
python cli.py machine status              # Подробный статус
python cli.py machine backup              # Бэкап Kiro telemetry
python cli.py machine backup -s           # + бэкап системного GUID
python cli.py machine reset               # Сброс всех ID
python cli.py machine reset -s            # + сброс системного GUID
python cli.py machine reset -f            # Без проверки запущен ли Kiro
python cli.py machine restore             # Восстановить из бэкапа

# ═══════════════════════════════════════════════════════════════
# ПАТЧИНГ KIRO
# ═══════════════════════════════════════════════════════════════
python cli.py patch                       # Статус патча
python cli.py patch status                # Подробный статус
python cli.py patch status --json         # JSON формат
python cli.py patch apply                 # Применить патч
python cli.py patch apply -f              # Принудительно перепатчить
python cli.py patch remove                # Удалить патч (восстановить оригинал)
python cli.py patch generate-id           # Сгенерировать новый Machine ID
python cli.py patch generate-id <id>      # Установить конкретный ID (64 hex)
python cli.py patch check                 # Проверить нужно ли обновить патч
python cli.py patch check --auto-fix      # Автоматически обновить если нужно
python cli.py patch restart               # Перезапустить Kiro (сохраняет окна)
python cli.py patch apply-restart         # Патч + перезапуск Kiro

# ═══════════════════════════════════════════════════════════════
# KIRO IDE
# ═══════════════════════════════════════════════════════════════
python cli.py kiro                        # Статус Kiro
python cli.py kiro status                 # Подробный статус
python cli.py kiro start                  # Запустить Kiro
python cli.py kiro stop                   # Остановить Kiro
python cli.py kiro restart                # Перезапустить Kiro
python cli.py kiro info                   # Инфо: версия, User-Agent, Machine ID
python cli.py kiro info --json            # JSON формат

# ═══════════════════════════════════════════════════════════════
# SSO IMPORT (импорт из браузера)
# ═══════════════════════════════════════════════════════════════
python cli.py sso-import                  # Интерактивный импорт
python cli.py sso-import <cookie>         # Импорт из x-amz-sso_authn cookie
python cli.py sso-import <cookie> -a      # Импорт и активировать в Kiro
python cli.py sso-import <cookie> -r eu-west-1  # Другой регион

# ═══════════════════════════════════════════════════════════════
# LLM API SERVER
# ═══════════════════════════════════════════════════════════════
python -m llm.run_llm_server              # Запустить на :8421

# ═══════════════════════════════════════════════════════════════
# STANDALONE WEB APP
# ═══════════════════════════════════════════════════════════════
python run.py                             # Запустить на :8420

# ═══════════════════════════════════════════════════════════════
# DEBUG
# ═══════════════════════════════════════════════════════════════
python -m debugger.run                    # Debug сессия регистрации
```

### SSO Import — импорт существующего аккаунта

Если у тебя уже есть залогиненный аккаунт в браузере:

1. Открой https://view.awsapps.com/start
2. DevTools (F12) → Application → Cookies
3. Скопируй значение `x-amz-sso_authn`
4. Запусти:
```bash
python cli.py sso-import <скопированное_значение> -a
```

Токен будет импортирован и активирован в Kiro.

---

## 🐛 Troubleshooting

### Авторег виснет на капче
AWS иногда показывает капчу. Решить руками или перезапустить.

### Браузер не открывается
```bash
# Проверить Chrome
python -c "from autoreg.registration.browser import find_chrome_path; print(find_chrome_path())"
```

### Python не найден
Убедиться что `python` или `python3` в PATH.

### Токен не применяется
Попробовать перезапустить Kiro. Редко, но бывает.

### Бан после регистрации
1. Сгенерировать новый machine ID: `python cli.py machine-id generate`
2. Использовать другой IP (VPN/proxy)
3. Подождать 24 часа

---

## 📝 Команды сборки

```bash
npm run build              # Собрать расширение
npm run build:standalone   # Собрать standalone HTML
npm run build:all          # Собрать всё
npm run package            # Создать .vsix

npm run release:patch      # Релиз патч версии (6.1.0 -> 6.1.1)
npm run release:minor      # Релиз минор версии (6.1.0 -> 6.2.0)
npm run release:major      # Релиз мажор версии (6.1.0 -> 7.0.0)
```

---

## 📜 Лицензия

MIT. Делай что хочешь, но помни про дисклеймер.

---

## 🤝 Контрибьютинг

Нашёл баг? Есть идея? Открывай issue или PR.

---

## 📢 Контакты

Telegram: [@whitebite_devsoft](https://t.me/whitebite_devsoft)
