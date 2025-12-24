"""
Quota Service - мониторинг квот через Web Portal API (CBOR).

ВАЖНО: Использует Web Portal API вместо CodeWhisperer API!
- Web Portal выглядит как браузер (меньше банов)
- CBOR протокол (не детектится как API abuse)
- Cookie-based auth (как настоящий браузер)
"""

import json
import time
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config
from .webportal_client import KiroWebPortalClient

logger = logging.getLogger(__name__)

# Retry configuration
MAX_RETRIES = 3
RETRY_DELAY_SEC = 1.0


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
    """
    Сервис для мониторинга квот через Web Portal API (CBOR).
    
    ВАЖНО: Использует Web Portal вместо CodeWhisperer API!
    - Меньше банов (выглядит как браузер)
    - CBOR протокол (не детектится как bot)
    - Cookie-based auth
    """
    
    def __init__(self):
        self.paths = get_paths()
        self.config = get_config()
        self.client = KiroWebPortalClient()
    
    def get_quota(self, access_token: str, idp: str = 'Google') -> QuotaInfo:
        """
        Получить квоты для токена через Web Portal API (CBOR).
        
        Args:
            access_token: Access token
            idp: Identity Provider (Google/Github)
        
        Returns:
            QuotaInfo с информацией о квотах
        """
        last_error = ""
        
        for attempt in range(MAX_RETRIES):
            if attempt > 0:
                logger.info(f"[Quota] Retry {attempt}/{MAX_RETRIES}")
                time.sleep(RETRY_DELAY_SEC)
            
            try:
                # Используем Web Portal API вместо CodeWhisperer!
                response = self.client.get_user_usage_and_limits(access_token, idp)
                return self._parse_webportal_response(response)
                
            except ValueError as e:
                error_msg = str(e)
                
                # Проверяем на бан (не ретраим)
                if 'BANNED' in error_msg or 'UNAUTHORIZED' in error_msg:
                    logger.error(f"[Quota] {error_msg}")
                    return QuotaInfo(error=error_msg)
                
                last_error = error_msg
                logger.warning(f"[Quota] Attempt {attempt + 1} failed: {error_msg}")
                continue
            
            except Exception as e:
                last_error = f"Unexpected error: {e}"
                logger.error(f"[Quota] {last_error}")
                continue
        
        return QuotaInfo(error=f"Failed after {MAX_RETRIES} retries: {last_error}")
    
    def get_current_quota(self) -> Optional[QuotaInfo]:
        """Получить квоты для текущего активного аккаунта"""
        if not self.paths.kiro_token_file.exists():
            return None
        
        try:
            data = json.loads(self.paths.kiro_token_file.read_text())
            access_token = data.get('accessToken')
            idp = data.get('idp', 'Google')  # ВАЖНО: нужен idp для Web Portal!
            
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
            
            return self.get_quota(access_token, idp)
            
        except Exception as e:
            logger.error(f"[Quota] Error getting current quota: {e}")
            return QuotaInfo(error=str(e))
    
    def _parse_webportal_response(self, data: Dict) -> QuotaInfo:
        """
        Парсит ответ Web Portal API (CBOR).
        
        Формат ответа такой же как у CodeWhisperer API,
        но приходит через CBOR вместо JSON.
        """
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
            
            # Next reset (timestamp в секундах)
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
        
        logger.info(f"[Quota] Parsed: {info.email} - {info.usage.used if info.usage else 0}/{info.usage.limit if info.usage else 0}")
        
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
