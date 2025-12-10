"""
Кастомные исключения для всей системы
"""


class KiroError(Exception):
    """Базовое исключение для всех ошибок Kiro"""
    pass


class TokenError(KiroError):
    """Ошибки связанные с токенами"""
    pass


class TokenExpiredError(TokenError):
    """Токен истёк"""
    pass


class TokenRefreshError(TokenError):
    """Ошибка обновления токена"""
    pass


class TokenNotFoundError(TokenError):
    """Токен не найден"""
    pass


class AuthError(KiroError):
    """Ошибки авторизации"""
    pass


class AuthBannedError(AuthError):
    """Аккаунт забанен"""
    def __init__(self, reason: str = "Unknown"):
        self.reason = reason
        super().__init__(f"Account banned: {reason}")


class QuotaError(KiroError):
    """Ошибки связанные с квотами"""
    pass


class QuotaExceededError(QuotaError):
    """Квота исчерпана"""
    pass


class MachineIdError(KiroError):
    """Ошибки связанные с Machine ID"""
    pass


class KiroNotInstalledError(KiroError):
    """Kiro IDE не установлен"""
    pass


class KiroRunningError(KiroError):
    """Kiro IDE запущен (нужно закрыть для операции)"""
    pass


class RegistrationError(KiroError):
    """Ошибки регистрации аккаунта"""
    pass


class EmailVerificationError(RegistrationError):
    """Ошибка верификации email"""
    pass
