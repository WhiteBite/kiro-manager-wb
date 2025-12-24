"""
Kiro Web Portal API Client (CBOR RPC).

Использует AWS Smithy RPC v2 protocol с CBOR encoding.
Это ЛЕГИТИМНЫЙ способ взаимодействия с Kiro API, который не детектится как bot.
"""

import requests
import logging
from typing import Dict, Any, Optional
from ..core.cbor_utils import cbor_encode, cbor_decode

logger = logging.getLogger(__name__)


class KiroWebPortalClient:
    """
    Клиент для Kiro Web Portal API.
    
    Особенности:
    - CBOR encoding/decoding (не JSON!)
    - Cookie-based authentication (как браузер)
    - Smithy RPC v2 protocol
    - Автоматическая обработка банов (423 status)
    
    Endpoints:
    - GetUserUsageAndLimits - получить квоту
    - GetUserInfo - получить инфо о пользователе
    - RefreshToken - обновить токены
    """
    
    ENDPOINT = "https://prod.us-east-1.webportal.kiro.dev"
    
    def __init__(self, timeout: int = 30):
        """
        Args:
            timeout: Таймаут запросов в секундах
        """
        self.timeout = timeout
        self.session = requests.Session()
        
    def _make_request(
        self,
        operation: str,
        request_data: Dict[str, Any],
        access_token: str,
        idp: str = 'Google',
        csrf_token: Optional[str] = None,
        session_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Выполняет CBOR RPC запрос к Web Portal.
        
        Args:
            operation: Имя операции (например, "GetUserUsageAndLimits")
            request_data: Данные запроса (будут закодированы в CBOR)
            access_token: Access token
            idp: Identity Provider (Google/Github)
            csrf_token: CSRF token (опционально)
            session_token: Session/Refresh token (опционально)
            
        Returns:
            Декодированный CBOR ответ
            
        Raises:
            ValueError: Если запрос не удался или аккаунт забанен
        """
        url = f"{self.ENDPOINT}/service/KiroWebPortalService/operation/{operation}"
        
        # CBOR encode request
        try:
            body = cbor_encode(request_data)
        except Exception as e:
            raise ValueError(f"Failed to encode request: {e}")
        
        # Headers (имитируем браузер)
        headers = {
            'Content-Type': 'application/cbor',
            'Accept': 'application/cbor',
            'smithy-protocol': 'rpc-v2-cbor',  # КРИТИЧНО!
            'authorization': f'Bearer {access_token}',
        }
        
        # Cookie auth (как браузер!)
        cookies = [f'Idp={idp}', f'AccessToken={access_token}']
        
        if csrf_token:
            headers['x-csrf-token'] = csrf_token
            cookies.append(f'csrfToken={csrf_token}')
        
        if session_token:
            cookies.append(f'RefreshToken={session_token}')
        
        headers['Cookie'] = '; '.join(cookies)
        
        logger.info(f"[WebPortal] {operation} Request")
        logger.debug(f"URL: {url}")
        logger.debug(f"Idp: {idp}")
        logger.debug(f"Request data: {request_data}")
        
        try:
            response = self.session.post(
                url,
                data=body,
                headers=headers,
                timeout=self.timeout
            )
            
            status = response.status_code
            logger.info(f"[WebPortal] {operation} Response: {status} ({len(response.content)} bytes)")
            
            # Проверка на ошибки
            if not response.ok:
                # Пытаемся декодировать CBOR ошибку
                try:
                    error_data = cbor_decode(response.content)
                    error_msg = str(error_data)
                    logger.debug(f"[WebPortal] Error data: {error_data}")
                except:
                    error_msg = response.text
                
                logger.error(f"[WebPortal] Error ({status}): {error_msg}")
                
                # Проверка на бан (423 Locked = AccountSuspendedException)
                if status == 423 or 'AccountSuspendedException' in error_msg:
                    raise ValueError("BANNED: Account suspended")
                
                # Проверка на невалидный токен
                if status == 401:
                    raise ValueError("UNAUTHORIZED: Token expired or invalid")
                
                raise ValueError(f"{operation} failed ({status}): {error_msg}")
            
            # CBOR decode response
            try:
                result = cbor_decode(response.content)
                logger.debug(f"[WebPortal] Response data keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
                return result
            except Exception as e:
                logger.error(f"[WebPortal] Failed to decode response: {e}")
                raise ValueError(f"Failed to decode response: {e}")
            
        except requests.RequestException as e:
            logger.error(f"[WebPortal] Network error: {e}")
            raise ValueError(f"Network error: {e}")
    
    def get_user_usage_and_limits(
        self,
        access_token: str,
        idp: str = 'Google'
    ) -> Dict[str, Any]:
        """
        Получает информацию о квоте и использовании.
        
        Args:
            access_token: Access token
            idp: Identity Provider (Google/Github)
            
        Returns:
            {
                'daysUntilReset': int,
                'nextDateReset': float,
                'userInfo': {
                    'email': str,
                    'userId': str
                },
                'subscriptionInfo': {
                    'subscriptionTitle': str,
                    'type': str
                },
                'usageBreakdownList': [
                    {
                        'usageLimit': int,
                        'currentUsage': int,
                        'nextDateReset': float,
                        'freeTrialInfo': {
                            'usageLimit': int,
                            'currentUsage': int,
                            'freeTrialExpiry': float,
                            'freeTrialStatus': str
                        },
                        'bonuses': [...]
                    }
                ]
            }
            
        Raises:
            ValueError: Если запрос не удался или аккаунт забанен
        """
        request_data = {
            'isEmailRequired': True,
            'origin': 'KIRO_IDE'
        }
        
        return self._make_request(
            'GetUserUsageAndLimits',
            request_data,
            access_token,
            idp
        )
    
    def get_user_info(
        self,
        access_token: str,
        idp: str = 'Google'
    ) -> Dict[str, Any]:
        """
        Получает информацию о пользователе.
        
        Args:
            access_token: Access token
            idp: Identity Provider (Google/Github)
            
        Returns:
            {
                'email': str,
                'userId': str,
                'name': str,
                ...
            }
            
        Raises:
            ValueError: Если запрос не удался или аккаунт забанен
        """
        request_data = {
            'origin': 'KIRO_IDE'
        }
        
        return self._make_request(
            'GetUserInfo',
            request_data,
            access_token,
            idp
        )
    
    def refresh_token(
        self,
        access_token: str,
        csrf_token: str,
        session_token: str,
        idp: str = 'Google'
    ) -> Dict[str, Any]:
        """
        Обновляет токены.
        
        Args:
            access_token: Текущий access token
            csrf_token: CSRF token
            session_token: Session/Refresh token
            idp: Identity Provider (Google/Github)
            
        Returns:
            {
                'accessToken': str,
                'csrfToken': str,
                'expiresIn': int,
                'profileArn': str
            }
            
        Raises:
            ValueError: Если запрос не удался или аккаунт забанен
        """
        request_data = {
            'csrfToken': csrf_token
        }
        
        return self._make_request(
            'RefreshToken',
            request_data,
            access_token,
            idp,
            csrf_token,
            session_token
        )
    
    def initiate_login(
        self,
        idp: str,
        redirect_uri: str,
        code_challenge: str,
        state: str
    ) -> Dict[str, Any]:
        """
        Инициирует OAuth login flow.
        
        Args:
            idp: Identity Provider (Google/Github)
            redirect_uri: OAuth redirect URI
            code_challenge: PKCE code challenge
            state: OAuth state
            
        Returns:
            {
                'redirectUrl': str  # URL для авторизации
            }
        """
        request_data = {
            'idp': idp,
            'redirectUri': redirect_uri,
            'codeChallenge': code_challenge,
            'codeChallengeMethod': 'S256',
            'state': state
        }
        
        url = f"{self.ENDPOINT}/service/KiroWebPortalService/operation/InitiateLogin"
        body = cbor_encode(request_data)
        
        headers = {
            'Content-Type': 'application/cbor',
            'Accept': 'application/cbor',
            'smithy-protocol': 'rpc-v2-cbor'
        }
        
        response = self.session.post(url, data=body, headers=headers, timeout=self.timeout)
        
        if not response.ok:
            raise ValueError(f"InitiateLogin failed ({response.status_code})")
        
        return cbor_decode(response.content)
    
    def exchange_token(
        self,
        idp: str,
        code: str,
        code_verifier: str,
        redirect_uri: str,
        state: str
    ) -> Dict[str, Any]:
        """
        Обменивает OAuth code на токены.
        
        Args:
            idp: Identity Provider (Google/Github)
            code: OAuth authorization code
            code_verifier: PKCE code verifier
            redirect_uri: OAuth redirect URI
            state: OAuth state
            
        Returns:
            {
                'accessToken': str,
                'csrfToken': str,
                'expiresIn': int,
                'profileArn': str,
                'sessionToken': str  # из Set-Cookie
            }
        """
        request_data = {
            'idp': idp,
            'code': code,
            'codeVerifier': code_verifier,
            'redirectUri': redirect_uri,
            'state': state
        }
        
        url = f"{self.ENDPOINT}/service/KiroWebPortalService/operation/ExchangeToken"
        body = cbor_encode(request_data)
        
        headers = {
            'Content-Type': 'application/cbor',
            'Accept': 'application/cbor',
            'smithy-protocol': 'rpc-v2-cbor'
        }
        
        response = self.session.post(url, data=body, headers=headers, timeout=self.timeout)
        
        if not response.ok:
            raise ValueError(f"ExchangeToken failed ({response.status_code})")
        
        # Парсим cookies из Set-Cookie headers
        result = cbor_decode(response.content)
        
        # Извлекаем cookies
        for cookie_header in response.headers.get_all('set-cookie', []):
            if 'RefreshToken=' in cookie_header:
                # Извлекаем значение RefreshToken
                token = cookie_header.split('RefreshToken=')[1].split(';')[0]
                result['sessionToken'] = token
        
        return result
