"""
Спуфинг Client Hints API (navigator.userAgentData)

Новый API который заменяет User-Agent строку.
AWS может проверять соответствие между UA и Client Hints.
"""

from .base import BaseSpoofModule


class ClientHintsSpoofModule(BaseSpoofModule):
    """Спуфинг Client Hints API"""
    
    name = "client_hints"
    description = "Spoof navigator.userAgentData (Client Hints)"
    
    def get_js(self) -> str:
        p = self.profile
        
        # Извлекаем версию Chrome из user_agent
        import re
        chrome_match = re.search(r'Chrome/(\d+)', p.user_agent)
        chrome_version = chrome_match.group(1) if chrome_match else '131'
        
        return f'''
(function() {{
    'use strict';
    
    const CHROME_VERSION = '{chrome_version}';
    const PLATFORM = 'Windows';
    const PLATFORM_VERSION = '15.0.0';
    const ARCHITECTURE = 'x86';
    const BITNESS = '64';
    
    // Brands array (как в реальном Chrome)
    const brands = [
        {{ brand: 'Google Chrome', version: CHROME_VERSION }},
        {{ brand: 'Chromium', version: CHROME_VERSION }},
        {{ brand: 'Not A(Brand', version: '24' }}
    ];
    
    const fullVersionList = [
        {{ brand: 'Google Chrome', version: CHROME_VERSION + '.0.0.0' }},
        {{ brand: 'Chromium', version: CHROME_VERSION + '.0.0.0' }},
        {{ brand: 'Not A(Brand', version: '24.0.0.0' }}
    ];
    
    // Создаём fake userAgentData
    const fakeUserAgentData = {{
        brands: brands,
        mobile: false,
        platform: PLATFORM,
        
        getHighEntropyValues: function(hints) {{
            return Promise.resolve({{
                architecture: ARCHITECTURE,
                bitness: BITNESS,
                brands: brands,
                fullVersionList: fullVersionList,
                mobile: false,
                model: '',
                platform: PLATFORM,
                platformVersion: PLATFORM_VERSION,
                uaFullVersion: CHROME_VERSION + '.0.0.0',
                wow64: false,
                formFactors: ['Desktop']
            }});
        }},
        
        toJSON: function() {{
            return {{
                brands: brands,
                mobile: false,
                platform: PLATFORM
            }};
        }}
    }};
    
    // Замораживаем чтобы нельзя было изменить
    Object.freeze(fakeUserAgentData.brands);
    Object.freeze(fakeUserAgentData);
    
    // Переопределяем navigator.userAgentData
    try {{
        Object.defineProperty(navigator, 'userAgentData', {{
            get: () => fakeUserAgentData,
            configurable: true
        }});
    }} catch(e) {{}}
}})();
'''
