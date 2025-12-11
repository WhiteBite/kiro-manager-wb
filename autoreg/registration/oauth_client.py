"""
OAuth клиент - чистый Python без Node.js
Использует device authorization flow как в sso_import_service
"""

import http.server
import json
import os
import re
import requests
import secrets
import socketserver
import threading
import hashlib
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple, Dict
from urllib.parse import urlencode, parse_qs, urlparse

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths

_paths = get_paths()
TOKENS_DIR = _paths.tokens_dir

# AWS OIDC Configuration
OIDC_REGION = "us-east-1"
OIDC_BASE = f"https://oidc.{OIDC_REGION}.amazonaws.com"
START_URL = "https://view.awsapps.com/start"
KIRO_SCOPES = [
    "sso:account:access",
    "codewhisperer:analysis",
    "codewhisperer:completions", 
    "codewhisperer:conversations",
    "codewhisperer:taskassist",
    "codewhisperer:transformations",
    "codewhisperer:security_scans"
]


class OAuthClient:
    """OAuth клиент с PKCE flow через локальный HTTP сервер"""
    
    def __init__(self, project_dir: Path = None):
        self.tokens_dir = TOKENS_DIR
        self.auth_url = None
        self.output_lines = []
        self.token_filename = None
        self.server = None
        self.server_thread = None
        self.auth_code = None
        self.auth_complete = threading.Event()
        self.auth_error = None
        
        # PKCE values
        self.code_verifier = None
        self.code_challenge = None
        self.state = None
        
        # Client registration
        self.client_id = None
        self.client_secret = None
    
    def _generate_pkce(self) -> Tuple[str, str]:
        """Generate PKCE code verifier and challenge"""
        import base64
        verifier = secrets.token_urlsafe(32)
        challenge = base64.urlsafe_b64encode(
            hashlib.sha256(verifier.encode()).digest()
        ).decode().rstrip('=')
        return verifier, challenge
    
    def _register_client(self) -> Tuple[str, str]:
        """Register OIDC client dynamically"""
        print("[OAuth] Registering OIDC client...")
        
        resp = requests.post(
            f"{OIDC_BASE}/client/register",
            json={
                "clientName": "Kiro Account Switcher",
                "clientType": "public",
                "scopes": KIRO_SCOPES,
                "grantTypes": ["authorization_code", "refresh_token"],
                "redirectUris": ["http://127.0.0.1:8765/callback"],
                "issuerUrl": START_URL
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if resp.status_code != 200:
            raise Exception(f"Client registration failed: {resp.text}")
        
        data = resp.json()
        print(f"[OAuth] ✓ Client registered: {data['clientId'][:20]}...")
        return data["clientId"], data["clientSecret"]
    
    def _exchange_code_for_token(self, code: str) -> Dict:
        """Exchange authorization code for tokens"""
        print("[OAuth] Exchanging code for token...")
        
        resp = requests.post(
            f"{OIDC_BASE}/token",
            json={
                "clientId": self.client_id,
                "clientSecret": self.client_secret,
                "grantType": "authorization_code",
                "code": code,
                "redirectUri": "http://127.0.0.1:8765/callback",
                "codeVerifier": self.code_verifier
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if resp.status_code != 200:
            raise Exception(f"Token exchange failed: {resp.text}")
        
        return resp.json()
    
    def _save_token(self, token_data: Dict, account_name: str) -> str:
        """Save token to file"""
        timestamp = int(datetime.now().timestamp() * 1000)
        safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', account_name)
        filename = f"token-BuilderId-IdC-{safe_name}-{timestamp}.json"
        filepath = self.tokens_dir / filename
        
        # Calculate expiry
        expires_in = token_data.get('expiresIn', 3600)
        expires_at = (datetime.utcnow() + timedelta(seconds=expires_in)).isoformat() + 'Z'
        
        # Calculate clientIdHash
        client_id_hash = hashlib.sha256(START_URL.encode()).hexdigest()
        
        token_file = {
            "accessToken": token_data.get('accessToken'),
            "refreshToken": token_data.get('refreshToken'),
            "expiresAt": expires_at,
            "tokenType": token_data.get('tokenType', 'Bearer'),
            "clientIdHash": client_id_hash,
            "accountName": account_name,
            "provider": "BuilderId",
            "authMethod": "IdC",
            "region": OIDC_REGION,
            "createdAt": datetime.now().isoformat(),
            "_clientId": self.client_id,
            "_clientSecret": self.client_secret
        }
        
        filepath.write_text(json.dumps(token_file, indent=2))
        print(f"[OAuth] Token saved to: {filepath}")
        self.output_lines.append(f"Token saved to: {filepath}")
        
        return filename
    
    def _create_callback_handler(self):
        """Create HTTP request handler for OAuth callback"""
        oauth_client = self
        
        class CallbackHandler(http.server.BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass  # Suppress default logging
            
            def do_GET(self):
                parsed = urlparse(self.path)
                
                if parsed.path == '/callback':
                    params = parse_qs(parsed.query)
                    
                    error = params.get('error', [None])[0]
                    if error:
                        oauth_client.auth_error = error
                        self.send_response(400)
                        self.send_header('Content-Type', 'text/html')
                        self.end_headers()
                        self.wfile.write(f'<html><body><h1>Error: {error}</h1></body></html>'.encode())
                        oauth_client.auth_complete.set()
                        return
                    
                    code = params.get('code', [None])[0]
                    state = params.get('state', [None])[0]
                    
                    if state != oauth_client.state:
                        oauth_client.auth_error = "State mismatch"
                        self.send_response(400)
                        self.send_header('Content-Type', 'text/html')
                        self.end_headers()
                        self.wfile.write(b'<html><body><h1>State mismatch</h1></body></html>')
                        oauth_client.auth_complete.set()
                        return
                    
                    if code:
                        oauth_client.auth_code = code
                        self.send_response(200)
                        self.send_header('Content-Type', 'text/html')
                        self.end_headers()
                        self.wfile.write(b'''
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
                                    <h1>Authentication Successful!</h1>
                                    <p>You can close this window and return to Kiro.</p>
                                </div>
                            </body>
                            </html>
                        ''')
                        oauth_client.auth_complete.set()
                else:
                    self.send_response(404)
                    self.end_headers()
        
        return CallbackHandler
    
    def start(self, provider: str = 'BuilderId', account_name: str = 'auto') -> Optional[str]:
        """
        Start OAuth flow and return authorization URL
        
        Args:
            provider: Provider type (BuilderId)
            account_name: Account name for identification
        
        Returns:
            Authorization URL or None
        """
        try:
            # 1. Register client
            self.client_id, self.client_secret = self._register_client()
            
            # 2. Generate PKCE
            self.code_verifier, self.code_challenge = self._generate_pkce()
            self.state = secrets.token_urlsafe(16)
            
            # 3. Start callback server
            handler = self._create_callback_handler()
            self.server = socketserver.TCPServer(('127.0.0.1', 8765), handler)
            self.server.timeout = 1
            self.server_thread = threading.Thread(target=self._run_server, daemon=True)
            self.server_thread.start()
            print("[OAuth] Callback server listening on http://127.0.0.1:8765")
            
            # 4. Build authorization URL
            params = {
                "response_type": "code",
                "client_id": self.client_id,
                "redirect_uri": "http://127.0.0.1:8765/callback",
                "scope": " ".join(KIRO_SCOPES),
                "state": self.state,
                "code_challenge": self.code_challenge,
                "code_challenge_method": "S256"
            }
            
            self.auth_url = f"{OIDC_BASE}/authorize?{urlencode(params)}"
            self.account_name = account_name
            
            print(f"[OAuth] Authorization URL generated")
            self.output_lines.append(f"Authorization URL:\n{self.auth_url}")
            
            return self.auth_url
            
        except Exception as e:
            print(f"[OAuth] Error: {e}")
            self.output_lines.append(f"Error: {e}")
            return None
    
    def _run_server(self):
        """Run callback server in background"""
        while not self.auth_complete.is_set():
            self.server.handle_request()
    
    def wait_for_callback(self, timeout: int = 300) -> bool:
        """
        Wait for OAuth callback and save token
        
        Returns:
            True if successful, False on error or timeout
        """
        print("[OAuth] Waiting for callback...")
        
        # Wait for auth to complete
        if not self.auth_complete.wait(timeout=timeout):
            print("[OAuth] Timeout waiting for callback")
            return False
        
        if self.auth_error:
            print(f"[OAuth] Auth error: {self.auth_error}")
            return False
        
        if not self.auth_code:
            print("[OAuth] No auth code received")
            return False
        
        try:
            # Exchange code for token
            token_data = self._exchange_code_for_token(self.auth_code)
            print("[OAuth] Authentication successful!")
            self.output_lines.append("Authentication successful!")
            
            # Save token
            self.token_filename = self._save_token(token_data, self.account_name)
            return True
            
        except Exception as e:
            print(f"[OAuth] Token exchange error: {e}")
            self.output_lines.append(f"Error: {e}")
            return False
    
    def get_token_filename(self) -> Optional[str]:
        """Get saved token filename"""
        return self.token_filename
    
    def close(self):
        """Shutdown server"""
        if self.server:
            try:
                self.server.shutdown()
            except Exception:
                pass
