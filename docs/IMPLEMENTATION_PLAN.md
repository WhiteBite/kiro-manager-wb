# План имплементации anti-ban мер

## Фаза 1: КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ (делать СРОЧНО)

### 1.1. Убрать немедленные проверки после регистрации

**Проблема:** Сразу после регистрации вызываем `get_quota()` - это триггерит бан систему AWS.

**Решение:**

#### A) Backend (`autoreg/registration/register.py`)
```python
# БЫЛО:
def register(self, email: str, password: str):
    token = self._exchange_code_for_token(code)
    quota = self.token_service.get_quota(token)  # ← УБРАТЬ!
    logger.info(f"Quota: {quota}")
    return token

# СТАЛО:
def register(self, email: str, password: str):
    token = self._exchange_code_for_token(code)
    # НЕ проверяем quota сразу!
    logger.info("Registration successful, token saved")
    return token
```

#### B) Frontend (`src/providers/AccountsProvider.ts`)
```typescript
// БЫЛО:
async addAccount(email: string, token: string) {
    await saveToken(email, token);
    await this.checkAccountHealth(email);  // ← УБРАТЬ!
}

// СТАЛО:
async addAccount(email: string, token: string) {
    await saveToken(email, token);
    // НЕ проверяем health сразу!
    this.refresh();
}
```

#### C) Проверять quota только по требованию
- Когда пользователь нажимает "Refresh All"
- Когда пользователь переключается на аккаунт
- Раз в N часов (например, раз в 24 часа)

**Файлы для изменения:**
- `autoreg/registration/register.py`
- `src/providers/AccountsProvider.ts`
- `src/accounts.ts`

**Приоритет:** 🔴 КРИТИЧНО

---

### 1.2. WebView OAuth с реальным браузером

**Проблема:** DrissionPage детектируется AWS как автоматизация.

**Решение:** Открывать реальный браузер, пользователь вводит данные вручную.

#### Архитектура:

```
┌─────────────┐      1. Start OAuth      ┌──────────────────┐
│   Python    │─────────────────────────>│  OAuth Server    │
│   Backend   │                           │  (localhost:43210)│
└─────────────┘                           └──────────────────┘
       │                                           │
       │ 2. Open browser                           │
       v                                           │
┌─────────────┐                                    │
│   Chrome    │  3. User logs in manually          │
│   (real)    │────────────────────────────────────┘
└─────────────┘       4. Callback with code
       │
       │ 5. Exchange code for token
       v
┌─────────────┐
│  Save token │
│  (no checks)│
└─────────────┘
```

#### Компоненты:

**A) OAuth Callback Server** (`autoreg/registration/oauth_server.py`)
```python
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        
        if 'code' in query:
            self.server.auth_code = query['code'][0]
            self.server.state = query.get('state', [None])[0]
            
            # Success page
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b"""
                <html><body>
                <h1>Authorization successful!</h1>
                <p>You can close this window.</p>
                <script>window.close();</script>
                </body></html>
            """)
        else:
            # Error page
            self.send_response(400)
            self.end_headers()

class OAuthServer:
    def __init__(self, port=43210):
        self.port = port
        self.server = None
        self.auth_code = None
        self.state = None
        
    def start(self):
        self.server = HTTPServer(('127.0.0.1', self.port), OAuthCallbackHandler)
        self.server.auth_code = None
        self.server.state = None
        
        # Run in thread
        thread = threading.Thread(target=self._run)
        thread.daemon = True
        thread.start()
        
    def _run(self):
        # Handle one request and stop
        self.server.handle_request()
        self.auth_code = self.server.auth_code
        self.state = self.server.state
        
    def wait_for_callback(self, timeout=300):
        """Wait for OAuth callback (max 5 minutes)"""
        import time
        start = time.time()
        while self.auth_code is None:
            if time.time() - start > timeout:
                raise TimeoutError("OAuth callback timeout")
            time.sleep(0.5)
        return self.auth_code, self.state
```

