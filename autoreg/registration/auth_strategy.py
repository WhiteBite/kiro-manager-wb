"""
Authentication Strategy Pattern

Поддерживает разные методы авторизации:
- AutomatedStrategy: DrissionPage (старый метод, работает для некоторых)
- WebViewStrategy: Реальный браузер с ручным вводом (новый, anti-ban)
- DeviceFlowStrategy: Device flow OAuth (для headless серверов)
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class AuthResult:
    """Результат авторизации"""
    success: bool
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    profile_arn: Optional[str] = None
    csrf_token: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class AuthStrategy(ABC):
    """Базовый класс для стратегий авторизации"""
    
    @abstractmethod
    def authenticate(self, email: str, password: str, **kwargs) -> AuthResult:
        """
        Выполнить авторизацию
        
        Args:
            email: Email для авторизации
            password: Пароль
            **kwargs: Дополнительные параметры (зависят от стратегии)
            
        Returns:
            AuthResult с токенами или ошибкой
        """
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Название стратегии"""
        pass
    
    @abstractmethod
    def requires_manual_input(self) -> bool:
        """Требует ли стратегия ручного ввода от пользователя"""
        pass
    
    @abstractmethod
    def supports_headless(self) -> bool:
        """Поддерживает ли headless режим"""
        pass
    
    def get_ban_risk(self) -> str:
        """Оценка риска бана (low/medium/high)"""
        return "unknown"
    
    def cleanup(self):
        """Очистка ресурсов"""
        pass


class RegistrationStrategy(ABC):
    """Базовый класс для стратегий регистрации"""
    
    @abstractmethod
    def register(self, email: str, name: Optional[str] = None, 
                password: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """
        Выполнить регистрацию
        
        Args:
            email: Email для регистрации
            name: Имя пользователя (генерируется если не указано)
            password: Пароль (генерируется если не указан)
            **kwargs: Дополнительные параметры
            
        Returns:
            Dict с результатом регистрации
        """
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Название стратегии"""
        pass
    
    @abstractmethod
    def requires_manual_input(self) -> bool:
        """Требует ли стратегия ручного ввода от пользователя"""
        pass
    
    @abstractmethod
    def supports_headless(self) -> bool:
        """Поддерживает ли headless режим"""
        pass
    
    def get_ban_risk(self) -> str:
        """Оценка риска бана (low/medium/high)"""
        return "unknown"
    
    def supports_immediate_quota_check(self) -> bool:
        """
        Поддерживает ли стратегия немедленную проверку quota после регистрации.
        
        Для anti-ban стратегий должно быть False!
        """
        return True
    
    def cleanup(self):
        """Очистка ресурсов"""
        pass
