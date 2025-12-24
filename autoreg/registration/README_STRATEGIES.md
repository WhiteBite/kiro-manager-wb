# Registration Strategies

Поддерживаются два метода регистрации аккаунтов AWS Builder ID:

## 🎯 Стратегии

### 1. WebView (Рекомендуется) ✅

**Описание:** Открывает реальный браузер, пользователь вручную вводит логин/пароль.

**Преимущества:**
- ✅ Низкий риск бана (<10%)
- ✅ AWS не детектирует автоматизацию
- ✅ Не требует немедленной проверки quota
- ✅ Работает стабильно

**Недостатки:**
- ❌ Требует участия пользователя
- ❌ Не поддерживает headless режим
- ❌ Медленнее автоматической регистрации

**Использование:**
```bash
# Базовая регистрация
python -m autoreg.cli_registration register-webview --email test@gmail.com

# С кастомным браузером
python -m autoreg.cli_registration register-webview \
    --email test@gmail.com \
    --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"

# С прокси
python -m autoreg.cli_registration register-webview \
    --email test@gmail.com \
    --proxy "user:pass@proxy.com:8080"

# Github вместо Google
python -m autoreg.cli_registration register-webview \
    --email test@gmail.com \
    --provider Github
```

**Как работает:**
1. Запускается локальный OAuth callback server на `http://127.0.0.1:43210`
2. Открывается реальный браузер с OAuth URL
3. Пользователь **вручную** вводит логин/пароль
4. После авторизации AWS редиректит на callback URL
5. Сервер получает authorization code
6. Code обменивается на токены
7. Токены сохраняются **БЕЗ** проверки quota

---

### 2. Automated (Legacy) ⚠️

**Описание:** Использует DrissionPage для автоматизации браузера.

**Преимущества:**
- ✅ Полностью автоматический
- ✅ Не требует участия пользователя
- ✅ Поддерживает headless режим
- ✅ Работает для некоторых пользователей

**Недостатки:**
- ❌ Высокий риск бана (80-90% с немедленной проверкой quota)
- ❌ Средний риск бана (40-60% без немедленной проверки)
- ❌ AWS детектирует автоматизацию

**Использование:**
```bash
# Базовая регистрация (БЕЗ немедленной проверки quota - рекомендуется!)
python -m autoreg.cli_registration register-automated \
    --email test@gmail.com \
    --no-check-quota

# С немедленной проверкой quota (НЕ рекомендуется! Высокий риск бана)
python -m autoreg.cli_registration register-automated \
    --email test@gmail.com

# Headless режим
python -m autoreg.cli_registration register-automated \
    --email test@gmail.com \
    --no-check-quota \
    --headless

# С кастомным именем и паролем
python -m autoreg.cli_registration register-automated \
    --email test@gmail.com \
    --name "John Doe" \
    --password "MySecurePass123!" \
    --no-check-quota
```

**Как работает:**
1. Запускается DrissionPage (автоматизированный браузер)
2. Автоматически вводится email, имя, пароль
3. Автоматически получается verification code из IMAP
4. Автоматически кликается "Allow access"
5. Получается OAuth callback с code
6. Code обменивается на токены
7. Токены сохраняются (с проверкой quota или без - зависит от флага)

---

## 📊 Сравнение стратегий

| Параметр | WebView | Automated |
|----------|---------|-----------|
| Ban risk | **Low (<10%)** | High (80-90%) или Medium (40-60%) |
| Manual input | Yes | No |
| Headless | No | Yes |
| Speed | Slow (manual) | Fast (automated) |
| Stability | High | Medium |
| Recommended | **✅ Yes** | ⚠️ Legacy |

---

## 🚀 Быстрый старт

### Для новых пользователей (рекомендуется):

```bash
# 1. Показать доступные стратегии
python -m autoreg.cli_registration register-strategies

# 2. Зарегистрировать аккаунт через WebView
python -m autoreg.cli_registration register-webview --email your@email.com

# 3. Проверить quota (через 24 часа после регистрации)
python -m autoreg.cli check-account --email your@email.com
```

### Для опытных пользователей (legacy):

```bash
# Automated регистрация БЕЗ немедленной проверки quota
python -m autoreg.cli_registration register-automated \
    --email your@email.com \
    --no-check-quota
```

---

## 🔧 Интеграция в существующий код

### Использование стратегий в Python коде:

