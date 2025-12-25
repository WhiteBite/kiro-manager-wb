"""
OAuth клиент - PKCE Authorization Code Flow (как в Kiro IDE)
Правильный flow:
1. Register client → получаем clientId, clientSecret
2. Запускаем локальный сервер на 127.0.0.1:PORT/oauth/callback
3. Генерируем PKCE code_verifier + code_challenge
4. Открываем браузер: /authorize?client_id=...&redirect_uri=...&code_challenge=...
5. Пользователь логинится → AWS редиректит на наш callback с code
6. Обмениваем code на токены: POST /token
"""

import json
import hashlib
import base64
import secrets
import requests
import time
import threading
import socket
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, urlparse, parse_qs
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Tuple

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.kiro_config import (
    get_machine_id,
    get_kiro_user_agent,
    get_kiro_scopes,
    get_client_id_hash,
)

_paths = get_paths()
TOKENS_DIR = _paths.tokens_dir

# AWS SSO OIDC Configuration
OIDC_REGION = "us-east-1"
OIDC_BASE = f"https://oidc.{OIDC_REGION}.amazonaws.com"
START_URL = "https://view.awsapps.com/start"

# Kiro scopes (динамически из kiro_config)
KIRO_SCOPES = get_kiro_scopes()


def base64url_encode(data: bytes) -> str:
    """Base64 URL-safe encoding without padding"""
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def generate_code_verifier() -> str:
    """Generate PKCE code verifier (43-128 chars)"""
    return base64url_encode(secrets.token_bytes(32))


def generate_code_challenge(verifier: str) -> str:
    """Generate PKCE code challenge (S256)"""
    digest = hashlib.sha256(verifier.encode('ascii')).digest()
    return base64url_encode(digest)


def generate_state() -> str:
    """Generate random state parameter"""
    return base64url_encode(secrets.token_bytes(16))


