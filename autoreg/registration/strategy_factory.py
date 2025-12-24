"""
Strategy Factory

Фабрика для создания стратегий регистрации.
Упрощает выбор и конфигурацию стратегий.
"""

from typing import Optional
from .auth_strategy import RegistrationStrategy
from .strategies.automated_strategy import AutomatedRegistrationStrategy
from .strategies.webview_strategy import WebViewRegistrationStrategy


class StrategyFactory:
    """Фабрика стратегий регистрации"""
    
    @staticmethod
    def create(strategy_name: str, **kwargs) -> RegistrationStrategy:
        """
        Создать стратегию по имени
        
        Args:
            strategy_name: Имя стратегии ("automated", "webview")
            **kwargs: Параметры для стратегии
            
        Returns:
            RegistrationStrategy instance
            
        Raises:
            ValueError: Если стратегия не найдена
        """
        strategy_name = strategy_name.lower()
        
        if strategy_name == "automated":
            return AutomatedRegistrationStrategy(
                headless=kwargs.get('headless', False),
                check_quota_immediately=kwargs.get('check_quota_immediately', False),
                human_delays=kwargs.get('human_delays', True)
            )
        
        elif strategy_name == "webview":
            return WebViewRegistrationStrategy(
                browser_path=kwargs.get('browser_path'),
                port=kwargs.get('port', 43210),
                proxy=kwargs.get('proxy')
            )
        
        else:
            raise ValueError(
                f"Unknown strategy: {strategy_name}. "
                f"Available: automated, webview"
            )
    
    @staticmethod
    def list_strategies() -> dict:
        """
        Список доступных стратегий с описанием
        
        Returns:
            Dict с информацией о стратегиях
        """
        return {
            'automated': {
                'name': 'Automated (Legacy)',
                'description': 'DrissionPage automation - works for some users',
                'ban_risk': 'high (80-90% if quota checked immediately)',
                'manual_input': False,
                'headless': True,
                'recommended': False,
                'notes': 'Use --no-check-quota to reduce ban risk to ~40-60%'
            },
            'webview': {
                'name': 'WebView (Anti-Ban)',
                'description': 'Real browser with manual input - minimal ban risk',
                'ban_risk': 'low (<10%)',
                'manual_input': True,
                'headless': False,
                'recommended': True,
                'notes': 'Requires user to manually enter credentials'
            }
        }
    
    @staticmethod
    def get_recommended() -> str:
        """Получить рекомендуемую стратегию"""
        return "webview"
    
    @staticmethod
    def print_strategies():
        """Вывести список стратегий в консоль"""
        strategies = StrategyFactory.list_strategies()
        
        print("\n" + "="*70)
        print("AVAILABLE REGISTRATION STRATEGIES")
        print("="*70)
        
        for name, info in strategies.items():
            recommended = " [RECOMMENDED]" if info['recommended'] else ""
            print(f"\n{name.upper()}{recommended}")
            print(f"  Name: {info['name']}")
            print(f"  Description: {info['description']}")
            print(f"  Ban Risk: {info['ban_risk']}")
            print(f"  Manual Input: {info['manual_input']}")
            print(f"  Headless Support: {info['headless']}")
            if info.get('notes'):
                print(f"  Notes: {info['notes']}")
        
        print("\n" + "="*70)
        print(f"Recommended: {StrategyFactory.get_recommended()}")
        print("="*70 + "\n")