**B) WebView Auth** (`autoreg/registration/webview_auth.py`)
```python
import subprocess
import secrets
import hashlib
import base64
from .oauth_server import OAuthServer

class WebViewAuth:
    def __init__(self):
        self.redirect_uri = "http://127.0.0.1:43210/oauth/callback"
        
    def _generate_pkce(self):
        """Generate PKCE code_verifier and code_challenge"""
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        return code_verifier, code_challenge
        
    def _open_browser(self, url: str, browser_path: str = None):
        """Open real browser (not automated)"""
        if browser_path:
            # Custom browser
            subprocess.Popen([browser_path, "--incognito", url])
        else:
            # Default browser
            import webbrowser
            webbrowser.open(url)
            
    def login_google(self, browser_path: str = None):
        """Login with Google via WebView"""
        # 1. Generate PKCE
        code_verifier, code_challenge = self._generate_pkce()
        state = secrets.token_urlsafe(32)
        
        # 2. Start OAuth server
        server = OAuthServer()
        server.start()
        
        # 3. Build auth URL
        auth_url = (
            f"https://prod.us-east-1.auth.desktop.kiro.dev/login"
            f"?idp=Google"
            f"&redirect_uri={self.redirect_uri}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
            f"&state={state}"
        )
        
        # 4. Open browser (user logs in manually)
        print(f"\n🌐 Opening browser for Google login...")
        print(f"Please log in with your Google account")
        self._open_browser(auth_url, browser_path)
        
        # 5. Wait for callback
        print("⏳ Waiting for authorization...")
        code, returned_state = server.wait_for_callback()
        
        if returned_state != state:
            raise ValueError("State mismatch - possible CSRF attack")
            
        # 6. Exchange code for token
        print("🔄 Exchanging code for token...")
        token_data = self._exchange_code(code, code_verifier)
        
        # 7. Return token (NO CHECKS!)
        print("✅ Login successful!")
        return {
            'access_token': token_data['accessToken'],
            'refresh_token': token_data['refreshToken'],
            'expires_in': token_data['expiresIn'],
            'profile_arn': token_data.get('profileArn'),
            'csrf_token': token_data.get('csrfToken')
        }
        
    def _exchange_code(self, code: str, code_verifier: str):
        """Exchange authorization code for tokens"""
        import requests
        
        url = "https://prod.us-east-1.auth.desktop.kiro.dev/oauth/token"
        data = {
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": self.redirect_uri
        }
        
        response = requests.post(url, json=data, headers={
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        
        if response.status_code != 200:
            raise Exception(f"Token exchange failed: {response.text}")
            
        return response.json()
```

**C) CLI Integration** (`autoreg/cli.py`)
```python
@click.command()
@click.option('--email', required=True)
@click.option('--browser', help='Path to browser executable')
def webview_login(email: str, browser: str):
    """Login via WebView (manual input)"""
    auth = WebViewAuth()
    
    try:
        token_data = auth.login_google(browser_path=browser)
        
        # Save token (NO CHECKS!)
        token_service = TokenService()
        token_service.save_token(email, token_data['access_token'])
        
        click.echo(f"✅ Account {email} added successfully!")
        click.echo("⚠️  Quota will be checked on first use")
        
    except Exception as e:
        click.echo(f"❌ Error: {e}", err=True)
```

**Файлы для создания:**
- `autoreg/registration/oauth_server.py` (новый)
- `autoreg/registration/webview_auth.py` (переписать)

**Файлы для изменения:**
- `autoreg/cli.py` (добавить команду `webview-login`)

**Приоритет:** 🔴 КРИТИЧНО

---

## Фаза 2: ВАЖНЫЕ УЛУЧШЕНИЯ

### 2.1. Прокси поддержка

**Проблема:** Все аккаунты с одного IP.

**Решение:** Ротация прокси для каждого аккаунта.

#### A) Proxy Pool (`autoreg/core/proxy_pool.py`)
```python
from dataclasses import dataclass
from typing import List, Optional
import random

@dataclass
class ProxyConfig:
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    
    def to_url(self) -> str:
        if self.username and self.password:
            return f"http://{self.username}:{self.password}@{self.host}:{self.port}"
        return f"http://{self.host}:{self.port}"

class ProxyPool:
    def __init__(self, proxies: List[ProxyConfig]):
        self.proxies = proxies
        self.used = {}  # email -> proxy
        
    def get_proxy(self, email: str) -> Optional[ProxyConfig]:
        """Get proxy for account (sticky)"""
        if email in self.used:
            return self.used[email]
            
        if not self.proxies:
            return None
            
        # Assign random proxy
        proxy = random.choice(self.proxies)
        self.used[email] = proxy
        return proxy
        
    def release_proxy(self, email: str):
        """Release proxy for account"""
        if email in self.used:
            del self.used[email]
```

#### B) Browser with Proxy (`autoreg/registration/webview_auth.py`)
```python
def _open_browser(self, url: str, browser_path: str = None, proxy: ProxyConfig = None):
    """Open browser with proxy"""
    args = ["--incognito"]
    
    if proxy:
        args.append(f"--proxy-server={proxy.to_url()}")
        
    args.append(url)
    
    if browser_path:
        subprocess.Popen([browser_path] + args)
    else:
        import webbrowser
        webbrowser.open(url)
```

#### C) Config (`autoreg/core/config.py`)
```python
@dataclass
class AppConfig:
    # ... existing fields ...
    
    # Proxy pool
    proxies: List[ProxyConfig] = field(default_factory=list)
    
    @classmethod
    def from_env(cls):
        config = cls()
        
        # Load proxies from env
        proxy_list = os.getenv('PROXY_LIST', '')  # host:port:user:pass,host:port,...
        if proxy_list:
            for proxy_str in proxy_list.split(','):
                parts = proxy_str.split(':')
                if len(parts) >= 2:
                    config.proxies.append(ProxyConfig(
                        host=parts[0],
                        port=int(parts[1]),
                        username=parts[2] if len(parts) > 2 else None,
                        password=parts[3] if len(parts) > 3 else None
                    ))
                    
        return config
```

**Файлы для создания:**
- `autoreg/core/proxy_pool.py` (новый)

**Файлы для изменения:**
- `autoreg/core/config.py`
- `autoreg/registration/webview_auth.py`
- `autoreg/.env.example` (добавить `PROXY_LIST`)

