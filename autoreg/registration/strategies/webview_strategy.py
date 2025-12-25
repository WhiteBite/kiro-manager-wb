"""
WebView Registration Strategy (Anti-Ban)

Использует pywebview для открытия OAuth окна с ручным вводом данных.
Минимальный риск бана, так как AWS видит обычного пользователя.

Преимущества:
- Низкий риск бана (<10%)
- AWS не детектирует автоматизацию
- Пользователь вводит данные сам
- Не требует немедленной проверки quota

Недостатки:
- Требует участия пользователя
- Не поддерживает headless режим
- Медленнее автоматической регистрации
"""

from typing import Optional, Dict, Any
import logging

from ..auth_strategy import RegistrationStrategy

logger = logging.getLogger(__name__)


class WebViewRegistrationStrategy(RegistrationStrategy):
    """
    Регистрация через WebView окно с ручным вводом
    
    Использует pywebview для открытия нативного окна браузера.
    Пользователь вручную вводит логин/пароль.
    Перехватываем callback URL с authorization code.
    """
    
    def __init__(self, browser_path: Optional[str] = None,
                 port: int = 43210,
                 proxy: Optional[str] = None,
                 check_proxy: bool = True):
        """
        Args:
            browser_path: Не используется (pywebview использует системный WebView)
            port: Не используется
            proxy: Прокси (пока не поддерживается в pywebview)
            check_proxy: Не используется
        """
        self.browser_path = browser_path
        self.proxy = proxy
    
    def register(self, email: str, name: Optional[str] = None,
                password: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Регистрация через WebView
        
        Flow:
        1. InitiateLogin через KiroWebPortal API (CBOR)
        2. Открываем WebView с authorize_url
        3. Пользователь ВРУЧНУЮ логинится
        4. Перехватываем редирект на https://app.kiro.dev/signin/oauth?code=...
        5. ExchangeToken через KiroWebPortal API (CBOR)
        6. Сохраняем токены
        
        Args:
            email: Email для регистрации (показывается пользователю как подсказка)
            name: Имя (не используется, пользователь вводит сам)
            password: Пароль (не используется, пользователь вводит сам)
            **kwargs:
                - provider: "Google" или "Github" (по умолчанию "Google")
                - timeout: Таймаут ожидания в секундах (по умолчанию 300)
        """
        provider = kwargs.get('provider', 'Google')
        timeout = kwargs.get('timeout', 300)
        
        try:
            # Используем новый webview_oauth модуль
            from ..webview_oauth import webview_register
            
            result = webview_register(
                email=email,
                provider=provider,
                timeout=timeout
            )
            
            # Добавляем метаданные стратегии
            result['strategy'] = self.get_name()
            result['ban_risk'] = self.get_ban_risk()
            result['manual_input_required'] = True
            result['quota_checked'] = False
            result['quota_check_deferred'] = True
            
            return result
            
        except ImportError as e:
            logger.error(f"[WebView] Missing dependency: {e}")
            return {
                'email': email,
                'success': False,
                'error': f'Missing dependency: {e}. Run: pip install pywebview cbor2',
                'strategy': self.get_name()
            }
        except Exception as e:
            logger.error(f"[WebView] Registration error: {e}", exc_info=True)
            return {
                'email': email,
                'success': False,
                'error': str(e),
                'strategy': self.get_name()
            }
    
    def get_name(self) -> str:
        return "webview"
    
    def requires_manual_input(self) -> bool:
        return True
    
    def supports_headless(self) -> bool:
        return False
    
    def get_ban_risk(self) -> str:
        """
        Низкий риск бана благодаря:
        1. Реальный браузер (не автоматизация)
        2. Ручной ввод данных пользователем
        3. Нет немедленной проверки quota
        """
        return "low"  # <10% ban rate
    
    def supports_immediate_quota_check(self) -> bool:
        """
        НЕ поддерживает немедленную проверку quota!
        Это ключевая anti-ban мера.
        """
        return False
    
    def cleanup(self):
        """Cleanup (ничего не нужно)"""
        pass
