#!/usr/bin/env python3
"""
Kiro Batch Login CLI v2
=======================

Новый CLI с модульной архитектурой.

Использование:
    python cli_new.py status              # Общий статус
    python cli_new.py tokens list         # Список токенов
    python cli_new.py tokens switch <name> # Переключить аккаунт
    python cli_new.py quota               # Квоты текущего аккаунта
    python cli_new.py quota --all         # Квоты всех аккаунтов
    python cli_new.py machine status      # Статус Machine ID
    python cli_new.py machine reset       # Сброс Kiro telemetry
    python cli_new.py kiro status         # Статус Kiro IDE
"""

import argparse
import sys
import json
from pathlib import Path

# Добавляем путь к модулям
sys.path.insert(0, str(Path(__file__).parent))

from core.paths import get_paths
from core.config import get_config
from services.token_service import TokenService
from services.quota_service import QuotaService
from services.machine_id_service import MachineIdService
from services.kiro_service import KiroService
from services.sso_import_service import SsoImportService


def cmd_status(args):
    """Общий статус системы"""
    paths = get_paths()
    token_service = TokenService()
    kiro_service = KiroService()
    
    print("\n" + "="*60)
    print("[STATS] Kiro Batch Login Status")
    print("="*60)
    
    # Kiro IDE
    kiro_status = kiro_service.get_status()
    print(f"\n[C]  Kiro IDE:")
    print(f"   Installed: {'[OK]' if kiro_status.installed else '[X]'}")
    if kiro_status.installed:
        print(f"   Running: {'[OK]' if kiro_status.running else '[X]'}")
        if kiro_status.current_account:
            token_icon = '[OK]' if kiro_status.token_valid else '[X]'
            print(f"   Account: {kiro_status.current_account} ({token_icon})")
    
    # Tokens
    tokens = token_service.list_tokens()
    valid_tokens = [t for t in tokens if not t.is_expired]
    print(f"\n🔑 Tokens:")
    print(f"   Total: {len(tokens)}")
    print(f"   Valid: {len(valid_tokens)}")
    print(f"   Expired: {len(tokens) - len(valid_tokens)}")
    
    # Paths
    print(f"\n📁 Paths:")
    print(f"   Tokens: {paths.tokens_dir}")
    print(f"   Backups: {paths.backups_dir}")
    
    print("\n" + "="*60)


# =============================================================================
# Token Commands
# =============================================================================

def cmd_tokens_list(args):
    """Список токенов"""
    service = TokenService()
    tokens = service.list_tokens()
    
    if not tokens:
        print("📭 No tokens found")
        print(f"   Directory: {service.paths.tokens_dir}")
        return
    
    # Текущий токен
    current = service.get_current_token()
    current_refresh = current.raw_data.get('refreshToken') if current else None
    
    print(f"\n🔑 Tokens ({len(tokens)}):")
    print("-" * 60)
    
    for token in tokens:
        is_current = (current_refresh and 
                     token.raw_data.get('refreshToken') == current_refresh)
        
        marker = "→ " if is_current else "  "
        status = "[X]" if token.is_expired else "[OK]"
        current_label = " [ACTIVE]" if is_current else ""
        
        print(f"{marker}{token.account_name}{current_label} {status}")
        print(f"      Provider: {token.provider} | Auth: {token.auth_method}")
        print(f"      Region: {token.region}")
        if token.expires_at:
            print(f"      Expires: {token.expires_at.strftime('%Y-%m-%d %H:%M')}")
        print()


def cmd_tokens_switch(args):
    """Переключить на токен"""
    service = TokenService()
    
    token = service.get_token(args.name)
    if not token:
        print(f"[X] Token '{args.name}' not found")
        print("\nAvailable tokens:")
        for t in service.list_tokens():
            print(f"  - {t.account_name}")
        return
    
    print(f"\n[R] Switching to: {token.account_name}")
    print(f"   Provider: {token.provider}")
    print(f"   Auth: {token.auth_method}")
    
    success = service.activate_token(token, force_refresh=args.refresh)
    
    if success:
        print(f"\n[OK] Switched to {token.account_name}")
        print("   Restart Kiro to apply changes")
    else:
        print("\n[X] Failed to switch")


