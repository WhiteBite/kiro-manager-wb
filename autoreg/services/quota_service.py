"""
Quota Service - мониторинг квот
"""

import json
import uuid
import hashlib
import time
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config
from core.exceptions import QuotaError, AuthBannedError


# API Endpoints
CODEWHISPERER_API = "https://codewhisperer.us-east-1.amazonaws.com"
DEFAULT_PROFILE_ARN = "arn:aws:codewhisperer:us-east-1:699475941385:profile/EHGA3GRVQMUK"

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SEC = 1.0

# Kiro version for headers
KIRO_VERSION = "0.6.18"


@dataclass
class UsageInfo:
    """Информация об использовании"""
    limit: int = 0
    used: int = 0
    display_name: str = ""
    resource_type: str = ""
    next_reset: Optional[datetime] = None
    
    # Trial
    trial_limit: int = 0
    trial_used: int = 0
    trial_status: str = ""
    trial_expiry: Optional[datetime] = None
    
    # Bonuses
    bonuses: List[Dict] = field(default_factory=list)
    
    @property
    def remaining(self) -> int:
        return max(0, self.limit - self.used)
    
    @property
    def percent_used(self) -> float:
        return (self.used / self.limit * 100) if self.limit > 0 else 0
    
    @property
    def trial_remaining(self) -> int:
        return max(0, self.trial_limit - self.trial_used)
    
    @property
    def total_remaining(self) -> int:
        """Всего осталось (основные + trial + бонусы)"""
        bonus_remaining = sum(
            b.get('limit', 0) - b.get('usage', 0) 
            for b in self.bonuses 
            if b.get('status') == 'ACTIVE'
        )
        return self.remaining + self.trial_remaining + int(bonus_remaining)


@dataclass
class QuotaInfo:
    """Полная информация о квотах"""
    email: str = ""
    user_id: str = ""
    subscription_type: str = "Free"
    subscription_title: str = ""
    days_until_reset: int = 0
    
    usage: Optional[UsageInfo] = None
    raw_response: Dict = None
    error: str = None
    
    @property
    def is_pro(self) -> bool:
        return 'PRO' in self.subscription_type.upper()
    
    @property
    def is_banned(self) -> bool:
        return self.error and 'BANNED' in self.error


