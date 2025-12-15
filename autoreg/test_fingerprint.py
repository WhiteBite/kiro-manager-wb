#!/usr/bin/env python3
"""
Тест fingerprint на известных детекторах

Запуск: python test_fingerprint.py

Проверяет спуфинг на:
- bot.sannysoft.com (webdriver detection)
- browserleaks.com (базовые проверки)
"""

import sys
import time
from DrissionPage import ChromiumPage, ChromiumOptions

# Добавляем путь к spoofers
sys.path.insert(0, '.')
from spoofers.cdp_spoofer import CDPSpoofer
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
    options.set_argument('--no-first-run')
    options.set_argument('--no-default-browser-check')
    options.set_argument('--disable-dev-shm-usage')
    options.set_argument('--disable-infobars')
    
    print("\n[BROWSER] Starting...")
    page = ChromiumPage(options)
    
    # Применяем спуфинг ДО навигации
    print("\n[SPOOF] Applying pre-navigation spoofing...")
    spoofer = CDPSpoofer(profile)
    spoofer.apply_pre_navigation(page)
    
    results = {'passed': 0, 'failed': 0}
    
    # Тест 1: bot.sannysoft.com
    print("\n" + "=" * 60)
    print("[TEST 1] bot.sannysoft.com - WebDriver Detection")
    print("=" * 60)
    page.get('https://bot.sannysoft.com/')
    time.sleep(3)
    
    try:
        webdriver_result = page.run_js('return document.querySelector("#webdriver-result")?.textContent || "N/A"')
        chrome_result = page.run_js('return document.querySelector("#chrome-result")?.textContent || "N/A"')
        
        print(f"  WebDriver: {webdriver_result}")
        print(f"  Chrome: {chrome_result}")
        
        if 'passed' in webdriver_result.lower() or 'missing' in webdriver_result.lower():
            print("  ✅ WebDriver test PASSED")
            results['passed'] += 1
        else:
            print("  ❌ WebDriver test FAILED")
            results['failed'] += 1
    except Exception as e:
        print(f"  Error: {e}")
        results['failed'] += 1
    
    time.sleep(2)
    
    # Тест 2: browserleaks.com
    print("\n" + "=" * 60)
    print("[TEST 2] browserleaks.com - JS Properties")
    print("=" * 60)
    page.get('https://browserleaks.com/javascript')
    time.sleep(3)
    
    try:
        webdriver = page.run_js('return navigator.webdriver')
        tz = page.run_js('return Intl.DateTimeFormat().resolvedOptions().timeZone')
        tz_offset = page.run_js('return new Date().getTimezoneOffset()')
        lang = page.run_js('return navigator.language')
        
        print(f"  WebDriver: {webdriver}")
        print(f"  Timezone: {tz}")
        print(f"  TZ Offset: {tz_offset}")
        print(f"  Language: {lang}")
        
        # Проверки
        # webdriver должен быть undefined (None в Python) или False
        if webdriver is None or webdriver == False:
            print("  ✅ WebDriver hidden!")
            results['passed'] += 1
        else:
            print(f"  ❌ WebDriver detected: {webdriver}")
            results['failed'] += 1
            
        if tz == profile.timezone:
            print("  ✅ Timezone matches!")
            results['passed'] += 1
        else:
            print(f"  ❌ Timezone mismatch: expected {profile.timezone}, got {tz}")
            results['failed'] += 1
            
        if tz_offset == profile.timezone_offset:
            print("  ✅ TZ Offset matches!")
            results['passed'] += 1
        else:
            print(f"  ❌ TZ Offset mismatch: expected {profile.timezone_offset}, got {tz_offset}")
            results['failed'] += 1
            
    except Exception as e:
        print(f"  Error: {e}")
        results['failed'] += 1
    
    # Закрываем браузер
    page.quit()
    
    # Итог
    print("\n" + "=" * 60)
    print(f"[RESULT] Passed: {results['passed']}, Failed: {results['failed']}")
    print("=" * 60)
    
    return results['failed'] == 0


if __name__ == '__main__':
    success = test_fingerprint()
    sys.exit(0 if success else 1)
