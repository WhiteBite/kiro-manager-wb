"""
Базовый класс для всех спуф-модулей
"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .profile import SpoofProfile


class BaseSpoofModule(ABC):
    """
    Базовый класс спуф-модуля.
    
    Каждый модуль:
    - Принимает SpoofProfile
    - Возвращает JS-код через get_js()
    - Имеет name и description для логирования
    """
    
    name: str = "base"
    description: str = "Base spoof module"
    
    def __init__(self, profile: "SpoofProfile"):
        self.profile = profile
    
    @abstractmethod
    def get_js(self) -> str:
        """
        Возвращает JS-код для инжекта.
        
        JS должен быть обёрнут в IIFE: (function() { ... })();
        Использовать self.profile для доступа к параметрам.
        """
        pass
    
    def __repr__(self):
        return f"<{self.__class__.__name__}: {self.description}>"