class QuotaService:
    """Сервис для мониторинга квот"""
    
    def __init__(self):
        self.paths = get_paths()
        self.config = get_config()
    
    def _get_machine_id(self) -> str:
        """Получает machine ID из Kiro или генерирует"""
        if self.paths.kiro_storage_json and self.paths.kiro_storage_json.exists():
            try:
                data = json.loads(self.paths.kiro_storage_json.read_text())
                machine_id = data.get('telemetry.machineId')
                if machine_id:
                    return machine_id
            except:
                pass
        
        return hashlib.sha256(uuid.uuid4().bytes).hexdigest()
    
    def _generate_headers(self, access_token: str, for_idc: bool = False) -> Dict[str, str]:
        """Генерирует заголовки для API запроса (как в kiro-account-manager)"""
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json'
        }
        
        if for_idc:
            machine_id = self._get_machine_id()
            
            headers.update({
                'x-amz-user-agent': f"aws-sdk-js/1.0.0 KiroIDE-{KIRO_VERSION}-{machine_id}",
                'user-agent': f"aws-sdk-js/1.0.0 ua/2.1 os/windows lang/js md/nodejs#20.16.0 api/codewhispererruntime#1.0.0 m/E KiroIDE-{KIRO_VERSION}-{machine_id}",
                'amz-sdk-invocation-id': str(uuid.uuid4()),
                'amz-sdk-request': 'attempt=1; max=1',
                'Connection': 'close'  # Важно для IdC!
            })
        
        return headers
    
    def get_quota(self, access_token: str, auth_method: str = 'social') -> QuotaInfo:
        """
        Получить квоты для токена (с retry механизмом)
        
        Args:
            access_token: Access token
            auth_method: 'social' или 'IdC'
        
        Returns:
            QuotaInfo с информацией о квотах
        """
        params = {
            'isEmailRequired': 'true',
            'origin': 'AI_EDITOR'
        }
        
        # Разные параметры для Social vs IdC (как в kiro-account-manager)
        if auth_method == 'social':
            params['profileArn'] = DEFAULT_PROFILE_ARN
        else:
            params['resourceType'] = 'AGENTIC_REQUEST'
        
        headers = self._generate_headers(access_token, for_idc=(auth_method != 'social'))
        
        last_error = ""
        for attempt in range(MAX_RETRIES):
            if attempt > 0:
                time.sleep(RETRY_DELAY_SEC)
            
            try:
                resp = requests.get(
                    f"{CODEWHISPERER_API}/getUsageLimits",
                    params=params,
                    headers=headers,
                    timeout=self.config.timeouts.api_request
                )
                
                if resp.status_code != 200:
                    # Проверяем на бан (не ретраим)
                    try:
                        error_data = resp.json()
                        if 'reason' in error_data:
                            return QuotaInfo(error=f"BANNED:{error_data['reason']}")
                    except:
                        pass
                    last_error = f"API error ({resp.status_code})"
                    continue
                
                return self._parse_response(resp.json())
                
            except requests.RequestException as e:
                last_error = f"Network error: {e}"
                continue
        
        return QuotaInfo(error=last_error)
    
    def get_current_quota(self) -> Optional[QuotaInfo]:
        """Получить квоты для текущего активного аккаунта"""
        if not self.paths.kiro_token_file.exists():
            return None
        
        try:
            data = json.loads(self.paths.kiro_token_file.read_text())
            access_token = data.get('accessToken')
            auth_method = data.get('authMethod', 'social')
            
            if not access_token:
                return None
            
            # Проверяем не истёк ли токен
            expires_at = data.get('expiresAt')
            if expires_at:
                try:
                    exp = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                    if exp <= datetime.now(exp.tzinfo):
                        # Токен истёк - нужно обновить
                        from .token_service import TokenService
                        token_service = TokenService()
                        token_info = token_service.get_current_token()
                        
                        if token_info and token_info.has_refresh_token:
                            try:
                                new_data = token_service.refresh_token(token_info)
                                access_token = new_data['accessToken']
                                
                                # Сохраняем обновлённый токен
                                data['accessToken'] = access_token
                                data['expiresAt'] = new_data['expiresAt']
                                if new_data.get('refreshToken'):
                                    data['refreshToken'] = new_data['refreshToken']
                                
                                self.paths.kiro_token_file.write_text(
                                    json.dumps(data, indent=2)
                                )
                            except:
                                return QuotaInfo(error="Token expired and refresh failed")
                except:
                    pass
            
            return self.get_quota(access_token, auth_method)
            
        except Exception as e:
            return QuotaInfo(error=str(e))
    
    def _parse_response(self, data: Dict) -> QuotaInfo:
        """Парсит ответ API"""
        info = QuotaInfo(raw_response=data)
        
        # User info
        user_info = data.get('userInfo', {})
        info.email = user_info.get('email', '')
        info.user_id = user_info.get('userId', '')
        
        # Subscription
        sub_info = data.get('subscriptionInfo', {})
        info.subscription_type = sub_info.get('type', 'Free')
        info.subscription_title = sub_info.get('subscriptionTitle', '')
        
        info.days_until_reset = data.get('daysUntilReset', 0)
        
        # Usage breakdowns
        breakdowns = data.get('usageBreakdownList', [])
        if breakdowns:
            bd = breakdowns[0]
            usage = UsageInfo(
                limit=bd.get('usageLimit', 0),
                used=bd.get('currentUsage', 0),
                display_name=bd.get('displayName', ''),
                resource_type=bd.get('resourceType', '')
            )
            
            # Next reset (timestamp в секундах, не миллисекундах!)
            if bd.get('nextDateReset'):
                usage.next_reset = datetime.fromtimestamp(bd['nextDateReset'])
            
            # Trial
            trial = bd.get('freeTrialInfo', {})
            if trial:
                usage.trial_limit = trial.get('usageLimit', 0)
                usage.trial_used = trial.get('currentUsage', 0)
                usage.trial_status = trial.get('freeTrialStatus', '')
                if trial.get('freeTrialExpiry'):
                    usage.trial_expiry = datetime.fromtimestamp(trial['freeTrialExpiry'])
            
            # Bonuses
            for bonus in bd.get('bonuses', []):
                usage.bonuses.append({
                    'code': bonus.get('bonusCode', ''),
                    'name': bonus.get('displayName', ''),
                    'limit': bonus.get('usageLimit', 0),
                    'usage': bonus.get('currentUsage', 0),
                    'status': bonus.get('status', ''),
                    'expires_at': bonus.get('expiresAt')
                })
            
            info.usage = usage
        
        return info
    
    def print_quota(self, info: QuotaInfo):
        """Красиво выводит информацию о квотах"""
        if info.error:
            print(f"[X] {info.error}")
            return
        
        print(f"\n{'='*60}")
        print(f"[STATS] Kiro Quota Information")
        print(f"{'='*60}")
        
        if info.email:
            print(f"\n[U] User: {info.email}")
        
        sub_icon = "[*]" if info.is_pro else "🆓"
        print(f"{sub_icon} Subscription: {info.subscription_title or info.subscription_type}")
        print(f"[D] Days until reset: {info.days_until_reset}")
        
        if info.usage:
            u = info.usage
            print(f"\n[+] {u.display_name or 'Usage'}:")
            
            # Progress bar
            bar_width = 30
            filled = int(bar_width * u.percent_used / 100)
            bar = '█' * filled + '░' * (bar_width - filled)
            
            print(f"   [{bar}] {u.percent_used:.1f}%")
            print(f"   Used: {u.used} / {u.limit}")
            print(f"   Remaining: {u.remaining}")
            
            if u.next_reset:
                print(f"   Next reset: {u.next_reset.strftime('%Y-%m-%d %H:%M')}")
            
            if u.trial_limit > 0:
                print(f"\n[GIFT] Trial:")
                print(f"   Used: {u.trial_used} / {u.trial_limit}")
                print(f"   Status: {u.trial_status}")
                if u.trial_expiry:
                    print(f"   Expires: {u.trial_expiry.strftime('%Y-%m-%d')}")
            
            if u.bonuses:
                print(f"\n[!] Bonuses:")
                for b in u.bonuses:
                    remaining = b['limit'] - b['usage']
                    print(f"   • {b['name']}: {remaining:.0f} remaining ({b['status']})")
            
            print(f"\n[STATS] Total remaining: {u.total_remaining}")
        
        print(f"\n{'='*60}")
