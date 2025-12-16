"""
CDP-based спуфинг для DrissionPage

Использует Chrome DevTools Protocol для надёжного спуфинга.
Собирает JS из всех модулей и инжектит через CDP.
"""

from typing import Dict, List, Optional

from .profile import SpoofProfile, PROFILES, generate_random_profile
from .automation import AutomationSpoofModule
from .navigator import NavigatorSpoofModule
from .screen import ScreenSpoofModule
from .webgl import WebGLSpoofModule
from .canvas import CanvasSpoofModule
from .timezone import TimezoneSpoofModule
from .audio import AudioSpoofModule
from .battery import BatterySpoofModule
from .network import NetworkSpoofModule
from .webrtc import WebRTCSpoofModule
from .fonts import FontsSpoofModule
from .sensors import SensorsSpoofModule
from .geolocation import GeolocationSpoofModule
from .cdp_hide import CDPHideSpoofModule
from .client_hints import ClientHintsSpoofModule
from .performance import PerformanceSpoofModule
from .math import MathSpoofModule
from .history import HistorySpoofModule
from .capabilities import CapabilitiesSpoofModule


# Все JS-модули в порядке применения
JS_MODULES = [
    AutomationSpoofModule,   # Сначала скрываем автоматизацию
    CDPHideSpoofModule,      # Скрываем следы CDP
    NavigatorSpoofModule,    # Navigator properties
    ScreenSpoofModule,       # Screen properties
    WebGLSpoofModule,        # WebGL vendor/renderer
    CanvasSpoofModule,       # Canvas fingerprint
    TimezoneSpoofModule,     # Timezone
    AudioSpoofModule,        # Audio fingerprint
    BatterySpoofModule,      # Battery API
    NetworkSpoofModule,      # Network info
    WebRTCSpoofModule,       # WebRTC IP leak
    FontsSpoofModule,        # Font fingerprint
    SensorsSpoofModule,      # Device sensors
    GeolocationSpoofModule,  # Geolocation (JS fallback)
    ClientHintsSpoofModule,  # Client Hints API (userAgentData)
    PerformanceSpoofModule,  # Performance timing
    MathSpoofModule,         # Math fingerprint (sin/cos/tan)
    HistorySpoofModule,      # History length
    CapabilitiesSpoofModule, # JS/CSS capabilities
]


