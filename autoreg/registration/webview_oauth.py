"""
WebView OAuth - Manual Registration via Real Browser

Использует pywebview для открытия OAuth окна и перехвата callback.
Аналог подхода из kiro-account-manager (Tauri).

Flow:
1. InitiateLogin через KiroWebPortal API (CBOR)
2. Открываем WebView с authorize_url
3. Пользователь логинится вручную
4. Перехватываем редирект на https://app.kiro.dev/signin/oauth?code=...
5. ExchangeToken через KiroWebPortal API (CBOR)
6. Сохраняем токены
"""

import secrets
import hashlib
import base64
import logging
import threading
import time
from typing import Optional, Dict, Any, Tuple
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

# Constants
KIRO_WEB_PORTAL = "https://app.kiro.dev"
KIRO_REDIRECT_URI = "https://app.kiro.dev/signin/oauth"


def generate_pkce() -> Tuple[str, str]:
    """Generate PKCE code_verifier and code_challenge"""
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode('utf-8')).digest()
    ).decode('utf-8').rstrip('=')
    return code_verifier, code_challenge


class WebViewOAuth:
    """
    OAuth через WebView окно
    
    Открывает нативное окно браузера, пользователь логинится,
    перехватываем callback URL с code.
    """
    
    def __init__(self):
        self.code: Optional[str] = None
        self.state: Optional[str] = None
        self.error: Optional[str] = None
        self._window = None
        self._callback_received = threading.Event()
    
    def _on_navigation(self, url: str) -> bool:
        """
        Callback при навигации в WebView
        
        Returns:
            True - разрешить навигацию
            False - заблокировать навигацию
        """
        logger.info(f"[WebView] Navigation: {url[:100]}...")
        
        # Проверяем callback URL
        if url.startswith(KIRO_REDIRECT_URI) and 'code=' in url:
            logger.info("[WebView] Callback URL detected!")
            
            # Парсим параметры
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            
            self.code = params.get('code', [None])[0]
            self.state = params.get('state', [None])[0]
            
            if self.code:
                logger.info(f"[WebView] Got code: {self.code[:20]}...")
                self._callback_received.set()
                
                # Закрываем окно
                if self._window:
                    try:
                        self._window.destroy()
                    except:
                        pass
                
                return False  # Блокируем навигацию
        
        # Проверяем ошибку
        if 'error=' in url:
            parsed = urlparse(url)
            params = parse_qs(parsed.query)
            self.error = params.get('error', ['Unknown error'])[0]
            error_desc = params.get('error_description', [''])[0]
            logger.error(f"[WebView] OAuth error: {self.error} - {error_desc}")
            self._callback_received.set()
            
            if self._window:
                try:
                    self._window.destroy()
                except:
                    pass
            
            return False
        
        return True  # Разрешаем навигацию
    
    def open_auth_window(self, authorize_url: str, title: str = "Login with Google") -> bool:
        """
        Открыть WebView окно для авторизации
        
        Args:
            authorize_url: URL для авторизации
            title: Заголовок окна
            
        Returns:
            True если получен code, False при ошибке/отмене
        """
        try:
            import webview
        except ImportError:
            logger.error("[WebView] pywebview not installed! Run: pip install pywebview")
            raise RuntimeError("pywebview not installed. Run: pip install pywebview")
        
        logger.info(f"[WebView] Opening auth window: {authorize_url[:80]}...")
        
        # Создаём окно
        self._window = webview.create_window(
            title=title,
            url=authorize_url,
            width=500,
            height=700,
            resizable=True,
            text_select=False,
            confirm_close=False
        )
        
        # Polling для проверки URL в отдельном потоке
        def poll_url():
            """Poll URL changes and detect OAuth callback"""
            time.sleep(2)  # Wait for window to initialize
            while not self._callback_received.is_set():
                try:
                    if self._window:
                        current_url = self._window.get_current_url()
                        if current_url:
                            if not self._on_navigation(current_url):
                                break
                except Exception as e:
                    # Window might be closed
                    if "window" in str(e).lower() or "destroyed" in str(e).lower():
                        break
                time.sleep(0.5)
        
        # Start polling thread before webview.start()
        poll_thread = threading.Thread(target=poll_url, daemon=True)
        poll_thread.start()
        
        # webview.start() MUST run in main thread on Windows
        # It blocks until all windows are closed
        try:
            webview.start(debug=False)
        except Exception as e:
            logger.error(f"[WebView] Error: {e}")
        
        # Wait a bit for callback processing
        self._callback_received.wait(timeout=2)
        
        return self.code is not None


