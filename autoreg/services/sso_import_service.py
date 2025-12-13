"""
SSO Import Service - импорт аккаунта из x-amz-sso_authn cookie

Позволяет импортировать BuilderId аккаунт без полной OAuth авторизации,
используя только bearer token из cookie браузера.
"""

import json
import time
import hashlib
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config
from core.kiro_config import get_kiro_user_agent, get_kiro_scopes
from core.exceptions import AuthError


# API Endpoints
PORTAL_BASE = "https://portal.sso.us-east-1.amazonaws.com"
START_URL = "https://view.awsapps.com/start"

# Scopes for Kiro (динамически из kiro_config)
KIRO_SCOPES = get_kiro_scopes()


@dataclass
class SsoImportResult:
    """Результат импорта SSO"""
    success: bool
    email: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    client_id_hash: Optional[str] = None
    error: Optional[str] = None


class SsoImportService:
    """
    Сервис для импорта аккаунта из SSO bearer token.
    
    Использование:
    1. Залогиниться в https://view.awsapps.com/start в браузере
    2. Открыть DevTools -> Application -> Cookies
    3. Скопировать значение cookie `x-amz-sso_authn`
    4. Вызвать import_from_token(bearer_token)
    """
    
    def __init__(self):
        self.paths = get_paths()
        self.config = get_config()
        self.timeout = 30
    
    def import_from_token(self, bearer_token: str, region: str = "us-east-1") -> SsoImportResult:
        """
        Импортировать аккаунт из SSO bearer token.
        
        Args:
            bearer_token: Значение cookie x-amz-sso_authn
            region: AWS регион (default: us-east-1)
        
        Returns:
            SsoImportResult с данными аккаунта
        """
        oidc_base = f"https://oidc.{region}.amazonaws.com"
        
        try:
            # Step 1: Регистрация OIDC клиента
            print("[N] Step 1: Registering OIDC client...")
            client_id, client_secret = self._register_client(oidc_base)
            print(f"   [OK] Client registered: {client_id[:20]}...")
            
            # Step 2: Инициация device authorization
            print("[K] Step 2: Starting device authorization...")
            device_code, user_code, interval = self._start_device_auth(
                oidc_base, client_id, client_secret
            )
            print(f"   [OK] Device code obtained, user_code: {user_code}")
            
            # Step 3: Проверка bearer token
            print("[S] Step 3: Validating bearer token...")
            self._validate_token(bearer_token)
            print("   [OK] Token is valid")
            
            # Step 4: Получение device session token
            print("[T] Step 4: Getting device session token...")
            device_session_token = self._get_device_session(bearer_token)
            print("   [OK] Device session obtained")
            
            # Step 5: Accept user code
            print("[OK] Step 5: Accepting user code...")
            device_context = self._accept_user_code(oidc_base, user_code, device_session_token)
            print("   [OK] User code accepted")
            
            # Step 6: Approve authorization
            if device_context:
                print("[UNLOCK] Step 6: Approving authorization...")
                self._approve_authorization(
                    oidc_base, device_context, client_id, device_session_token
                )
                print("   [OK] Authorization approved")
            
            # Step 7: Poll for token
            print("[...] Step 7: Polling for token...")
            access_token, refresh_token = self._poll_for_token(
                oidc_base, client_id, client_secret, device_code, interval
            )
            print("   [OK] Token obtained!")
            
            # Step 8: Get user info
            print("[U] Step 8: Getting user info...")
            email, user_id = self._get_user_info(access_token)
            print(f"   [OK] User: {email}")
            
            # Calculate clientIdHash
            client_id_hash = hashlib.sha256(START_URL.encode()).hexdigest()
            
            return SsoImportResult(
                success=True,
                email=email,
                access_token=access_token,
                refresh_token=refresh_token,
                client_id=client_id,
                client_secret=client_secret,
                client_id_hash=client_id_hash
            )
            
        except Exception as e:
            return SsoImportResult(success=False, error=str(e))
    
    def _register_client(self, oidc_base: str) -> tuple:
        """Регистрация OIDC клиента"""
        resp = requests.post(
            f"{oidc_base}/client/register",
            json={
                "clientName": "Kiro IDE",
                "clientType": "public",
                "scopes": KIRO_SCOPES,
                "grantTypes": ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
                "issuerUrl": START_URL
            },
            headers={
                "Content-Type": "application/json",
                "User-Agent": get_kiro_user_agent(),
                "Accept": "application/json"
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            raise AuthError(f"Client registration failed: {resp.text}")
        
        data = resp.json()
        return data["clientId"], data["clientSecret"]
    
    def _start_device_auth(self, oidc_base: str, client_id: str, client_secret: str) -> tuple:
        """Инициация device authorization"""
        resp = requests.post(
            f"{oidc_base}/device_authorization",
            json={
                "clientId": client_id,
                "clientSecret": client_secret,
                "startUrl": START_URL
            },
            headers={
                "Content-Type": "application/json",
                "User-Agent": get_kiro_user_agent(),
                "Accept": "application/json"
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            raise AuthError(f"Device authorization failed: {resp.text}")
        
        data = resp.json()
        return data["deviceCode"], data["userCode"], data.get("interval", 1)
    
    def _validate_token(self, bearer_token: str):
        """Проверка bearer token"""
        resp = requests.get(
            f"{PORTAL_BASE}/token/whoAmI",
            headers={
                "Authorization": f"Bearer {bearer_token}",
                "Accept": "application/json",
                "User-Agent": get_kiro_user_agent()
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            raise AuthError(f"Token validation failed ({resp.status_code}): {resp.text}")
    
    def _get_device_session(self, bearer_token: str) -> str:
        """Получение device session token"""
        resp = requests.post(
            f"{PORTAL_BASE}/session/device",
            json={},
            headers={
                "Authorization": f"Bearer {bearer_token}",
                "Content-Type": "application/json",
                "User-Agent": get_kiro_user_agent()
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            raise AuthError(f"Device session failed: {resp.text}")
        
        return resp.json()["token"]
    
    def _accept_user_code(self, oidc_base: str, user_code: str, 
                          device_session_token: str) -> Optional[Dict]:
        """Accept user code"""
        resp = requests.post(
            f"{oidc_base}/device_authorization/accept_user_code",
            json={
                "userCode": user_code,
                "userSessionId": device_session_token
            },
            headers={
                "Content-Type": "application/json",
                "User-Agent": get_kiro_user_agent(),
                "Referer": "https://view.awsapps.com/"
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            raise AuthError(f"Accept user code failed: {resp.text}")
        
        data = resp.json()
        return data.get("deviceContext")
    
    def _approve_authorization(self, oidc_base: str, device_context: Dict,
                               client_id: str, device_session_token: str):
        """Approve authorization"""
        ctx_id = device_context.get("deviceContextId")
        if not ctx_id:
            return
        
        resp = requests.post(
            f"{oidc_base}/device_authorization/associate_token",
            json={
                "deviceContext": {
                    "deviceContextId": ctx_id,
                    "clientId": device_context.get("clientId", client_id),
                    "clientType": device_context.get("clientType", "public")
                },
                "userSessionId": device_session_token
            },
            headers={
                "Content-Type": "application/json",
                "User-Agent": get_kiro_user_agent(),
                "Referer": "https://view.awsapps.com/"
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            raise AuthError(f"Approve authorization failed: {resp.text}")

    def _poll_for_token(self, oidc_base: str, client_id: str, client_secret: str,
                        device_code: str, interval: int) -> tuple:
        """Poll for token until authorized"""
        timeout_sec = 120
        start_time = time.time()
        current_interval = interval
        
        while time.time() - start_time < timeout_sec:
            time.sleep(current_interval)
            
            resp = requests.post(
                f"{oidc_base}/token",
                json={
                    "clientId": client_id,
                    "clientSecret": client_secret,
                    "grantType": "urn:ietf:params:oauth:grant-type:device_code",
                    "deviceCode": device_code
                },
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": get_kiro_user_agent(),
                    "Accept": "application/json"
                },
                timeout=self.timeout
            )
            
            if resp.status_code == 200:
                data = resp.json()
                return data["accessToken"], data["refreshToken"]
            
            if resp.status_code == 400:
                try:
                    error_data = resp.json()
                    error = error_data.get("error", "")
                    
                    if error == "authorization_pending":
                        continue
                    elif error == "slow_down":
                        current_interval += 5
                        continue
                    else:
                        raise AuthError(f"Token poll error: {error}")
                except json.JSONDecodeError:
                    raise AuthError(f"Token poll failed: {resp.text}")
            
            raise AuthError(f"Token poll failed ({resp.status_code}): {resp.text}")
        
        raise AuthError("Authorization timeout")
    
    def _get_user_info(self, access_token: str) -> tuple:
        """Get user info from quota API"""
        from .quota_service import QuotaService, CODEWHISPERER_API
        
        # Use quota API to get email
        resp = requests.get(
            f"{CODEWHISPERER_API}/getUsageLimits",
            params={
                "isEmailRequired": "true",
                "origin": "AI_EDITOR",
                "resourceType": "AGENTIC_REQUEST"
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
                "User-Agent": get_kiro_user_agent()
            },
            timeout=self.timeout
        )
        
        if resp.status_code != 200:
            return "unknown@builderid", None
        
        data = resp.json()
        user_info = data.get("userInfo", {})
        email = user_info.get("email", "unknown@builderid")
        user_id = user_info.get("userId")
        
        return email, user_id
    
    def import_and_save(self, bearer_token: str, region: str = "us-east-1") -> SsoImportResult:
        """
        Импортировать аккаунт и сохранить токен.
        
        Args:
            bearer_token: Значение cookie x-amz-sso_authn
            region: AWS регион
        
        Returns:
            SsoImportResult
        """
        result = self.import_from_token(bearer_token, region)
        
        if not result.success:
            return result
        
        # Save token
        from .token_service import TokenService
        token_service = TokenService()
        
        expires_at = datetime.utcnow() + timedelta(hours=1)
        
        token_data = {
            "accessToken": result.access_token,
            "refreshToken": result.refresh_token,
            "expiresAt": expires_at.isoformat() + "Z",
            "authMethod": "IdC",
            "provider": "BuilderId",
            "region": region,
            "accountName": result.email,
            "_clientId": result.client_id,
            "_clientSecret": result.client_secret,
            "_importedAt": datetime.now().isoformat(),
            "_importMethod": "sso_cookie"
        }
        
        saved_path = token_service.save_token(token_data, result.email.split("@")[0])
        print(f"[SAVE] Token saved to: {saved_path}")
        
        return result
    
    def import_and_activate(self, bearer_token: str, region: str = "us-east-1") -> SsoImportResult:
        """
        Импортировать аккаунт, сохранить и активировать в Kiro.
        
        Args:
            bearer_token: Значение cookie x-amz-sso_authn
            region: AWS регион
        
        Returns:
            SsoImportResult
        """
        result = self.import_and_save(bearer_token, region)
        
        if not result.success:
            return result
        
        # Activate in Kiro
        from .token_service import TokenService
        token_service = TokenService()
        
        # Get the just-saved token
        token = token_service.get_token(result.email.split("@")[0])
        if token:
            if token_service.activate_token(token):
                print(f"[OK] Account activated in Kiro: {result.email}")
            else:
                print(f"[!] Failed to activate in Kiro")
        
        return result
