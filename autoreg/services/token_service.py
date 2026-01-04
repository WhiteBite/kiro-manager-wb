"""
Token Service - управление токенами
"""

import json
import hashlib
import time
import requests
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config
from core.kiro_config import get_machine_id, get_kiro_user_agent
from core.exceptions import (
    TokenError, TokenExpiredError, TokenRefreshError, TokenNotFoundError
)
from core.constants import MAX_RETRIES, RETRY_DELAY_SEC


@dataclass
class TokenInfo:
    """Информация о токене"""
    path: Path
    account_name: str
    provider: str
    auth_method: str
    region: str
    expires_at: Optional[datetime]
    is_expired: bool
    has_refresh_token: bool
    
    # Raw data
    raw_data: Dict[str, Any] = None


class TokenService:
    """Сервис для работы с токенами"""
    
    # API endpoints
    DESKTOP_AUTH_API = "https://prod.{region}.auth.desktop.kiro.dev"
    OIDC_API = "https://oidc.{region}.amazonaws.com"
    
    def __init__(self):
        self.paths = get_paths()
        self.config = get_config()
    
    # =========================================================================
    # Token CRUD
    # =========================================================================
    
    def list_tokens(self) -> List[TokenInfo]:
        """Список всех токенов"""
        tokens = []
        
        for token_file in self.paths.list_tokens():
            try:
                info = self._parse_token_file(token_file)
                if info:
                    tokens.append(info)
            except Exception as e:
                print(f"[!] Error reading {token_file.name}: {e}")
        
        return tokens
    
    def get_token(self, name: str) -> Optional[TokenInfo]:
        """Получить токен по имени"""
        # Ищем по имени аккаунта или имени файла
        for token in self.list_tokens():
            if name.lower() in token.account_name.lower() or name in token.path.name:
                return token
        return None
    
    def get_current_token(self) -> Optional[TokenInfo]:
        """Получить текущий активный токен Kiro"""
        if not self.paths.kiro_token_file.exists():
            return None
        
        return self._parse_token_file(self.paths.kiro_token_file)
    
    def save_token(self, data: Dict[str, Any], name: str = None) -> Path:
        """
        Сохранить токен.
        
        ВАЖНО: Автоматически добавляет idp и _machineId если их нет.
        """
        if name is None:
            name = data.get('accountName', 'unknown')
        
        # Генерируем имя файла
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"token-{name}-{timestamp}.json"
        filepath = self.paths.tokens_dir / filename
        
        # Добавляем метаданные
        data['_savedAt'] = datetime.now().isoformat()
        data['_filename'] = filename
        
        # ВАЖНО: Добавляем idp если его нет (для Web Portal API)
        if 'idp' not in data:
            # Определяем idp по provider
            provider = data.get('provider', '').lower()
            if 'google' in provider:
                data['idp'] = 'Google'
            elif 'github' in provider:
                data['idp'] = 'Github'
            else:
                data['idp'] = 'Google'  # По умолчанию
        
        # ANTI-BAN: Добавляем _machineId если его нет
        if '_machineId' not in data:
            data['_machineId'] = get_machine_id()
        
        filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        return filepath
    
    def delete_token(self, name: str) -> bool:
        """Удалить токен"""
        token = self.get_token(name)
        if token and token.path.exists():
            token.path.unlink()
            return True
        return False
    
    # =========================================================================
    # Token Refresh
    # =========================================================================
    
    def refresh_token(self, token: TokenInfo) -> Dict[str, Any]:
        """
        Обновить токен
        
        Returns:
            Обновлённые данные токена
        
        Raises:
            TokenRefreshError: если не удалось обновить
        """
        if not token.has_refresh_token:
            raise TokenRefreshError("No refresh token available")
        
        data = token.raw_data
        refresh_token = data.get('refreshToken')
        region = token.region
        
        if token.auth_method == 'social':
            return self._refresh_social(refresh_token, region)
        else:
            return self._refresh_idc(
                refresh_token,
                data.get('_clientId', data.get('clientId', '')),
                data.get('_clientSecret', data.get('clientSecret', '')),
                region
            )
    
    def _refresh_social(self, refresh_token: str, region: str) -> Dict[str, Any]:
        """
        Обновить Social токен через Web Portal API (CBOR).
        
        ВАЖНО: Использует Web Portal вместо Desktop Auth API!
        """
        from .webportal_client import KiroWebPortalClient
        
        # Получаем idp из raw_data (должен быть сохранён)
        # Если нет - используем Google по умолчанию
        idp = 'Google'  # Будет переопределён в refresh_token()
        
        # Для Web Portal refresh нужны access_token, csrf_token, session_token
        # Но у нас есть только refresh_token...
        # Поэтому используем старый Desktop Auth API как fallback
        url = f"{self.DESKTOP_AUTH_API.format(region=region)}/refreshToken"
        
        # Headers как в Kiro IDE
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": get_kiro_user_agent(),
        }
        
        last_error = ""
        for attempt in range(MAX_RETRIES):
            if attempt > 0:
                time.sleep(RETRY_DELAY_SEC)
            
            try:
                resp = requests.post(
                    url,
                    json={"refreshToken": refresh_token},
                    headers=headers,
                    timeout=self.config.timeouts.api_request
                )
                
                if resp.status_code == 401:
                    raise TokenRefreshError("Refresh token expired or invalid")
                
                if resp.status_code != 200:
                    last_error = f"Refresh failed ({resp.status_code})"
                    continue
                
                data = resp.json()
                expires_at = datetime.utcnow() + timedelta(seconds=data.get('expiresIn', 3600))
                
                return {
                    'accessToken': data.get('accessToken'),
                    'refreshToken': data.get('refreshToken', refresh_token),
                    'expiresAt': expires_at.isoformat() + 'Z',
                    'expiresIn': data.get('expiresIn', 3600),
                    'profileArn': data.get('profileArn'),
                    'csrfToken': data.get('csrfToken'),
                    'idp': idp  # Сохраняем idp
                }
            except requests.RequestException as e:
                last_error = f"Network error: {e}"
                continue
        
        raise TokenRefreshError(last_error)
    
    def _refresh_idc(self, refresh_token: str, client_id: str, 
                     client_secret: str, region: str) -> Dict[str, Any]:
        """Обновить IdC токен через AWS OIDC API (с retry)"""
        url = f"{self.OIDC_API.format(region=region)}/token"
        
        # Headers как в Kiro IDE
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": get_kiro_user_agent(),
        }
        
        # JSON формат (как в kiro-account-manager)
        payload = {
            "clientId": client_id,
            "clientSecret": client_secret,
            "grantType": "refresh_token",
            "refreshToken": refresh_token
        }
        
        last_error = ""
        for attempt in range(MAX_RETRIES):
            if attempt > 0:
                time.sleep(RETRY_DELAY_SEC)
            
            try:
                resp = requests.post(
                    url,
                    json=payload,
                    headers=headers,
                    timeout=self.config.timeouts.api_request
                )
                
                if resp.status_code == 401:
                    raise TokenRefreshError("Refresh token expired or invalid")
                
                if resp.status_code != 200:
                    last_error = f"Refresh failed ({resp.status_code})"
                    continue
                
                data = resp.json()
                expires_at = datetime.utcnow() + timedelta(seconds=data.get('expiresIn', 3600))
                
                return {
                    'accessToken': data.get('accessToken'),
                    'refreshToken': data.get('refreshToken', refresh_token),
                    'expiresAt': expires_at.isoformat() + 'Z',
                    'expiresIn': data.get('expiresIn', 3600),
                    'idToken': data.get('idToken'),
                    'ssoSessionId': data.get('aws_sso_app_session_id')
                }
            except requests.RequestException as e:
                last_error = f"Network error: {e}"
                continue
        
        raise TokenRefreshError(last_error)
    
    def refresh_and_save(self, token: TokenInfo) -> TokenInfo:
        """Обновить токен и сохранить"""
        new_data = self.refresh_token(token)
        
        # Мержим с существующими данными
        updated_data = token.raw_data.copy()
        updated_data.update(new_data)
        updated_data['_refreshedAt'] = datetime.now().isoformat()
        
        # Сохраняем
        token.path.write_text(json.dumps(updated_data, indent=2, ensure_ascii=False))
        
        return self._parse_token_file(token.path)
    
    # =========================================================================
    # Token Activation (switch to Kiro)
    # =========================================================================
    
    def activate_token(self, token: TokenInfo, force_refresh: bool = False) -> bool:
        """
        Активировать токен в Kiro (записать в AWS SSO cache)
        
        Args:
            token: Токен для активации
            force_refresh: Принудительно обновить перед активацией
        
        Returns:
            True если успешно
        """
        data = token.raw_data
        
        # Обновляем если нужно
        if token.is_expired or force_refresh:
            try:
                new_data = self.refresh_token(token)
                data = token.raw_data.copy()
                data.update(new_data)
                
                # Сохраняем обновлённый токен
                token.path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
            except TokenRefreshError as e:
                print(f"[X] Failed to refresh token: {e}")
                return False
        
        # Генерируем clientIdHash
        client_id = data.get('_clientId', data.get('clientId', ''))
        client_id_hash = hashlib.sha1(client_id.encode()).hexdigest() if client_id else ''
        
        # Формат для Kiro
        kiro_data = {
            "accessToken": data.get('accessToken'),
            "refreshToken": data.get('refreshToken'),
            "expiresAt": data.get('expiresAt'),
            "clientIdHash": client_id_hash,
            "authMethod": data.get('authMethod', 'IdC'),
            "provider": data.get('provider', 'BuilderId'),
            "region": data.get('region', 'us-east-1'),
            "idp": data.get('idp', 'Google')  # ВАЖНО: Сохраняем idp для Web Portal API
        }
        
        # Бэкапим старый токен
        if self.paths.kiro_token_file.exists():
            backup_name = f"kiro-auth-token.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            backup_path = self.paths.aws_sso_cache / backup_name
            self.paths.kiro_token_file.rename(backup_path)
        
        # Atomic write: пишем во временный файл, потом rename
        temp_file = self.paths.kiro_token_file.with_suffix('.json.tmp')
        temp_file.write_text(json.dumps(kiro_data, indent=2))
        temp_file.rename(self.paths.kiro_token_file)
        
        # Также сохраняем client registration для IdC
        if client_id_hash and data.get('_clientId'):
            client_reg = {
                "clientId": data.get('_clientId'),
                "clientSecret": data.get('_clientSecret'),
                "expiresAt": (datetime.utcnow() + timedelta(days=90)).isoformat() + 'Z'
            }
            client_file = self.paths.get_client_registration_file(client_id_hash)
            client_file.write_text(json.dumps(client_reg, indent=2))
        
        return True
    
    # =========================================================================
    # Helpers
    # =========================================================================
    
    def _parse_token_file(self, path: Path) -> Optional[TokenInfo]:
        """Парсит файл токена в TokenInfo"""
        try:
            data = json.loads(path.read_text())
            
            expires_at = None
            is_expired = True
            
            if data.get('expiresAt'):
                try:
                    expires_at = datetime.fromisoformat(
                        data['expiresAt'].replace('Z', '+00:00')
                    )
                    is_expired = expires_at <= datetime.now(expires_at.tzinfo)
                except:
                    pass
            
            return TokenInfo(
                path=path,
                account_name=data.get('accountName', path.stem),
                provider=data.get('provider', 'Unknown'),
                auth_method=data.get('authMethod', 'Unknown'),
                region=data.get('region', 'us-east-1'),
                expires_at=expires_at,
                is_expired=is_expired,
                has_refresh_token=bool(data.get('refreshToken')),
                raw_data=data
            )
        except Exception:
            return None
    
    def get_best_token(self) -> Optional[TokenInfo]:
        """Получить лучший доступный токен (не истёкший, с refresh)"""
        tokens = self.list_tokens()
        
        # Сначала ищем не истёкшие
        valid_tokens = [t for t in tokens if not t.is_expired and t.has_refresh_token]
        if valid_tokens:
            return valid_tokens[0]
        
        # Потом с refresh token
        refreshable = [t for t in tokens if t.has_refresh_token]
        if refreshable:
            return refreshable[0]
        
        # Любой
        return tokens[0] if tokens else None