class CDPSpoofer:
    """
    Спуфер на основе Chrome DevTools Protocol.
    
    Использует CDP для надёжного спуфинга + собирает JS из модулей.
    
    Использование:
        spoofer = CDPSpoofer()
        spoofer.apply(page)  # Применить к DrissionPage
    """
    
    def __init__(self, profile: SpoofProfile = None):
        self.profile = profile or generate_random_profile()
        self._modules = [ModuleClass(self.profile) for ModuleClass in JS_MODULES]
    
    def _collect_js(self) -> str:
        """Собирает JS из всех модулей в один скрипт"""
        js_parts = [
            "// === AWS FWCIM Bypass - Auto-generated ===",
            "'use strict';",
            "",
            "// === WEBDRIVER PROXY (must be first!) ===",
            """
(function() {
    // Proxy для полного скрытия webdriver
    const originalNavigator = window.navigator;
    const navigatorProxy = new Proxy(originalNavigator, {
        has: function(target, prop) {
            if (prop === 'webdriver') return false;
            return prop in target;
        },
        get: function(target, prop) {
            if (prop === 'webdriver') return undefined;
            const value = target[prop];
            if (typeof value === 'function') {
                return value.bind(target);
            }
            return value;
        }
    });
    
    try {
        Object.defineProperty(window, 'navigator', {
            get: () => navigatorProxy,
            configurable: true
        });
    } catch(e) {}
})();
""",
        ]
        
        for module in self._modules:
            js = module.get_js()
            if js:
                js_parts.append(f"\n// === {module.name}: {module.description} ===")
                js_parts.append(js)
        
        js_parts.append("\nconsole.log('[SPOOF] All modules applied');")
        return '\n'.join(js_parts)
    
    def apply(self, page) -> Dict[str, bool]:
        """
        Применяет все спуфинги к DrissionPage.
        
        Args:
            page: DrissionPage ChromiumPage instance
        
        Returns:
            Dict с результатами применения
        """
        results = {}
        p = self.profile
        
        print("[SPOOF] Applying CDP-based spoofing...")
        
        # 0. Отключаем webdriver через Proxy (КРИТИЧНО!)
        try:
            page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source='''
                const originalNavigator = window.navigator;
                const navigatorProxy = new Proxy(originalNavigator, {
                    has: function(target, prop) {
                        if (prop === 'webdriver') return false;
                        return prop in target;
                    },
                    get: function(target, prop) {
                        if (prop === 'webdriver') return undefined;
                        const value = target[prop];
                        if (typeof value === 'function') {
                            return value.bind(target);
                        }
                        return value;
                    }
                });
                Object.defineProperty(window, 'navigator', {
                    get: () => navigatorProxy,
                    configurable: true
                });
            ''')
            results['webdriver_hide'] = True
            print("   [OK] WebDriver flag hidden via CDP")
        except Exception as e:
            results['webdriver_hide'] = False
            print(f"   [FAIL] WebDriver hide: {e}")
        
        # 1. User-Agent через CDP
        try:
            page.run_cdp('Emulation.setUserAgentOverride', 
                userAgent=p.user_agent,
                platform=p.platform,
                acceptLanguage=f"{p.locale},en;q=0.9"
            )
            results['user_agent'] = True
            print(f"   [OK] User-Agent: {p.user_agent[:50]}...")
        except Exception as e:
            results['user_agent'] = False
            print(f"   [FAIL] User-Agent: {e}")
        
        # 2. Timezone через CDP
        try:
            page.run_cdp('Emulation.setTimezoneOverride', timezoneId=p.timezone)
            results['timezone'] = True
            print(f"   [OK] Timezone: {p.timezone}")
        except Exception as e:
            results['timezone'] = False
            print(f"   [FAIL] Timezone: {e}")
        
        # 3. Geolocation через CDP
        try:
            page.run_cdp('Emulation.setGeolocationOverride',
                latitude=p.latitude,
                longitude=p.longitude,
                accuracy=p.accuracy
            )
            results['geolocation'] = True
            print(f"   [OK] Geolocation: {p.latitude:.4f}, {p.longitude:.4f}")
        except Exception as e:
            results['geolocation'] = False
            print(f"   [FAIL] Geolocation: {e}")
        
        # 4. Device metrics через CDP
        try:
            page.run_cdp('Emulation.setDeviceMetricsOverride',
                width=p.screen_width,
                height=p.screen_height,
                deviceScaleFactor=p.pixel_ratio,
                mobile=False
            )
            results['device_metrics'] = True
            print(f"   [OK] Screen: {p.screen_width}x{p.screen_height}")
        except Exception as e:
            results['device_metrics'] = False
            print(f"   [FAIL] Device metrics: {e}")
        
        # 5. Locale через CDP (опционально)
        try:
            page.run_cdp('Emulation.setLocaleOverride', locale=p.locale)
            results['locale'] = True
        except:
            results['locale'] = False
        
        # 6. Персистентный JS-инжект (выполнится на каждой странице)
        try:
            js_code = self._collect_js()
            page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=js_code)
            results['js_persistent'] = True
            print(f"   [OK] Persistent JS injection ({len(self._modules)} modules)")
        except Exception as e:
            results['js_persistent'] = False
            print(f"   [FAIL] Persistent JS: {e}")
        
        # 7. Также выполняем JS сразу для текущей страницы
        try:
            page.run_js(self._collect_js())
            results['js_immediate'] = True
        except Exception as e:
            results['js_immediate'] = False
            print(f"   [WARN] Immediate JS: {e}")
        
        success = sum(results.values())
        total = len(results)
        print(f"[SPOOF] Applied {success}/{total} spoofings")
        
        return results
    
    def apply_pre_navigation(self, page) -> bool:
        """
        Применяет спуфинг ДО навигации на страницу.
        
        ВАЖНО: Вызывать ПЕРЕД page.get(url)!
        
        Args:
            page: DrissionPage ChromiumPage instance
        
        Returns:
            True если успешно
        """
        p = self.profile
        success = True
        
        print("[SPOOF] Applying pre-navigation spoofing...")
        
        # 0. Отключаем webdriver через Proxy (КРИТИЧНО!)
        # Proxy нужен чтобы 'webdriver' in navigator возвращал false
        try:
            page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source='''
                // Используем Proxy чтобы полностью скрыть webdriver
                const originalNavigator = window.navigator;
                const navigatorProxy = new Proxy(originalNavigator, {
                    has: function(target, prop) {
                        if (prop === 'webdriver') return false;
                        return prop in target;
                    },
                    get: function(target, prop) {
                        if (prop === 'webdriver') return undefined;
                        const value = target[prop];
                        if (typeof value === 'function') {
                            return value.bind(target);
                        }
                        return value;
                    }
                });
                
                Object.defineProperty(window, 'navigator', {
                    get: () => navigatorProxy,
                    configurable: true
                });
            ''')
            print("   [OK] WebDriver hidden")
        except Exception as e:
            print(f"   [WARN] WebDriver hide: {e}")
            success = False
        
        # CDP настройки
        try:
            page.run_cdp('Emulation.setUserAgentOverride', 
                userAgent=p.user_agent,
                platform=p.platform,
                acceptLanguage=f"{p.locale},en;q=0.9"
            )
            print(f"   [OK] User-Agent")
        except Exception as e:
            print(f"   [WARN] User-Agent: {e}")
            success = False
        
        try:
            page.run_cdp('Emulation.setTimezoneOverride', timezoneId=p.timezone)
            print(f"   [OK] Timezone: {p.timezone}")
        except Exception as e:
            print(f"   [WARN] Timezone: {e}")
        
        try:
            page.run_cdp('Emulation.setGeolocationOverride',
                latitude=p.latitude,
                longitude=p.longitude,
                accuracy=p.accuracy
            )
            print(f"   [OK] Geolocation")
        except Exception as e:
            print(f"   [WARN] Geolocation: {e}")
        
        try:
            page.run_cdp('Emulation.setDeviceMetricsOverride',
                width=p.screen_width,
                height=p.screen_height,
                deviceScaleFactor=p.pixel_ratio,
                mobile=False
            )
            print(f"   [OK] Device metrics")
        except Exception as e:
            print(f"   [WARN] Device metrics: {e}")
        
        # Персистентный JS-инжект
        try:
            js_code = self._collect_js()
            page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=js_code)
            print(f"   [OK] Persistent JS ({len(self._modules)} modules)")
        except Exception as e:
            print(f"   [FAIL] Persistent JS: {e}")
            success = False
        
        print("[SPOOF] Pre-navigation spoofing ready")
        return success
    
    def get_modules_info(self) -> List[Dict]:
        """Возвращает информацию о всех модулях"""
        return [
            {"name": m.name, "description": m.description}
            for m in self._modules
        ]


# === Удобные функции ===

def apply_cdp_spoofing(page, profile: SpoofProfile = None) -> Dict[str, bool]:
    """Применяет CDP спуфинг к странице"""
    spoofer = CDPSpoofer(profile)
    return spoofer.apply(page)


def apply_pre_navigation_spoofing(page, profile: SpoofProfile = None) -> CDPSpoofer:
    """
    Применяет спуфинг ДО навигации.
    
    Использование:
        spoofer = apply_pre_navigation_spoofing(page)
        page.get('https://...')
    
    Returns:
        CDPSpoofer instance
    """
    spoofer = CDPSpoofer(profile)
    spoofer.apply_pre_navigation(page)
    return spoofer
