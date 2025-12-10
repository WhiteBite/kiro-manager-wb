"""
Kiro Batch Login - Autoreg Module
=================================

Модуль для автоматизации работы с аккаунтами Kiro.

Структура:
    core/           - Базовые компоненты (config, paths, exceptions)
    services/       - Бизнес-логика (tokens, quota, machine_id, kiro)
    registration/   - Авторегистрация аккаунтов
    _legacy/        - Устаревший код (для справки)

Использование:
    # CLI
    python cli.py status
    python cli.py tokens list
    python cli.py quota
    python cli.py machine reset
    
    # Или через kiro_switch.py
    python kiro_switch.py switch <account>
    python kiro_switch.py quota
"""

__version__ = '2.0.0'

# Lazy imports
def get_token_service():
    from .services.token_service import TokenService
    return TokenService()

def get_quota_service():
    from .services.quota_service import QuotaService
    return QuotaService()

def get_machine_id_service():
    from .services.machine_id_service import MachineIdService
    return MachineIdService()

def get_kiro_service():
    from .services.kiro_service import KiroService
    return KiroService()