def cmd_tokens_refresh(args):
    """Обновить токен"""
    service = TokenService()
    
    if args.name:
        token = service.get_token(args.name)
    else:
        token = service.get_best_token()
    
    if not token:
        print("[X] No token found")
        return
    
    print(f"[R] Refreshing: {token.account_name}")
    
    try:
        updated = service.refresh_and_save(token)
        print(f"[OK] Token refreshed!")
        print(f"   Expires: {updated.expires_at.strftime('%Y-%m-%d %H:%M')}")
        
        if args.activate:
            service.activate_token(updated)
            print("   Activated in Kiro")
    except Exception as e:
        print(f"[X] Failed: {e}")


# =============================================================================
# Quota Commands
# =============================================================================

def cmd_quota(args):
    """Показать квоты"""
    service = QuotaService()
    token_service = TokenService()
    
    if args.all:
        # Квоты всех аккаунтов
        tokens = token_service.list_tokens()
        
        if not tokens:
            print("[X] No tokens found")
            return
        
        print(f"\n[STATS] Checking quotas for {len(tokens)} accounts...\n")
        
        for token in tokens:
            print(f"\n{'='*60}")
            print(f"[M] {token.account_name} ({token.provider})")
            
            access_token = token.raw_data.get('accessToken')
            
            # Обновляем если нужно
            if token.is_expired or args.refresh:
                print("[R] Refreshing token...")
                try:
                    new_data = token_service.refresh_token(token)
                    access_token = new_data['accessToken']
                except Exception as e:
                    print(f"[X] Failed to refresh: {e}")
                    continue
            
            info = service.get_quota(access_token, token.auth_method)
            
            if info.error:
                print(f"   [X] {info.error}")
            elif info.usage:
                u = info.usage
                print(f"   📈 {u.used}/{u.limit} ({u.percent_used:.1f}%)")
                print(f"   📅 Reset in {info.days_until_reset} days")
                if u.trial_limit > 0:
                    print(f"   🎁 Trial: {u.trial_used}/{u.trial_limit}")
        return
    
    # Квоты текущего аккаунта
    print("\n[S] Getting quota for current account...")
    
    info = service.get_current_quota()
    
    if info:
        if args.json:
            print(json.dumps(info.raw_response, indent=2))
        else:
            service.print_quota(info)
    else:
        print("[X] Failed to get quota")


# =============================================================================
# Machine ID Commands
# =============================================================================

def cmd_machine_status(args):
    """Статус Machine ID"""
    service = MachineIdService()
    
    print("\n" + "="*60)
    print("[*] Machine ID Status")
    print("="*60)
    
    # System MachineGuid
    sys_info = service.get_system_machine_info()
    if sys_info.machine_guid:
        print(f"\n💻 System MachineGuid:")
        print(f"   {sys_info.machine_guid}")
        if sys_info.backup_exists:
            print(f"   Backup: [OK] ({sys_info.backup_time})")
    
    # Kiro telemetry
    tele_info = service.get_telemetry_info()
    
    if not tele_info.kiro_installed:
        print("\n[X] Kiro not installed")
    else:
        print(f"\n🎯 Kiro Telemetry IDs:")
        print(f"   machineId:        {(tele_info.machine_id or 'N/A')[:40]}...")
        print(f"   sqmId:            {tele_info.sqm_id or 'N/A'}")
        print(f"   devDeviceId:      {tele_info.dev_device_id or 'N/A'}")
        print(f"   serviceMachineId: {(tele_info.service_machine_id or 'N/A')[:40]}...")
    
    # Backups
    paths = get_paths()
    backups = paths.list_backups('kiro-telemetry')
    print(f"\n[P] Backups:")
    print(f"   Kiro telemetry: {len(backups)} backup(s)")
    print(f"   System GUID: {'[OK]' if sys_info.backup_exists else '[X]'}")
    
    print("\n" + "="*60)


