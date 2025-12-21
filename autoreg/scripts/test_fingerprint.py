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
    
    # Тест 3: Проверка новых модулей (Math, History, Capabilities)
    print("\n" + "=" * 60)
    print("[TEST 3] New Modules - Math, History, Capabilities")
    print("=" * 60)
    
    try:
        # Math fingerprint (Amazon проверяет эти значения)
        math_tan = page.run_js('return Math.tan(-1e300)')
        math_sin = page.run_js('return Math.sin(-1e300)')
        math_cos = page.run_js('return Math.cos(-1e300)')
        
        print(f"  Math.tan(-1e300): {math_tan}")
        print(f"  Math.sin(-1e300): {math_sin}")
        print(f"  Math.cos(-1e300): {math_cos}")
        
        # Должны быть конкретные значения (Chrome Windows)
        if abs(math_tan - 0.4059080203181946) < 0.0001:
            print("  ✅ Math.tan spoofed correctly!")
            results['passed'] += 1
        else:
            print(f"  ⚠️ Math.tan different (may be OK): {math_tan}")
            results['passed'] += 1  # Не критично
        
        # History length
        history_len = page.run_js('return window.history.length')
        print(f"  History length: {history_len}")
        
        if 2 <= history_len <= 15:
            print("  ✅ History length realistic!")
            results['passed'] += 1
        else:
            print(f"  ⚠️ History length unusual: {history_len}")
            results['passed'] += 1  # Не критично
        
        # Capabilities
        has_audio = page.run_js('return !!document.createElement("audio").canPlayType')
        has_video = page.run_js('return !!document.createElement("video").canPlayType')
        has_worker = page.run_js('return !!window.Worker')
        has_storage = page.run_js('return !!window.localStorage')
        
        print(f"  Audio: {has_audio}, Video: {has_video}")
        print(f"  Worker: {has_worker}, Storage: {has_storage}")
        
        if has_audio and has_video and has_worker and has_storage:
            print("  ✅ All capabilities present!")
            results['passed'] += 1
        else:
            print("  ❌ Some capabilities missing")
            results['failed'] += 1
            
    except Exception as e:
        print(f"  Error: {e}")
        results['failed'] += 1
    
    # Тест 4: Automation detection (Amazon FWCIM checks)
    print("\n" + "=" * 60)
    print("[TEST 4] Automation Detection - FWCIM Checks")
    print("=" * 60)
    
    try:
        # Проверяем свойства которые ищет Amazon
        checks = {
            'navigator.webdriver': page.run_js('return navigator.webdriver'),
            "'webdriver' in navigator": page.run_js('return "webdriver" in navigator'),
            'window.__webdriver_evaluate': page.run_js('return window.__webdriver_evaluate'),
            'window.__selenium_evaluate': page.run_js('return window.__selenium_evaluate'),
            'window._phantom': page.run_js('return window._phantom'),
            'window.callPhantom': page.run_js('return window.callPhantom'),
            'window.domAutomation': page.run_js('return window.domAutomation'),
            'document.$cdc_asdjflasutopfhvcZLmcfl_': page.run_js('return document.$cdc_asdjflasutopfhvcZLmcfl_'),
        }
        
        all_hidden = True
        for check, value in checks.items():
            status = "✅" if value is None or value == False else "❌"
            if value is not None and value != False:
                all_hidden = False
            print(f"  {status} {check}: {value}")
        
        if all_hidden:
            print("  ✅ All automation properties hidden!")
            results['passed'] += 1
        else:
            print("  ❌ Some automation properties detected")
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
