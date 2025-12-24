# Почему kiro-account-manager не банит аккаунты

## КРИТИЧЕСКИЕ РАЗЛИЧИЯ (после глубокого анализа)

### 1. Браузер и автоматизация

**Их подход:**
- Открывают **реальный браузер** через subprocess (Chrome/Edge/Firefox)
- Пользователь **вручную** вводит логин/пароль Google/Github
- Никакой автоматизации ввода данных
- Браузер открывается в обычном режиме (не headless)
- Код: `browser.rs` - просто `std::process::Command::new(exe_path).args(&[url]).spawn()`

**Наш подход:**
- DrissionPage (автоматизация на базе CDP)
- Автоматический ввод данных через `.input()`, `.click()`
- AWS легко детектирует автоматизацию

**Вывод:** AWS детектирует DrissionPage как бота. Нужен реальный браузер с ручным вводом.

---

### 2. OAuth Flow и API - ДВА РАЗНЫХ МЕТОДА

Они поддерживают **два способа** авторизации:

#### A) Social OAuth (через Desktop Auth API)

**Файл:** `auth_social.rs`, `kiro_auth_client.rs`

**Endpoints:**
```
https://prod.us-east-1.auth.desktop.kiro.dev/login
https://prod.us-east-1.auth.desktop.kiro.dev/oauth/token
https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken
```

**Encoding:** JSON (обычный)

**Flow:**
1. Открывают браузер на `/login?idp=Google&redirect_uri=...&code_challenge=...`
2. Пользователь логинится вручную
3. Получают callback с `code`
4. POST `/oauth/token` с `{code, code_verifier, redirect_uri}`
5. Получают `{access_token, refresh_token, expires_in, profile_arn, csrf_token}`

**Проверка quota:**
```
GET https://codewhisperer.us-east-1.amazonaws.com/getUsageLimits
  ?isEmailRequired=true
  &origin=AI_EDITOR
  &profileArn=arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK
Headers:
  Authorization: Bearer <access_token>
```

**Это тот же API, что используем мы!** Но с ключевыми отличиями:
- Они НЕ вызывают его сразу после регистрации
- Они используют реальный браузер, не автоматизацию

#### B) WebOAuth (через KiroWebPortalService)

**Файл:** `web_oauth.rs`

**Endpoints:**
```
https://kiro.dev/service/KiroWebPortalService/operation/InitiateLogin
https://kiro.dev/service/KiroWebPortalService/operation/ExchangeToken
https://kiro.dev/service/KiroWebPortalService/operation/RefreshToken
https://kiro.dev/service/KiroWebPortalService/operation/GetUserInfo
https://kiro.dev/service/KiroWebPortalService/operation/GetUserUsageAndLimits
```

**Encoding:** CBOR (Concise Binary Object Representation)

**Headers:**
```
Content-Type: application/cbor
Accept: application/cbor
smithy-protocol: rpc-v2-cbor
```

**Authentication:** Cookie-based
- Cookies: `AccessToken`, `RefreshToken`, `Idp`, `csrfToken`
- `csrfToken` передаётся и в body, и в header `x-csrf-token`

**Flow:**

1. **InitiateLogin**
```rust
POST /operation/InitiateLogin
Body (CBOR): {
  "idp": "Google",
  "redirectUri": "http://127.0.0.1:43210/oauth/callback",
  "codeChallenge": "...",
  "state": "..."
}
Response (CBOR): {
  "redirectUrl": "https://accounts.google.com/..."
}
```

2. **ExchangeToken**
```rust
POST /operation/ExchangeToken
Body (CBOR): {
  "idp": "Google",
  "code": "...",
  "codeVerifier": "...",
  "redirectUri": "...",
  "state": "..."
}
Response:
  Body (CBOR): {"accessToken": "...", "csrfToken": "...", "expiresIn": 3600}
  Set-Cookie: AccessToken=...; RefreshToken=...; Idp=Google
```

3. **RefreshToken**
```rust
POST /operation/RefreshToken
Headers:
  x-csrf-token: <csrf_token>
  Cookie: AccessToken=...; RefreshToken=...; Idp=...
Body (CBOR): {"csrfToken": "..."}
```

4. **GetUserUsageAndLimits**
```rust
POST /operation/GetUserUsageAndLimits
Headers:
  authorization: Bearer <access_token>
  Cookie: Idp=...; AccessToken=...
Body (CBOR): {
  "isEmailRequired": true,
  "origin": "KIRO_IDE"
}
```

**Ban detection:** HTTP 423 Locked = `AccountSuspendedException`

---

### 3. Проверки после регистрации - ГЛАВНОЕ ОТЛИЧИЕ!

**Их подход:**
- **НЕ делают** немедленных API запросов после регистрации
- Сохраняют токены и всё
- Проверки делаются только когда пользователь переключается на аккаунт
- Код в `auth.rs`: функции `get_usage_limits_desktop()` вызываются только по требованию

**Наш подход:**
```python
# register.py
token = self._exchange_code_for_token(code)
# Сразу проверяем!
quota = self.token_service.get_quota(token)  # ← БАН!
```

**Вывод:** Немедленная проверка quota после регистрации = red flag для AWS.

---

### 4. IP и прокси

**Из чата пользователей:**
> "Похоже когда мы проверяем через API, в этот момент нас банит. Я сделал чтобы ходил через прокси - зарегилось несколько."

