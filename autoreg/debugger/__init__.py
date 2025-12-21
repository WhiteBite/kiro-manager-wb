"""
AWS Registration Debugger

Модульный дебаггер для анализа проблем регистрации AWS Builder ID.

Структура:
- core.py - Основной класс DebugSession
- collectors/ - Модули сбора данных (network, cookies, dom, console, cdp)
- exporters/ - Экспорт в разные форматы (json, har, html)
- analyzers/ - Анализаторы данных (request, timing, fingerprint, redirect)
- run.py - Точка входа для полной отладки
- analyze_session.py - Анализ существующих сессий

Использование:
    from debugger import DebugSession
    
    session = DebugSession()
    session.attach(page)
    session.start_step("login")
    # ... действия ...
    session.end_step()
    session.save()

CLI:
    python -m debugger.run              # Запуск полной отладки
    python -m debugger.analyze_session  # Анализ последней сессии
    python -m debugger.analyze_har      # Анализ HAR файла
"""

from .core import DebugSession
from .collectors import NetworkCollector, CookieCollector, DOMCollector, ConsoleCollector, CDPCollector
from .exporters import JSONExporter, HARExporter, HTMLExporter
from .analyzers import RequestAnalyzer, TimingAnalyzer, FingerprintAnalyzer, RedirectAnalyzer

__all__ = [
    'DebugSession',
    # Collectors
    'NetworkCollector',
    'CookieCollector', 
    'DOMCollector',
    'ConsoleCollector',
    'CDPCollector',
    # Exporters
    'JSONExporter',
    'HARExporter',
    'HTMLExporter',
    # Analyzers
    'RequestAnalyzer',
    'TimingAnalyzer',
    'FingerprintAnalyzer',
    'RedirectAnalyzer',
]
