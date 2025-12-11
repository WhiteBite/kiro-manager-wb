"""
AWS Builder ID Auto-Registration
Главный модуль для автоматической регистрации аккаунтов

Использование:
    python register.py                    # Интерактивный режим
    python register.py --email user@example.com
    python register.py --file emails.txt
    python register.py --count 5          # Сгенерировать 5 email и зарегистрировать
"""

import argparse
import time
from typing import List, Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import get_config
from .browser import BrowserAutomation
from .oauth_client import OAuthClient
from .mail_handler import get_mail_handler

# Для обратной совместимости
config = get_config()
TIMEOUTS = {
    'page_load': config.timeouts.page_load,
    'element_wait': config.timeouts.element_wait,
    'verification_code': config.timeouts.verification_code,
    'oauth_callback': config.timeouts.oauth_callback,
    'between_accounts': config.timeouts.between_accounts,
    'imap_poll_interval': config.timeouts.imap_poll_interval,
}


class AccountStorage:
    """Простое хранилище аккаунтов (для обратной совместимости)"""
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
        import time
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
            'failed': len([a for a in accounts if a.get('status') == 'failed']),
        }


class AWSRegistration:
    """Главный класс для регистрации AWS Builder ID"""
    
    def __init__(self, headless: bool = False):
        self.storage = AccountStorage()
        self.headless = headless
        self.browser = None
        self.mail_handler = None
    
    def _init_mail(self, email_domain: str):
        """Инициализация обработчика почты"""
        if not self.mail_handler:
            self.mail_handler = get_mail_handler(email_domain)
        return self.mail_handler
    
    def register_single(self, email: str, name: Optional[str] = None, 
                       password: Optional[str] = None) -> dict:
        """Регистрация одного аккаунта (без callback)"""
        return self.register_single_with_progress(email, name, password, None)
    
    def register_single_with_progress(self, email: str, name: Optional[str] = None, 
                                      password: Optional[str] = None,
                                      progress_callback=None) -> dict:
        """
        Регистрация одного аккаунта с callback для прогресса
        
        Args:
            email: Email для регистрации
            name: Имя пользователя (по умолчанию из email)
            password: Пароль (по умолчанию генерируется)
            progress_callback: функция(step, total, name, detail)
        
        Returns:
            dict с результатом регистрации
        """
        def progress(step, total, name, detail=""):
            if progress_callback:
                progress_callback(step, total, name, detail)
            print(f"[{step}/{total}] {name}: {detail}")
        
        if name is None:
            # Извлекаем имя из email: JohnSmith1234 -> John Smith
            username = email.split('@')[0]
            # Убираем цифры в конце
            import re
            name_part = re.sub(r'\d+$', '', username)
            # Разделяем CamelCase: JohnSmith -> John Smith
            name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name_part)
        
        if password is None:
            password = BrowserAutomation.generate_password()
        
        email_domain = email.split('@')[1]
        mail_handler = self._init_mail(email_domain)
        
        if not mail_handler:
            return {'email': email, 'success': False, 'error': 'Mail handler not available'}
        
        oauth = OAuthClient()
        
        try:
            # 1. Запускаем OAuth сервер
            progress(2, 8, "OAuth", "Starting server...")
            
            auth_url = oauth.start(account_name=name)
            if not auth_url:
                return {'email': email, 'success': False, 'error': 'Failed to get auth URL'}
            
            # 2. Создаём новый браузер (чистый, без кэша)
            progress(3, 8, "Browser", "Opening page...")
            if self.browser:
                self.browser.close()
            self.browser = BrowserAutomation(headless=self.headless, spoof_fingerprint=True)
            
            # 3. Открываем страницу
            self.browser.navigate(auth_url)
            
            # 3. Проверяем на ошибку AWS
            if self.browser.check_aws_error():
                return {'email': email, 'success': False, 'error': 'AWS temporary error, try again later'}
            
            # 4. Закрываем cookie
            self.browser.close_cookie_dialog()
            
            # 5. Вводим email
            progress(4, 8, "Email", f"Entering {email}")
            self.browser.enter_email(email)
            self.browser.click_continue()
            
            # 5. Вводим имя
            self.browser.enter_name(name)
            
            # 6. Получаем и вводим код верификации
            progress(5, 8, "Verification", "Waiting for email code...")
            code = mail_handler.get_verification_code(email, timeout=TIMEOUTS['verification_code'])
            
            if not code:
                return {'email': email, 'success': False, 'error': 'Verification code not received'}
            
            progress(5, 8, "Verification", f"Code: {code}")
            self.browser.enter_verification_code(code)
            
            # 7. Вводим пароль
            progress(6, 8, "Password", "Setting password...")
            self.browser.enter_password(password)
            
            # 8. Allow access
            progress(7, 8, "Authorization", "Allowing access...")
            self.browser.click_allow_access()
            
            # 9. Ждём callback
            if self.browser.wait_for_callback():
                # Ждём завершения OAuth
                oauth.wait_for_callback(timeout=30)
                token_file = oauth.get_token_filename()
                
                # Debug: log token file
                print(f"[DEBUG] Token file from OAuth: {token_file}")
                
                # Сохраняем аккаунт
                self.storage.save(email, password, name, token_file)
                
                progress(8, 8, "Complete", f"Account created: {email}, token: {token_file}")
                return {
                    'email': email,
                    'password': password,
                    'name': name,
                    'token_file': token_file,
                    'success': True
                }
            else:
                return {'email': email, 'success': False, 'error': 'Callback timeout'}
                
        except Exception as e:
            return {'email': email, 'success': False, 'error': str(e)}
        
        finally:
            oauth.close()
    
    def register_batch(self, emails: List[str], names: List[str] = None) -> List[dict]:
        """
        Пакетная регистрация
        
        Args:
            emails: Список email адресов
            names: Список имён (опционально)
        
        Returns:
            Список результатов
        """
        if names is None:
            names = [e.split('@')[0] for e in emails]
        
        results = []
        
        for i, (email, name) in enumerate(zip(emails, names)):
            print(f"\n{'='*60}")
            print(f"Аккаунт {i+1}/{len(emails)}")
            print('='*60)
            
            result = self.register_single(email, name)
            results.append(result)
            
            # Пауза между регистрациями
            if i < len(emails) - 1:
                print(f"\n⏳ Пауза {TIMEOUTS['between_accounts']} секунд...")
                time.sleep(TIMEOUTS['between_accounts'])
        
        return results
    
    def print_summary(self, results: List[dict]):
        """Выводит итоги регистрации"""
        print("\n" + "="*60)
        print("📊 ИТОГИ")
        print("="*60)
        
        success = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]
        
        print(f"✅ Успешно: {len(success)}")
        print(f"❌ Ошибки: {len(failed)}")
        
        if success:
            print("\nУспешные аккаунты:")
            for r in success:
                print(f"  {r['email']} : {r['password']}")
        
        if failed:
            print("\nОшибки:")
            for r in failed:
                print(f"  {r['email']} - {r.get('error', 'Unknown')}")
        
        # Статистика хранилища
        stats = self.storage.count()
        print(f"\nВсего в базе: {stats['total']} аккаунтов")
    
    def close(self):
        """Закрытие ресурсов"""
        if self.mail_handler:
            self.mail_handler.disconnect()
        if self.browser:
            self.browser.close()


