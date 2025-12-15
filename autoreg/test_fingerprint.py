#!/usr/bin/env python3
"""
Тест fingerprint на известных детекторах

Запуск: python test_fingerprint.py

Проверяет спуфинг на:
- creepjs.com (продвинутый детектор)
- browserleaks.com (базовые проверки)
- bot.sannysoft.com (webdriver detection)
"""

import sys
import time
from DrissionPage import ChromiumPage, ChromiumOptions

# Добавляем путь к spoofers
sys.path.insert(0, '.')
from spoofers.cdp_spoofer import CDPSpoofer, apply_pre_navigation_spoofing
from spoofers.profile import generate_random_profile


def test_fingerprint():
    """Тестирует fingerprint на детекторах"""
    
    print("=" * 60)
    print("FINGERPRINT TEST")
    print("=" * 60)
    
    # Генерируем профиль
    profile = generate_random_profile()
    print(f"\n[PROFILE]")
    print(f"  User-Agent: {profile.user_agent[:60]}...")
    print(f"  Timezone: {profile.timezone} (offset: {profile.timezone_offset})")
    print(f"  Screen: {profile.screen_width}x{profile.screen_height}")
    print(f"  WebGL: {profile.webgl_renderer[:50]}...")
    print(f"  Locale: {profile.locale}")
    
    # Настройки браузера
    options = ChromiumOptions()
    options.set_argument('--disable-blink-features=AutomationControlled')
    options.set_argument('--disable-infobars')
    options.set_argument('--no-first-run')
    options.set_argument('--no-default-browser-check')
    
    print("\n[BROWSER] Starting...")
    page = ChromiumPage(options)
    
    # Применяем спуфинг ДО навигации
    print("\n[SPOOF] Applying pre-navigation spoofing...")
    spoofer = CDPSpoofer(profile)
    spoofer.apply_pre_navigation(page)
    
    # Тест 1: bot.sannysoft.com (webdriver detection)
    print("\n" + "=" * 60)
    print("[TEST 1] bot.sannysoft.com - WebDriver Detection")
    print("=" * 60)
    page.get('https://bot.sannysoft.com/')
    time.sleep(3)
    
    # Проверяем результаты
    try:
        webdriver_result = page.run_js('return document.querySelector("#webdriver-result")?.textContent || "N/A"')
        chrome_result = page.run_js('return document.querySelector("#chrome-result")?.textContent || "N/A"')
        permissions_result = page.run_js('return document.querySelector("#permissions-result")?.textContent || "N/A"')
        
        print(f"  WebDriver: {webdriver_result}")
        print(f"  Chrome: {chrome_result}")
        print(f"  Permissions: {permissions_result}")
    except Exception as e:
        print(f"  Error reading results: {e}")
    
    input("\nPress Enter to continue to browserleaks.com...")
    
    # Тест 2: browserleaks.com
    print("\n" + "=" * 60)
    print("[TEST 2] browserleaks.com/javascript - JS Properties")
    print("=" * 60)
    page.get('https://browserleaks.com/javascript')
    time.sleep(3)
    
    # Проверяем что видит сайт
    try:
        ua = page.run_js('return navigator.userAgent')
        platform = page.run_js('return navigator.platform')
        webdriver = page.run_js('return navigator.webdriver')
        tz = page.run_js('return Intl.DateTimeFormat().resolvedOptions().timeZone')
        tz_offset = page.run_js('return new Date().getTimezoneOffset()')
        
        print(f"  User-Agent: {ua[:60]}...")
        print(f"  Platform: {platform}")
        print(f"  WebDriver: {webdriver}")
        print(f"  Timezone: {tz}")
        print(f"  TZ Offset: {tz_offset}")
        
        # Проверяем соответствие
        if str(webdriver).lower() == 'false':
            print("  ✅ WebDriver hidden!")
        else:
            print(f"  ❌ WebDriver detected: {webdriver}")
            
        if tz == profile.timezone:
            print("  ✅ Timezone matches!")
        else:
            print(f"  ❌ Timezone mismatch: expected {profile.timezone}, got {tz}")
            
        if tz_offset == profile.timezone_offset:
            print("  ✅ TZ Offset matches!")
        else:
            print(f"  ❌ TZ Offset mismatch: expected {profile.timezone_offset}, got {tz_offset}")
            
    except Exception as e:
        print(f"  Error: {e}")
    
    input("\nPress Enter to continue to creepjs.com...")
    
    # Тест 3: creepjs.com (продвинутый)
    print("\n" + "=" * 60)
    print("[TEST 3] creepjs.com - Advanced Fingerprint")
    print("=" * 60)
    page.get('https://abrahamjuliot.github.io/creepjs/')
    time.sleep(10)  # Нужно больше времени для анализа
    
    print("  Check the page manually for:")
    print("  - Trust Score (higher is better)")
    print("  - Lies detected (should be minimal)")
    print("  - Bot detection (should be 'human')")
    
    input("\nPress Enter to close browser...")
    page.quit()
    print("\n[DONE] Test complete!")


if __name__ == '__main__':
    test_fingerprint()