**Приоритет:** 🟡 ВАЖНО

---

### 2.2. Delayed quota checks

**Решение:** Проверять quota с задержкой и только по требованию.

#### A) Quota Check Strategy
```python
from datetime import datetime, timedelta

class QuotaCheckStrategy:
    def __init__(self):
        self.last_check = {}  # email -> datetime
        self.min_interval = timedelta(hours=24)
        
    def should_check(self, email: str, force: bool = False) -> bool:
        """Should we check quota for this account?"""
        if force:
            return True
            
        last = self.last_check.get(email)
        if last is None:
            return True
            
        return datetime.now() - last > self.min_interval
        
    def mark_checked(self, email: str):
        """Mark account as checked"""
        self.last_check[email] = datetime.now()
```

#### B) Integration
```typescript
// src/providers/AccountsProvider.ts
async refreshAccount(email: string, force: boolean = false) {
    const shouldCheck = await this.quotaStrategy.shouldCheck(email, force);
    
    if (!shouldCheck) {
        console.log(`Skipping quota check for ${email} (checked recently)`);
        return;
    }
    
    // Check quota
    const quota = await checkAccountHealth(email);
    await this.quotaStrategy.markChecked(email);
}
```

**Приоритет:** 🟡 ВАЖНО

---

## Фаза 3: ОПЦИОНАЛЬНЫЕ УЛУЧШЕНИЯ

### 3.1. KiroWebPortalService API с CBOR

**Зачем:** Может быть менее детектируемым, но не критично если работают фазы 1-2.

#### A) CBOR Client (`autoreg/services/kiro_webportal_client.py`)
```python
import cbor2
import requests

class KiroWebPortalClient:
    def __init__(self):
        self.endpoint = "https://kiro.dev"
        self.session = requests.Session()
        
    def _cbor_request(self, operation: str, data: dict):
        """Make CBOR-encoded request"""
        url = f"{self.endpoint}/service/KiroWebPortalService/operation/{operation}"
        
        body = cbor2.dumps(data)
        
        response = self.session.post(url, 
            data=body,
            headers={
                "Content-Type": "application/cbor",
                "Accept": "application/cbor",
                "smithy-protocol": "rpc-v2-cbor"
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"{operation} failed: {response.status_code}")
            
        return cbor2.loads(response.content)
        
    def initiate_login(self, idp: str, redirect_uri: str, code_challenge: str, state: str):
        """InitiateLogin operation"""
        return self._cbor_request("InitiateLogin", {
            "idp": idp,
            "redirectUri": redirect_uri,
            "codeChallenge": code_challenge,
            "state": state
        })
        
    def exchange_token(self, idp: str, code: str, code_verifier: str, redirect_uri: str, state: str):
        """ExchangeToken operation"""
        response = self._cbor_request("ExchangeToken", {
            "idp": idp,
            "code": code,
            "codeVerifier": code_verifier,
            "redirectUri": redirect_uri,
            "state": state
        })
        
        # Extract cookies from Set-Cookie headers
        cookies = {}
        for cookie in self.session.cookies:
            cookies[cookie.name] = cookie.value
            
        return {
            **response,
            'cookies': cookies
        }
```

**Приоритет:** 🟢 ОПЦИОНАЛЬНО (делать только если фазы 1-2 не помогут)

---

## Порядок внедрения

### Неделя 1: Критические исправления
1. ✅ Убрать немедленные проверки quota
2. ✅ Реализовать OAuth callback server
3. ✅ Реализовать WebView auth с реальным браузером
4. ✅ Интегрировать в CLI
5. ✅ Тестирование на 5-10 аккаунтах

### Неделя 2: Важные улучшения
1. ✅ Proxy pool
2. ✅ Delayed quota checks
3. ✅ Тестирование на 20-30 аккаунтах

### Неделя 3: Опционально
1. ⚠️ KiroWebPortalService API (только если нужно)
2. ⚠️ CBOR encoding (только если нужно)

---

## Метрики успеха

**До изменений:**
- Ban rate: ~80-90% (почти все аккаунты банятся)
- Время до бана: сразу после регистрации

**После фазы 1:**
- Ожидаемый ban rate: <10%
- Время до бана: не должно быть банов

**После фазы 2:**
- Ожидаемый ban rate: <5%
- Стабильная работа 50+ аккаунтов

---

## Риски и митигация

### Риск 1: AWS всё равно детектирует
**Митигация:** Перейти на KiroWebPortalService API (фаза 3)

### Риск 2: Пользователи не хотят вводить данные вручную
**Митигация:** 
- Сделать это опциональным
- Показать статистику: "WebView: 0% ban, Auto: 90% ban"

### Риск 3: Прокси не работают
**Митигация:** Использовать качественные residential прокси

---

## Заключение

**Главное:** Убрать автоматизацию браузера и немедленные проверки.

**Приоритеты:**
1. 🔴 Фаза 1 - делать СРОЧНО
2. 🟡 Фаза 2 - делать после тестирования фазы 1
3. 🟢 Фаза 3 - делать только если нужно
