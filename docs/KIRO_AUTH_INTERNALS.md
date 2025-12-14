# Kiro Authentication Internals

> Документация по внутренней работе аутентификации Kiro IDE.
> Используй при рефакторинге чтобы ничего не сломать!

## Оглавление

1. [Архитектура аутентификации](#архитектура-аутентификации)
2. [Форматы токенов](#форматы-токенов)
3. [Пути к файлам](#пути-к-файлам)
4. [Процесс переключения аккаунтов](#процесс-переключения-аккаунтов)
5. [Refresh токенов](#refresh-токенов)
6. [Обработка ошибок и баны](#обработка-ошибок-и-баны)
7. [Kiro Auth Server vs AWS OIDC](#kiro-auth-server-vs-aws-oidc)
8. [Machine ID и патчинг](#machine-id-и-патчинг)

---

## Архитектура аутентификации

### Два типа аутентификации в Kiro

Kiro поддерживает два метода аутентификации:

1. **Social Auth** (Google, Github) — через `prod.us-east-1.auth.desktop.kiro.dev`
2. **IdC Auth** (BuilderId, Enterprise) — через AWS SSO OIDC (`oidc.{region}.amazonaws.com`)

```
┌─────────────────────────────────────────────────────────────┐
│                      Kiro IDE                                │
├─────────────────────────────────────────────────────────────┤
│  AuthServiceClient          │  SSOOIDCClient                │
│  (Social: Google, Github)   │  (IdC: BuilderId, Enterprise) │
│                             │                                │
│  Endpoint:                  │  Endpoint:                     │
│  prod.us-east-1.auth.       │  oidc.{region}.amazonaws.com   │
│  desktop.kiro.dev           │                                │
└─────────────────────────────────────────────────────────────┘
```

### Наши токены — это IdC (BuilderId)

Мы регистрируем аккаунты через AWS Builder ID, поэтому используем **AWS SSO OIDC**.

---

## Форматы токенов

### Наш формат (сохраняется в `~/.kiro-batch-login/tokens/`)

```json
{
  "accessToken": "aoaAAAAA...",
  "refreshToken": "aorAAAAA...",
  "idToken": null,
  "expiresAt": "2025-12-14T19:59:22.502822Z",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  
  "clientIdHash": "e909a0580879b06ece1202964fbe9dda95ea4ce3",
  "accountName": "RichardLee6431",
  "provider": "BuilderId",
  "authMethod": "IdC",
  "region": "us-east-1",
  "createdAt": "2025-12-14T21:59:22.502822",
  
  "_clientId": "yZAEwwXuFY1mSv3GVr-vdnVzLWVhc3QtMQ",
  "_clientSecret": "eyJraWQiOiJrZXktMTU2NDAyODA5OSIsImFsZyI6IkhTMzg0In0..."
}
```

**Важные поля:**
- `_clientId`, `_clientSecret` — нужны для refresh через AWS OIDC
- `clientIdHash` — SHA1 хеш от clientId, используется Kiro для идентификации
- `region` — регион AWS (обычно `us-east-1`)

### Формат Kiro (записывается в `kiro-auth-token.json`)

```json
{
  "accessToken": "aoaAAAAA...",
  "refreshToken": "aorAAAAA...",
  "expiresAt": "2025-12-14T19:59:22.502822Z",
  "clientIdHash": "e909a0580879b06ece1202964fbe9dda95ea4ce3",
  "authMethod": "IdC",
  "provider": "BuilderId",
  "region": "us-east-1"
}
```

**НЕ включает:** `_clientId`, `_clientSecret`, `accountName`, `createdAt`

---

## Пути к файлам

### КРИТИЧЕСКИ ВАЖНО: Kiro Token Storage

Kiro использует **AWS SSO cache directory**, а НЕ свою папку globalStorage!

```javascript
// Из исходников Kiro (TokenStorage class):
this.cacheDirectory = path.join(os.homedir(), ".aws", "sso", "cache");
this.authTokenPath = path.join(this.cacheDirectory, "kiro-auth-token.json");
```

### Windows

```
# Наши токены (хранилище аккаунтов)
%USERPROFILE%\.kiro-batch-login\tokens\token-BuilderId-IdC-{name}-{timestamp}.json

# Kiro auth token (АКТИВНЫЙ ТОКЕН - куда мы записываем при switch)
%USERPROFILE%\.aws\sso\cache\kiro-auth-token.json

# Kiro state database (usage, settings)
%APPDATA%\Kiro\User\globalStorage\state.vscdb

# Наш usage cache
%USERPROFILE%\.kiro-batch-login\account-usage.json
```

### macOS

```
# Наши токены
~/.kiro-batch-login/tokens/

# Kiro auth token (АКТИВНЫЙ ТОКЕН)
~/.aws/sso/cache/kiro-auth-token.json

# Kiro state database
~/Library/Application Support/Kiro/User/globalStorage/state.vscdb
```

### Linux

```
# Наши токены
~/.kiro-batch-login/tokens/

# Kiro auth token (АКТИВНЫЙ ТОКЕН)
~/.aws/sso/cache/kiro-auth-token.json

# Kiro state database
~/.config/Kiro/User/globalStorage/state.vscdb
```

### Проверка в коде

```typescript
// src/utils.ts - getKiroAuthTokenPath()
export function getKiroAuthTokenPath(): string {
  return path.join(os.homedir(), '.aws', 'sso', 'cache', 'kiro-auth-token.json');
}
```

---

## Процесс переключения аккаунтов

### Шаги в `switchToAccount()`

```typescript
1. Найти аккаунт по имени или filename
2. Проверить needsRefresh (истекает в течение 10 мин) и trulyInvalid (истёк + 3 мин)
3. Если needsRefresh → попытаться refresh:
   - Если refresh успешен → перечитать токен
   - Если refresh неудачен И trulyInvalid → вернуть ошибку
   - Если refresh неудачен НО НЕ trulyInvalid → продолжить с текущим токеном (grace period)
4. Записать токен в kiro-auth-token.json
5. Инкрементировать счётчик использования
```

### Логика grace period (как в Kiro)

```
Timeline:
|-------- Token Valid --------|-- Grace Period (3 min) --|-- Truly Invalid --|
                              ^                          ^
                         expiresAt                  expiresAt + 3 min

- needsRefresh: expiresAt - 10 min (начинаем refresh заранее)
- isExpired: expiresAt (базовая проверка)
- trulyInvalid: expiresAt + 3 min (токен точно не работает)
```

### Код записи токена

```typescript
// src/accounts.ts - writeKiroToken()

const kiroToken = {
  accessToken: tokenData.accessToken,
  refreshToken: tokenData.refreshToken,
  expiresAt: tokenData.expiresAt,
  clientIdHash,                          // SHA1 от _clientId
  authMethod: tokenData.authMethod || 'IdC',
  provider: tokenData.provider || 'BuilderId',
  region: tokenData.region || 'us-east-1'
};

fs.writeFileSync(kiroAuthPath, JSON.stringify(kiroToken, null, 2));
```

### Как Kiro подхватывает токен

#### File Watching механизм

Kiro **СЛЕДИТ** за изменениями файла через `fs.watchFile()`:

```javascript
// Из исходников Kiro (TokenStorage class):
class TokenStorage {
  constructor() {
    this.cacheDirectory = path.join(os.homedir(), ".aws", "sso", "cache");
    this.authTokenPath = path.join(this.cacheDirectory, "kiro-auth-token.json");
    
    // Kiro следит за файлом!
    fs.watchFile(this.authTokenPath, this.watchListener);
  }
  
  watchListener = (curr, prev) => {
    // При изменении файла - fire event
    if (curr.mtime !== prev.mtime) {
      this._onDidChange.fire();  // Уведомляет подписчиков
    }
  };
  
  // Метод для чтения токена с санитизацией
  readToken() {
    const content = fs.readFileSync(this.authTokenPath, 'utf8');
    const token = JSON.parse(content);
    return this.sanitizeToken(token);
  }
  
  // Удаляет лишние поля, оставляет только нужные
  sanitizeToken(token) {
    return {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      clientIdHash: token.clientIdHash,
      authMethod: token.authMethod,
      provider: token.provider,
      region: token.region
    };
  }
}
```

#### Когда Kiro читает токен

1. **При запуске IDE** — читает из файла
2. **При изменении файла** — `fs.watchFile()` триггерит `_onDidChange`
3. **При истечении токена** — refresh loop каждые 60 секунд
4. **При API вызове** — если текущий токен невалиден

#### Почему может быть "пролаг"

1. **fs.watchFile polling** — не мгновенный, интервал ~5 секунд
2. **Кэширование токена в памяти** — Kiro может использовать старый токен до следующего API вызова
3. **Refresh loop** — проверяет каждые 60 секунд

#### Как минимизировать пролаг

После записи токена Kiro должен подхватить его при:
- Следующем API вызове (генерация кода, чат)
- Через ~5-60 секунд автоматически
- При перезапуске Kiro (гарантированно)

---

## Refresh токенов

### AWS OIDC Refresh (наша реализация)

```typescript
// src/accounts.ts - refreshOIDCToken()

const payload = JSON.stringify({
  clientId,
  clientSecret,
  grantType: 'refresh_token',
  refreshToken
});

https.request({
  hostname: `oidc.${region}.amazonaws.com`,
  path: '/token',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
```

**Endpoint:** `https://oidc.us-east-1.amazonaws.com/token`

### Kiro Auth Refresh (для Social auth)

```typescript
// Kiro использует для Google/Github

POST https://prod.us-east-1.auth.desktop.kiro.dev/refreshToken
Content-Type: application/json
User-Agent: KiroIDE-{version}-{machineId}

{ "refreshToken": "..." }
```

**Мы НЕ используем этот endpoint** — наши токены IdC, не Social.

### Когда refresh работает

- `_clientId` и `_clientSecret` должны быть в токене
- `clientSecret` не должен быть истёкшим (обычно ~90 дней)
- `refreshToken` должен быть валидным

### Когда refresh НЕ работает

- Токен создан через SSO cookie import (нет clientId/clientSecret)
- clientSecret истёк
- Аккаунт заблокирован/удалён

---

## Обработка ошибок и баны

### AWS SSO OIDC Error Types

При работе с AWS SSO OIDC могут возникать следующие ошибки:

| Ошибка | Описание | Действие |
|--------|----------|----------|
| `InvalidGrantException` | Refresh token невалиден или истёк | Требуется повторный логин |
| `AccessDeniedException` | Аккаунт заблокирован/забанен | Аккаунт нельзя использовать |
| `ExpiredTokenException` | Токен истёк | Попробовать refresh |
| `InvalidClientException` | Client credentials невалидны | clientSecret мог истечь (~90 дней) |
| `UnauthorizedClientException` | Client не авторизован | Проблема с регистрацией клиента |
| `SlowDownException` | Rate limiting | Подождать и повторить |
| `InternalServerException` | Ошибка AWS | Повторить позже |

### Как Kiro определяет бан (из исходников)

```javascript
// Строка 113110: isBlockedAccessError()
function isBlockedAccessError(error) {
  return error.name === 'NewUserAccessPausedError' ||
         error.message?.includes('Kiro access not available for this account');
}

// Строка 138788: isBadAuthIssue()
function isBadAuthIssue(error) {
  const badAuthErrors = [
    'MissingTokenError',
    'MalformedTokenError', 
    'InvalidIdCAuthError',
    'InvalidSSOAuthError',
    'InvalidAuthError'
  ];
  return badAuthErrors.includes(error.name);
}
```

### Наша реализация (src/accounts.ts)

```typescript
// Типы ошибок SSO OIDC
export type OIDCErrorType = 
  | 'InvalidGrantException'      // Refresh token invalid/expired
  | 'AccessDeniedException'      // Account blocked/banned
  | 'ExpiredTokenException'      // Token expired
  | 'InvalidClientException'     // Client credentials invalid
  | 'UnauthorizedClientException' // Client not authorized
  | 'SlowDownException'          // Rate limited
  | 'NetworkError'               // Network connectivity issue
  | 'UnknownError';

// Проверка на бан (как в Kiro isBlockedAccessError + расширено)
export function isBlockedAccessError(error: OIDCErrorType | undefined, message?: string): boolean {
  if (error === 'AccessDeniedException') return true;
  if (message?.includes('Kiro access not available')) return true;
  if (message?.includes('NewUserAccessPausedError')) return true;
  if (message?.includes('account is blocked')) return true;
  if (message?.includes('account is suspended')) return true;
  return false;
}

// Проверка на проблемы с auth
export function isBadAuthIssue(error: OIDCErrorType): boolean {
  return ['InvalidGrantException', 'ExpiredTokenException', 
          'InvalidClientException', 'UnauthorizedClientException'].includes(error);
}
```

### Проверка здоровья аккаунта

```typescript
// Проверить один аккаунт
const status = await checkAccountHealth('accountName');
if (status.isBanned) {
  console.log('Account is banned!');
}

// Проверить все аккаунты
const allStatuses = await checkAllAccountsHealth();
const bannedAccounts = allStatuses.filter(s => s.isBanned);
```

### Что делать при бане

1. **Сменить Machine ID** — бан может быть привязан к устройству
2. **Использовать другой аккаунт** — текущий аккаунт заблокирован
3. **Подождать** — некоторые баны временные (rate limiting)

---

## Kiro Auth Server vs AWS OIDC

### Сравнение

| Параметр | Kiro Auth Server | AWS SSO OIDC |
|----------|------------------|--------------|
| Провайдеры | Google, Github | BuilderId, Enterprise |
| Endpoint | prod.us-east-1.auth.desktop.kiro.dev | oidc.{region}.amazonaws.com |
| Refresh payload | `{ refreshToken }` | `{ clientId, clientSecret, grantType, refreshToken }` |
| User-Agent | `KiroIDE-{version}-{machineId}` | Не требуется |

### Kiro внутренний код

```javascript
// packages/kiro-shared/dist/sso-oidc-client-DymqnaGh.js

// AuthServiceClient - для Social auth
class AuthServiceClient {
  endpoint = "https://prod.us-east-1.auth.desktop.kiro.dev";
  
  refreshToken({ refreshToken }) {
    return this.client.post(this.refreshTokenUrl, { refreshToken });
  }
}

// SSOOIDCClient - для IdC auth (BuilderId)
class SSOOIDCClient {
  constructor(region = "us-east-1") {
    this.ssoClient = new SSOOIDC({ region });
  }
  
  createToken(input) {
    // input.grantType = "refresh_token" для refresh
    return this.ssoClient.createToken(input);
  }
}
```

---

## Machine ID и патчинг

### Зачем нужен патч

Kiro отправляет Machine ID в телеметрию и для идентификации устройства.
Если аккаунт заблокирован, блокировка привязана к Machine ID.

### Где хранится Machine ID

```javascript
// packages/kiro-shared/dist/machine-id-DDyBZGvP.js

// Оригинальная функция
function getMachineId() {
  return machineIdSync();  // из node-machine-id
}

// После патча
function getMachineId() {
  const customId = readCustomMachineId();
  if (customId) return customId;
  return machineIdSync();
}
```

### Файл кастомного Machine ID

```
Windows: %USERPROFILE%\.kiro-batch-login\machine-id.txt
macOS:   ~/.kiro-batch-login/machine-id.txt
Linux:   ~/.kiro-batch-login/machine-id.txt
```

### User-Agent формат

```
KiroIDE-{kiroVersion}-{machineId}

Пример: KiroIDE-0.7.45-b24d98d6e176d1c6f1058c0806967923
```

---

## Важные константы

```javascript
// Kiro internal constants (из extension.js строки 156831-156833)

KIRO_AUTH_TOKEN_FILE_NAME = "kiro-auth-token.json"
SOCIAL_PROVIDERS = ["Google", "Github"]
IDC_PROVIDERS = ["Enterprise", "BuilderId", "Internal"]

// Timing constants
AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS = 3 * 60   // 3 минуты - grace period после истечения
REFRESH_BEFORE_EXPIRY_SECONDS = 10 * 60           // 10 минут - начать refresh заранее
REFRESH_LOOP_INTERVAL_SECONDS = 60                // 1 минута - интервал проверки
```

### Логика refresh в Kiro

```javascript
// Строка 156975: Если токен истекает в течение 10 минут - refresh
if (this.isAuthTokenExpiredWithinSeconds(token, REFRESH_BEFORE_EXPIRY_SECONDS)) {
  // Запустить refresh
}

// Строка 156982: Если ошибка auth и токен истекает в течение 3 минут - invalidate
if (isBadAuthIssue(error) && this.isAuthTokenExpiredWithinSeconds(token, AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS)) {
  // Инвалидировать токен
}
```

### Наша реализация (src/accounts.ts)

```typescript
// Экспортируемые константы (как в Kiro)
export const AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS = 3 * 60;   // 3 min
export const REFRESH_BEFORE_EXPIRY_SECONDS = 10 * 60;           // 10 min
export const REFRESH_LOOP_INTERVAL_SECONDS = 60;                // 1 min

// Проверки токена
export function isTokenExpired(tokenData, offsetSeconds = 0): boolean;
export function tokenNeedsRefresh(tokenData): boolean;  // expires within 10 min
export function isTokenTrulyInvalid(tokenData): boolean; // expired + 3 min passed
```

---

## Чеклист при рефакторинге

### При изменении формата токена

- [ ] Проверить что `clientIdHash` генерируется правильно (SHA1 от clientId)
- [ ] Проверить что `authMethod` = "IdC" для BuilderId
- [ ] Проверить что `provider` = "BuilderId"
- [ ] НЕ включать `_clientId`, `_clientSecret` в kiro-auth-token.json

### При изменении refresh логики

- [ ] Использовать `oidc.{region}.amazonaws.com/token` для IdC
- [ ] Payload: `{ clientId, clientSecret, grantType: 'refresh_token', refreshToken }`
- [ ] Content-Type: `application/json`

### При изменении путей

- [ ] Проверить все три платформы (Windows, macOS, Linux)
- [ ] Использовать `os.homedir()` для home directory
- [ ] Использовать `process.env.APPDATA` на Windows

### При изменении Machine ID

- [ ] Патч должен быть обратимым (backup оригинала)
- [ ] Кастомный ID должен быть 64 hex символа
- [ ] После патча требуется перезапуск Kiro

---

## Известные проблемы

### 0. Баг "выбивает из аккаунта при истечении токена" (ИСПРАВЛЕНО)

**Проблема:** В старых версиях при истечении токена пользователя "выбивало" из аккаунта,
потому что refresh не успевал выполниться или проверка была слишком строгой.

**Причина:** 
- `isTokenExpired()` проверял `expiresAt <= now` без учёта grace period
- При неудачном refresh сразу возвращалась ошибка, даже если токен ещё мог работать

**Решение (v5.x):**
1. Добавлены константы времени как в Kiro:
   - `AUTH_TOKEN_INVALIDATION_OFFSET_SECONDS = 180` (3 мин grace period)
   - `REFRESH_BEFORE_EXPIRY_SECONDS = 600` (10 мин - начать refresh заранее)

2. Новые функции проверки:
   - `tokenNeedsRefresh()` - истекает в течение 10 минут
   - `isTokenTrulyInvalid()` - истёк И прошло 3 минуты grace period

3. Умная логика в `switchToAccount()`:
   - Если токен скоро истечёт → пробуем refresh
   - Если refresh не удался, но токен ещё в grace period → используем как есть
   - Только если токен truly invalid И refresh не удался → ошибка

**Результат:** Токен продолжает работать даже если refresh временно недоступен
(например, нет интернета), пока не истечёт grace period.

### 1. Пролаг при переключении (5-60 секунд)

**Причина:** `fs.watchFile()` использует polling с интервалом ~5 секунд.
Плюс Kiro кэширует токен в памяти.

**Решение:** Это нормальное поведение. Пользователь может:
- Подождать несколько секунд
- Сделать любой API вызов (чат, генерация) чтобы форсировать обновление
- Перезапустить Kiro для гарантированного обновления

### 2. Refresh не работает для SSO import

Токены импортированные через SSO cookie не имеют `_clientId`/`_clientSecret`,
поэтому refresh невозможен.

**Решение:** Использовать только токены созданные через полный OAuth flow.

### 3. shell: true на Windows ломает python -c

При вызове `spawnSync` с `shell: true` на Windows, многострочные
Python скрипты через `-c` не работают.

**Решение:** Использовать `cli.py` с `--json` флагом вместо inline Python.

---

## Ссылки на код

- `src/accounts.ts` — загрузка, переключение, refresh токенов
- `src/utils.ts` — пути к файлам, чтение usage из DB
- `src/commands/autoreg.ts` — патчинг, Machine ID
- `autoreg/services/kiro_patcher_service.py` — Python патчер
- `autoreg/cli.py` — CLI для патча и Machine ID


---

## Приложение A: Полный flow регистрации

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REGISTRATION FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

1. IMAP Profile Setup
   ├── User configures email (Gmail, Yandex, etc.)
   ├── Strategy: single, plus_alias, catch_all, pool
   └── IMAP credentials saved to ~/.kiro-batch-login/profiles/

2. Browser Automation (DrissionPage)
   ├── Open https://profile.aws.amazon.com/
   ├── Click "Create Builder ID"
   ├── Fill email (generated based on strategy)
   ├── Wait for verification code
   └── Complete registration

3. OAuth PKCE Flow
   ├── Register OIDC client with AWS
   │   POST https://oidc.us-east-1.amazonaws.com/client/register
   │   → Returns clientId, clientSecret
   │
   ├── Start OAuth flow
   │   GET https://oidc.us-east-1.amazonaws.com/authorize
   │   ?client_id={clientId}
   │   &redirect_uri=http://127.0.0.1:{port}/oauth/callback
   │   &response_type=code
   │   &code_challenge={challenge}
   │   &code_challenge_method=S256
   │
   ├── User authorizes (automated via browser)
   │   → Redirects to callback with ?code={auth_code}
   │
   └── Exchange code for tokens
       POST https://oidc.us-east-1.amazonaws.com/token
       { clientId, clientSecret, code, code_verifier, redirect_uri }
       → Returns accessToken, refreshToken, expiresIn

4. Token Storage
   ├── Save to ~/.kiro-batch-login/tokens/token-BuilderId-IdC-{name}-{ts}.json
   └── Optionally activate in Kiro (write to kiro-auth-token.json)
```

---

## Приложение B: Структура файлов проекта

```
kiro-extension/
├── src/
│   ├── accounts.ts          # Token management, switch, refresh
│   ├── extension.ts         # VS Code extension entry point
│   ├── utils.ts             # Paths, DB access, helpers
│   ├── types.ts             # TypeScript interfaces
│   ├── kiro-commands.ts     # Kiro-specific commands
│   │
│   ├── commands/
│   │   ├── autoreg.ts       # Auto-registration, patching
│   │   ├── webview-handler.ts # Webview message handling
│   │   └── index.ts
│   │
│   ├── providers/
│   │   └── AccountsProvider.ts # Webview provider
│   │
│   └── webview/
│       ├── index.ts         # Main webview HTML generation
│       ├── scripts.ts       # Client-side JavaScript
│       ├── messages.ts      # Message types
│       ├── styles/          # CSS
│       ├── components/      # UI components
│       └── i18n/            # Translations (10 languages)
│
├── autoreg/
│   ├── cli.py               # CLI entry point
│   ├── registration/
│   │   ├── register.py      # Main registration logic
│   │   ├── browser.py       # DrissionPage automation
│   │   ├── mail_handler.py  # IMAP email handling
│   │   └── oauth_pkce.py    # OAuth PKCE flow
│   │
│   ├── services/
│   │   ├── kiro_service.py          # Kiro config reading
│   │   ├── kiro_patcher_service.py  # Machine ID patching
│   │   ├── machine_id_service.py    # Machine ID generation
│   │   ├── token_service.py         # Token file operations
│   │   └── quota_service.py         # Usage quota checking
│   │
│   ├── core/
│   │   ├── config.py        # Configuration
│   │   ├── paths.py         # Path constants
│   │   └── exceptions.py    # Custom exceptions
│   │
│   └── src/
│       └── index.js         # Node.js OAuth helper
│
├── tests/
│   ├── autoreg-integration.test.ts
│   └── extension-paths.test.ts
│
└── docs/
    └── KIRO_AUTH_INTERNALS.md  # This file
```

---

## Приложение C: API Endpoints

### AWS SSO OIDC

```
Base: https://oidc.{region}.amazonaws.com

POST /client/register     # Register OIDC client
POST /device/authorization # Start device auth flow
POST /token               # Exchange code or refresh token
```

### Kiro Auth Server

```
Base: https://prod.us-east-1.auth.desktop.kiro.dev

GET  /login               # Start login flow
POST /oauth/token         # Exchange code for tokens
POST /refreshToken        # Refresh tokens (Social auth only)
POST /logout              # Invalidate refresh token
DELETE /account           # Delete account
```

### AWS Builder ID

```
https://profile.aws.amazon.com/          # Registration page
https://signin.aws.amazon.com/           # Sign in
https://view.awsapps.com/start/          # SSO portal
```

---

## Приложение D: Troubleshooting

### Token refresh fails

1. Check if `_clientId` and `_clientSecret` exist in token file
2. Check if clientSecret is not expired (90 days from creation)
3. Check network connectivity to `oidc.us-east-1.amazonaws.com`
4. Check Kiro logs for detailed error

### Account switch doesn't work

1. Verify token file exists and is valid JSON
2. Check `kiro-auth-token.json` was written correctly
3. Try restarting Kiro
4. Check if token is not expired

### Patch doesn't apply

1. Close Kiro before patching
2. Check Kiro installation path
3. Verify `machine-id-*.js` file exists
4. Check backup was created

### Usage not updating

1. Usage is cached, may take time to update
2. Check `kiro-usage.db` exists
3. Try `invalidateAccountUsage()` to clear cache