def find_free_port() -> int:
    """Find a free port on localhost"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


class CallbackHandler(BaseHTTPRequestHandler):
    """HTTP handler for OAuth callback"""
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass
    
    def do_GET(self):
        """Handle GET request (OAuth callback)"""
        parsed = urlparse(self.path)
        
        if parsed.path == '/oauth/callback':
            params = parse_qs(parsed.query)
            
            code = params.get('code', [None])[0]
            state = params.get('state', [None])[0]
            error = params.get('error', [None])[0]
            
            self.server.callback_code = code
            self.server.callback_state = state
            self.server.callback_error = error
            self.server.callback_received = True
            
            if error:
                self.send_response(400)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(f'<html><body><h1>Error: {error}</h1></body></html>'.encode())
            elif code:
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                html = '''
                <html>
                <head><style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                           display: flex; justify-content: center; align-items: center; 
                           height: 100vh; margin: 0; background: #1e1e1e; color: #fff; }
                    .container { text-align: center; }
                    h1 { color: #3fb68b; }
                </style></head>
                <body>
                    <div class="container">
                        <h1>[OK] Authentication Successful!</h1>
                        <p>You can close this window.</p>
                    </div>
                </body>
                </html>
                '''
                self.wfile.write(html.encode())
            else:
                self.send_response(400)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(b'<html><body><h1>Missing code</h1></body></html>')
        else:
            self.send_response(404)
            self.end_headers()


class OAuthPKCE:
    """OAuth клиент с PKCE Authorization Code Flow (как Kiro IDE)"""
    
    def __init__(self):
        self.port = None
        self.tokens_dir = TOKENS_DIR
        self.output_lines = []
        self.token_filename = None
        self.account_name = None
        
        # PKCE values
        self.code_verifier = None
        self.code_challenge = None
        self.state = None
        
        # Client registration (dynamic)
        self.client_id = None
        self.client_secret = None
        
        # Callback server
        self.server = None
        self.server_thread = None
        
        # Auth URL
        self.auth_url = None
        self.redirect_uri = None
    
    def _register_client(self) -> Tuple[str, str]:
        """
        Step 1: Register OIDC client dynamically
        POST https://oidc.{region}.amazonaws.com/client/register
        
        Использует User-Agent как в Kiro IDE для совместимости.
        """
        print("[OAuth] Registering OIDC client...")
        
        # Headers как в Kiro IDE
        headers = {
            "Content-Type": "application/json",
            "User-Agent": get_kiro_user_agent(),
            "Accept": "application/json",
        }
        
        print(f"[OAuth] User-Agent: {headers['User-Agent'][:50]}...")
        
        # Retry logic for connection issues
        max_retries = 3
        last_error = None
        
        for attempt in range(max_retries):
            try:
                resp = requests.post(
                    f"{OIDC_BASE}/client/register",
                    json={
                        "clientName": "Kiro IDE",
                        "clientType": "public",
                        "scopes": KIRO_SCOPES,
                        "grantTypes": ["authorization_code", "refresh_token"],
                        "redirectUris": [self.redirect_uri],
                        "issuerUrl": START_URL
                    },
                    headers=headers,
                    timeout=30
                )
                
                if resp.status_code != 200:
                    raise Exception(f"Client registration failed: {resp.status_code} - {resp.text}")
                
                data = resp.json()
                print(f"[OAuth] [OK] Client registered: {data['clientId'][:20]}...")
                return data["clientId"], data.get("clientSecret", "")
                
            except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
                last_error = e
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # 2, 4, 6 seconds
                    print(f"[OAuth] Connection error, retrying in {wait_time}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(wait_time)
                else:
                    raise Exception(f"Client registration failed after {max_retries} attempts: {last_error}")
        
        # Should not reach here, but just in case
        raise Exception(f"Client registration failed: {last_error}")
    
    def _start_callback_server(self):
        """
        Step 2: Start local HTTP server for OAuth callback
        """
        self.port = find_free_port()
        self.redirect_uri = f"http://127.0.0.1:{self.port}/oauth/callback"
        
        self.server = HTTPServer(('127.0.0.1', self.port), CallbackHandler)
        self.server.callback_code = None
        self.server.callback_state = None
        self.server.callback_error = None
        self.server.callback_received = False
        
        self.server_thread = threading.Thread(target=self.server.serve_forever)
        self.server_thread.daemon = True
        self.server_thread.start()
        
        print(f"[OAuth] [OK] Callback server listening on {self.redirect_uri}")
    
    def _build_auth_url(self) -> str:
        """
        Step 3: Build authorization URL with PKCE
        Note: AWS uses 'scopes' (plural) with comma separator, not standard OAuth 'scope' with space
        """
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "scopes": ",".join(KIRO_SCOPES),  # AWS uses 'scopes' with comma, not 'scope' with space
            "state": self.state,
            "code_challenge": self.code_challenge,
            "code_challenge_method": "S256"
        }
        
        return f"{OIDC_BASE}/authorize?{urlencode(params)}"
    
    def _exchange_code_for_token(self, code: str) -> Dict:
        """
        Step 5: Exchange authorization code for tokens
        POST https://oidc.{region}.amazonaws.com/token
        
        AWS SDK uses camelCase for parameters:
        - grantType (not grant_type)
        - clientId (not client_id)
        - clientSecret (not client_secret)
        - redirectUri (not redirect_uri)
        - codeVerifier (not code_verifier)
        
        Использует User-Agent как в Kiro IDE.
        """
        print("[OAuth] Exchanging code for token...")
        print(f"   clientId: {self.client_id[:20]}...")
        print(f"   clientSecret: {self.client_secret[:30] if self.client_secret else 'EMPTY'}...")
        
        # Headers как в Kiro IDE
        headers = {
            "Content-Type": "application/json",
            "User-Agent": get_kiro_user_agent(),
            "Accept": "application/json",
        }
        
        # AWS SSO OIDC uses camelCase parameters
        data = {
            "grantType": "authorization_code",
            "clientId": self.client_id,
            "clientSecret": self.client_secret,
            "code": code,
            "redirectUri": self.redirect_uri,
            "codeVerifier": self.code_verifier
        }
        
        resp = requests.post(
            f"{OIDC_BASE}/token",
            json=data,
            headers=headers,
            timeout=30
        )
        
        if resp.status_code != 200:
            print(f"[OAuth] Token exchange failed: {resp.status_code}")
            print(f"[OAuth] Response: {resp.text}")
            raise Exception(f"Token exchange failed: {resp.status_code} - {resp.text}")
        
        print("[OAuth] [OK] Token obtained!")
        return resp.json()
    
    def _save_token(self, token_data: Dict, account_name: str) -> str:
        """Save token to file"""
        import re
        timestamp = int(datetime.now().timestamp() * 1000)
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', account_name)
        filename = f"token-BuilderId-IdC-{safe_name}-{timestamp}.json"
        filepath = self.tokens_dir / filename
        
        # Calculate expiry
        expires_in = token_data.get('expiresIn', token_data.get('expires_in', 3600))
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + 'Z'
        
        # Calculate clientIdHash (динамически как в Kiro IDE)
        client_id_hash = get_client_id_hash(START_URL)
        
        # ВАЖНО: Сохраняем machine ID который использовался при регистрации!
        # Это нужно чтобы при переключении на аккаунт использовался тот же ID
        current_machine_id = get_machine_id()
        
        token_file = {
            "accessToken": token_data.get('accessToken', token_data.get('access_token')),
            "refreshToken": token_data.get('refreshToken', token_data.get('refresh_token')),
            "expiresAt": expires_at,
            "tokenType": token_data.get('tokenType', token_data.get('token_type', 'Bearer')),
            "clientIdHash": client_id_hash,
            "accountName": account_name,
            "provider": "BuilderId",
            "authMethod": "IdC",
            "region": OIDC_REGION,
            "createdAt": datetime.now().isoformat(),
            "_clientId": self.client_id,
            "_clientSecret": self.client_secret,
            "_machineId": current_machine_id  # ANTI-BAN: сохраняем machine ID!
        }
        
        filepath.write_text(json.dumps(token_file, indent=2))
        print(f"[OAuth] [OK] Token saved to: {filepath}")
        self.output_lines.append(f"Token saved to: {filepath}")
        
        return filename
    
    def start_server_only(self, account_name: str = 'auto'):
        """
        Start callback server AND register OIDC client (for registration flow).
        
        Registration flow:
        1. We register OIDC client with our redirect_uri
        2. User goes through AWS registration UI
        3. After "Allow access", AWS redirects to our callback with code
        4. We exchange code for tokens
        
        The client registration is needed because AWS uses our redirect_uri
        in the orchestrator_id for the final callback.
        """
        self.account_name = account_name
        
        # Step 1: Start callback server (need port for redirect_uri)
        self._start_callback_server()
        
        # Step 2: Register OIDC client with our redirect_uri
        # This is REQUIRED - AWS will redirect to this URI after "Allow access"
        self.client_id, self.client_secret = self._register_client()
        
        # Step 3: Generate PKCE values (needed for token exchange)
        self.code_verifier = generate_code_verifier()
        self.code_challenge = generate_code_challenge(self.code_verifier)
        self.state = generate_state()
        
        print(f"[OAuth] [OK] Client registered, callback server ready: {self.redirect_uri}")
    
    def start(self, account_name: str = 'auto') -> Optional[str]:
        """
        Start OAuth PKCE flow and return authorization URL
        
        Returns:
            Authorization URL for browser to open
        """
        try:
            self.account_name = account_name
            
            # Step 2: Start callback server FIRST (need port for redirect_uri)
            self._start_callback_server()
            
            # Step 1: Register client (needs redirect_uri)
            self.client_id, self.client_secret = self._register_client()
            
            # Step 3: Generate PKCE values
            self.code_verifier = generate_code_verifier()
            self.code_challenge = generate_code_challenge(self.code_verifier)
            self.state = generate_state()
            
            print(f"[OAuth] PKCE code_verifier: {self.code_verifier[:20]}...")
            print(f"[OAuth] PKCE code_challenge: {self.code_challenge[:20]}...")
            
            # Build authorization URL
            self.auth_url = self._build_auth_url()
            
            print(f"[OAuth] Authorization URL: {self.auth_url[:80]}...")
            self.output_lines.append(f"Authorization URL:\n{self.auth_url}")
            
            return self.auth_url
            
        except Exception as e:
            print(f"[OAuth] Error: {e}")
            self.output_lines.append(f"Error: {e}")
            return None
    
    def wait_for_callback(self, timeout: int = 300) -> bool:
        """
        Wait for OAuth callback with authorization code
        
        Returns:
            True if successful, False on error or timeout
        """
        try:
            print(f"[OAuth] Waiting for callback (timeout: {timeout}s)...")
            
            start_time = time.time()
            while time.time() - start_time < timeout:
                if self.server and self.server.callback_received:
                    break
                time.sleep(0.5)
            
            if not self.server or not self.server.callback_received:
                raise Exception("Callback timeout")
            
            if self.server.callback_error:
                raise Exception(f"OAuth error: {self.server.callback_error}")
            
            if not self.server.callback_code:
                raise Exception("No authorization code received")
            
            # Verify state
            if self.server.callback_state != self.state:
                print(f"[OAuth] [!] State mismatch: expected {self.state}, got {self.server.callback_state}")
                # Continue anyway - some flows don't return state correctly
            
            # Step 5: Exchange code for token
            token_data = self._exchange_code_for_token(self.server.callback_code)
            
            # Save token
            self.token_filename = self._save_token(token_data, self.account_name)
            self.output_lines.append("Authentication successful!")
            return True
            
        except Exception as e:
            print(f"[OAuth] Error: {e}")
            self.output_lines.append(f"Error: {e}")
            return False
    
    def get_auth_url(self) -> Optional[str]:
        """Get the authorization URL"""
        return self.auth_url
    
    def get_token_filename(self) -> Optional[str]:
        """Get saved token filename"""
        return self.token_filename
    
    def close(self):
        """Cleanup - stop callback server"""
        if self.server:
            try:
                self.server.shutdown()
            except:
                pass