**Их подход:**
- Один из пользователей упомянул, что через прокси регистрация проходит лучше
- Но основная фишка не в прокси, а в ручном вводе через WebView

**Наш подход:**
- Все аккаунты с одного IP
- Автоматизация + один IP = очевидный паттерн для AWS

**Вывод:** Прокси помогает, но не критично. Главное - ручной ввод + отсутствие немедленных проверок.

---

## Что мы делаем неправильно

### ❌ 1. Автоматизация браузера (КРИТИЧНО!)
```python
# Наш код
from DrissionPage import ChromiumPage
page = ChromiumPage()
page.get("https://...")
page.ele("@type=email").input(email)  # ← AWS детектирует это как бота
page.ele("@type=password").input(password)
page.ele("@type=submit").click()
```

**Их код:**
```rust
// browser.rs
std::process::Command::new("chrome.exe")
    .args(&["--incognito", url])
    .spawn()
// Пользователь вводит данные сам!
```

### ❌ 2. Немедленная проверка quota (КРИТИЧНО!)
```python
# Наш код - register.py
def register(self, email: str, password: str):
    # ... регистрация ...
    token = self._exchange_code_for_token(code)
    
    # Сразу проверяем quota - ЭТО ТРИГГЕРИТ БАН!
    quota = self.token_service.get_quota(token)
    logger.info(f"Quota: {quota}")
```

**Их код:**
```rust
// Они НЕ вызывают get_usage_limits сразу!
// Только когда пользователь явно переключается на аккаунт
```

### ❌ 3. Один IP для всех аккаунтов
- Паттерн: 10 аккаунтов с одного IP за час = подозрительно
- Но это вторично по сравнению с пунктами 1-2

---

## План исправления (по приоритету)

### 🔴 Приоритет 1: Убрать немедленные проверки
**Что делать:**
1. В `register.py` убрать вызов `get_quota()` после регистрации
2. В `AccountsProvider.ts` убрать автоматический health check после добавления
3. Проверять quota только когда:
   - Пользователь явно нажимает "Refresh"
   - Пользователь переключается на аккаунт
   - Прошло N часов с последней проверки

**Файлы:**
- `autoreg/registration/register.py`
- `src/providers/AccountsProvider.ts`
- `src/accounts.ts`

### 🔴 Приоритет 1: WebView авторизация
**Что делать:**
1. Открывать реальный браузер (Chrome/Edge) через subprocess
2. Запустить локальный HTTP сервер на `http://127.0.0.1:43210/oauth/callback`
3. Пользователь вводит логин/пароль вручную
4. Ловить OAuth callback с `code`
5. Обменять `code` на токены через Desktop Auth API
6. Сохранить токены БЕЗ проверок

**Файлы:**
- `autoreg/registration/webview_auth.py` (переписать)
- Добавить `autoreg/registration/oauth_server.py` (локальный HTTP сервер)

**Пример кода:**
```python
import subprocess
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler

# 1. Открыть браузер
auth_url = f"https://prod.us-east-1.auth.desktop.kiro.dev/login?idp=Google&redirect_uri=..."
subprocess.Popen(["chrome.exe", "--incognito", auth_url])

# 2. Запустить локальный сервер
class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Получить code из query params
        code = parse_qs(self.path)['code'][0]
        # Сохранить code
        self.server.auth_code = code

server = HTTPServer(('127.0.0.1', 43210), CallbackHandler)
server.handle_request()  # Ждём один запрос

# 3. Обменять code на токены
token = exchange_code(server.auth_code)

# 4. Сохранить БЕЗ проверок!
save_token(token)
```

### 🟡 Приоритет 2: Прокси поддержка
**Что делать:**
1. Добавить proxy pool в конфиг
2. Ротация прокси для каждого аккаунта
3. Прокси для браузера: `chrome.exe --proxy-server=http://proxy:port`

**Файлы:**
- `autoreg/core/config.py` (уже добавлено)
- `autoreg/registration/webview_auth.py`

### 🟢 Приоритет 3: KiroWebPortalService API (опционально)
**Что делать:**
1. Реализовать CBOR encoding/decoding (библиотека `cbor2`)
2. Переписать API клиент на KiroWebPortalService endpoints
3. Cookie-based auth вместо Bearer tokens

**Зачем:** Может быть менее детектируемым, но не критично если есть пункты 1-2.

**Файлы:**
- Новый `autoreg/services/kiro_webportal_client.py`

---

## Выводы

**Главная причина банов:**
1. 🔴 Автоматизация браузера (DrissionPage) - AWS детектирует CDP/WebDriver
2. 🔴 Немедленные API проверки после регистрации - подозрительный паттерн
3. 🟡 Один IP для всех аккаунтов - усиливает подозрения

**Почему их не банят:**
1. ✅ Реальный браузер с ручным вводом (subprocess, не автоматизация)
2. ✅ Никаких проверок сразу после регистрации
3. ✅ (Опционально) Используют современный API (KiroWebPortalService с CBOR)
4. ✅ (Опционально) Прокси для разных IP

**Что делать СРОЧНО:**
1. Убрать все вызовы `get_quota()` сразу после регистрации
2. Реализовать WebView OAuth с реальным браузером
3. Добавить прокси поддержку

**Что делать ПОТОМ:**
- Перейти на KiroWebPortalService API с CBOR (если пункты 1-2 не помогут)
