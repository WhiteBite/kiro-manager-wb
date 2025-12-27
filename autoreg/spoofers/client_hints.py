"""
Спуфинг Client Hints API (navigator.userAgentData)

Новый API который заменяет User-Agent строку.
AWS может проверять соответствие между UA и Client Hints.
"""

import re
from typing import Tuple

from .base import BaseSpoofModule


def parse_platform_from_ua(user_agent: str) -> Tuple[str, str, str, str]:
    """
    Извлекает информацию о платформе из User-Agent строки.
    
    Returns:
        Tuple[platform, platform_version, architecture, bitness]
        
    Примеры User-Agent:
    - Windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
    - macOS: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36..."
    - Linux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36..."
    """
    # Defaults (Windows 10 как безопасный вариант)
    platform = "Windows"
    platform_version = "10.0.0"
    architecture = "x86"
    bitness = "64"
    
    # Определяем платформу
    if "Macintosh" in user_agent or "Mac OS X" in user_agent:
        platform = "macOS"
        # macOS версия из UA: "Mac OS X 10_15_7" -> "10.15.7"
        mac_match = re.search(r'Mac OS X (\d+)[_.](\d+)[_.]?(\d+)?', user_agent)
        if mac_match:
            major = mac_match.group(1)
            minor = mac_match.group(2)
            patch = mac_match.group(3) or "0"
            platform_version = f"{major}.{minor}.{patch}"
        else:
            platform_version = "10.15.7"  # Безопасный default для macOS
        architecture = "arm"  # Современные Mac на Apple Silicon
        bitness = "64"
        
    elif "Linux" in user_agent:
        platform = "Linux"
        platform_version = ""  # Linux не передаёт версию в Client Hints
        if "x86_64" in user_agent:
            architecture = "x86"
            bitness = "64"
        elif "aarch64" in user_agent or "arm64" in user_agent:
            architecture = "arm"
            bitness = "64"
        else:
            architecture = "x86"
            bitness = "64"
            
    elif "Windows" in user_agent:
        platform = "Windows"
        architecture = "x86"
        
        # Определяем битность
        if "Win64" in user_agent or "x64" in user_agent or "WOW64" in user_agent:
            bitness = "64"
        else:
            bitness = "32"
        
        # Windows NT версия
        # Windows NT 10.0 может быть Windows 10 или Windows 11
        # Различаем по build number если есть, иначе default = Windows 10
        nt_match = re.search(r'Windows NT (\d+\.\d+)', user_agent)
        if nt_match:
            nt_version = nt_match.group(1)
            if nt_version == "10.0":
                # Пытаемся найти build number в UA (редко, но бывает)
                # Формат: "Windows NT 10.0; Win64; x64; rv:..." или с build
                # Некоторые UA содержат build: "Windows NT 10.0.22621"
                build_match = re.search(r'Windows NT 10\.0\.(\d+)', user_agent)
                if build_match:
                    build = int(build_match.group(1))
                    if build >= 22000:
                        # Windows 11 (build 22000+)
                        platform_version = "15.0.0"
                    else:
                        # Windows 10
                        platform_version = "10.0.0"
                else:
                    # Нет build number - безопасный default Windows 10
                    platform_version = "10.0.0"
            elif nt_version == "6.3":
                platform_version = "6.3.0"  # Windows 8.1
            elif nt_version == "6.2":
                platform_version = "6.2.0"  # Windows 8
            elif nt_version == "6.1":
                platform_version = "6.1.0"  # Windows 7
            else:
                platform_version = "10.0.0"  # Default
    
    return platform, platform_version, architecture, bitness


class ClientHintsSpoofModule(BaseSpoofModule):
    """Спуфинг Client Hints API"""
    
    name = "client_hints"
    description = "Spoof navigator.userAgentData (Client Hints)"
    
    def get_js(self) -> str:
        p = self.profile
        
        # Извлекаем версию Chrome из user_agent
        chrome_match = re.search(r'Chrome/(\d+)', p.user_agent)
        chrome_version = chrome_match.group(1) if chrome_match else '131'
        
        # Извлекаем информацию о платформе из User-Agent
        platform, platform_version, architecture, bitness = parse_platform_from_ua(p.user_agent)
        
        return f'''
(function() {{
    'use strict';
    
    const CHROME_VERSION = '{chrome_version}';
    const PLATFORM = '{platform}';
    const PLATFORM_VERSION = '{platform_version}';
    const ARCHITECTURE = '{architecture}';
    const BITNESS = '{bitness}';
    
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