class KiroWebPortalClient:
    """
    Клиент для Kiro Web Portal API (CBOR)
    
    Реализует InitiateLogin и ExchangeToken endpoints.
    """
    
    def __init__(self):
        self.base_url = KIRO_WEB_PORTAL
        self._session = None
    
    @property
    def session(self):
        if self._session is None:
            import requests
            self._session = requests.Session()
            self._session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/cbor',
                'Content-Type': 'application/cbor',
                'smithy-protocol': 'rpc-v2-cbor',
            })
        return self._session
    
    def _cbor_encode(self, data: dict) -> bytes:
        """Encode data to CBOR"""
        try:
            import cbor2
            return cbor2.dumps(data)
        except ImportError:
            raise RuntimeError("cbor2 not installed. Run: pip install cbor2")
    
    def _cbor_decode(self, data: bytes) -> dict:
        """Decode CBOR data"""
        import cbor2
        return cbor2.loads(data)
    
    def initiate_login(self, idp: str, code_challenge: str, state: str) -> Dict[str, Any]:
        """
        InitiateLogin - начать OAuth flow
        
        POST /service/KiroWebPortalService/operation/InitiateLogin
        Body (CBOR): {idp, redirectUri, codeChallenge, codeChallengeMethod, state}
        
        Returns:
            {redirectUrl: str} - URL для авторизации
        """
        url = f"{self.base_url}/service/KiroWebPortalService/operation/InitiateLogin"
        
        payload = {
            'idp': idp,
            'redirectUri': KIRO_REDIRECT_URI,
            'codeChallenge': code_challenge,
            'codeChallengeMethod': 'S256',
            'state': state,
        }
        
        logger.info(f"[WebPortal] InitiateLogin: idp={idp}, state={state[:20]}...")
        
        response = self.session.post(url, data=self._cbor_encode(payload))
        
        if response.status_code != 200:
            logger.error(f"[WebPortal] InitiateLogin failed: {response.status_code}")
            raise RuntimeError(f"InitiateLogin failed: {response.status_code}")
        
        result = self._cbor_decode(response.content)
        logger.info(f"[WebPortal] InitiateLogin success, redirectUrl: {result.get('redirectUrl', '')[:80]}...")
        
        return result
    
    def exchange_token(self, idp: str, code: str, code_verifier: str, state: str) -> Dict[str, Any]:
        """
        ExchangeToken - обменять code на токены
        
        POST /service/KiroWebPortalService/operation/ExchangeToken
        Body (CBOR): {idp, code, codeVerifier, redirectUri, state}
        
        Returns:
            {accessToken, csrfToken, expiresIn, profileArn} + cookies (RefreshToken)
        """
        url = f"{self.base_url}/service/KiroWebPortalService/operation/ExchangeToken"
        
        payload = {
            'idp': idp,
            'code': code,
            'codeVerifier': code_verifier,
            'redirectUri': KIRO_REDIRECT_URI,
            'state': state,
        }
        
        logger.info(f"[WebPortal] ExchangeToken: idp={idp}, code={code[:20]}...")
        
        response = self.session.post(url, data=self._cbor_encode(payload))
        
        if response.status_code != 200:
            logger.error(f"[WebPortal] ExchangeToken failed: {response.status_code}")
            raise RuntimeError(f"ExchangeToken failed: {response.status_code}")
        
        result = self._cbor_decode(response.content)
        
        # Извлекаем RefreshToken из cookies
        refresh_token = None
        for cookie in response.cookies:
            if cookie.name == 'RefreshToken':
                refresh_token = cookie.value
                break
        
        result['refreshToken'] = refresh_token
        result['idp'] = idp
        
        logger.info(f"[WebPortal] ExchangeToken success, accessToken: {result.get('accessToken', '')[:20]}...")
        
        return result


