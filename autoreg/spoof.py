"""
Фасад-модуль для спуфинга браузера

Экспортирует всё необходимое из spoofers/ для удобного использования.

Использование:
    from autoreg.spoof import apply_pre_navigation_spoofing, BehaviorSpoofModule
    
    # В BrowserAutomation.__init__:
    spoofer = apply_pre_navigation_spoofing(self.page)
    self._behavior = BehaviorSpoofModule()
"""

# Re-export всё из spoofers
from spoofers import (
    # Profile
    SpoofProfile,
    PROFILES,
    generate_random_profile,
    # CDP Spoofer
    CDPSpoofer,
    apply_cdp_spoofing,
    apply_pre_navigation_spoofing,
    # Behavior
    BehaviorSpoofModule,
    # All modules (для продвинутого использования)
    ALL_JS_MODULES,
)


__all__ = [
    'SpoofProfile',
    'PROFILES',
    'generate_random_profile',
    'CDPSpoofer',
    'apply_cdp_spoofing',
    'apply_pre_navigation_spoofing',
    'BehaviorSpoofModule',
    'ALL_JS_MODULES',
]
