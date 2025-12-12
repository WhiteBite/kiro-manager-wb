"""
AWS Builder ID Auto-Registration with OAuth PKCE Flow

Правильный flow (как в Kiro IDE):
1. Register OIDC client + start callback server
2. Generate PKCE (code_verifier, code_challenge)
3. Build auth_url: /authorize?client_id=...&code_challenge=...
4. Open auth_url in browser → AWS redirects to signin/signup
5. Enter email → Continue → AWS redirects to profile.aws for registration
6. Enter name → Continue
7. Enter verification code → Continue
8. Enter password → Continue
9. AWS redirects to view.awsapps.com/start
10. Click "Allow access" button (CRITICAL!)
11. AWS redirects to 127.0.0.1:PORT/oauth/callback?code=...
12. Exchange code for tokens via POST /token
13. Save tokens
"""

import argparse
import time
import re
import threading
from typing import List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import get_config
from .browser import BrowserAutomation
from .mail_handler import get_mail_handler
from .oauth_pkce import OAuthPKCE

config = get_config()
TIMEOUTS = {
    'page_load': config.timeouts.page_load,
    'element_wait': config.timeouts.element_wait,
    'verification_code': config.timeouts.verification_code,
    'oauth_callback': config.timeouts.oauth_callback,
    'between_accounts': config.timeouts.between_accounts,
}


class AccountStorage:
    """Простое хранилище аккаунтов"""
    def __init__(self):
        from core.paths import get_paths
        self.paths = get_paths()
        self.filepath = self.paths.accounts_file
        self._ensure_file()
    
    def _ensure_file(self):
        if not self.filepath.exists():
            self.filepath.write_text('[]', encoding='utf-8')
    
    def load_all(self) -> list:
        import json
        try:
            return json.loads(self.filepath.read_text(encoding='utf-8'))
        except:
            return []
    
    def save(self, email: str, password: str, name: str, token_file=None) -> dict:
        import json
        accounts = self.load_all()
        account = {
            'email': email,
            'password': password,
            'name': name,
            'token_file': token_file,
            'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'active'
        }
        accounts.append(account)
        self.filepath.write_text(json.dumps(accounts, indent=2, ensure_ascii=False), encoding='utf-8')
        return account
    
    def count(self) -> dict:
        accounts = self.load_all()
        return {
            'total': len(accounts),
            'active': len([a for a in accounts if a.get('status') == 'active']),
        }


