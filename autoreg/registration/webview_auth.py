"""
WebView OAuth Authorization
Открывает реальный браузер для ручной авторизации (как в kiro-account-manager)
"""

import json
import time
import webbrowser
import secrets
import hashlib
import base64
from pathlib import Path
from typing import Optional, Dict, Any
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config


# OAuth endpoints
DESKTOP_AUTH_API = "https://prod.us-east-1.auth.desktop.kiro.dev"
REDIRECT_URI = "http://127.0.0.1:8765/oauth/callback"


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """HTTP сервер для перехвата OAuth callback"""
    
    auth_code: Optional[str] = None
    auth_error: Optional[str] = None
    
    def do_GET(self):
        """Обработка GET запроса с OAuth callback"""
        parsed = urlparse(self.path)
        
        if parsed.path == '/oauth/callback':
            params = parse_qs(parsed.query)
            
            if 'code' in params:
                OAuthCallbackHandler.auth_code = params['code'][0]
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                
                # Красивая страница успеха
                html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Authorization Successful</title>
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                            max-width: 400px;
                        }
                        .icon { font-size: 64px; margin-bottom: 20px; }
                        h1 { color: #333; margin: 0 0 10px 0; }
                        p { color: #666; margin: 0; }
                        .close-hint { 
                            margin-top: 20px; 
                            font-size: 14px; 
                            color: #999; 
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">✅</div>
                        <h1>Authorization Successful!</h1>
                        <p>You can close this window now.</p>
                        <p class="close-hint">Returning to Kiro Manager...</p>
                    </div>
                    <script>
                        setTimeout(() => window.close(), 2000);
                    </script>
                </body>
                </html>
                """
                self.wfile.write(html.encode())
                
            elif 'error' in params:
                OAuthCallbackHandler.auth_error = params['error'][0]
                self.send_response(400)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Authorization Failed</title>
                    <style>
                        body {{ 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            display: flex; 
                            justify-content: center; 
                            align-items: center; 
                            height: 100vh; 
                            margin: 0;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        }}
                        .container {{
                            background: white;
                            padding: 40px;
                            border-radius: 12px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                            max-width: 400px;
                        }}
                        .icon {{ font-size: 64px; margin-bottom: 20px; }}
                        h1 {{ color: #333; margin: 0 0 10px 0; }}
                        p {{ color: #666; margin: 10px 0; }}
                        .error {{ color: #f5576c; font-family: monospace; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="icon">❌</div>
                        <h1>Authorization Failed</h1>
                        <p class="error">{OAuthCallbackHandler.auth_error}</p>
                        <p>Please try again.</p>
                    </div>
                </body>
                </html>
                """
                self.wfile.write(html.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """Отключаем логи HTTP сервера"""
        pass


def generate_pkce_pair() -> tuple[str, str]:
    """
    Генерирует PKCE code_verifier и code_challenge
    
    Returns:
        (code_verifier, code_challenge)
    """
    # code_verifier: 32 байта random, base64url
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
    
    # code_challenge: SHA256(code_verifier), base64url
    challenge_bytes = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode('utf-8').rstrip('=')
    
    return code_verifier, code_challenge


def start_oauth_server(timeout: int = 300) -> Optional[str]:
    """
    Запускает локальный HTTP сервер для перехвата OAuth callback
    
    Args:
        timeout: Таймаут ожидания (секунды)
    
    Returns:
        Authorization code или None
    """
    server = HTTPServer(('127.0.0.1', 8765), OAuthCallbackHandler)
    
    # Запускаем сервер в отдельном потоке
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    
    print(f"[OAuth] Waiting for callback (timeout: {timeout}s)...")
    
    start_time = time.time()
    while time.time() - start_time < timeout:
        if OAuthCallbackHandler.auth_code:
            server.shutdown()
            return OAuthCallbackHandler.auth_code
        
        if OAuthCallbackHandler.auth_error:
            server.shutdown()
            print(f"[OAuth] Error: {OAuthCallbackHandler.auth_error}")
            return None
        
        time.sleep(0.5)
    
    server.shutdown()
    print("[OAuth] Timeout waiting for callback")
    return None


def authorize_via_webview(provider: str = 'Google', region: str = 'us-east-1') -> Optional[Dict[str, Any]]:
    """
    Авторизация через WebView (реальный браузер)
    
    Args:
        provider: 'Google', 'GitHub', или 'BuilderId'
        region: AWS регион
    
    Returns:
        Token data или None
    """
    print(f"\n[WebView Auth] Starting {provider} authorization...")
    print("[WebView Auth] Browser will open for manual login")
    
    # Генерируем PKCE
    code_verifier, code_challenge = generate_pkce_pair()
    
    # Формируем OAuth URL
    if provider == 'Google':
        auth_url = (
            f"{DESKTOP_AUTH_API}/authorize"
            f"?response_type=code"
            f"&client_id=kiro-desktop"
            f"&redirect_uri={REDIRECT_URI}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
            f"&provider=Google"
            f"&region={region}"
        )
    elif provider == 'GitHub':
        auth_url = (
            f"{DESKTOP_AUTH_API}/authorize"
            f"?response_type=code"
            f"&client_id=kiro-desktop"
            f"&redirect_uri={REDIRECT_URI}"
            f"&code_challenge={code_challenge}"
            f"&code_challenge_method=S256"
            f"&provider=GitHub"
            f"&region={region}"
        )
    else:
        print(f"[WebView Auth] Unsupported provider: {provider}")
        return None
    
    print(f"[WebView Auth] Opening browser...")
    print(f"[WebView Auth] URL: {auth_url[:80]}...")
    
    # Открываем браузер
    try:
        webbrowser.open(auth_url)
    except Exception as e:
        print(f"[WebView Auth] Failed to open browser: {e}")
        return None
    
    # Ждём callback
    auth_code = start_oauth_server(timeout=300)
    
    if not auth_code:
        print("[WebView Auth] Failed to get authorization code")
        return None
    
    print(f"[WebView Auth] Got authorization code: {auth_code[:20]}...")
    
    # Обмениваем code на token
    print("[WebView Auth] Exchanging code for token...")
    
    try:
        import requests
        from core.kiro_config import get_kiro_user_agent
        
        # Обмениваем code на token
        response = requests.post(
            f"{DESKTOP_AUTH_API}/oauth/token",
            json={
                'code': auth_code,
                'code_verifier': code_verifier,
                'redirect_uri': REDIRECT_URI
            },
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': get_kiro_user_agent()  # Динамический User-Agent!
            },
            timeout=30
        )
        
        if response.status_code != 200:
            print(f"[WebView Auth] Token exchange failed: {response.status_code}")
            print(f"[WebView Auth] Response: {response.text}")
            return None
        
        token_data = response.json()
        
        print("[WebView Auth] ✅ Authorization successful!")
        
        # Добавляем метаданные
        token_data['authMethod'] = 'social'
        token_data['provider'] = provider
        token_data['region'] = region
        token_data['_webview_auth'] = True  # Маркер что это WebView авторизация
        
        return token_data
        
    except Exception as e:
        print(f"[WebView Auth] Token exchange error: {e}")
        return None


def save_webview_token(token_data: Dict[str, Any], account_name: Optional[str] = None) -> Path:
    """
    Сохраняет токен полученный через WebView
    
    Args:
        token_data: Данные токена
        account_name: Имя аккаунта (опционально)
    
    Returns:
        Путь к сохранённому файлу
    """
    paths = get_paths()
    
    if not account_name:
        # Генерируем имя из email или timestamp
        email = token_data.get('email', 'unknown')
        account_name = email.split('@')[0] if '@' in email else f"webview_{int(time.time())}"
    
    # Формат имени файла
    timestamp = int(time.time())
    provider = token_data.get('provider', 'Google')
    filename = f"token-{provider}-WebView-{account_name}-{timestamp}.json"
    
    filepath = paths.tokens_dir / filename
    
    # Сохраняем
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(token_data, f, indent=2, ensure_ascii=False)
    
    print(f"[WebView Auth] Token saved: {filepath}")
    
    return filepath


if __name__ == '__main__':
    """Тестирование WebView авторизации"""
    print("=== WebView Authorization Test ===\n")
    
    # Тест Google авторизации
    token_data = authorize_via_webview(provider='Google')
    
    if token_data:
        print("\n✅ Success!")
        print(f"Access Token: {token_data.get('accessToken', '')[:50]}...")
        print(f"Refresh Token: {token_data.get('refreshToken', '')[:50]}...")
        print(f"Expires At: {token_data.get('expiresAt')}")
        
        # Сохраняем
        filepath = save_webview_token(token_data)
        print(f"\nSaved to: {filepath}")
    else:
        print("\n❌ Failed!")