```python
from autoreg.registration.strategy_factory import StrategyFactory

# WebView стратегия
strategy = StrategyFactory.create('webview', browser_path=None, proxy=None)
result = strategy.register(email='test@gmail.com', provider='Google')

if result['success']:
    print(f"Token: {result['access_token']}")
    print(f"Ban risk: {result['ban_risk']}")  # "low"
else:
    print(f"Error: {result['error']}")

strategy.cleanup()

# Automated стратегия
strategy = StrategyFactory.create(
    'automated',
    headless=False,
    check_quota_immediately=False,  # ВАЖНО! Не проверять quota сразу
    human_delays=True
)

result = strategy.register(
    email='test@gmail.com',
    name='John Doe',
    password='SecurePass123!'
)

strategy.cleanup()
```

### Список доступных стратегий:

```python
from autoreg.registration.strategy_factory import StrategyFactory

# Получить информацию о стратегиях
strategies = StrategyFactory.list_strategies()
for name, info in strategies.items():
    print(f"{name}: {info['description']}")
    print(f"  Ban risk: {info['ban_risk']}")
    print(f"  Recommended: {info['recommended']}")

# Получить рекомендуемую стратегию
recommended = StrategyFactory.get_recommended()  # "webview"
```

---

## ⚠️ Важные замечания

### 1. Немедленная проверка quota

**НЕ ПРОВЕРЯЙТЕ QUOTA СРАЗУ ПОСЛЕ РЕГИСТРАЦИИ!**

Это один из главных триггеров бан системы AWS. Подождите минимум 24 часа.

```bash
# ❌ ПЛОХО - сразу проверяем quota
python -m autoreg.cli_registration register-automated --email test@gmail.com

# ✅ ХОРОШО - откладываем проверку
python -m autoreg.cli_registration register-automated --email test@gmail.com --no-check-quota

# Проверяем через 24 часа
python -m autoreg.cli check-account --email test@gmail.com
```

### 2. Прокси

Для WebView стратегии прокси помогает, но не критично. Главное - ручной ввод.

```bash
# С прокси
python -m autoreg.cli_registration register-webview \
    --email test@gmail.com \
    --proxy "proxy.com:8080"

# С авторизацией
python -m autoreg.cli_registration register-webview \
    --email test@gmail.com \
    --proxy "user:pass@proxy.com:8080"
```

### 3. Headless режим

WebView стратегия **НЕ поддерживает** headless режим, так как требует ручного ввода.

Для headless серверов используйте Automated стратегию с `--no-check-quota`:

```bash
python -m autoreg.cli_registration register-automated \
    --email test@gmail.com \
    --no-check-quota \
    --headless
```

---

## 📈 Статистика ban rate

### WebView стратегия:
- Ban rate: **<10%**
- Время до бана: не должно быть банов
- Причина низкого ban rate: реальный браузер + ручной ввод + нет немедленных проверок

### Automated стратегия:
- Ban rate с `--no-check-quota`: **40-60%**
- Ban rate без флага: **80-90%**
- Время до бана: сразу после регистрации (если проверяем quota)
- Причина высокого ban rate: DrissionPage детектируется + немедленная проверка quota

---

## 🐛 Troubleshooting

### WebView: "Port already in use"

Другой OAuth server уже запущен. Закройте его или используйте другой порт:

```bash
# Найти процесс на порту 43210
netstat -ano | findstr :43210

# Убить процесс (замените PID)
taskkill /PID <PID> /F

# Или используйте другой порт (не реализовано пока)
```

### WebView: "Browser failed to open"

Проверьте путь к браузеру:

```bash
# Windows
python -m autoreg.cli_registration register-webview \
    --email test@gmail.com \
    --browser "C:\Program Files\Google\Chrome\Application\chrome.exe"

# Или используйте системный браузер (по умолчанию)
python -m autoreg.cli_registration register-webview --email test@gmail.com
```

### Automated: "Verification code not received"

Проверьте IMAP настройки в `.env`:

```bash
IMAP_HOST=imap.gmail.com
IMAP_EMAIL=your@gmail.com
IMAP_PASSWORD=your_app_password
```

---

## 📚 Дополнительная информация

- [WHY_THEY_DONT_BAN.md](../../docs/WHY_THEY_DONT_BAN.md) - детальный анализ причин банов
- [IMPLEMENTATION_PLAN.md](../../docs/IMPLEMENTATION_PLAN.md) - план имплементации anti-ban мер
- [ANTI_BAN_SUMMARY.md](../../docs/ANTI_BAN_SUMMARY.md) - краткая сводка
