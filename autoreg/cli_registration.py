"""
CLI команды для регистрации аккаунтов

Поддерживает разные стратегии:
- automated: DrissionPage (legacy, работает для некоторых)
- webview: Реальный браузер с ручным вводом (рекомендуется)
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from registration.strategy_factory import StrategyFactory
from registration.auth_strategy import RegistrationStrategy
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def cmd_register_strategies(args):
    """Показать доступные стратегии регистрации"""
    StrategyFactory.print_strategies()


def cmd_register_webview(args):
    """
    Регистрация через WebView (рекомендуется)
    
    Открывает реальный браузер, пользователь вручную вводит данные.
    Минимальный риск бана (<10%).
    """
    email = args.email
    provider = args.provider or "Google"
    browser_path = args.browser
    proxy = args.proxy
    timeout = args.timeout or 300
    
    print("\n" + "="*70)
    print("WEBVIEW REGISTRATION (Anti-Ban)")
    print("="*70)
    print(f"Email: {email}")
    print(f"Provider: {provider}")
    print(f"Strategy: webview (low ban risk)")
    if browser_path:
        print(f"Browser: {browser_path}")
    if proxy:
        print(f"Proxy: {proxy}")
    print("="*70 + "\n")
    
    # Создаём стратегию
    strategy = StrategyFactory.create(
        'webview',
        browser_path=browser_path,
        proxy=proxy
    )
    
    try:
        # Регистрация
        result = strategy.register(
            email=email,
            provider=provider,
            timeout=timeout
        )
        
        # Результат
        print("\n" + "="*70)
        if result['success']:
            print("✅ REGISTRATION SUCCESSFUL")
            print("="*70)
            print(f"Email: {result['email']}")
            print(f"Token file: {result.get('token_file', 'N/A')}")
            print(f"Strategy: {result['strategy']}")
            print(f"Ban risk: {result['ban_risk']}")
            print(f"\n⚠️  Quota check deferred (anti-ban measure)")
            print(f"   Use: python -m autoreg.cli check-account --email {email}")
        else:
            print("❌ REGISTRATION FAILED")
            print("="*70)
            print(f"Email: {result['email']}")
            print(f"Error: {result.get('error', 'Unknown error')}")
            print(f"Strategy: {result['strategy']}")
        print("="*70 + "\n")
        
        return 0 if result['success'] else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Registration cancelled by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
    finally:
        strategy.cleanup()


def cmd_register_automated(args):
    """
    Регистрация через автоматизацию (legacy)
    
    Использует DrissionPage для автоматизации браузера.
    Работает для некоторых пользователей, но имеет высокий риск бана.
    """
    email = args.email
    name = args.name
    password = args.password
    headless = args.headless
    check_quota = not args.no_check_quota
    device_flow = args.device_flow
    
    print("\n" + "="*70)
    print("AUTOMATED REGISTRATION (Legacy)")
    print("="*70)
    print(f"Email: {email}")
    if name:
        print(f"Name: {name}")
    print(f"Strategy: automated")
    print(f"Headless: {headless}")
    print(f"Check quota immediately: {check_quota}")
    if check_quota:
        print(f"⚠️  WARNING: Immediate quota check increases ban risk!")
        print(f"   Consider using --no-check-quota flag")
    print("="*70 + "\n")
    
    # Создаём стратегию
    strategy = StrategyFactory.create(
        'automated',
        headless=headless,
        check_quota_immediately=check_quota,
        human_delays=True
    )
    
    try:
        # Регистрация
        result = strategy.register(
            email=email,
            name=name,
            password=password,
            device_flow=device_flow
        )
        
        # Результат
        print("\n" + "="*70)
        if result['success']:
            print("✅ REGISTRATION SUCCESSFUL")
            print("="*70)
            print(f"Email: {result['email']}")
            print(f"Password: {result.get('password', 'N/A')}")
            print(f"Token file: {result.get('token_file', 'N/A')}")
            print(f"Strategy: {result['strategy']}")
            print(f"Ban risk: {result['ban_risk']}")
            
            if not check_quota:
                print(f"\n⚠️  Quota check deferred (anti-ban measure)")
                print(f"   Use: python -m autoreg.cli check-account --email {email}")
        else:
            print("❌ REGISTRATION FAILED")
            print("="*70)
            print(f"Email: {result['email']}")
            print(f"Error: {result.get('error', 'Unknown error')}")
            print(f"Strategy: {result['strategy']}")
        print("="*70 + "\n")
        
        return 0 if result['success'] else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Registration cancelled by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
    finally:
        strategy.cleanup()


def cmd_register_auto(args):
    """
    Автоматическая регистрация с email стратегией
    
    Использует настроенную email стратегию (single/plus_alias/catch_all/pool).
    По умолчанию использует automated стратегию, но можно указать webview.
    """
    import os
    from core.email_generator import EmailGenerator
    
    count = args.count or 1
    strategy_name = args.strategy or "automated"
    headless = args.headless
    check_quota = not args.no_check_quota
    
    print("\n" + "="*70)
    print(f"AUTO REGISTRATION ({count} accounts)")
    print("="*70)
    print(f"Strategy: {strategy_name}")
    print(f"Headless: {headless}")
    print(f"Check quota immediately: {check_quota}")
    print("="*70 + "\n")
    
    # Для webview стратегии - только 1 аккаунт за раз
    if strategy_name == "webview" and count > 1:
        print("⚠️  WebView strategy supports only 1 account at a time")
        print("   Setting count to 1")
        count = 1
    
    # Получаем email стратегию из окружения
    email_strategy_type = os.environ.get('EMAIL_STRATEGY', 'single')
    imap_user = os.environ.get('IMAP_USER', '')
    email_domain = os.environ.get('EMAIL_DOMAIN', '')
    
    print(f"Email strategy: {email_strategy_type}")
    print(f"IMAP user: {imap_user}")
    if email_domain:
        print(f"Email domain: {email_domain}")
    
    # Создаём email генератор
    email_generator = EmailGenerator.from_env()
    
    # Генерируем email
    email_result = email_generator.generate()
    email = email_result.registration_email
    display_name = email_result.display_name
    print(f"Generated email: {email}")
    print(f"Display name: {display_name}")
    
    # WebView стратегия - используем напрямую
    if strategy_name == "webview":
        strategy = StrategyFactory.create('webview')
        
        # Get OAuth provider from environment (set by VS Code extension)
        oauth_provider = os.environ.get('OAUTH_PROVIDER', 'Google')
        print(f"OAuth provider: {oauth_provider}")
        
        try:
            result = strategy.register(
                email=email,
                name=display_name,
                provider=oauth_provider,
                timeout=300
            )
            
            # Результат
            print("\n" + "="*70)
            if result['success']:
                print("[OK] SUCCESS")
                print("="*70)
                print(f"Email: {result['email']}")
                print(f"Token file: {result.get('token_file', 'N/A')}")
                print(f"Strategy: {result['strategy']}")
                print(f"Ban risk: {result['ban_risk']}")
                print(f"\n⚠️  Quota check deferred (anti-ban measure)")
            else:
                print("[X] FAILED")
                print("="*70)
                print(f"Email: {result['email']}")
                print(f"Error: {result.get('error', 'Unknown error')}")
            print("="*70 + "\n")
            
            return 0 if result['success'] else 1
            
        except KeyboardInterrupt:
            print("\n\n⚠️  Registration cancelled by user")
            return 1
        except Exception as e:
            print(f"\n[X] ERROR: {e}")
            import traceback
            traceback.print_exc()
            return 1
        finally:
            strategy.cleanup()
    
    # Automated стратегия - используем старый AWSRegistration
    from registration.register import AWSRegistration
    
    reg = AWSRegistration(headless=headless)
    
    try:
        results = []
        for i in range(count):
            if i > 0:
                print(f"\n{'='*70}")
                print(f"Account {i+1}/{count}")
                print('='*70 + "\n")
            
            result = reg.register_auto(password=None)
            results.append(result)
            
            if i < count - 1:
                import time
                print(f"\n⏳ Pause 30s before next account...")
                time.sleep(30)
        
        # Итоги
        reg.print_summary(results)
        
        success_count = len([r for r in results if r.get('success')])
        return 0 if success_count == count else 1
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Registration cancelled by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
    finally:
        reg.close()


def setup_registration_commands(subparsers):
    """
    Настроить команды регистрации
    
    Вызывается из главного CLI для добавления команд.
    """
    
    # register strategies - показать доступные стратегии
    parser_strategies = subparsers.add_parser(
        'register-strategies',
        help='Show available registration strategies'
    )
    parser_strategies.set_defaults(func=cmd_register_strategies)
    
    # register webview - WebView регистрация (рекомендуется)
    parser_webview = subparsers.add_parser(
        'register-webview',
        help='Register via WebView (recommended, low ban risk)'
    )
    parser_webview.add_argument('--email', '-e', required=True,
                               help='Email for registration')
    parser_webview.add_argument('--provider', '-p', choices=['Google', 'Github'],
                               help='OAuth provider (default: Google)')
    parser_webview.add_argument('--browser', '-b',
                               help='Path to browser executable')
    parser_webview.add_argument('--proxy',
                               help='Proxy in format host:port or user:pass@host:port')
    parser_webview.add_argument('--timeout', '-t', type=int,
                               help='Callback timeout in seconds (default: 300)')
    parser_webview.set_defaults(func=cmd_register_webview)
    
    # register automated - Automated регистрация (legacy)
    parser_automated = subparsers.add_parser(
        'register-automated',
        help='Register via automation (legacy, higher ban risk)'
    )
    parser_automated.add_argument('--email', '-e', required=True,
                                 help='Email for registration')
    parser_automated.add_argument('--name', '-n',
                                 help='User name (generated if not specified)')
    parser_automated.add_argument('--password', '-p',
                                 help='Password (generated if not specified)')
    parser_automated.add_argument('--headless', action='store_true',
                                 help='Run browser in headless mode')
    parser_automated.add_argument('--no-check-quota', action='store_true',
                                 help='Do NOT check quota immediately (reduces ban risk)')
    parser_automated.add_argument('--device-flow', action='store_true',
                                 help='Use device flow instead of PKCE')
    parser_automated.set_defaults(func=cmd_register_automated)
    
    # register auto - Автоматическая регистрация с email стратегией
    parser_auto = subparsers.add_parser(
        'register-auto',
        help='Auto register using email strategy from .env'
    )
    parser_auto.add_argument('--count', '-c', type=int,
                            help='Number of accounts to register (default: 1)')
    parser_auto.add_argument('--strategy', '-s', choices=['automated', 'webview'],
                            help='Registration strategy (default: automated)')
    parser_auto.add_argument('--headless', action='store_true',
                            help='Run browser in headless mode (automated only)')
    parser_auto.add_argument('--no-check-quota', action='store_true',
                            help='Do NOT check quota immediately (reduces ban risk)')
    parser_auto.set_defaults(func=cmd_register_auto)


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Registration commands')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    setup_registration_commands(subparsers)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    sys.exit(args.func(args))