def generate_realistic_name() -> tuple[str, str]:
    """Генерация реалистичного имени и фамилии"""
    import random
    
    # Популярные английские имена
    first_names = [
        'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph',
        'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
        'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
        'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan',
        'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan',
        'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
        'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol',
        'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura',
        'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'
    ]
    
    # Популярные английские фамилии
    last_names = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
        'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
        'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
        'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Turner', 'Phillips', 'Evans',
        'Parker', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Murphy', 'Cook'
    ]
    
    return random.choice(first_names), random.choice(last_names)


def generate_emails(count: int, domain: str = 'example.com', prefix: str = 'kiro_auto') -> List[tuple[str, str]]:
    """
    Генерация списка email адресов с реалистичными именами
    Формат: ИмяФамилия + случайные цифры (JohnSmith1234@domain)
    
    Returns:
        List of tuples (email, full_name)
    """
    import random
    
    results = []
    used_emails = set()
    
    for _ in range(count):
        first_name, last_name = generate_realistic_name()
        
        # Генерируем уникальный email
        attempts = 0
        while attempts < 100:
            number = random.randint(100, 9999)  # 3-4 цифры
            username = f"{first_name}{last_name}{number}"  # JohnSmith1234
            email = f"{username}@{domain}"
            
            if email.lower() not in used_emails:
                used_emails.add(email.lower())
                full_name = f"{first_name} {last_name}"
                results.append((email, full_name))
                break
            attempts += 1
    
    return results