class AWSRegistration:
    """Регистрация AWS Builder ID через OAuth PKCE Flow (как в Kiro IDE)"""
    
    def __init__(self, headless: bool = False, spoof_fingerprint: bool = False):
        self.storage = AccountStorage()
        self.headless = headless
        self.spoof_fingerprint = spoof_fingerprint
        self.browser = None
        self.mail_handler = None
        self.oauth = None
    
    def _init_mail(self, email_domain: str):
        if not self.mail_handler:
            self.mail_handler = get_mail_handler(email_domain)
        return self.mail_handler
    
    def register_single(self, email: str, name: Optional[str] = None, 
                       password: Optional[str] = None) -> dict:
        """
        Регистрация одного аккаунта через OAuth PKCE Flow
        
        Flow:
        1. Start OAuth (callback server + PKCE + client registration)
        2. Get auth_url from OAuth
        3. Open auth_url in browser → AWS redirects to login/signup
        4. Enter email → Continue → redirects to profile.aws for registration
        5. Enter name → Continue
        6. Enter verification code → Continue
        7. Enter password → Continue
        8. AWS redirects to view.awsapps.com/start
        9. Click "Allow access" button (CRITICAL!)
        10. AWS redirects to callback → OAuth exchanges code for tokens
        """
        # Генерируем имя из email если не указано
        if name is None:
            username = email.split('@')[0]
            name_part = re.sub(r'\d+$', '', username)
            name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name_part)
        
        # Генерируем пароль если не указан
        if password is None:
            password = BrowserAutomation.generate_password()
        
        # Инициализируем почту
        email_domain = email.split('@')[1]
        mail_handler = self._init_mail(email_domain)
        
        if not mail_handler:
            return {'email': email, 'success': False, 'error': 'Mail handler not available'}
        
        try:
            # ШАГ 1: Запускаем OAuth PKCE flow
            print(f"\n[1/8] Starting OAuth PKCE flow...")
            if self.oauth:
                self.oauth.close()
            self.oauth = OAuthPKCE()
            
            # Получаем auth_url (это также запускает callback server и регистрирует client)
            auth_url = self.oauth.start(account_name=email.split('@')[0])
            
            if not auth_url:
                return {'email': email, 'success': False, 'error': 'Failed to start OAuth flow'}
            
            print(f"   ✓ OAuth started, callback server on port {self.oauth.port}")
            print(f"   Auth URL: {auth_url[:80]}...")
            
            # ШАГ 2: Открываем браузер с auth_url
            print(f"\n[2/8] Opening browser with OAuth authorize URL...")
            if self.browser:
                self.browser.close()
            self.browser = BrowserAutomation(
                headless=self.headless, 
                spoof_fingerprint=self.spoof_fingerprint
            )
            
            # Открываем OAuth authorize URL (НЕ profile.aws напрямую!)
            print(f"   Opening: {auth_url[:60]}...")
            self.browser.navigate(auth_url)
            
            # Проверяем на ошибку AWS
            if self.browser.check_aws_error():
                return {'email': email, 'success': False, 'error': 'AWS temporary error'}
            
            self.browser.close_cookie_dialog()
            time.sleep(1)
            
            # Смотрим где мы оказались (должен быть редирект на signin.aws или profile.aws)
            current_url = self.browser.current_url
            print(f"   Current URL: {current_url[:60]}...")
            
            # ШАГ 3: Вводим email
            print(f"[3/8] Entering email: {email}")
            self.browser.enter_email(email)
            self.browser.click_continue()
            
            # ШАГ 4: Вводим имя
            print(f"[4/8] Entering name: {name}")
            self.browser.enter_name(name)
            
            # ШАГ 5: Получаем и вводим код верификации
            print(f"[5/8] Waiting for verification code...")
            code = mail_handler.get_verification_code(email, timeout=TIMEOUTS['verification_code'])
            
            if not code:
                return {'email': email, 'success': False, 'error': 'Verification code not received'}
            
            print(f"[5/8] Entering code: {code}")
            self.browser.enter_verification_code(code)
            
            # ШАГ 6: Вводим пароль
            print(f"[6/8] Setting password...")
            self.browser.enter_password(password)
            
            # ШАГ 7: Ждём редирект на view.awsapps.com и кликаем "Allow access"
            print(f"[7/8] Waiting for Allow access page...")
            time.sleep(2)
            
            # Ждём появления страницы Allow access (до 30 секунд)
            allow_access_found = False
            for i in range(60):  # 60 * 0.5 = 30 секунд
                current_url = self.browser.current_url
                
                # Проверяем что мы на view.awsapps.com
                if 'view.awsapps.com' in current_url:
                    print(f"   ✓ Redirected to view.awsapps.com (after {(i+1)*0.5:.1f}s)")
                    allow_access_found = True
                    break
                
                # Проверяем на callback (если Allow access уже был нажат автоматически)
                if '127.0.0.1' in current_url and 'oauth/callback' in current_url:
                    print(f"   ✓ Already redirected to callback!")
                    allow_access_found = True
                    break
                
                time.sleep(0.5)
            
            if not allow_access_found:
                print(f"   ⚠️ Did not reach view.awsapps.com, current URL: {current_url[:60]}")
                # Продолжаем всё равно - может быть другой flow
            
            # Кликаем "Allow access" если мы на этой странице
            current_url = self.browser.current_url
            if 'view.awsapps.com' in current_url and '127.0.0.1' not in current_url:
                print(f"   Clicking Allow access button...")
                self.browser.close_cookie_dialog(force=True)
                time.sleep(0.5)
                
                if not self.browser.click_allow_access():
                    print(f"   ⚠️ Failed to click Allow access")
                    self.browser.screenshot("error_allow_access_click")
            
            # ШАГ 8: Ждём callback и обмениваем code на токены
            print(f"[8/8] Waiting for OAuth callback...")
            
            # Ждём callback (OAuth сервер обработает его автоматически)
            success = self.oauth.wait_for_callback(timeout=TIMEOUTS['oauth_callback'])
            
            if success:
                token_file = self.oauth.get_token_filename()
                
                # Сохраняем аккаунт С токеном
                self.storage.save(email, password, name, token_file)
                
                print(f"\n✅ SUCCESS: {email}")
                print(f"   Password: {password}")
                print(f"   Token: {token_file}")
                
                return {
                    'email': email,
                    'password': password,
                    'name': name,
                    'token_file': token_file,
                    'success': True
                }
            else:
                # OAuth callback не получен, но регистрация могла пройти
                print(f"   ⚠️ OAuth callback not received")
                
                # Проверяем текущий URL
                current_url = self.browser.current_url
                print(f"   Current URL: {current_url[:60]}...")
                
                # Если мы на callback URL, пробуем обработать вручную
                if '127.0.0.1' in current_url and 'code=' in current_url:
                    print(f"   Found code in URL, but callback wasn't processed")
                
                # Сохраняем аккаунт без токена
                self.storage.save(email, password, name, None)
                
                return {
                    'email': email,
                    'password': password,
                    'name': name,
                    'token_file': None,
                    'success': True,
                    'warning': 'Registration complete but token not obtained. Use device code flow.'
                }
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'email': email, 'success': False, 'error': str(e)}
    
    def register_batch(self, emails: List[str], names: List[str] = None) -> List[dict]:
        """Пакетная регистрация"""
        if names is None:
            names = [None] * len(emails)
        
        results = []
        
        for i, (email, name) in enumerate(zip(emails, names)):
            print(f"\n{'='*60}")
            print(f"Account {i+1}/{len(emails)}: {email}")
            print('='*60)
            
            result = self.register_single(email, name)
            results.append(result)
            
            if i < len(emails) - 1:
                print(f"\n⏳ Pause {TIMEOUTS['between_accounts']}s...")
                time.sleep(TIMEOUTS['between_accounts'])
        
        return results
    
    def print_summary(self, results: List[dict]):
        """Итоги регистрации"""
        print("\n" + "="*60)
        print("📊 SUMMARY")
        print("="*60)
        
        success = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]
        
        print(f"✅ Success: {len(success)}")
        print(f"❌ Failed: {len(failed)}")
        
        if success:
            print("\nSuccessful:")
            for r in success:
                token_info = f" (token: {r.get('token_file', 'none')})" if r.get('token_file') else " (no token)"
                print(f"  {r['email']} : {r['password']}{token_info}")
        
        if failed:
            print("\nFailed:")
            for r in failed:
                print(f"  {r['email']} - {r.get('error')}")
    
    def close(self):
        if self.mail_handler:
            self.mail_handler.disconnect()
        if self.browser:
            self.browser.close()
        if self.oauth:
            self.oauth.close()


