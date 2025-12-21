"""
Базовый класс коллектора
"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core import DebugSession, DebugStep


class BaseCollector(ABC):
    """
    Базовый класс для всех коллекторов данных.
    
    Коллектор отвечает за:
    1. Инжект перехватчиков в страницу (inject)
    2. Периодический сбор данных (collect)
    3. Обработку начала/конца шага (on_step_start/on_step_end)
    """
    
    name: str = "base"
    
    def __init__(self, session: 'DebugSession'):
        self.session = session
        self._data = []
    
    @property
    def page(self):
        return self.session.page
    
    def log(self, msg: str):
        """Логирование через сессию"""
        self.session._log(f"  [{self.name}] {msg}")
    
    @abstractmethod
    def inject(self):
        """Инжектит перехватчики в страницу"""
        pass
    
    @abstractmethod
    def collect(self) -> list:
        """Собирает накопленные данные"""
        pass
    
    def on_step_start(self, step_name: str):
        """Вызывается при начале шага"""
        pass
    
    def on_step_end(self, step: 'DebugStep'):
        """Вызывается при завершении шага"""
        pass