def webview_register(email: str, name: str = None, provider: str = 'Google', timeout: int = 300) -> Dict[str, Any]:
    """
    Регистрация через WebView
    
    Args:
        email: Email (для подсказки пользователю)
        name: Display name для аккаунта (используется в имени файла токена)
        provider: OAuth provider ('Google' или 'Github')
        timeout: Таймаут в секундах
        
    Returns:
        Dict с результатом регистрации
    """
    # Use name if provided, otherwise extract from email
    account_name = name or email.split('@')[0]
    
    print("\n" + "="*60)
    print("🌐 WEBVIEW REGISTRATION (Low Ban Risk)")
    print("="*60)
    print(f"Provider: {provider}")
    print(f"Account name: {account_name}")
    print(f"Email hint: {email}")
    print("="*60 + "\n")
    
    try:
        # 1. Генерируем PKCE
        code_verifier, code_challenge = generate_pkce()
        state = secrets.token_urlsafe(32)
        
        logger.info(f"[WebView] Generated PKCE, state: {state[:20]}...")
        
        # 2. InitiateLogin
        client = KiroWebPortalClient()
        init_result = client.initiate_login(
            idp=provider,
            code_challenge=code_challenge,
            state=state
        )
        
        authorize_url = init_result.get('redirectUrl')
        if not authorize_url:
            return {
                'email': email,
                'success': False,
                'error': 'No redirectUrl in InitiateLogin response',
            }
        
        # 3. Открываем WebView
        print("📱 Opening browser window for login...")
        print("   Please log in with your credentials.\n")
        
        oauth = WebViewOAuth()
        success = oauth.open_auth_window(
            authorize_url=authorize_url,
            title=f"Login with {provider}"
        )
        
        if not success or not oauth.code:
            return {
                'email': email,
                'success': False,
                'error': oauth.error or 'OAuth cancelled or timeout',
            }
        
        # 4. ExchangeToken
        print("🔄 Exchanging code for tokens...")
        
        token_result = client.exchange_token(
            idp=provider,
            code=oauth.code,
            code_verifier=code_verifier,
            state=oauth.state or state
        )
        
        # 5. Сохраняем токены
        print("✅ Authentication successful!")
        print(f"   Access token: {token_result.get('accessToken', '')[:20]}...")
        
        # Сохраняем через TokenService
        from ..services.token_service import TokenService
        token_service = TokenService()
        
        # Prepare token data
        token_data = {
            'accessToken': token_result['accessToken'],
            'refreshToken': token_result.get('refreshToken'),
            'expiresIn': token_result.get('expiresIn', 3600),
            'csrfToken': token_result.get('csrfToken'),
            'profileArn': token_result.get('profileArn'),
            'idp': provider,
            'email': email,
            'accountName': account_name,
        }
        
        token_file = token_service.save_token(data=token_data, name=account_name)
        
        return {
            'email': email,
            'success': True,
            'token_file': token_file,
            'access_token': token_result['accessToken'],
            'refresh_token': token_result.get('refreshToken'),
            'csrf_token': token_result.get('csrfToken'),
            'expires_in': token_result.get('expiresIn'),
            'profile_arn': token_result.get('profileArn'),
            'idp': provider,
            'strategy': 'webview',
            'ban_risk': 'low',
        }
        
    except Exception as e:
        logger.error(f"[WebView] Registration error: {e}", exc_info=True)
        return {
            'email': email,
            'success': False,
            'error': str(e),
        }


if __name__ == '__main__':
    # Test
    logging.basicConfig(level=logging.INFO)
    result = webview_register('test@example.com', 'Google')
    print(f"\nResult: {result}")