def cmd_machine_backup(args):
    """Бэкап Machine ID"""
    service = MachineIdService()
    
    print("[P] Creating backup...")
    
    try:
        backup_file = service.backup_telemetry()
        print(f"[OK] Kiro telemetry saved: {backup_file}")
    except Exception as e:
        print(f"[X] Failed: {e}")
    
    if args.system:
        backup_file = service.backup_system_machine_guid()
        if backup_file:
            print(f"[OK] System MachineGuid saved: {backup_file}")


def cmd_machine_reset(args):
    """Сброс Machine ID"""
    service = MachineIdService()
    
    print("[R] Resetting Machine IDs...")
    
    results = service.full_reset(
        reset_system=args.system,
        check_running=not args.force
    )
    
    if results['kiro_reset']:
        print("[OK] Kiro telemetry IDs reset!")
        tele = results['new_telemetry']
        print(f"   machineId: {tele.machine_id[:30]}...")
        print(f"   sqmId: {tele.sqm_id}")
    
    if results['system_reset']:
        print(f"[OK] System MachineGuid reset: {results['new_system_guid']}")
    
    for error in results['errors']:
        print(f"[!] {error}")


def cmd_machine_restore(args):
    """Восстановить Machine ID"""
    service = MachineIdService()
    
    print("📥 Restoring from backup...")
    
    try:
        service.restore_telemetry()
        print("[OK] Kiro telemetry restored!")
    except Exception as e:
        print(f"[X] Failed: {e}")


# =============================================================================
# Kiro Commands
# =============================================================================

def cmd_kiro_status(args):
    """Статус Kiro IDE"""
    service = KiroService()
    service.print_status()


def cmd_kiro_start(args):
    """Запустить Kiro"""
    service = KiroService()
    
    try:
        service.start()
        print("[OK] Kiro started")
    except Exception as e:
        print(f"[X] Failed: {e}")


def cmd_kiro_stop(args):
    """Остановить Kiro"""
    service = KiroService()
    
    if service.stop():
        print("[OK] Kiro stopped")
    else:
        print("[X] Failed to stop Kiro")


def cmd_kiro_restart(args):
    """Перезапустить Kiro"""
    service = KiroService()
    
    try:
        service.restart()
        print("[OK] Kiro restarted")
    except Exception as e:
        print(f"[X] Failed: {e}")


# =============================================================================
# SSO Import Commands
# =============================================================================

def cmd_sso_import(args):
    """
    Импорт аккаунта из SSO cookie.
    
    Как получить cookie:
    1. Залогиниться в https://view.awsapps.com/start
    2. DevTools (F12) -> Application -> Cookies
    3. Скопировать значение x-amz-sso_authn
    """
    service = SsoImportService()
    
    bearer_token = args.token
    
    # Если токен не передан, запросить
    if not bearer_token:
        print("\n📋 SSO Cookie Import")
        print("=" * 50)
        print("\nКак получить cookie:")
        print("1. Залогиниться в https://view.awsapps.com/start")
        print("2. DevTools (F12) -> Application -> Cookies")
        print("3. Скопировать значение x-amz-sso_authn")
        print()
        bearer_token = input("Вставьте значение cookie x-amz-sso_authn: ").strip()
    
    if not bearer_token:
        print("[X] Token is required")
        return
    
    print(f"\n[R] Importing account from SSO cookie...")
    print(f"   Region: {args.region}")
    print()
    
    if args.activate:
        result = service.import_and_activate(bearer_token, args.region)
    else:
        result = service.import_and_save(bearer_token, args.region)
    
    if result.success:
        print(f"\n[OK] Import successful!")
        print(f"   Email: {result.email}")
        print(f"   Client ID: {result.client_id[:30]}...")
        if args.activate:
            print(f"   Status: Activated in Kiro")
    else:
        print(f"\n[X] Import failed: {result.error}")


