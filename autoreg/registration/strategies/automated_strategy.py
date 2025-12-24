"""
Automated Registration Strategy (Legacy)

Использует DrissionPage для автоматизации браузера.
Работает для некоторых пользователей, но имеет высокий риск бана.

Преимущества:
- Полностью автоматический
- Не требует участия пользователя
- Поддерживает headless режим

Недостатки:
- Высокий риск бана (80-90%)
- AWS детектирует автоматизацию
- Немедленная проверка quota триггерит бан систему
"""

from typing import Optional, Dict, Any
import time

from ..auth_strategy import RegistrationStrategy


class AutomatedRegistrationStrategy(RegistrationStrategy):
    """
    Автоматическая регистрация через DrissionPage
    
    Это СТАРЫЙ метод, который работает для некоторых пользователей,
    но имеет высокий риск бана.
    """
    
    def __init__(self, headless: bool = False, 
                 check_quota_immediately: bool = False,
                 human_delays: bool = True):
        """
        Args:
            headless: Запускать браузер без GUI
            check_quota_immediately: Проверять quota сразу после регистрации
                                    (НЕ рекомендуется! Триггерит баны)
            human_delays: Использовать человеческие задержки
        """
        self.headless = headless
        self.check_quota_immediately = check_quota_immediately
        self.human_delays = human_delays
        self._registration = None
    
    def register(self, email: str, name: Optional[str] = None,
                password: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Регистрация через DrissionPage automation
        
        Args:
            email: Email для регистрации
            name: Имя пользователя
            password: Пароль
            **kwargs:
                - imap_lookup_email: Email для поиска в IMAP
                - device_flow: Использовать device flow вместо PKCE
        """
        # Lazy import для избежания циклических зависимостей
        from ..register import AWSRegistration
        
        if not self._registration:
            device_flow = kwargs.get('device_flow', False)
            self._registration = AWSRegistration(
                headless=self.headless,
                device_flow=device_flow
            )
        
        try:
            result = self._registration.register_single(
                email=email,
                name=name,
                password=password,
                imap_lookup_email=kwargs.get('imap_lookup_email')
            )
            
            # Добавляем метаданные о стратегии
            result['strategy'] = self.get_name()
            result['ban_risk'] = self.get_ban_risk()
            result['manual_input_required'] = False
            
            # ВАЖНО: Если check_quota_immediately=False, не проверяем quota
            if not self.check_quota_immediately and result.get('success'):
                result['quota_checked'] = False
                result['quota_check_deferred'] = True
            
            return result
            
        except Exception as e:
            return {
                'email': email,
                'success': False,
                'error': str(e),
                'strategy': self.get_name()
            }
    
    def get_name(self) -> str:
        return "automated"
    
    def requires_manual_input(self) -> bool:
        return False
    
    def supports_headless(self) -> bool:
        return True
    
    def get_ban_risk(self) -> str:
        """
        Высокий риск бана из-за:
        1. DrissionPage детектируется как автоматизация
        2. Немедленная проверка quota (если включена)
        """
        if self.check_quota_immediately:
            return "high"  # 80-90% ban rate
        else:
            return "medium"  # 40-60% ban rate (без немедленной проверки)
    
    def supports_immediate_quota_check(self) -> bool:
        """
        Технически поддерживает, но НЕ рекомендуется!
        Немедленная проверка quota триггерит бан систему AWS.
        """
        return self.check_quota_immediately
    
    def cleanup(self):
        if self._registration:
            self._registration.close()
            self._registration = None
