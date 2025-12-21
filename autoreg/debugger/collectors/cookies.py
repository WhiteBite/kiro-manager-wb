"""
Cookie Collector - отслеживание cookies
"""

import time
from typing import Dict, List
from .base import BaseCollector


class CookieCollector(BaseCollector):
    """
    Отслеживает изменения cookies.
    
    Особенно важные cookies для AWS:
    - workflow-step-id: статус регистрации
    - directory-csrf-token: CSRF токен
    - login-interview-token: токен сессии
    - aws-user-profile-ubid: ID профиля
    """
    
    name = "cookies"
    
    # Важные cookies для мониторинга
    IMPORTANT_COOKIES = [
        'workflow-step-id',
        'directory-csrf-token',
        'workflow-csrf-token',
        'login-interview-token',
        'aws-user-profile-ubid',
        'platform-ubid',
        'noflush_awsccs_sid',
    ]
    
    def __init__(self, session):
        super().__init__(session)
        self._last_cookies = {}
        self._cookie_history = []
    
    def inject(self):
        """Cookies не требуют инжекта"""
        self.log("Cookie monitoring enabled")
    
    def collect(self) -> Dict:
        """Собирает текущие cookies и отслеживает изменения"""
        if not self.page:
            return {}
        
        try:
            # Получаем cookies через JS
            js_cookies = self.page.run_js('''
                const result = {};
                document.cookie.split(';').forEach(c => {
                    const [name, ...rest] = c.trim().split('=');
                    if (name) result[name] = rest.join('=');
                });
                return result;
            ''') or {}
            
            # Получаем cookies через CDP (более полные)
            try:
                cdp_result = self.page.run_cdp('Network.getAllCookies')
                cdp_cookies = {}
                for cookie in cdp_result.get('cookies', []):
                    cdp_cookies[cookie['name']] = {
                        'value': cookie['value'],
                        'domain': cookie.get('domain', ''),
                        'path': cookie.get('path', '/'),
                        'expires': cookie.get('expires', 0),
                        'httpOnly': cookie.get('httpOnly', False),
                        'secure': cookie.get('secure', False),
                        'sameSite': cookie.get('sameSite', ''),
                    }
            except:
                cdp_cookies = {}
            
            # Объединяем
            all_cookies = {**js_cookies}
            for name, data in cdp_cookies.items():
                if name not in all_cookies:
                    all_cookies[name] = data['value'] if isinstance(data, dict) else data
            
            # Отслеживаем изменения важных cookies
            for cookie_name in self.IMPORTANT_COOKIES:
                old_value = self._last_cookies.get(cookie_name)
                new_value = all_cookies.get(cookie_name)
                
                if new_value and new_value != old_value:
                    self.log(f"CHANGED: {cookie_name} = {str(new_value)[:50]}...")
                    
                    # Особый случай: workflow-step-id
                    if cookie_name == 'workflow-step-id':
                        if new_value == 'end-of-workflow-success':
                            self.log("🎉 WORKFLOW SUCCESS DETECTED!")
                        else:
                            self.log(f"Workflow step: {new_value}")
            
            # Сохраняем историю
            timestamp = self.session._elapsed()
            self._cookie_history.append((timestamp, all_cookies.copy()))
            self.session.all_cookies.append((timestamp, all_cookies.copy()))
            
            self._last_cookies = all_cookies
            return all_cookies
            
        except Exception as e:
            self.log(f"Error collecting cookies: {e}")
            return {}
    
    def get_cookie(self, name: str) -> str:
        """Получает значение конкретной cookie"""
        return self._last_cookies.get(name, '')
    
    def is_workflow_success(self) -> bool:
        """Проверяет успешность workflow"""
        return self.get_cookie('workflow-step-id') == 'end-of-workflow-success'
    
    def on_step_end(self, step):
        """Добавляем cookies к шагу"""
        step.cookies_after = self._last_cookies.copy()
