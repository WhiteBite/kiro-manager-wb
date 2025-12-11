"""
OAuth клиент - использует device authorization flow
"""

import json
import hashlib
import requests
import time
import webbrowser
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Tuple, Dict

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
    """OAuth клиент с device authorization flow"""
    
    def __init__(self, project_dir: Path = None):
        self.tokens_dir = TOKENS_DIR
        self.auth_url = None
        self.output_lines = []
        self.token_filename = None
        self.account_name = None
        
        # Client registration
        self.client_id = None
        self.client_secret = None
        
        # Device auth
        self.device_code = None
        self.user_code = None
        self.verification_uri = None
        self.interval = 5
    
    def _register_client(self) -> Tuple[str, str]:
        """Register OIDC client for device flow"""
        print("[OAuth] Registering OIDC client...")
        
        resp = requests.post(
            f"{OIDC_BASE}/client/register",
            json={
                "clientName": "Kiro Account Switcher",
                "clientType": "public",
                "scopes": KIRO_SCOPES,
                "grantTypes": ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
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
    
    def _start_device_auth(self) -> Dict:
        """Start device authorization flow"""
        print("[OAuth] Starting device authorization...")
        
        resp = requests.post(
            f"{OIDC_BASE}/device_authorization",
            json={
                "clientId": self.client_id,
                "clientSecret": self.client_secret,
                "startUrl": START_URL
            },
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if resp.status_code != 200:
            raise Exception(f"Device authorization failed: {resp.text}")
        
        data = resp.json()
        self.device_code = data["deviceCode"]
        self.user_code = data["userCode"]
        self.verification_uri = data.get("verificationUri", data.get("verificationUriComplete"))
        self.interval = data.get("interval", 5)
        
        print(f"[OAuth] ✓ Device code obtained")
        print(f"[OAuth] User code: {self.user_code}")
        return data
    
    def _poll_for_token(self, timeout: int = 300) -> Dict:
        """Poll for token after user authorizes"""
        print("[OAuth] Waiting for authorization...")
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            time.sleep(self.interval)
            
            resp = requests.post(
                f"{OIDC_BASE}/token",
                json={
                    "clientId": self.client_id,
                    "clientSecret": self.client_secret,
                    "grantType": "urn:ietf:params:oauth:grant-type:device_code",
                    "deviceCode": self.device_code
                },
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if resp.status_code == 200:
                print("[OAuth] ✓ Token obtained!")
                return resp.json()
            
            data = resp.json()
            error = data.get("error", "")
            
            if error == "authorization_pending":
                continue
            elif error == "slow_down":
                self.interval += 1
                continue
            elif error == "expired_token":
                raise Exception("Device code expired")
            elif error == "access_denied":
                raise Exception("Access denied by user")
            else:
                raise Exception(f"Token error: {resp.text}")
        
        raise Exception("Authorization timeout")
    
    def _save_token(self, token_data: Dict, account_name: str) -> str:
        """Save token to file"""
        import re
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
    
    def start(self, provider: str = 'BuilderId', account_name: str = 'auto') -> Optional[str]:
        """
        Start OAuth device flow and return verification URL
        
        Returns:
            Verification URL for user to open in browser
        """
        try:
            self.account_name = account_name
            
            # 1. Register client
            self.client_id, self.client_secret = self._register_client()
            
            # 2. Start device authorization
            self._start_device_auth()
            
            # 3. Build verification URL (with user code pre-filled if possible)
            self.auth_url = self.verification_uri or f"{START_URL}?user_code={self.user_code}"
            
            print(f"[OAuth] Verification URL: {self.auth_url}")
            self.output_lines.append(f"Authorization URL:\n{self.auth_url}")
            
            return self.auth_url
            
        except Exception as e:
            print(f"[OAuth] Error: {e}")
            self.output_lines.append(f"Error: {e}")
            return None
    
    def wait_for_callback(self, timeout: int = 300) -> bool:
        """
        Poll for token after user authorizes in browser
        
        Returns:
            True if successful, False on error or timeout
        """
        try:
            # Poll for token
            token_data = self._poll_for_token(timeout)
            
            # Save token
            self.token_filename = self._save_token(token_data, self.account_name)
            self.output_lines.append("Authentication successful!")
            return True
            
        except Exception as e:
            print(f"[OAuth] Error: {e}")
            self.output_lines.append(f"Error: {e}")
            return False
    
    def get_token_filename(self) -> Optional[str]:
        """Get saved token filename"""
        return self.token_filename
    
    def close(self):
        """Cleanup (nothing to do for device flow)"""
        pass