# =============================================================================
# Main
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Kiro Batch Login CLI v2',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command')
    
    # status
    status_parser = subparsers.add_parser('status', help='Show overall status')
    status_parser.set_defaults(func=cmd_status)
    
    # tokens
    tokens_parser = subparsers.add_parser('tokens', help='Token management')
    tokens_sub = tokens_parser.add_subparsers(dest='tokens_cmd')
    
    tokens_list = tokens_sub.add_parser('list', help='List tokens')
    tokens_list.set_defaults(func=cmd_tokens_list)
    
    tokens_switch = tokens_sub.add_parser('switch', help='Switch to token')
    tokens_switch.add_argument('name', help='Token name')
    tokens_switch.add_argument('-r', '--refresh', action='store_true', help='Force refresh')
    tokens_switch.set_defaults(func=cmd_tokens_switch)
    
    tokens_refresh = tokens_sub.add_parser('refresh', help='Refresh token')
    tokens_refresh.add_argument('name', nargs='?', help='Token name')
    tokens_refresh.add_argument('-a', '--activate', action='store_true', help='Activate after refresh')
    tokens_refresh.set_defaults(func=cmd_tokens_refresh)
    
    # quota
    quota_parser = subparsers.add_parser('quota', help='Show quotas')
    quota_parser.add_argument('--all', '-a', action='store_true', help='All accounts')
    quota_parser.add_argument('--refresh', '-r', action='store_true', help='Refresh tokens')
    quota_parser.add_argument('--json', '-j', action='store_true', help='JSON output')
    quota_parser.set_defaults(func=cmd_quota)
    
    # machine
    machine_parser = subparsers.add_parser('machine', help='Machine ID management')
    machine_sub = machine_parser.add_subparsers(dest='machine_cmd')
    
    machine_status = machine_sub.add_parser('status', help='Show status')
    machine_status.set_defaults(func=cmd_machine_status)
    
    machine_backup = machine_sub.add_parser('backup', help='Create backup')
    machine_backup.add_argument('-s', '--system', action='store_true', help='Include system GUID')
    machine_backup.set_defaults(func=cmd_machine_backup)
    
    machine_reset = machine_sub.add_parser('reset', help='Reset IDs')
    machine_reset.add_argument('-s', '--system', action='store_true', help='Include system GUID')
    machine_reset.add_argument('-f', '--force', action='store_true', help='Skip Kiro running check')
    machine_reset.set_defaults(func=cmd_machine_reset)
    
    machine_restore = machine_sub.add_parser('restore', help='Restore from backup')
    machine_restore.set_defaults(func=cmd_machine_restore)
    
    # kiro
    kiro_parser = subparsers.add_parser('kiro', help='Kiro IDE management')
    kiro_sub = kiro_parser.add_subparsers(dest='kiro_cmd')
    
    kiro_status = kiro_sub.add_parser('status', help='Show status')
    kiro_status.set_defaults(func=cmd_kiro_status)
    
    kiro_start = kiro_sub.add_parser('start', help='Start Kiro')
    kiro_start.set_defaults(func=cmd_kiro_start)
    
    kiro_stop = kiro_sub.add_parser('stop', help='Stop Kiro')
    kiro_stop.set_defaults(func=cmd_kiro_stop)
    
    kiro_restart = kiro_sub.add_parser('restart', help='Restart Kiro')
    kiro_restart.set_defaults(func=cmd_kiro_restart)
    
    # sso-import
    sso_parser = subparsers.add_parser('sso-import', help='Import account from SSO cookie')
    sso_parser.add_argument('token', nargs='?', help='x-amz-sso_authn cookie value')
    sso_parser.add_argument('-r', '--region', default='us-east-1', help='AWS region')
    sso_parser.add_argument('-a', '--activate', action='store_true', help='Activate in Kiro after import')
    sso_parser.set_defaults(func=cmd_sso_import)
    
    # Parse
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Handle subcommands
    if args.command == 'tokens' and not args.tokens_cmd:
        cmd_tokens_list(args)
        return
    
    if args.command == 'machine' and not args.machine_cmd:
        cmd_machine_status(args)
        return
    
    if args.command == 'kiro' and not args.kiro_cmd:
        cmd_kiro_status(args)
        return
    
    if hasattr(args, 'func'):
        args.func(args)


if __name__ == '__main__':
    main()
