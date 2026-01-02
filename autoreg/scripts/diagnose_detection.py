#!/usr/bin/env python3
"""
Диагностика детекции браузера на известных сервисах

Запуск: python autoreg/scripts/diagnose_detection.py

Проверяет что именно детектят сервисы:
- bot.sannysoft.com - базовая проверка webdriver
- abrahamjuliot.github.io/creepjs - продвинутый fingerprint
- browserleaks.com/javascript - JS properties

Сохраняет:
- Скриншоты результатов
- JSON отчёт с детальной информацией
"""

import sys
import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

# Добавляем путь к autoreg
sys.path.insert(0, str(Path(__file__).parent.parent))

from DrissionPage import ChromiumPage, ChromiumOptions
from spoof import apply_pre_navigation_spoofing, BehaviorSpoofModule
from spoofers.profile import generate_random_profile


# Конфигурация
DEBUG_SESSIONS_DIR = Path(__file__).parent.parent / "debug_sessions"
DETECTION_SITES = [
    {
        "name": "sannysoft",
        "url": "https://bot.sannysoft.com/",
        "description": "WebDriver & Automation Detection",
        "wait_time": 3,
    },
    {
        "name": "creepjs",
        "url": "https://abrahamjuliot.github.io/creepjs/",
        "description": "Advanced Fingerprint Analysis",
        "wait_time": 8,  # CreepJS нужно больше времени для анализа
    },
    {
        "name": "browserleaks",
        "url": "https://browserleaks.com/javascript",
        "description": "JavaScript Properties",
        "wait_time": 3,
    },
]


