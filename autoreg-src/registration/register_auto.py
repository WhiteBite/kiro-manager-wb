"""
Автоматическая регистрация без интерактивного подтверждения
С выводом прогресса для VS Code extension
"""
import sys
import time
import json
import argparse
import random
import sys as _sys
from pathlib import Path as _Path
_sys.path.insert(0, str(_Path(__file__).parent.parent))

from .register import AWSRegistration, generate_emails
from core.config import get_config, save_config

def get_setting(path, default=None):
    return get_config().get(path, default)

def set_setting(path, value):
    config = get_config()
    config.set(path, value)
    save_config()


# Популярные имена и фамилии для генерации человекоподобных email
FIRST_NAMES = [
    'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph',
    'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
    'Steven', 'Paul', 'Andrew', 'Joshua', 'Kevin', 'Brian', 'George', 'Edward',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra', 'Ashley',
    'Emily', 'Amanda', 'Melissa', 'Stephanie', 'Rebecca', 'Laura', 'Helen',
    'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn',
    'Max', 'Ben', 'Jake', 'Ryan', 'Nick', 'Tom', 'Jack', 'Luke', 'Adam', 'Eric'
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore',
    'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Green', 'Baker',
    'Adams', 'Nelson', 'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter',
    'Phillips', 'Evans', 'Turner', 'Parker', 'Collins', 'Edwards', 'Stewart',
    'Morris', 'Murphy', 'Cook', 'Rogers', 'Morgan', 'Peterson', 'Cooper', 'Reed'
]


def generate_human_email(domain: str = 'whitebite.ru') -> str:
    """
    Генерирует человекоподобный email типа JohnSmith1234@domain
    Формат всегда одинаковый: ИмяФамилия + случайные цифры
    """
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    number = random.randint(100, 9999)  # 3-4 цифры
    
    # Единый формат: JohnSmith1234
    username = f"{first}{last}{number}"
    return f"{username}@{domain}"


def progress(step: int, total: int, name: str, detail: str = ""):
    """Выводит прогресс в JSON формате для extension"""
    data = {
        "step": step,
        "totalSteps": total,
        "stepName": name,
        "detail": detail
    }
    print(f"PROGRESS:{json.dumps(data)}")
    sys.stdout.flush()


def main():
    parser = argparse.ArgumentParser(description='Auto-register AWS Builder ID')
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    parser.add_argument('--no-headless', action='store_true', help='Show browser window (default)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--email', type=str, help='Custom email to use')
    parser.add_argument('--domain', type=str, default='whitebite.ru', help='Email domain')
    parser.add_argument('--prefix', type=str, default='kiro_auto', help='Email prefix')
    args = parser.parse_args()
    
    # Determine headless mode
    if args.headless:
        headless = True
    elif args.no_headless:
        headless = False
    else:
        # Use config setting
        headless = get_setting('browser.headless', False)
    
    # Update config if verbose
    if args.verbose:
        set_setting('debug.verbose', True)
    
    # Generate email
    if args.email:
        email = args.email
    else:
        email = generate_human_email(args.domain)
    
    progress(1, 8, "Initializing", f"Email: {email}")
    
    if args.verbose:
        print(f"[DEBUG] Headless: {headless}")
        print(f"[DEBUG] Email: {email}")
    
    reg = AWSRegistration(headless=headless)
    
    try:
        progress(2, 8, "Starting OAuth", "Getting auth URL...")
        
        result = reg.register_single_with_progress(email, progress_callback=progress)
        
        if result.get('success'):
            progress(8, 8, "Complete", f"Account: {result['email']}")
            print("\n✅ SUCCESS")
            print(f"Email: {result['email']}")
            print(f"Password: {result['password']}")
            print(f"Token: {result.get('token_file', 'N/A')}")
        else:
            progress(8, 8, "Failed", result.get('error', 'Unknown error'))
            print(f"\n❌ FAILED: {result.get('error', 'Unknown')}")
            
        return result
        
    except Exception as e:
        progress(8, 8, "Error", str(e))
        print(f"\n❌ ERROR: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return {'success': False, 'error': str(e)}
        
    finally:
        reg.close()


if __name__ == '__main__':
    main()
