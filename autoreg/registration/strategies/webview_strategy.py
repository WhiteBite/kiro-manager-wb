"""
WebView Registration Strategy (Anti-Ban)

Использует реальный браузер с ручным вводом данных пользователем.
Минимальный риск бана, так как AWS видит обычного пользователя.

Преимущества:
- Низкий риск бана (<10%)
- AWS не детектирует автоматизацию
- Пользователь вводит данные сам
- Не требует немедленной проверки quota

Недостатки:
- Требует участия пользователя
- Не поддерживает headless режим
- Медленнее автоматической регистрации
"""

from typing import Optional, Dict, Any
import subprocess
import secrets
import hashlib
import base64
import time
import logging

from ..auth_strategy import RegistrationStrategy
from ..oauth_callback_server import OAuthCallbackServer
from ...core.proxy_checker import ProxyChecker

logger = logging.getLogger(__name__)


class WebViewRegistrationStrategy(RegistrationStrategy):
    """
    Регистрация через реальный браузер с ручным вводом
    
    Это НОВЫЙ метод с минимальным риском бана.
    Пользователь вручную вводит логин/пароль в настоящем браузере.
    """
    
    # OAuth endpoints (Desktop Auth API)
    AUTH_ENDPOINT = "https://prod.us-east-1.auth.desktop.kiro.dev"
    REDIRECT_URI_TEMPLATE = "http://127.0.0.1:{port}/oauth/callback"
    
    def __init__(self, browser_path: Optional[str] = None,
                 port: int = 43210,
                 proxy: Optional[str] = None,
                 check_proxy: bool = True):
        """
        Args:
            browser_path: Путь к браузеру (если None - используется системный)
            port: Порт для OAuth callback server
            proxy: Прокси в формате "host:port" или "user:pass@host:port"
            check_proxy: Проверять прокси перед использованием
        """
        self.browser_path = browser_path
        self.port = port
        self.proxy = proxy
        self.check_proxy = check_proxy
        self._server: Optional[OAuthCallbackServer] = None
        
        # Проверяем прокси если указан
        if self.proxy and self.check_proxy:
            logger.info(f"[WebView] Checking proxy: {self.proxy}")
            checker = ProxyChecker(timeout=10)
            result = checker.check_proxy(self.proxy)
            
            if not result.is_working:
                raise ValueError(f"Proxy is not working: {result.error}")
            
            logger.info(f"[WebView] Proxy OK (IP: {result.ip_address}, {result.response_time:.2f}s)")
    
    def register(self, email: str, name: Optional[str] = None,
                password: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Регистрация через WebView
        
        Flow:
        1. Запускаем OAuth callback server
        2. Генерируем PKCE параметры
        3. Открываем браузер с OAuth URL
        4. Пользователь ВРУЧНУЮ логинится
        5. Получаем callback с code
        6. Обмениваем code на токены
        7. Сохраняем БЕЗ проверки quota
        
        Args:
            email: Email для регистрации (показывается пользователю как подсказка)
            name: Имя (не используется, пользователь вводит сам)
            password: Пароль (не используется, пользователь вводит сам)
            **kwargs:
                - provider: "Google" или "Github" (по умолчанию "Google")
                - timeout: Таймаут ожидания callback в секундах (по умолчанию 300)
        """
        provider = kwargs.get('provider', 'Google')
        timeout = kwargs.get('timeout', 300)
        
        try:
            # Шаг 1: Запускаем OAuth callback server
            logger.info(f"[WebView] Starting OAuth callback server on port {self.port}...")
            self._server = OAuthCallbackServer(port=self.port)
            self._server.start()
            
            redirect_uri = self._server.get_redirect_uri()
            
            # Шаг 2: Генерируем PKCE параметры
            logger.info(f"[WebView] Generating PKCE parameters...")
            code_verifier, code_challenge = self._generate_pkce()
            state = secrets.token_urlsafe(32)
            
            # Шаг 3: Строим OAuth URL
            auth_url = self._build_auth_url(
                provider=provider,
                redirect_uri=redirect_uri,
                code_challenge=code_challenge,
                state=state
            )
            
            logger.info(f"[WebView] OAuth URL: {auth_url[:80]}...")
            
            # Шаг 4: Открываем браузер
            print("\n" + "="*60)
            print("🌐 WEBVIEW AUTHENTICATION")
            print("="*60)
            print(f"Provider: {provider}")
            print(f"Email hint: {email}")
            print(f"\nOpening browser for manual login...")
            print("Please log in with your credentials in the browser window.")
            print("="*60 + "\n")
            
            self._open_browser(auth_url)
            
            # Шаг 5: Ждём callback
            print(f"⏳ Waiting for authorization (timeout: {timeout}s)...")
            print("   Please complete the login process in your browser.\n")
            
            code, returned_state = self._server.wait_for_callback(timeout=timeout)
            
            if not code:
                return {
                    'email': email,
                    'success': False,
                    'error': 'OAuth callback not received (timeout or user cancelled)',
                    'strategy': self.get_name()
                }
            
            # Проверяем state (защита от CSRF)
            if returned_state != state:
                logger.error(f"[WebView] State mismatch! Expected: {state[:20]}..., Got: {returned_state[:20] if returned_state else None}...")
                return {
                    'email': email,
                    'success': False,
                    'error': 'State mismatch - possible CSRF attack',
                    'strategy': self.get_name()
                }
            
            # Шаг 6: Обмениваем code на токены
            print("🔄 Exchanging authorization code for tokens...")
            token_data = self._exchange_code(
                code=code,
                code_verifier=code_verifier,
                redirect_uri=redirect_uri
            )
            
            if not token_data:
                return {
                    'email': email,
                    'success': False,
                    'error': 'Failed to exchange code for tokens',
                    'strategy': self.get_name()
                }
            
            # Шаг 7: Сохраняем токены БЕЗ проверки quota
            print("✅ Authentication successful!")
            print(f"   Access token: {token_data['accessToken'][:20]}...")
            print(f"   Expires in: {token_data.get('expiresIn', 'unknown')}s")
            print("\n⚠️  Quota check deferred (anti-ban measure)")
            print("   Use 'check-account' command to verify quota later.\n")
            
            # Сохраняем токены через TokenService
            from ...services.token_service import TokenService
            token_service = TokenService()
            
            token_file = token_service.save_token(
                email=email,
                access_token=token_data['accessToken'],
                refresh_token=token_data.get('refreshToken'),
                expires_in=token_data.get('expiresIn', 3600)
            )
            
            return {
                'email': email,
                'success': True,
                'token_file': token_file,
                'access_token': token_data['accessToken'],
                'refresh_token': token_data.get('refreshToken'),
                'expires_in': token_data.get('expiresIn'),
                'profile_arn': token_data.get('profileArn'),
                'csrf_token': token_data.get('csrfToken'),
                'provider': provider,  # Google/Github
                'auth_method': 'social',
                'idp': provider,  # ВАЖНО: для Web Portal API!
                'strategy': self.get_name(),
                'ban_risk': self.get_ban_risk(),
                'manual_input_required': True,
                'quota_checked': False,
                'quota_check_deferred': True
            }
            
        except Exception as e:
            logger.error(f"[WebView] Registration error: {e}", exc_info=True)
            return {
                'email': email,
                'success': False,
                'error': str(e),
                'strategy': self.get_name()
            }
        finally:
            self.cleanup()
    
    def _generate_pkce(self) -> tuple[str, str]:
        """
        Генерация PKCE параметров
        
        Returns:
            Tuple (code_verifier, code_challenge)
        """
        # code_verifier: 32 байта random, base64url encoded
        code_verifier = base64.urlsafe_b64encode(
            secrets.token_bytes(32)
        ).decode('utf-8').rstrip('=')
        
        # code_challenge: SHA256(code_verifier), base64url encoded
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode('utf-8')).digest()
        ).decode('utf-8').rstrip('=')
        
        return code_verifier, code_challenge
    
    def _build_auth_url(self, provider: str, redirect_uri: str,
                       code_challenge: str, state: str) -> str:
        """Построить OAuth authorization URL"""
        from urllib.parse import urlencode
        
        params = {
            'idp': provider,
            'redirect_uri': redirect_uri,
            'code_challenge': code_challenge,
            'code_challenge_method': 'S256',
            'state': state
        }
        
        return f"{self.AUTH_ENDPOINT}/login?{urlencode(params)}"
    
    def _open_browser(self, url: str):
        """
        Открыть реальный браузер (НЕ автоматизированный!)
        
        Это ключевое отличие от DrissionPage - мы просто открываем браузер,
        пользователь вводит данные сам.
        """
        args = []
        
        # Добавляем incognito режим
        if self.browser_path:
            # Определяем тип браузера по пути
            browser_lower = self.browser_path.lower()
            if 'chrome' in browser_lower or 'brave' in browser_lower:
                args.append('--incognito')
            elif 'firefox' in browser_lower:
                args.append('-private-window')
            elif 'edge' in browser_lower or 'msedge' in browser_lower:
                args.append('--inprivate')
        
        # Добавляем прокси если указан
        if self.proxy:
            if 'firefox' not in (self.browser_path or '').lower():
                # Chrome/Edge/Brave
                args.append(f'--proxy-server=http://{self.proxy}')
        
        # Добавляем URL
        args.append(url)
        
        try:
            if self.browser_path:
                # Кастомный браузер
                logger.info(f"[WebView] Opening custom browser: {self.browser_path}")
                subprocess.Popen([self.browser_path] + args)
            else:
                # Системный браузер по умолчанию
                logger.info(f"[WebView] Opening default browser")
                import webbrowser
                webbrowser.open(url)
                
        except Exception as e:
            logger.error(f"[WebView] Failed to open browser: {e}")
            raise RuntimeError(f"Failed to open browser: {e}")
    
    def _exchange_code(self, code: str, code_verifier: str, 
                      redirect_uri: str) -> Optional[Dict[str, Any]]:
        """
        Обменять authorization code на токены
        
        POST /oauth/token
        {
            "code": "...",
            "code_verifier": "...",
            "redirect_uri": "..."
        }
        """
        import requests
        
        url = f"{self.AUTH_ENDPOINT}/oauth/token"
        data = {
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": redirect_uri
        }
        
        try:
            logger.info(f"[WebView] Exchanging code for tokens...")
            response = requests.post(
                url,
                json=data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"[WebView] Token exchange failed: {response.status_code} - {response.text}")
                return None
            
            token_data = response.json()
            logger.info(f"[WebView] Token exchange successful")
            
            return token_data
            
        except Exception as e:
            logger.error(f"[WebView] Token exchange error: {e}")
            return None
    
    def get_name(self) -> str:
        return "webview"
    
    def requires_manual_input(self) -> bool:
        return True
    
    def supports_headless(self) -> bool:
        return False
    
    def get_ban_risk(self) -> str:
        """
        Низкий риск бана благодаря:
        1. Реальный браузер (не автоматизация)
        2. Ручной ввод данных пользователем
        3. Нет немедленной проверки quota
        """
        return "low"  # <10% ban rate
    
    def supports_immediate_quota_check(self) -> bool:
        """
        НЕ поддерживает немедленную проверку quota!
        Это ключевая anti-ban мера.
        """
        return False
    
    def cleanup(self):
        """Остановить OAuth callback server"""
        if self._server:
            self._server.stop()
            self._server = None
