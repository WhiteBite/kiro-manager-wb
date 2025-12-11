"""
Services module - бизнес-логика
"""

# Lazy imports to avoid circular dependencies
def get_token_service():
    from .token_service import TokenService
    return TokenService

def get_quota_service():
    from .quota_service import QuotaService
    return QuotaService

def get_machine_id_service():
    from .machine_id_service import MachineIdService
    return MachineIdService

def get_kiro_service():
    from .kiro_service import KiroService
    return KiroService

__all__ = [
    'get_token_service',
    'get_quota_service', 
    'get_machine_id_service',
    'get_kiro_service'
]
