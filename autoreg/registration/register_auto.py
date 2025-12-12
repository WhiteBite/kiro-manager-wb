"""
Автоматическая регистрация без интерактивного подтверждения
С выводом прогресса для VS Code extension
"""
import sys
import time
import json
import argparse
import random
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from .register import AWSRegistration, generate_emails
from core.config import get_config, save_config

def get_setting(path, default=None):
    return get_config().get(path, default)

def set_setting(path, value):
    config = get_config()
    config.set(path, value)
    save_config()


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


def generate_human_email(domain: str = 'example.com') -> str:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    number = random.randint(100, 9999)
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
    print(f"PROGRESS:{json.dumps(data)}", flush=True)


def main():
    parser = argparse.ArgumentParser(description='Auto-register AWS Builder ID')
    parser.add_argument('--headless', action='store_true', help='Run browser in headless mode')
    parser.add_argument('--no-headless', action='store_true', help='Show browser window')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--email', type=str, help='Custom email to use')
    parser.add_argument('--domain', type=str, default='example.com', help='Email domain')
    args = parser.parse_args()

    # Determine headless mode
    if args.headless:
        headless = True
    elif args.no_headless:
        headless = False
    else:
        headless = get_setting('browser.headless', False)

    if args.verbose:
        set_setting('debug.verbose', True)

    # Generate email
    email = args.email if args.email else generate_human_email(args.domain)

    progress(1, 8, "Initializing", f"Email: {email}")

    if args.verbose:
        print(f"[DEBUG] Headless: {headless}")
        print(f"[DEBUG] Email: {email}")

    reg = AWSRegistration(headless=headless)

    try:
        progress(2, 8, "Starting OAuth", "Getting auth URL...")
        
        # Use register_single (standard method)
        result = reg.register_single(email)
        
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