def main():
    parser = argparse.ArgumentParser(description='AWS Builder ID Auto-Registration')
    parser.add_argument('--email', '-e', help='Email для регистрации')
    parser.add_argument('--file', '-f', help='Файл со списком email')
    parser.add_argument('--count', '-c', type=int, help='Количество аккаунтов для генерации')
    parser.add_argument('--headless', action='store_true', help='Запуск без GUI')
    parser.add_argument('--export', action='store_true', help='Экспорт аккаунтов в файл')
    parser.add_argument('--list', action='store_true', help='Показать все аккаунты')
    parser.add_argument('--delete-all', action='store_true', help='Удалить все аккаунты')
    parser.add_argument('--delete-failed', action='store_true', help='Удалить failed аккаунты')
    parser.add_argument('--delete', type=str, help='Удалить аккаунт по email')
    
    args = parser.parse_args()
    
    storage = AccountStorage()
    
    # Управление аккаунтами
    if args.list:
        storage.list_all()
        return
    
    if args.delete_all:
        confirm = input("⚠️ Удалить ВСЕ аккаунты? (yes/no): ").strip().lower()
        if confirm == 'yes':
            storage.delete_all()
        else:
            print("Отменено")
        return
    
    if args.delete_failed:
        storage.delete_failed()
        return
    
    if args.delete:
        storage.delete_by_email(args.delete)
        return
    
    # Экспорт
    if args.export:
        storage.export_credentials()
        return
    
    # Определяем список email и имён
    emails = []
    names = None
    
    if args.email:
        emails = [args.email]
    elif args.file:
        with open(args.file) as f:
            emails = [line.strip() for line in f if line.strip() and '@' in line]
    elif args.count:
        generated = generate_emails(args.count)
        emails = [e for e, _ in generated]
        names = [n for _, n in generated]
        print(f"Сгенерировано {len(emails)} аккаунтов:")
        for email, name in generated:
            print(f"  {name} <{email}>")
    else:
        # Интерактивный режим
        print("=" * 60)
        print("AWS Builder ID Auto-Registration")
        print("=" * 60)
        print("\nРежимы:")
        print("1. Один аккаунт")
        print("2. Из файла")
        print("3. Сгенерировать N аккаунтов")
        print("4. Экспорт аккаунтов")
        print("5. Показать все аккаунты")
        print("6. Удалить все аккаунты")
        print("7. Удалить failed аккаунты")
        
        mode = input("\nВыберите режим (1-7): ").strip()
        
        if mode == '1':
            email = input("Email (@example.com): ").strip()
            if not email.endswith('@example.com'):
                print("❌ Поддерживается только @example.com")
                return
            emails = [email]
        
        elif mode == '2':
            filepath = input("Путь к файлу: ").strip()
            with open(filepath) as f:
                emails = [line.strip() for line in f if line.strip() and '@' in line]
        
        elif mode == '3':
            count = int(input("Количество: ").strip())
            generated = generate_emails(count)
            emails = [e for e, _ in generated]
            names = [n for _, n in generated]
            print(f"\nСгенерировано:")
            for email, name in generated:
                print(f"  {name} <{email}>")
        
        elif mode == '4':
            storage.export_credentials()
            return
        
        elif mode == '5':
            storage.list_all()
            return
        
        elif mode == '6':
            confirm = input("⚠️ Удалить ВСЕ аккаунты? (yes/no): ").strip().lower()
            if confirm == 'yes':
                storage.delete_all()
            else:
                print("Отменено")
            return
        
        elif mode == '7':
            storage.delete_failed()
            return
        
        else:
            print("❌ Неверный режим")
            return
    
    if not emails:
        print("❌ Нет email для регистрации")
        return
    
    # Подтверждение
    print(f"\nБудет зарегистрировано: {len(emails)} аккаунтов")
    confirm = input("Начать? (y/n): ").strip().lower()
    
    if confirm != 'y':
        print("Отменено")
        return
    
    # Регистрация
    reg = AWSRegistration(headless=args.headless)
    
    try:
        results = reg.register_batch(emails, names)
        reg.print_summary(results)
    finally:
        reg.close()


if __name__ == '__main__':
    main()
