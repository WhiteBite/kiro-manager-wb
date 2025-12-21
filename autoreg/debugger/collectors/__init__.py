"""
Коллекторы данных для дебаггера
"""

from .base import BaseCollector
from .network import NetworkCollector
from .cookies import CookieCollector
from .dom import DOMCollector
from .console import ConsoleCollector
from .cdp import CDPCollector

__all__ = [
    'BaseCollector',
    'NetworkCollector',
    'CookieCollector',
    'DOMCollector',
    'ConsoleCollector',
    'CDPCollector',
]