def generate_emails(count: int, domain: str = 'whitebite.ru') -> List[tuple]:
    """Генерация email адресов"""
    import random
    
    first_names = ['James', 'John', 'Robert', 'Michael', 'David', 'Mary', 'Jennifer', 'Linda', 'Alex', 'Sam']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
    
    results = []
    used = set()
    
    for _ in range(count):
        first = random.choice(first_names)
        last = random.choice(last_names)
        
        for _ in range(100):
            num = random.randint(100, 9999)
            email = f"{first}{last}{num}@{domain}"
            
            if email.lower() not in used:
                used.add(email.lower())
                results.append((email, f"{first} {last}"))
                break
    
    return results


def main():
    parser = argparse.ArgumentParser(description='AWS Builder ID Auto-Registration')
    parser.add_argument('--email', '-e', help='Email для регистрации')
    parser.add_argument('--count', '-c', type=int, help='Количество аккаунтов')
    parser.add_argument('--headless', action='store_true', help='Без GUI')
    parser.add_argument('--spoof', action='store_true', help='Включить fingerprint spoofing (по умолчанию выключен)')
    
    args = parser.parse_args()
    
    emails = []
    names = None
    
    if args.email:
        emails = [args.email]
    elif args.count:
        generated = generate_emails(args.count)
        emails = [e for e, _ in generated]
        names = [n for _, n in generated]
        print(f"Generated {len(emails)} accounts")
    else:
        email = input("Email: ").strip()
        if email:
            emails = [email]
    
    if not emails:
        print("No emails")
        return
    
    print(f"\nWill register: {len(emails)} accounts")
    
    # Спуфинг по умолчанию ВЫКЛЮЧЕН (вызывает ошибки AWS)
    reg = AWSRegistration(headless=args.headless, spoof_fingerprint=args.spoof)
    
    try:
        results = reg.register_batch(emails, names)
        reg.print_summary(results)
    finally:
        reg.close()


if __name__ == '__main__':
    main()