class DetectionDiagnostics:
    """Диагностика детекции браузера"""
    
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.report_dir = DEBUG_SESSIONS_DIR / f"detection_{self.timestamp}"
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.results: Dict[str, Any] = {
            "timestamp": self.timestamp,
            "headless": headless,
            "profile": {},
            "sites": {},
            "automation_checks": {},
            "fingerprint_data": {},
            "summary": {
                "passed": 0,
                "failed": 0,
                "warnings": 0,
            }
        }
        
        self.page: Optional[ChromiumPage] = None
        self.profile = None
        self.behavior = None
    
    def _init_browser(self):
        """Инициализация браузера с нашим спуфингом"""
        print("\n" + "=" * 70)
        print("BROWSER INITIALIZATION")
        print("=" * 70)
        
        # Генерируем профиль
        self.profile = generate_random_profile()
        self.results["profile"] = {
            "user_agent": self.profile.user_agent,
            "platform": self.profile.platform,
            "timezone": self.profile.timezone,
            "timezone_offset": self.profile.timezone_offset,
            "locale": self.profile.locale,
            "screen": f"{self.profile.screen_width}x{self.profile.screen_height}",
            "webgl_vendor": self.profile.webgl_vendor,
            "webgl_renderer": self.profile.webgl_renderer,
            "latitude": self.profile.latitude,
            "longitude": self.profile.longitude,
        }
        
        print(f"\n[PROFILE]")
        print(f"  User-Agent: {self.profile.user_agent[:60]}...")
        print(f"  Platform: {self.profile.platform}")
        print(f"  Timezone: {self.profile.timezone} (offset: {self.profile.timezone_offset})")
        print(f"  Screen: {self.profile.screen_width}x{self.profile.screen_height}")
        print(f"  WebGL: {self.profile.webgl_renderer[:50]}...")
        print(f"  Locale: {self.profile.locale}")
        
        # Настройки браузера
        options = ChromiumOptions()
        options.set_argument('--no-first-run')
        options.set_argument('--no-default-browser-check')
        options.set_argument('--disable-dev-shm-usage')
        options.set_argument('--disable-infobars')
        options.set_argument('--window-size=1920,1080')
        options.set_argument('--lang=en-US')
        
        if self.headless:
            options.headless()
            options.set_argument('--disable-gpu')
            options.set_argument('--no-sandbox')
        
        # Уникальный профиль
        import tempfile
        import uuid
        temp_profile = os.path.join(tempfile.gettempdir(), f'detection_diag_{uuid.uuid4().hex[:8]}')
        options.set_user_data_path(temp_profile)
        options.auto_port()
        
        print(f"\n[BROWSER] Starting (headless={self.headless})...")
        self.page = ChromiumPage(options)
        
        # Применяем спуфинг ДО навигации
        print("\n[SPOOF] Applying pre-navigation spoofing...")
        apply_pre_navigation_spoofing(self.page, self.profile)
        
        # Инициализируем behavior module
        self.behavior = BehaviorSpoofModule()
        
        print("[BROWSER] Ready!")
    
    def _take_screenshot(self, name: str) -> str:
        """Делает скриншот и возвращает путь"""
        filepath = self.report_dir / f"{name}.png"
        try:
            self.page.get_screenshot(path=str(filepath), full_page=True)
            print(f"   [📸] Screenshot: {filepath.name}")
            return str(filepath)
        except Exception as e:
            print(f"   [!] Screenshot failed: {e}")
            return ""
    
    def _collect_automation_checks(self) -> Dict[str, Any]:
        """Собирает данные о детекции автоматизации"""
        checks = {}
        
        # Основные проверки webdriver
        automation_props = [
            ("navigator.webdriver", "return navigator.webdriver"),
            ("'webdriver' in navigator", "return 'webdriver' in navigator"),
            ("navigator.webdriver === undefined", "return navigator.webdriver === undefined"),
            ("navigator.webdriver === false", "return navigator.webdriver === false"),
        ]
        
        # Selenium/Puppeteer/Playwright следы
        automation_traces = [
            ("window.__webdriver_evaluate", "return typeof window.__webdriver_evaluate"),
            ("window.__selenium_evaluate", "return typeof window.__selenium_evaluate"),
            ("window.__webdriver_script_function", "return typeof window.__webdriver_script_function"),
            ("window.__webdriver_script_func", "return typeof window.__webdriver_script_func"),
            ("window.__webdriver_script_fn", "return typeof window.__webdriver_script_fn"),
            ("window.__fxdriver_evaluate", "return typeof window.__fxdriver_evaluate"),
            ("window.__driver_unwrapped", "return typeof window.__driver_unwrapped"),
            ("window.__webdriver_unwrapped", "return typeof window.__webdriver_unwrapped"),
            ("window.__driver_evaluate", "return typeof window.__driver_evaluate"),
            ("window.__selenium_unwrapped", "return typeof window.__selenium_unwrapped"),
            ("window._phantom", "return typeof window._phantom"),
            ("window.callPhantom", "return typeof window.callPhantom"),
            ("window._selenium", "return typeof window._selenium"),
            ("window.domAutomation", "return typeof window.domAutomation"),
            ("window.domAutomationController", "return typeof window.domAutomationController"),
        ]
        
        # CDP следы
        cdp_traces = [
            ("document.$cdc_asdjflasutopfhvcZLmcfl_", "return typeof document.$cdc_asdjflasutopfhvcZLmcfl_"),
            ("document.$chrome_asyncScriptInfo", "return typeof document.$chrome_asyncScriptInfo"),
            ("document.$wdc_", "return typeof document.$wdc_"),
        ]
        
        # Chrome-specific
        chrome_checks = [
            ("window.chrome", "return typeof window.chrome"),
            ("window.chrome.runtime", "return typeof window.chrome?.runtime"),
            ("navigator.plugins.length", "return navigator.plugins.length"),
            ("navigator.languages", "return JSON.stringify(navigator.languages)"),
        ]
        
        print("\n   [Automation Properties]")
        for name, js in automation_props:
            try:
                value = self.page.run_js(js)
                checks[name] = value
                status = "✅" if value in [None, False, True] and name != "'webdriver' in navigator" else "⚠️"
                if name == "'webdriver' in navigator" and value == False:
                    status = "✅"
                elif name == "'webdriver' in navigator" and value == True:
                    status = "❌"
                print(f"      {status} {name}: {value}")
            except Exception as e:
                checks[name] = f"Error: {e}"
                print(f"      ❌ {name}: Error")
        
        print("\n   [Automation Traces]")
        for name, js in automation_traces:
            try:
                value = self.page.run_js(js)
                checks[name] = value
                status = "✅" if value == "undefined" else "❌"
                print(f"      {status} {name}: {value}")
            except Exception as e:
                checks[name] = f"Error: {e}"
        
        print("\n   [CDP Traces]")
        for name, js in cdp_traces:
            try:
                value = self.page.run_js(js)
                checks[name] = value
                status = "✅" if value == "undefined" else "❌"
                print(f"      {status} {name}: {value}")
            except Exception as e:
                checks[name] = f"Error: {e}"
        
        print("\n   [Chrome Checks]")
        for name, js in chrome_checks:
            try:
                value = self.page.run_js(js)
                checks[name] = value
                print(f"      ℹ️ {name}: {value}")
            except Exception as e:
                checks[name] = f"Error: {e}"
        
        return checks
    
    def _collect_aws_fwcim_checks(self) -> Dict[str, Any]:
        """Проверки специфичные для AWS FWCIM (Fraud Web Client Identity Module)"""
        checks = {}
        
        print("\n   [AWS FWCIM Specific Checks]")
        
        # FWCIM проверяет эти свойства
        fwcim_checks = [
            # Headless detection
            ("window.outerWidth > 0", "return window.outerWidth > 0"),
            ("window.outerHeight > 0", "return window.outerHeight > 0"),
            ("window.innerWidth > 0", "return window.innerWidth > 0"),
            ("window.innerHeight > 0", "return window.innerHeight > 0"),
            
            # Chrome object checks
            ("chrome.app", "return typeof chrome?.app"),
            ("chrome.csi", "return typeof chrome?.csi"),
            ("chrome.loadTimes", "return typeof chrome?.loadTimes"),
            ("chrome.runtime", "return typeof chrome?.runtime"),
            
            # Notification permission (headless часто denied)
            ("Notification.permission", "return Notification.permission"),
            
            # Plugin array prototype
            ("PluginArray.prototype", "return Object.getPrototypeOf(navigator.plugins).constructor.name"),
            ("Plugin.prototype", "return navigator.plugins[0] ? Object.getPrototypeOf(navigator.plugins[0]).constructor.name : 'N/A'"),
            
            # MimeType checks
            ("MimeTypeArray.prototype", "return Object.getPrototypeOf(navigator.mimeTypes).constructor.name"),
            
            # Function toString checks (automation detection)
            ("eval.toString()", "return eval.toString().includes('[native code]')"),
            ("setTimeout.toString()", "return setTimeout.toString().includes('[native code]')"),
            
            # Iframe checks
            ("contentWindow access", """
                const iframe = document.createElement('iframe');
                document.body.appendChild(iframe);
                const result = typeof iframe.contentWindow;
                document.body.removeChild(iframe);
                return result;
            """),
            
            # Error stack traces (can reveal automation)
            ("Error stack clean", """
                try { throw new Error('test'); } 
                catch(e) { 
                    return !e.stack.includes('puppeteer') && 
                           !e.stack.includes('selenium') && 
                           !e.stack.includes('webdriver');
                }
            """),
            
            # Performance entries (automation leaves traces)
            ("performance entries clean", """
                const entries = performance.getEntriesByType('resource');
                return !entries.some(e => 
                    e.name.includes('puppeteer') || 
                    e.name.includes('selenium') ||
                    e.name.includes('webdriver')
                );
            """),
            
            # Connection type (headless often has different values)
            ("navigator.connection", "return navigator.connection?.effectiveType || 'N/A'"),
            
            # Permissions API behavior
            ("permissions.query", """
                return navigator.permissions.query({name: 'notifications'})
                    .then(r => r.state)
                    .catch(() => 'error');
            """),
        ]
        
        for name, js in fwcim_checks:
            try:
                value = self.page.run_js(js)
                checks[name] = value
                
                # Определяем статус
                if name == "Notification.permission" and value == "denied":
                    status = "⚠️"  # Может быть подозрительно
                elif name in ["PluginArray.prototype", "Plugin.prototype", "MimeTypeArray.prototype"]:
                    expected = name.split(".")[0]
                    status = "✅" if value == expected else "❌"
                elif isinstance(value, bool):
                    status = "✅" if value else "❌"
                else:
                    status = "ℹ️"
                
                print(f"      {status} {name}: {value}")
            except Exception as e:
                checks[name] = f"Error: {e}"
                print(f"      ❌ {name}: Error - {str(e)[:50]}")
        
        return checks
    
    def _collect_fingerprint_data(self) -> Dict[str, Any]:
        """Собирает данные fingerprint"""
        data = {}
        
        # Navigator
        navigator_props = [
            ("userAgent", "return navigator.userAgent"),
            ("platform", "return navigator.platform"),
            ("vendor", "return navigator.vendor"),
            ("language", "return navigator.language"),
            ("languages", "return JSON.stringify(navigator.languages)"),
            ("hardwareConcurrency", "return navigator.hardwareConcurrency"),
            ("deviceMemory", "return navigator.deviceMemory"),
            ("maxTouchPoints", "return navigator.maxTouchPoints"),
            ("cookieEnabled", "return navigator.cookieEnabled"),
            ("doNotTrack", "return navigator.doNotTrack"),
            ("pdfViewerEnabled", "return navigator.pdfViewerEnabled"),
        ]
        
        # Screen
        screen_props = [
            ("screen.width", "return screen.width"),
            ("screen.height", "return screen.height"),
            ("screen.availWidth", "return screen.availWidth"),
            ("screen.availHeight", "return screen.availHeight"),
            ("screen.colorDepth", "return screen.colorDepth"),
            ("screen.pixelDepth", "return screen.pixelDepth"),
            ("devicePixelRatio", "return window.devicePixelRatio"),
        ]
        
        # Timezone
        timezone_props = [
            ("timezone", "return Intl.DateTimeFormat().resolvedOptions().timeZone"),
            ("timezoneOffset", "return new Date().getTimezoneOffset()"),
            ("locale", "return Intl.DateTimeFormat().resolvedOptions().locale"),
        ]
        
        # WebGL
        webgl_props = [
            ("webgl_vendor", """
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) return 'N/A';
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                return debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'N/A';
            """),
            ("webgl_renderer", """
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) return 'N/A';
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'N/A';
            """),
        ]
        
        # Canvas fingerprint
        canvas_props = [
            ("canvas_hash", """
                const canvas = document.createElement('canvas');
                canvas.width = 200;
                canvas.height = 50;
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillStyle = '#f60';
                ctx.fillRect(125, 1, 62, 20);
                ctx.fillStyle = '#069';
                ctx.fillText('Cwm fjordbank glyphs vext quiz', 2, 15);
                ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
                ctx.fillText('Cwm fjordbank glyphs vext quiz', 4, 17);
                return canvas.toDataURL().slice(-50);
            """),
        ]
        
        # Audio fingerprint
        audio_props = [
            ("audio_context", "return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined'"),
        ]
        
        # Math fingerprint (Amazon checks these!)
        math_props = [
            ("Math.tan(-1e300)", "return Math.tan(-1e300)"),
            ("Math.sin(-1e300)", "return Math.sin(-1e300)"),
            ("Math.cos(-1e300)", "return Math.cos(-1e300)"),
            ("Math.acos(0.123)", "return Math.acos(0.123)"),
            ("Math.acosh(1e300)", "return Math.acosh(1e300)"),
        ]
        
        # Performance timing
        perf_props = [
            ("performance.now()", "return performance.now()"),
            ("Date.now()", "return Date.now()"),
        ]
        
        # History
        history_props = [
            ("history.length", "return window.history.length"),
        ]
        
        # Client Hints (userAgentData)
        client_hints = [
            ("userAgentData.brands", "return JSON.stringify(navigator.userAgentData?.brands || [])"),
            ("userAgentData.mobile", "return navigator.userAgentData?.mobile"),
            ("userAgentData.platform", "return navigator.userAgentData?.platform"),
        ]
        
        all_props = [
            ("Navigator", navigator_props),
            ("Screen", screen_props),
            ("Timezone", timezone_props),
            ("WebGL", webgl_props),
            ("Canvas", canvas_props),
            ("Audio", audio_props),
            ("Math", math_props),
            ("Performance", perf_props),
            ("History", history_props),
            ("ClientHints", client_hints),
        ]
        
        for category, props in all_props:
            print(f"\n   [{category}]")
            data[category] = {}
            for name, js in props:
                try:
                    value = self.page.run_js(js)
                    data[category][name] = value
                    # Truncate long values for display
                    display_value = str(value)[:60] + "..." if len(str(value)) > 60 else value
                    print(f"      {name}: {display_value}")
                except Exception as e:
                    data[category][name] = f"Error: {e}"
                    print(f"      {name}: Error - {e}")
        
        return data
    
    def _test_sannysoft(self) -> Dict[str, Any]:
        """Тестирует на bot.sannysoft.com"""
        result = {
            "url": "https://bot.sannysoft.com/",
            "tests": {},
            "passed": 0,
            "failed": 0,
        }
        
        try:
            # Парсим результаты таблицы
            tests_js = """
                const results = {};
                document.querySelectorAll('table tr').forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 2) {
                        const name = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        const passed = cells[1].classList.contains('passed') || 
                                       value.toLowerCase().includes('missing') ||
                                       value.toLowerCase().includes('passed');
                        results[name] = { value, passed };
                    }
                });
                return JSON.stringify(results);
            """
            
            tests_raw = self.page.run_js(tests_js)
            tests = json.loads(tests_raw) if tests_raw else {}
            
            for name, data in tests.items():
                result["tests"][name] = data
                if data.get("passed"):
                    result["passed"] += 1
                else:
                    result["failed"] += 1
                    
                status = "✅" if data.get("passed") else "❌"
                print(f"      {status} {name}: {data.get('value', 'N/A')}")
                
        except Exception as e:
            print(f"      Error parsing results: {e}")
            result["error"] = str(e)
        
        return result
    
    def _test_creepjs(self) -> Dict[str, Any]:
        """Тестирует на CreepJS"""
        result = {
            "url": "https://abrahamjuliot.github.io/creepjs/",
            "data": {},
            "trust_score": None,
        }
        
        try:
            # Ждём загрузки результатов CreepJS
            time.sleep(5)
            
            # Получаем trust score
            trust_js = """
                const trustEl = document.querySelector('.trust-score, [class*="trust"]');
                return trustEl ? trustEl.textContent : null;
            """
            trust_score = self.page.run_js(trust_js)
            result["trust_score"] = trust_score
            print(f"      Trust Score: {trust_score or 'N/A'}")
            
            # Получаем fingerprint ID
            fp_js = """
                const fpEl = document.querySelector('.fingerprint-id, [class*="fingerprint"]');
                return fpEl ? fpEl.textContent : null;
            """
            fp_id = self.page.run_js(fp_js)
            result["fingerprint_id"] = fp_id
            print(f"      Fingerprint ID: {fp_id or 'N/A'}")
            
            # Получаем детекции ботов
            bot_js = """
                const results = [];
                document.querySelectorAll('[class*="bot"], [class*="lie"], [class*="fake"]').forEach(el => {
                    results.push(el.textContent.trim().slice(0, 100));
                });
                return JSON.stringify(results.slice(0, 20));
            """
            bot_detections = self.page.run_js(bot_js)
            if bot_detections:
                detections = json.loads(bot_detections)
                result["bot_detections"] = detections
                if detections:
                    print(f"      Bot Detections: {len(detections)} found")
                    for d in detections[:5]:
                        print(f"         - {d[:60]}...")
            
        except Exception as e:
            print(f"      Error: {e}")
            result["error"] = str(e)
        
        return result
    
    def _test_browserleaks(self) -> Dict[str, Any]:
        """Тестирует на BrowserLeaks"""
        result = {
            "url": "https://browserleaks.com/javascript",
            "data": {},
        }
        
        try:
            # Собираем данные со страницы
            data_js = """
                const data = {};
                document.querySelectorAll('table tr').forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length >= 2) {
                        const key = cells[0].textContent.trim();
                        const value = cells[1].textContent.trim();
                        if (key && value) {
                            data[key] = value;
                        }
                    }
                });
                return JSON.stringify(data);
            """
            
            data_raw = self.page.run_js(data_js)
            data = json.loads(data_raw) if data_raw else {}
            result["data"] = data
            
            # Выводим ключевые значения
            key_props = ["User Agent", "Platform", "Language", "Timezone", "Screen Resolution", "WebDriver"]
            for prop in key_props:
                if prop in data:
                    print(f"      {prop}: {data[prop][:60] if len(data.get(prop, '')) > 60 else data.get(prop, 'N/A')}")
                    
        except Exception as e:
            print(f"      Error: {e}")
            result["error"] = str(e)
        
        return result
    
    def run_diagnostics(self):
        """Запускает полную диагностику"""
        print("\n" + "=" * 70)
        print("🔍 BROWSER DETECTION DIAGNOSTICS")
        print("=" * 70)
        print(f"Timestamp: {self.timestamp}")
        print(f"Report dir: {self.report_dir}")
        
        try:
            # Инициализация браузера
            self._init_browser()
            
            # Сначала собираем данные на пустой странице
            print("\n" + "=" * 70)
            print("AUTOMATION DETECTION CHECKS")
            print("=" * 70)
            self.page.get("about:blank")
            time.sleep(0.5)
            self.results["automation_checks"] = self._collect_automation_checks()
            
            # Собираем fingerprint данные
            print("\n" + "=" * 70)
            print("FINGERPRINT DATA COLLECTION")
            print("=" * 70)
            self.results["fingerprint_data"] = self._collect_fingerprint_data()
            
            # AWS FWCIM специфичные проверки
            print("\n" + "=" * 70)
            print("AWS FWCIM SPECIFIC CHECKS")
            print("=" * 70)
            self.results["fwcim_checks"] = self._collect_aws_fwcim_checks()
            
            # Тестируем на каждом сайте
            for site in DETECTION_SITES:
                print("\n" + "=" * 70)
                print(f"TESTING: {site['name'].upper()} - {site['description']}")
                print(f"URL: {site['url']}")
                print("=" * 70)
                
                try:
                    self.page.get(site["url"])
                    time.sleep(site["wait_time"])
                    
                    # Скриншот
                    screenshot_path = self._take_screenshot(site["name"])
                    
                    # Специфичные тесты для каждого сайта
                    if site["name"] == "sannysoft":
                        site_result = self._test_sannysoft()
                    elif site["name"] == "creepjs":
                        site_result = self._test_creepjs()
                    elif site["name"] == "browserleaks":
                        site_result = self._test_browserleaks()
                    else:
                        site_result = {}
                    
                    site_result["screenshot"] = screenshot_path
                    self.results["sites"][site["name"]] = site_result
                    
                except Exception as e:
                    print(f"   ❌ Error testing {site['name']}: {e}")
                    self.results["sites"][site["name"]] = {"error": str(e)}
            
            # Подсчёт итогов
            self._calculate_summary()
            
        finally:
            # Закрываем браузер
            if self.page:
                print("\n[BROWSER] Closing...")
                try:
                    self.page.quit()
                except:
                    pass
        
        # Сохраняем отчёт
        self._save_report()
        
        # Выводим итоги
        self._print_summary()
    
    def _calculate_summary(self):
        """Подсчитывает итоговую статистику"""
        summary = self.results["summary"]
        
        # Проверяем automation checks
        auto_checks = self.results.get("automation_checks", {})
        
        # webdriver должен быть undefined/None/False
        webdriver = auto_checks.get("navigator.webdriver")
        if webdriver in [None, False]:
            summary["passed"] += 1
        else:
            summary["failed"] += 1
        
        # 'webdriver' in navigator должен быть False
        webdriver_in = auto_checks.get("'webdriver' in navigator")
        if webdriver_in == False:
            summary["passed"] += 1
        else:
            summary["failed"] += 1
        
        # Проверяем automation traces
        traces = [
            "window.__webdriver_evaluate",
            "window.__selenium_evaluate",
            "window._phantom",
            "window.domAutomation",
            "document.$cdc_asdjflasutopfhvcZLmcfl_",
        ]
        for trace in traces:
            value = auto_checks.get(trace)
            if value == "undefined":
                summary["passed"] += 1
            elif value and "Error" not in str(value):
                summary["failed"] += 1
        
        # Проверяем sannysoft результаты
        sannysoft = self.results.get("sites", {}).get("sannysoft", {})
        summary["passed"] += sannysoft.get("passed", 0)
        summary["failed"] += sannysoft.get("failed", 0)
    
    def _save_report(self):
        """Сохраняет JSON отчёт"""
        report_path = self.report_dir / f"detection_report_{self.timestamp}.json"
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"\n[REPORT] Saved: {report_path}")
        
        # Также сохраняем в корень debug_sessions для быстрого доступа
        latest_path = DEBUG_SESSIONS_DIR / f"detection_report_{self.timestamp}.json"
        with open(latest_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False, default=str)
    
    def _print_summary(self):
        """Выводит итоговый отчёт"""
        summary = self.results["summary"]
        
        print("\n" + "=" * 70)
        print("📊 DETECTION DIAGNOSTICS SUMMARY")
        print("=" * 70)
        
        print(f"\n✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        print(f"⚠️ Warnings: {summary['warnings']}")
        
        # Ключевые проблемы
        print("\n🔴 CRITICAL ISSUES:")
        issues = []
        
        auto_checks = self.results.get("automation_checks", {})
        fwcim_checks = self.results.get("fwcim_checks", {})
        
        if auto_checks.get("navigator.webdriver") not in [None, False]:
            issues.append("navigator.webdriver is detected!")
        
        if auto_checks.get("'webdriver' in navigator") != False:
            issues.append("'webdriver' in navigator returns true!")
        
        # CDP traces
        if auto_checks.get("document.$cdc_asdjflasutopfhvcZLmcfl_") != "undefined":
            issues.append("CDP trace $cdc_ detected!")
        
        # FWCIM specific issues
        if fwcim_checks.get("PluginArray.prototype") == "Object":
            issues.append("PluginArray.prototype returns 'Object' instead of 'PluginArray' - DETECTABLE!")
        
        if fwcim_checks.get("Plugin.prototype") == "Object":
            issues.append("Plugin.prototype returns 'Object' instead of 'Plugin' - DETECTABLE!")
        
        if fwcim_checks.get("MimeTypeArray.prototype") == "Object":
            issues.append("MimeTypeArray.prototype returns 'Object' instead of 'MimeTypeArray' - DETECTABLE!")
        
        if fwcim_checks.get("Notification.permission") == "denied":
            issues.append("Notification.permission is 'denied' - suspicious for automation!")
        
        if not issues:
            print("   None found! ✅")
        else:
            for issue in issues:
                print(f"   - {issue}")
        
        # Sannysoft failures
        sannysoft = self.results.get("sites", {}).get("sannysoft", {})
        sannysoft_failures = []
        for test_name, test_data in sannysoft.get("tests", {}).items():
            if isinstance(test_data, dict) and not test_data.get("passed"):
                # Фильтруем только важные тесты
                if any(x in test_name.lower() for x in ["webdriver", "plugin", "permission", "headchr", "phantom", "selenium"]):
                    sannysoft_failures.append(f"{test_name}: {test_data.get('value', 'N/A')}")
        
        if sannysoft_failures:
            print("\n🟡 SANNYSOFT FAILURES (important):")
            for failure in sannysoft_failures[:10]:
                print(f"   - {failure}")
        
        # Рекомендации
        print("\n💡 RECOMMENDATIONS:")
        recommendations = []
        
        if auto_checks.get("navigator.webdriver") not in [None, False]:
            recommendations.append("Check webdriver Proxy implementation in cdp_spoofer.py")
            recommendations.append("Ensure Page.addScriptToEvaluateOnNewDocument runs before page load")
        
        if auto_checks.get("'webdriver' in navigator") != False:
            recommendations.append("Navigator Proxy 'has' trap may not be working")
            recommendations.append("Check if CDP injection happens early enough")
        
        if fwcim_checks.get("PluginArray.prototype") == "Object":
            recommendations.append("Fix PluginArray prototype - need to spoof constructor.name")
            recommendations.append("Add: Object.defineProperty(PluginArray.prototype, Symbol.toStringTag, {value: 'PluginArray'})")
        
        if fwcim_checks.get("Notification.permission") == "denied":
            recommendations.append("Consider spoofing Notification.permission to 'prompt' or 'default'")
        
        if not recommendations:
            print("   All checks passed! Your spoofing is working well.")
        else:
            for rec in recommendations:
                print(f"   - {rec}")
        
        print(f"\n📁 Full report: {self.report_dir}")
        print("=" * 70)


def main():
    """Точка входа"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Browser Detection Diagnostics")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    args = parser.parse_args()
    
    diagnostics = DetectionDiagnostics(headless=args.headless)
    diagnostics.run_diagnostics()


if __name__ == "__main__":
    main()
