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
import functools
from typing import List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Force unbuffered output for real-time logging
print = functools.partial(print, flush=True)

from core.config import get_config
from core.email_generator import EmailGenerator, EmailResult
from .browser import BrowserAutomation
from .mail_handler import get_mail_handler, create_mail_handler_from_env
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
    
    def __init__(self, headless: bool = False):
        self.storage = AccountStorage()
        self.headless = headless
        self.browser = None
        self.mail_handler = None
        self.oauth = None
        self.email_generator = None
    
    def _init_mail(self, email_domain: str = None):
        """Initialize mail handler from environment settings"""
        if not self.mail_handler:
            self.mail_handler = create_mail_handler_from_env()
        return self.mail_handler
    
    def _init_email_generator(self) -> EmailGenerator:
        """Initialize email generator from environment settings"""
        if not self.email_generator:
            self.email_generator = EmailGenerator.from_env()
        return self.email_generator
    
    def register_auto(self, password: Optional[str] = None) -> dict:
        """
        Автоматическая регистрация с использованием email стратегии.
        
        Email и имя генерируются автоматически на основе настроенной стратегии:
        - single: использует IMAP email напрямую
        - plus_alias: генерирует user+random@domain
        - catch_all: генерирует random@custom-domain
        - pool: берёт следующий email из списка
        
        Returns:
            dict с результатом регистрации
        """
        # Инициализируем генератор email
        generator = self._init_email_generator()
        
        try:
            # Генерируем email по стратегии
            email_result = generator.generate()
            print(f"[EMAIL] Strategy: {generator.config.strategy}")
            print(f"[EMAIL] Registration: {email_result.registration_email}")
            print(f"[EMAIL] IMAP lookup: {email_result.imap_lookup_email}")
            print(f"[EMAIL] Name: {email_result.display_name}")
            
            # Вызываем основной метод регистрации
            result = self.register_single(
                email=email_result.registration_email,
                name=email_result.display_name,
                password=password,
                imap_lookup_email=email_result.imap_lookup_email
            )
            
            # Добавляем информацию о стратегии
            result['strategy'] = generator.config.strategy
            result['imap_lookup_email'] = email_result.imap_lookup_email
            
            return result
            
        except ValueError as e:
            return {
                'success': False,
                'error': str(e),
                'strategy': generator.config.strategy
            }
    
    def register_single(self, email: str, name: Optional[str] = None, 
                       password: Optional[str] = None,
                       imap_lookup_email: Optional[str] = None) -> dict:
        """
        Регистрация одного аккаунта через OAuth PKCE Flow
        
        Args:
            email: Email для регистрации в AWS
            name: Имя пользователя (генерируется если не указано)
            password: Пароль (генерируется если не указан)
            imap_lookup_email: Email для поиска в IMAP (для plus_alias стратегии)
                              Если не указан, используется email
        
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
        # Email для поиска в IMAP (может отличаться от registration email)
        lookup_email = imap_lookup_email or email
        
        # Генерируем имя из email если не указано
        if name is None:
            username = email.split('@')[0]
            name_part = re.sub(r'\d+$', '', username)
            name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name_part)
        
        # Генерируем пароль если не указан
        if password is None:
            password = BrowserAutomation.generate_password()
        
        # Инициализируем почту (использует настройки из env)
        mail_handler = self._init_mail()
        
        if not mail_handler:
            return {'email': email, 'success': False, 'error': 'Mail handler not available. Check IMAP settings.'}
        
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
            
            print(f"   [OK] OAuth started, callback server on port {self.oauth.port}")
            print(f"   Auth URL: {auth_url[:80]}...")
            
            # ШАГ 2: Открываем браузер с auth_url
            print(f"\n[2/8] Opening browser with OAuth authorize URL...")
            if self.browser:
                self.browser.close()
            self.browser = BrowserAutomation(headless=self.headless)
            
            # Спуфинг уже применён в BrowserAutomation.__init__
            # через apply_pre_navigation_spoofing
            
            # Открываем OAuth authorize URL (НЕ profile.aws напрямую!)
            print(f"   Opening: {auth_url[:60]}...")
            self.browser.navigate(auth_url)
            
            # Проверяем на ошибку AWS
            if self.browser.check_aws_error():
                return {'email': email, 'success': False, 'error': 'AWS temporary error'}
            
            # ШАГ 3: Вводим email
            print(f"[3/8] Entering email: {email}")
            self.browser.enter_email(email)
            self.browser.simulate_human_activity()  # Имитация человека
            self.browser.click_continue()
            
            # ШАГ 4: Вводим имя
            print(f"[4/8] Entering name: {name}")
            self.browser.simulate_human_activity()  # Имитация человека
            self.browser.enter_name(name)
            
            # ШАГ 5: Получаем и вводим код верификации
            # Используем lookup_email для поиска в IMAP (важно для plus_alias стратегии)
            print(f"[5/8] Waiting for verification code (lookup: {lookup_email})...")
            code = mail_handler.get_verification_code(lookup_email, timeout=TIMEOUTS['verification_code'])
            
            if not code:
                return {'email': email, 'success': False, 'error': 'Verification code not received'}
            
            print(f"[5/8] Entering code: {code}")
            self.browser.simulate_human_activity()  # Имитация человека
            self.browser.enter_verification_code(code)
            
            # ШАГ 6: Вводим пароль
            print(f"[6/8] Setting password...")
            self.browser.simulate_human_activity()  # Имитация человека
            self.browser.enter_password(password)
            
            # ШАГ 7: Ждём редирект на view.awsapps.com и кликаем "Allow access"
            print(f"[7/8] Waiting for Allow access page...")
            
            # ОПТИМИЗИРОВАНО: быстрый polling с минимальными задержками
            start_time = time.time()
            allow_clicked = False
            
            while time.time() - start_time < 60:  # Увеличено - AWS может долго грузить
                current_url = self.browser.current_url
                
                if '127.0.0.1' in current_url and 'oauth/callback' in current_url:
                    print(f"   [OK] Already redirected to callback!")
                    break
                
                # Кнопка Allow access только на view.awsapps.com
                if 'view.awsapps.com' in current_url:
                    elapsed = time.time() - start_time
                    print(f"   [OK] Redirected to view.awsapps.com in {elapsed:.2f}s")
                    
                    if not allow_clicked:
                        # Кликаем Allow access
                        if self.browser.click_allow_access():
                            allow_clicked = True
                        else:
                            print(f"   [!] Failed to click Allow access, retrying...")
                            self.browser.screenshot("error_allow_access_click")
                    
                # Логируем промежуточные URL для диагностики
                elif 'signin.aws' in current_url or 'profile.aws' in current_url:
                    if time.time() - start_time > 5:  # Логируем только если долго
                        print(f"   [...] Still on: {current_url[:60]}...")
                
                time.sleep(0.1)
            
            # ШАГ 8: Ждём callback и обмениваем code на токены
            print(f"[8/8] Waiting for OAuth callback...")
            
            # Ждём callback (OAuth сервер обработает его автоматически)
            success = self.oauth.wait_for_callback(timeout=TIMEOUTS['oauth_callback'])
            
            if success:
                token_file = self.oauth.get_token_filename()
                
                # Сохраняем аккаунт С токеном
                self.storage.save(email, password, name, token_file)
                
                print(f"\n[OK] SUCCESS: {email}")
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
                print(f"   [!] OAuth callback not received")
                
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
                print(f"\n[...] Pause {TIMEOUTS['between_accounts']}s...")
                time.sleep(TIMEOUTS['between_accounts'])
        
        return results
    
    def print_summary(self, results: List[dict]):
        """Итоги регистрации"""
        print("\n" + "="*60)
        print("[STATS] SUMMARY")
        print("="*60)
        
        success = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]
        
        print(f"[OK] Success: {len(success)}")
        print(f"[X] Failed: {len(failed)}")
        
        if success:
            print("\nSuccessful:")
            for r in success:
                token_info = f" (token: {r.get('token_file', 'none')})" if r.get('token_file') else " (no token)"
                print(f"  {r['email']} : {r['password']}{token_info}")
        
        if failed:
            print("\nFailed:")
            for r in failed:
                error_msg = str(r.get('error', 'Unknown error'))
                # Sanitize non-ASCII characters for Windows console
                error_msg = error_msg.encode('ascii', 'replace').decode('ascii')
                print(f"  {r['email']} - {error_msg}")
    
    def close(self):
        if self.mail_handler:
            self.mail_handler.disconnect()
        if self.browser:
            self.browser.close()
        if self.oauth:
            self.oauth.close()


def generate_emails(count: int, domain: str = 'example.com') -> List[tuple]:
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
    parser.add_argument('--yes', '-y', action='store_true', help='Автоматическое подтверждение (без prompt)')
    
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
        # Если запущено без --yes, спрашиваем email
        if not args.yes:
            email = input("Email: ").strip()
            if email:
                emails = [email]
    
    if not emails:
        print("No emails")
        return
    
    print(f"\nWill register: {len(emails)} accounts")
    
    reg = AWSRegistration(headless=args.headless)
    
    try:
        results = reg.register_batch(emails, names)
        reg.print_summary(results)
    finally:
        reg.close()


if __name__ == '__main__':
    main()
