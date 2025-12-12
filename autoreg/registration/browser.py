"""
Браузерная автоматизация для регистрации AWS Builder ID
С интегрированным обходом fingerprinting (Canvas, WebGL)
"""

import time
import random
from typing import Optional, Callable
from DrissionPage import ChromiumPage, ChromiumOptions

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import get_config
from core.paths import get_paths
from .fingerprint_spoof import FingerprintSpoofer

# Селекторы на основе анализа Playwright (декабрь 2025)
# AWS использует data-testid для стабильных селекторов
SELECTORS = {
    'cookie_reject': [
        'text=Decline',  # Английский - новый UI
        'text=Отклонить',  # Русский
        'text=Reject',
        'xpath://button[contains(text(), "Decline")]',
        'xpath://button[contains(text(), "Reject")]',
    ],
    'email_input': [
        '@placeholder=username@example.com',
        'aria:Email',
        '@type=email',
        '@data-testid=test-input',
    ],
    'continue_btn': [
        '@data-testid=test-primary-button',  # Основная кнопка Continue
        '@data-testid=signup-next-button',   # Continue на странице имени
        '@data-testid=email-verification-verify-button',  # Continue на странице кода
        'text=Continue',
    ],
    'name_input': [
        '@placeholder=Maria José Silva',  # Актуальный placeholder
        'aria:Name',
        '@data-testid=name-input',
    ],
    'code_input': [
        '@placeholder=6-digit',  # Актуальный placeholder
        'aria:Verification code',
    ],
    'password_input': [
        '@placeholder=Enter password',  # Актуальный placeholder
        'aria:Password',
    ],
    'confirm_password': [
        '@placeholder=Re-enter password',  # Актуальный placeholder
        'aria:Confirm password',
    ],
    'allow_access': [
        'text=Allow access',
        '@data-testid=allow-access-button',
    ],
}

# Контексты страниц - заголовки для определения текущего шага
PAGE_CONTEXTS = {
    'email': ['Get started', 'Sign in'],
    'name': ['Enter your name'],
    'verification': ['Verify your email'],
    'password': ['Create your password'],
    'allow_access': ['Allow access', 'Authorization'],
}

BROWSER_ARGS = [
    # '--disable-blink-features=AutomationControlled',  # AWS детектит этот флаг!
    '--disable-dev-shm-usage',
]

PASSWORD_LENGTH = 16
PASSWORD_CHARS = {
    'upper': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'lower': 'abcdefghijklmnopqrstuvwxyz',
    'digits': '0123456789',
    'special': '!@#$%^&*',  # Расширен набор спецсимволов
}

# Таймауты по умолчанию
DEFAULT_TIMEOUTS = {
    'page_load': 10,
    'element_wait': 3,
    'page_transition': 5,
}

def load_settings():
    return get_config().to_dict()

def get_setting(path, default=None):
    return get_config().get(path, default)

BASE_DIR = get_paths().autoreg_dir


class BrowserAutomation:
    """Автоматизация браузера для регистрации с обходом fingerprinting"""
    
    def __init__(self, headless: bool = None, spoof_fingerprint: bool = False):
        """
        Args:
            headless: Запуск без GUI (по умолчанию из настроек)
            spoof_fingerprint: Включить обход fingerprinting (по умолчанию True)
        """
        settings = load_settings()
        browser_settings = settings.get('browser', {})
        
        # headless можно переопределить параметром
        if headless is None:
            headless = browser_settings.get('headless', False)
        
        self.settings = settings
        self.headless = headless
        self.verbose = settings.get('debug', {}).get('verbose', False)
        self.screenshots_on_error = browser_settings.get('screenshots_on_error', True)
        self.spoof_fingerprint = spoof_fingerprint
        
        # Настройка браузера
        co = ChromiumOptions()
        
        if headless:
            co.headless()
        
        # Реалистичный user-agent
        co.set_user_agent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        
        # Размер окна
        co.set_argument('--window-size=1280,900')
        
        if browser_settings.get('incognito', True):
            co.set_argument('--incognito')
        
        if browser_settings.get('devtools', False):
            co.set_argument('--auto-open-devtools-for-tabs')
        
        for arg in BROWSER_ARGS:
            co.set_argument(arg)
        
        self.page = ChromiumPage(co)
        self.fingerprint_spoofer = None
        self._cookie_closed = False  # Флаг чтобы не закрывать cookie много раз
        self._network_logs = []  # Логи сетевых запросов
        
        # ВАЖНО: Очищаем cookies и storage для чистой сессии
        try:
            # Очищаем cookies для всех AWS доменов
            self.page.run_cdp('Network.clearBrowserCookies')
            self.page.run_cdp('Network.clearBrowserCache')
            
            # Очищаем storage для AWS доменов
            aws_origins = [
                'https://profile.aws.amazon.com',
                'https://signin.aws.amazon.com',
                'https://us-east-1.signin.aws',
                'https://oidc.us-east-1.amazonaws.com',
                'https://view.awsapps.com',
            ]
            for origin in aws_origins:
                try:
                    self.page.run_cdp('Storage.clearDataForOrigin', origin=origin, storageTypes='all')
                except:
                    pass
            
            print("   🧹 Cleared browser cookies, cache and storage")
        except Exception as e:
            print(f"   ⚠️ Failed to clear cookies: {e}")
        
        # Включаем перехват сетевых запросов
        self._setup_network_logging()
        
        # Инъекция fingerprint spoofing
        if spoof_fingerprint:
            self._init_fingerprint_spoof()
        
        self._log("Browser initialized", f"headless={headless}, spoof={spoof_fingerprint}")
    
    def _setup_network_logging(self):
        """Настройка перехвата сетевых запросов через CDP"""
        try:
            # Включаем Network domain
            self.page.run_cdp('Network.enable')
            
            # Слушаем события запросов
            def on_request(params):
                url = params.get('request', {}).get('url', '')
                if 'send-otp' in url or 'api/' in url:
                    self._network_logs.append({
                        'type': 'request',
                        'url': url,
                        'method': params.get('request', {}).get('method'),
                        'headers': params.get('request', {}).get('headers'),
                        'postData': params.get('request', {}).get('postData'),
                        'requestId': params.get('requestId'),
                    })
                    print(f"   🌐 API Request: {params.get('request', {}).get('method')} {url}")
            
            def on_response(params):
                url = params.get('response', {}).get('url', '')
                if 'send-otp' in url or 'api/' in url:
                    status = params.get('response', {}).get('status')
                    self._network_logs.append({
                        'type': 'response',
                        'url': url,
                        'status': status,
                        'headers': params.get('response', {}).get('headers'),
                        'requestId': params.get('requestId'),
                    })
                    print(f"   🌐 API Response: {status} {url}")
            
            # DrissionPage не поддерживает CDP events напрямую, используем альтернативу
            print("   📡 Network logging enabled (will capture via Performance API)")
            
        except Exception as e:
            print(f"   ⚠️ Network logging setup failed: {e}")
    
    def save_network_logs(self, filename: str = "network_logs.json"):
        """Сохраняет логи сетевых запросов в файл"""
        import json
        filepath = BASE_DIR / filename
        
        # Получаем логи через Performance API
        try:
            perf_logs = self.page.run_js('''
                return performance.getEntriesByType('resource')
                    .filter(e => e.name.includes('api/') || e.name.includes('send-otp'))
                    .map(e => ({
                        url: e.name,
                        duration: e.duration,
                        startTime: e.startTime,
                        transferSize: e.transferSize,
                        type: e.initiatorType
                    }));
            ''')
            self._network_logs.extend(perf_logs or [])
        except:
            pass
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(self._network_logs, f, indent=2, ensure_ascii=False)
        
        print(f"   📁 Network logs saved: {filepath}")
        return filepath
    
    def _init_fingerprint_spoof(self):
        """Инициализация и инъекция fingerprint spoofing"""
        try:
            # Создаём spoofer со случайной конфигурацией для каждой сессии
            self.fingerprint_spoofer = FingerprintSpoofer(self.page)
            self.fingerprint_spoofer.inject()
            
            if self.verbose:
                config = self.fingerprint_spoofer.get_config()
                self._log("Fingerprint spoof config", 
                         f"WebGL: {config['gpu_vendor'][:20]}... / {config['gpu_renderer'][:30]}...")
        except Exception as e:
            print(f"⚠️ Fingerprint spoof init failed: {e}")
            self.fingerprint_spoofer = None
    
    def _log(self, message: str, detail: str = ""):
        """Логирование с учётом verbose режима"""
        if self.verbose or not detail:
            print(f"🔧 {message}" + (f" ({detail})" if detail else ""))
    
    def _find_element(self, selectors: list, timeout: int = None):
        """Ищет элемент по списку селекторов"""
        timeout = timeout or self.settings.get('timeouts', {}).get('element_wait', 3)
        
        for selector in selectors:
            try:
                elem = self.page.ele(selector, timeout=timeout)
                if elem:
                    return elem
            except Exception:
                pass
        return None
    
    def _click_if_exists(self, selectors: list, timeout: int = 1) -> bool:
        """Кликает по элементу если он существует"""
        elem = self._find_element(selectors, timeout)
        if elem:
            self.human_click(elem)
            return True
        return False
    
    def wait_for_page_context(self, context_key: str, timeout: int = None) -> bool:
        """
        Ждёт появления контекста страницы (заголовка).
        Это гарантирует что мы на правильной странице перед поиском элементов.
        
        Args:
            context_key: Ключ из PAGE_CONTEXTS ('email', 'name', 'verification', 'password')
            timeout: Таймаут в секундах
        
        Returns:
            True если контекст найден
        """
        timeout = timeout or DEFAULT_TIMEOUTS['page_transition']
        contexts = PAGE_CONTEXTS.get(context_key, [])
        
        if not contexts:
            return True  # Нет контекста для проверки
        
        print(f"   ⏳ Waiting for page: {context_key}...")
        
        for _ in range(timeout * 2):
            for ctx in contexts:
                try:
                    if self.page.ele(f'text={ctx}', timeout=0.3):
                        print(f"   ✓ Page context found: '{ctx}'")
                        time.sleep(0.3)  # Даём React отрендерить остальные элементы
                        return True
                except:
                    pass
            time.sleep(0.5)
        
        print(f"   ⚠️ Page context not found: {context_key}")
        return False
    
    def wait_for_url_change(self, old_url: str, timeout: int = None) -> bool:
        """
        Ждёт изменения URL после действия.
        
        Args:
            old_url: Предыдущий URL
            timeout: Таймаут в секундах
        
        Returns:
            True если URL изменился
        """
        timeout = timeout or DEFAULT_TIMEOUTS['page_transition']
        
        for _ in range(timeout * 2):
            if self.page.url != old_url:
                time.sleep(0.5)  # Даём странице загрузиться
                return True
            time.sleep(0.5)
        
        return False
    
    # ========================================================================
    # HUMAN-LIKE INPUT (Обход поведенческого анализа AWS FWCIM)
    # ========================================================================
    
    def human_type(self, element, text: str, click_first: bool = True, fast: bool = False):
        """
        Вводит текст используя execCommand для совместимости с Cloudscape/React.
        
        Args:
            element: Элемент для ввода
            text: Текст для ввода
            click_first: Кликнуть на элемент перед вводом
            fast: Быстрый режим (не используется, оставлен для совместимости)
        """
        if click_first:
            element.click()
            time.sleep(random.uniform(0.05, 0.15))
        
        # Очищаем поле и вводим текст
        self.page.run_js('''
            const input = arguments[0];
            const text = arguments[1];
            
            // Фокусируемся
            input.focus();
            
            // Очищаем поле полностью
            input.value = '';
            
            // Выделяем всё (на случай если value = '' не сработало)
            input.select();
            
            // Вставляем текст через execCommand
            document.execCommand('insertText', false, text);
        ''', element, text)
        
        time.sleep(0.1)
    
    def human_click(self, element):
        """
        Кликает по элементу с предварительным движением мыши.
        AWS FWCIM модуль 61 анализирует mouseClickPositions и mouseCycles.
        
        Args:
            element: Элемент для клика
        """
        try:
            # Получаем координаты элемента
            rect = element.rect
            
            # Добавляем небольшой случайный сдвиг от центра
            offset_x = random.randint(-5, 5)
            offset_y = random.randint(-3, 3)
            
            # Используем actions для более реалистичного клика
            # DrissionPage >= 4.0 поддерживает duration для плавного движения
            try:
                self.page.actions.move_to(element, duration=random.uniform(0.3, 0.7))
                time.sleep(random.uniform(0.05, 0.15))
                self.page.actions.click()
            except:
                # Fallback на обычный клик
                element.click()
            
            time.sleep(random.uniform(0.1, 0.3))
            
        except Exception as e:
            # Fallback на обычный клик
            element.click()
            time.sleep(random.uniform(0.1, 0.2))
    
    @staticmethod
    def generate_password(length: int = PASSWORD_LENGTH) -> str:
        """
        Генерация криптографически безопасного пароля.
        Использует secrets для избежания предсказуемости.
        AWS проверяет пароли на утечки - нужна высокая энтропия.
        """
        import secrets
        
        chars = ''.join(PASSWORD_CHARS.values())
        
        # Гарантируем наличие всех типов символов
        password = [
            secrets.choice(PASSWORD_CHARS['upper']),
            secrets.choice(PASSWORD_CHARS['lower']),
            secrets.choice(PASSWORD_CHARS['digits']),
            secrets.choice(PASSWORD_CHARS['special']),
        ]
        
        # Добавляем случайные символы
        password += [secrets.choice(chars) for _ in range(length - 4)]
        
        # Перемешиваем (secrets.SystemRandom для криптографической случайности)
        secrets.SystemRandom().shuffle(password)
        
        return ''.join(password)
    
    def close_cookie_dialog(self, force: bool = False):
        """Закрывает диалог cookie если он появился"""
        if self._cookie_closed and not force:
            return False
            
        self._log("Checking for cookie dialog...")
        
        # Расширенный список селекторов для cookie диалога (RU + EN)
        cookie_selectors = [
            # AWS specific - наиболее надёжные
            '#awsccc-cb-btn-decline',
            '@data-id=awsccc-cb-btn-decline',
            # Русский интерфейс
            'text=Отклонить',
            # Английский интерфейс
            'text=Decline', 
        ]
        
        for selector in cookie_selectors:
            try:
                btn = self.page.ele(selector, timeout=0.5)
                if btn:
                    print(f"   🍪 Found cookie button: {selector}")
                    
                    # Пробуем кликнуть разными способами
                    try:
                        # Способ 1: Обычный клик DrissionPage
                        btn.click()
                        print(f"   🍪 Cookie dialog closed (click)")
                        time.sleep(0.5)
                        self._cookie_closed = True
                        return True
                    except Exception as e1:
                        print(f"   ⚠️ Click failed: {e1}")
                        try:
                            # Способ 2: JS клик
                            self.page.run_js('arguments[0].click()', btn)
                            print(f"   🍪 Cookie dialog closed (JS)")
                            time.sleep(0.5)
                            self._cookie_closed = True
                            return True
                        except Exception as e2:
                            print(f"   ⚠️ JS click failed: {e2}")
                            try:
                                # Способ 3: Клик через actions
                                self.page.actions.click(btn)
                                print(f"   🍪 Cookie dialog closed (actions)")
                                time.sleep(0.5)
                                self._cookie_closed = True
                                return True
                            except Exception as e3:
                                print(f"   ⚠️ Actions click failed: {e3}")
                    
            except Exception:
                pass
        
        return False
    
    def enter_device_code(self, user_code: str, email: str = None, password: str = None) -> bool:
        """
        Вводит код устройства на странице Device Authorization.
        Страница: view.awsapps.com/start/#/device
        
        Если показывается форма логина (после регистрации), сначала логинится.
        
        Args:
            user_code: Код устройства (например SQHH-RXJR)
            email: Email для логина (если нужен)
            password: Пароль для логина (если нужен)
        """
        print(f"🔑 Entering device code: {user_code}")
        
        # Ждём загрузки страницы device authorization
        print("   ⏳ Waiting for device authorization page...")
        for _ in range(15):
            try:
                # Проверяем что мы на странице device
                if self.page.ele('text=Authorization requested', timeout=0.5):
                    print("   ✓ Device authorization page loaded")
                    break
                if self.page.ele('text=Enter the code', timeout=0.5):
                    print("   ✓ Device authorization page loaded")
                    break
                # Форма логина на странице device
                if self.page.ele('text=Sign in', timeout=0.5):
                    print("   ✓ Login form on device page")
                    break
            except:
                pass
            time.sleep(0.5)
        
        # Закрываем cookie если есть
        self.close_cookie_dialog(force=True)
        time.sleep(1)
        
        # Проверяем - это форма логина или форма device code?
        # Если есть password поле но нет текстового поля - это логин
        all_inputs = self.page.eles('tag:input')
        has_password_field = any((inp.attr('type') or '').lower() == 'password' for inp in all_inputs)
        has_text_field = any((inp.attr('type') or '').lower() in ('', 'text') 
                            and (inp.attr('type') or '').lower() not in ('checkbox', 'hidden', 'submit', 'button')
                            for inp in all_inputs)
        
        # Если есть password но нет text - это форма логина
        if has_password_field and not has_text_field and password:
            print("   🔐 Login form detected, logging in first...")
            if not self._login_on_device_page(email, password):
                print("   ⚠️ Login failed")
                return False
            time.sleep(2)
            # После логина перезагружаем inputs
            all_inputs = self.page.eles('tag:input')
        
        # Ждём появления поля ввода кода
        # На странице device authorization поле может быть без type или с type=""
        code_input = None
        
        for attempt in range(15):
            try:
                # Способ 1: Ищем все input'ы и фильтруем
                all_inputs = self.page.eles('tag:input')
                print(f"   🔍 Found {len(all_inputs)} inputs on attempt {attempt + 1}")
                
                for inp in all_inputs:
                    inp_type = (inp.attr('type') or '').lower()
                    inp_id = inp.attr('id') or ''
                    inp_name = inp.attr('name') or ''
                    inp_aria = inp.attr('aria-label') or ''
                    
                    print(f"      Input: type='{inp_type}', id='{inp_id}', name='{inp_name}', aria='{inp_aria}'")
                    
                    # Пропускаем password, checkbox, hidden
                    if inp_type in ('password', 'checkbox', 'hidden', 'submit', 'button'):
                        continue
                    
                    # Это наше поле!
                    code_input = inp
                    print(f"   ✓ Found code input field")
                    break
                
                if code_input:
                    break
                    
            except Exception as e:
                print(f"   ⚠️ Error searching inputs: {e}")
            
            time.sleep(0.5)
        
        if not code_input:
            print("   ⚠️ Device code input not found")
            self._debug_inputs()
            self.screenshot("error_device_code")
            return False
        
        # Вводим код
        code_input.clear()
        self.human_type(code_input, user_code)
        time.sleep(0.5)
        
        # Кликаем Confirm and continue
        confirm_btn = self._find_element([
            'text=Confirm and continue',
            'xpath://button[contains(text(), "Confirm")]',
            '@data-testid=confirm-button',
        ], timeout=3)
        
        if confirm_btn:
            print("   ➡️ Clicking Confirm and continue...")
            self.human_click(confirm_btn)
            time.sleep(2)
            return True
        
        print("   ⚠️ Confirm button not found")
        return False
    
    def _login_on_device_page(self, email: str, password: str) -> bool:
        """
        Логинится на странице device (когда показывается форма логина после регистрации).
        AWS показывает только поле пароля, т.к. email уже известен.
        """
        print(f"   🔐 Logging in on device page...")
        
        # ВАЖНО: Сначала закрываем cookie диалог - он перекрывает кнопки!
        self.close_cookie_dialog(force=True)
        time.sleep(0.5)
        
        # Ищем поле пароля
        pwd_field = None
        for selector in ['tag:input@@type=password', 'input[type="password"]']:
            try:
                pwd_field = self.page.ele(selector, timeout=2)
                if pwd_field:
                    break
            except:
                pass
        
        if not pwd_field:
            print("   ⚠️ Password field not found on device page")
            return False
        
        # Вводим пароль
        print(f"   Entering password...")
        pwd_field.click()
        time.sleep(0.2)
        self.page.run_js('arguments[0].focus()', pwd_field)
        time.sleep(0.1)
        
        # Вводим через CDP
        for char in password:
            self.page.run_cdp('Input.insertText', text=char)
            time.sleep(random.uniform(0.03, 0.08))
        
        time.sleep(0.5)
        
        # Ещё раз закрываем cookie если появился снова
        self.close_cookie_dialog(force=True)
        time.sleep(0.3)
        
        # Debug: показываем все кнопки на странице
        try:
            buttons = self.page.eles('tag:button')
            print(f"   🔍 Found {len(buttons)} buttons:")
            for i, btn in enumerate(buttons[:5]):
                btn_text = btn.text or ''
                btn_type = btn.attr('type') or ''
                btn_testid = btn.attr('data-testid') or ''
                print(f"      Button {i}: text='{btn_text[:30]}', type='{btn_type}', testid='{btn_testid}'")
        except Exception as e:
            print(f"   ⚠️ Error listing buttons: {e}")
        
        # Кликаем Sign in / Continue - расширенный список селекторов
        sign_in_btn = self._find_element([
            'text=Sign in',
            'text=Continue',
            'text=Submit',
            'text=Next',
            'xpath://button[contains(text(), "Sign in")]',
            'xpath://button[contains(text(), "Continue")]',
            'xpath://button[contains(text(), "Submit")]',
            'xpath://button[@type="submit"]',
            '@data-testid=test-primary-button',
            '@data-testid=signin-button',
            '@data-testid=submit-button',
            'tag:button@@type=submit',
        ], timeout=3)
        
        if sign_in_btn:
            print(f"   ➡️ Clicking Sign in button...")
            self.human_click(sign_in_btn)
            time.sleep(3)
            print("   ✓ Logged in")
            return True
        
        # Fallback: кликаем первую кнопку submit
        try:
            submit_btn = self.page.ele('tag:button@@type=submit', timeout=2)
            if submit_btn:
                print(f"   ➡️ Clicking submit button (fallback)...")
                self.human_click(submit_btn)
                time.sleep(3)
                print("   ✓ Logged in (fallback)")
                return True
        except:
            pass
        
        print("   ⚠️ Sign in button not found")
        self.screenshot("error_login_no_button")
        return False
    
    def enter_email(self, email: str) -> bool:
        """Вводит email"""
        print(f"📧 Entering email: {email}")
        
        # СНАЧАЛА закрываем cookie диалог - он может перекрывать всё
        self.close_cookie_dialog(force=True)
        time.sleep(0.5)
        
        # Ждём появления страницы email (Get started / Sign in)
        if not self.wait_for_page_context('email', timeout=5):
            # Возможно cookie диалог ещё раз появился
            self.close_cookie_dialog(force=True)
            time.sleep(0.5)
        
        selectors = [
            '@placeholder=username@example.com',
            'aria:Email',
            '@type=email',
            '@name=email',
            'tag:input@@type=text',
            'xpath://input[@type="text"]',
            'xpath://input[contains(@placeholder, "example.com")]',
            'xpath://input[@data-testid="test-input"]',
        ]
        
        email_input = None
        for selector in selectors:
            try:
                email_input = self.page.ele(selector, timeout=1)
                if email_input:
                    self._log(f"Found email field", selector)
                    break
            except Exception:
                pass
        
        if not email_input:
            self._debug_inputs()
            self.screenshot("error_no_email")
            raise Exception("Email field not found")
        
        email_input.clear()
        # Используем человеческий ввод для обхода поведенческого анализа
        self.human_type(email_input, email)
        return True
    
    def _debug_inputs(self):
        """Выводит отладочную информацию о input элементах"""
        print("   🔍 Debug: searching for input elements...")
        try:
            inputs = self.page.eles('tag:input')
            for i, inp in enumerate(inputs[:5]):
                print(f"      Input {i}: type={inp.attr('type')}, placeholder={inp.attr('placeholder')}")
        except Exception as e:
            print(f"      Error: {e}")
    
    def click_continue(self) -> bool:
        """Нажимает кнопку Continue после email и ждёт страницу имени"""
        print("➡️ Clicking Continue...")
        
        # Закрываем cookie если ещё не закрыли
        self.close_cookie_dialog()
        
        # Пробуем кликнуть Continue
        clicked = False
        for attempt in range(3):
            if self._click_if_exists(SELECTORS['continue_btn'], timeout=2):
                clicked = True
                break
            time.sleep(0.3)
        
        if not clicked:
            raise Exception("Continue button not found")
        
        # КРИТИЧНО: Ждём появления страницы ввода имени (до 15 секунд)
        print("   ⏳ Waiting for name page (up to 15s)...")
        name_page_found = False
        for i in range(30):  # 30 * 0.5 = 15 секунд
            time.sleep(0.5)
            try:
                if self.page.ele('text=Enter your name', timeout=0.3):
                    print(f"   ✓ Name page loaded (after {(i+1)*0.5:.1f}s)")
                    name_page_found = True
                    break
                # Альтернативный вариант - поле имени
                if self.page.ele('@placeholder=Maria José Silva', timeout=0.2):
                    print(f"   ✓ Name page loaded (after {(i+1)*0.5:.1f}s)")
                    name_page_found = True
                    break
            except:
                pass
        
        if not name_page_found:
            print("   ❌ FAILED: Name page did not load!")
            self.screenshot("error_no_name_page")
            raise Exception("Name page did not load after email")
        
        return True
    
    def enter_name(self, name: str) -> bool:
        """Вводит имя"""
        print(f"📝 Entering name: {name}")
        
        # Ждём появления страницы ввода имени
        if not self.wait_for_page_context('name', timeout=10):
            print("   ⚠️ Name page context not found, trying anyway...")
        
        # Закрываем cookie диалог ПЕРЕД вводом (он перекрывает кнопку Continue)
        self.close_cookie_dialog(force=True)
        time.sleep(0.3)
        
        # Проверяем на ошибку AWS и закрываем модалку
        if self._check_aws_error():
            print("   ⚠️ AWS error detected, closing modal...")
            self._close_error_modal()
            time.sleep(1)
        
        # Расширенный список селекторов для поля имени
        name_selectors = [
            '@placeholder=Maria José Silva',
            '@placeholder=Your name',
            '@placeholder=Full name',
            '@placeholder=Name',
            'aria:Name',
            'aria:Your name',
            '@name=name',
            '@id=name',
            '@data-testid=name-input',
            'xpath://input[contains(@placeholder, "name")]',
            'xpath://input[contains(@placeholder, "Name")]',
            'xpath://input[@type="text"]',
        ]
        
        name_input = None
        for selector in name_selectors:
            try:
                elem = self.page.ele(selector, timeout=2)
                if elem:
                    name_input = elem
                    print(f"   Found name field: {selector}")
                    break
            except:
                pass
        
        if not name_input:
            # Fallback - ищем первый текстовый input
            print("   ⚠️ Name field not found by selectors, trying fallback...")
            try:
                inputs = self.page.eles('tag:input@@type=text')
                if inputs:
                    name_input = inputs[0]
                    print(f"   Found fallback input")
            except:
                pass
        
        if not name_input:
            print("   ❌ Name field not found!")
            self._debug_inputs()
            return False
        
        # Ввод имени через полную симуляцию клавиатуры
        print(f"   Typing name...")
        name_input.clear()
        time.sleep(0.2)
        
        # Кликаем и фокусируемся
        name_input.click()
        time.sleep(0.1)
        self.page.run_js('arguments[0].focus()', name_input)
        time.sleep(0.1)
        
        # Вводим через human_type
        self.human_type(name_input, name, click_first=False)
        
        # ВАЖНО: даём React обработать события
        time.sleep(0.5)
        
        # Проверяем что ввелось
        val = name_input.attr('value') or ''
        print(f"   Name field value: '{val}'")
        
        # Очищаем поле и вводим заново через select + execCommand
        # Это более надёжный способ для React/Cloudscape
        self.page.run_js('''
            const input = arguments[0];
            const name = arguments[1];
            
            // Фокусируемся
            input.focus();
            
            // Выделяем всё содержимое
            input.select();
            
            // Удаляем выделенное и вставляем новый текст через execCommand
            // execCommand триггерит все нужные события автоматически
            document.execCommand('insertText', false, name);
            
            console.log('Used execCommand, input.value =', input.value);
        ''', name_input, name)
        
        time.sleep(0.5)
        
        # Финальная проверка значения
        final_val = name_input.attr('value') or ''
        print(f"   Final name value: '{final_val}'")
        
        # Blur для финализации
        self.page.run_js('arguments[0].dispatchEvent(new Event("blur", { bubbles: true }))', name_input)
        time.sleep(0.3)
        
        # Пауза перед Continue
        print("   ⏳ Waiting before Continue (1.5s)...")
        time.sleep(1.5)
        
        # Кликаем Continue - используем несколько методов
        print("   ➡️ Clicking Continue after name...")
        
        # Ищем кнопку Continue
        continue_btn = None
        btn_selectors = [
            '@data-testid=signup-next-button',
            'text=Continue',
            'xpath://button[contains(text(), "Continue")]',
            'tag:button@@type=submit',
        ]
        
        for selector in btn_selectors:
            try:
                btn = self.page.ele(selector, timeout=1)
                if btn:
                    continue_btn = btn
                    print(f"   Found button: {selector}")
                    break
            except:
                pass
        
        if continue_btn:
            # Пробуем несколько способов клика
            try:
                # Способ 1: JS click (самый надёжный)
                self.page.run_js('arguments[0].click()', continue_btn)
                print("   ✓ Clicked via JS")
            except Exception as e1:
                print(f"   ⚠️ JS click failed: {e1}")
                try:
                    # Способ 2: human_click
                    self.human_click(continue_btn)
                    print("   ✓ Clicked via human_click")
                except Exception as e2:
                    print(f"   ⚠️ human_click failed: {e2}")
                    try:
                        # Способ 3: direct click
                        continue_btn.click()
                        print("   ✓ Clicked directly")
                    except Exception as e3:
                        print(f"   ⚠️ All click methods failed")
        else:
            print("   ⚠️ Continue button not found!")
        
        # КРИТИЧНО: Ждём появления страницы верификации (до 20 секунд)
        print("   ⏳ Waiting for verification page (up to 20s)...")
        verification_found = False
        retry_count = 0
        max_retries = 3
        
        for i in range(40):  # 40 * 0.5 = 20 секунд
            time.sleep(0.5)
            
            # Проверяем на ошибку AWS и закрываем модалку
            if self._check_aws_error():
                print(f"   ⚠️ AWS error detected on iteration {i+1}...")
                
                # Закрываем модалку
                modal_closed = self._close_error_modal()
                time.sleep(0.5)
                
                # Retry - заново вводим имя и кликаем Continue
                if retry_count < max_retries:
                    retry_count += 1
                    print(f"   🔄 Retry {retry_count}/{max_retries}: re-entering name and clicking Continue...")
                    
                    # Находим поле имени заново
                    name_input = self._find_element([
                        '@placeholder=Maria José Silva',
                        'xpath://input[@type="text"]',
                    ], timeout=2)
                    
                    if name_input:
                        # Проверяем текущее значение
                        current_val = name_input.attr('value') or ''
                        print(f"   Current name value: '{current_val}'")
                        
                        # Вводим заново через React-compatible метод
                        name_input.click()
                        time.sleep(0.1)
                        self.page.run_js('arguments[0].focus()', name_input)
                        time.sleep(0.1)
                        
                        # Используем execCommand для ввода (работает с Cloudscape/React)
                        self.page.run_js('''
                            const input = arguments[0];
                            const name = arguments[1];
                            input.focus();
                            input.select();
                            document.execCommand('insertText', false, name);
                        ''', name_input, name)
                        time.sleep(0.3)
                    
                    # Кликаем Continue
                    self._click_if_exists(SELECTORS['continue_btn'], timeout=2)
                    continue
            
            try:
                if self.page.ele('text=Verify your email', timeout=0.3):
                    print(f"   ✓ Verification page loaded (after {(i+1)*0.5:.1f}s)")
                    verification_found = True
                    break
                if self.page.ele('text=Verification code', timeout=0.2):
                    print(f"   ✓ Verification page loaded (after {(i+1)*0.5:.1f}s)")
                    verification_found = True
                    break
            except:
                pass
        
        if not verification_found:
            print("   ❌ FAILED: Verification page did not load!")
            self.screenshot("error_no_verification_page")
            raise Exception("Verification page did not load after entering name")
        
        return True
    
    def enter_verification_code(self, code: str) -> bool:
        """Вводит код верификации"""
        print(f"🔐 Entering code: {code}")
        
        # Ждём появления страницы верификации
        if not self.wait_for_page_context('verification', timeout=10):
            print("   ⚠️ Verification page context not found, trying anyway...")
        
        # Закрываем cookie ПРИНУДИТЕЛЬНО перед вводом кода
        self.close_cookie_dialog(force=True)
        time.sleep(0.3)
        
        code_input = self._find_element(SELECTORS['code_input'], timeout=30)
        if not code_input:
            raise Exception("Verification code field not found")
        
        # Очищаем поле перед вводом
        code_input.clear()
        time.sleep(0.1)
        
        # Код вводим через human_type
        self.human_type(code_input, code)
        
        # Важно: подождать чтобы React обработал ввод
        time.sleep(1)
        
        # Проверяем что код введён
        entered_code = code_input.attr('value') or ''
        print(f"   Entered code: '{entered_code}'")
        
        # Ещё раз закрываем cookie перед кликом Continue (может появиться снова)
        self.close_cookie_dialog(force=True)
        time.sleep(0.5)
        
        # Кликаем Continue - пробуем несколько раз разными способами
        print("   🔍 Looking for Continue/Verify button...")
        clicked = False
        
        # Специфичный селектор для страницы верификации
        verify_selectors = [
            '@data-testid=email-verification-verify-button',
            'text=Verify',
            'text=Continue',
            '@data-testid=test-primary-button',
            'xpath://button[contains(text(), "Verify")]',
            'xpath://button[contains(text(), "Continue")]',
        ]
        
        for selector in verify_selectors:
            try:
                btn = self.page.ele(selector, timeout=1)
                if btn:
                    print(f"   ✓ Found button: {selector}")
                    # Пробуем кликнуть разными способами
                    try:
                        # Сначала пробуем human_click (более надёжный)
                        self.human_click(btn)
                        print("   ✓ Clicked via human_click")
                        clicked = True
                        break
                    except Exception as e1:
                        print(f"   ⚠️ human_click failed: {e1}")
                        try:
                            self.page.run_js('arguments[0].click()', btn)
                            print("   ✓ Clicked via JS")
                            clicked = True
                            break
                        except Exception as e2:
                            try:
                                btn.click()
                                print("   ✓ Clicked directly")
                                clicked = True
                                break
                            except Exception as e3:
                                print(f"   ⚠️ All click methods failed")
            except:
                pass
        
        if not clicked:
            print("   ⚠️ Could not find/click Continue button!")
            self._debug_inputs()
        
        # КРИТИЧНО: Ждём появления страницы пароля (до 20 секунд)
        print("   ⏳ Waiting for password page (up to 20s)...")
        password_found = False
        for i in range(40):  # 40 * 0.5 = 20 секунд
            time.sleep(0.5)
            try:
                # Проверяем появление заголовка страницы пароля
                if self.page.ele('text=Create your password', timeout=0.3):
                    print(f"   ✓ Password page loaded (after {(i+1)*0.5:.1f}s)")
                    password_found = True
                    break
                # Альтернативный текст
                if self.page.ele('text=Set your password', timeout=0.2):
                    print(f"   ✓ Password page loaded (after {(i+1)*0.5:.1f}s)")
                    password_found = True
                    break
            except:
                pass
            
            # Логируем прогресс каждые 5 секунд
            if (i + 1) % 10 == 0:
                print(f"   ... still waiting ({(i+1)*0.5:.0f}s), URL: {self.page.url[:50]}...")
        
        if not password_found:
            print("   ❌ FAILED: Password page did not load in 20 seconds!")
            self.screenshot("error_no_password_page")
            raise Exception("Password page did not load after verification code")
        
        return True
    
    def enter_password(self, password: str) -> bool:
        """Вводит и подтверждает пароль"""
        print("🔑 Entering password...")
        
        # ВАЖНО: Ждём появления контекста страницы пароля
        # Это решает проблему когда поля ещё не отрендерились
        if not self.wait_for_page_context('password', timeout=10):
            print("   ⚠️ Password page context not found, trying anyway...")
        
        time.sleep(0.5)  # Даём React отрендерить поля
        
        # Ищем все password поля
        pwd_fields = self.page.eles('tag:input@@type=password', timeout=5)
        print(f"   Found {len(pwd_fields)} password fields")
        
        # Debug: показываем placeholder'ы
        for i, field in enumerate(pwd_fields[:3]):
            ph = field.attr('placeholder') or 'None'
            print(f"   Field {i}: placeholder='{ph}'")
        
        pwd1 = None
        pwd2 = None
        
        # Стратегия 1: по placeholder
        for field in pwd_fields:
            ph = (field.attr('placeholder') or '').lower()
            if 're-enter' in ph or 'confirm' in ph or 'repeat' in ph:
                pwd2 = field
            elif 'password' in ph or 'enter' in ph:
                pwd1 = field
        
        # Стратегия 2: если не нашли по placeholder, берём по порядку
        if not pwd1 and len(pwd_fields) >= 1:
            # Первое поле без "re-enter" - это основной пароль
            for field in pwd_fields:
                ph = (field.attr('placeholder') or '').lower()
                if 're-enter' not in ph and 'confirm' not in ph:
                    pwd1 = field
                    break
            # Если всё ещё не нашли - берём первое
            if not pwd1:
                pwd1 = pwd_fields[0]
        
        if not pwd2 and len(pwd_fields) >= 2:
            pwd2 = pwd_fields[1] if pwd_fields[1] != pwd1 else (pwd_fields[0] if pwd_fields[0] != pwd1 else None)
        
        if not pwd1:
            print("   ⚠️ No password fields found!")
            self._debug_inputs()
            self.screenshot("error_no_password")
            return False
        
        print(f"   pwd1: {pwd1.attr('placeholder')}")
        if pwd2:
            print(f"   pwd2: {pwd2.attr('placeholder')}")
        
        # Если нашли только одно поле - подождём и попробуем ещё раз
        if not pwd2 and len(pwd_fields) == 1:
            print("   ⚠️ Only 1 password field found, waiting for second...")
            time.sleep(2)
            pwd_fields = self.page.eles('tag:input@@type=password', timeout=5)
            if len(pwd_fields) >= 2:
                pwd2 = pwd_fields[1]
                print(f"   ✓ Found second field: {pwd2.attr('placeholder')}")
        
        def input_via_cdp(element, text, field_name):
            """Ввод через CDP - работает с React полями"""
            print(f"   Clicking {field_name}...")
            element.click()
            time.sleep(0.2)
            
            # Фокусируемся через JS
            self.page.run_js('arguments[0].focus()', element)
            time.sleep(0.1)
            
            # Вводим посимвольно через CDP
            print(f"   Typing into {field_name}...")
            for char in text:
                self.page.run_cdp('Input.insertText', text=char)
                time.sleep(random.uniform(0.03, 0.08))
            
            # Проверяем что ввелось
            time.sleep(0.1)
            val = element.attr('value') or ''
            print(f"   {field_name} value length: {len(val)}")
            return len(val) > 0
        
        # Вводим в ПЕРВОЕ поле (Password)
        print(f"   === Field 1: Password ===")
        success1 = False
        try:
            success1 = input_via_cdp(pwd1, password, "Password")
            if success1:
                print(f"   ✓ Field 1 done")
        except Exception as e:
            print(f"   ⚠️ CDP failed: {e}")
        
        if not success1:
            print(f"   Trying fallback for field 1...")
            try:
                pwd1.click()
                time.sleep(0.1)
                pwd1.clear()
                self.human_type(pwd1, password, click_first=False)
                success1 = True
            except Exception as e:
                print(f"   ⚠️ Fallback also failed: {e}")
        
        # Вводим во ВТОРОЕ поле (Re-enter password)
        if pwd2:
            time.sleep(0.3)
            print(f"   === Field 2: Confirm password ===")
            success2 = False
            try:
                success2 = input_via_cdp(pwd2, password, "Confirm")
                if success2:
                    print(f"   ✓ Field 2 done")
            except Exception as e:
                print(f"   ⚠️ CDP failed: {e}")
            
            if not success2:
                print(f"   Trying fallback for field 2...")
                pwd2.click()
                time.sleep(0.1)
                pwd2.clear()
                self.human_type(pwd2, password, click_first=False)
        
        time.sleep(0.3)
        print("➡️ Clicking Continue after password...")
        old_url = self.page.url
        self._click_if_exists(SELECTORS['continue_btn'], timeout=2)
        time.sleep(1)
        
        # Проверяем на ошибку "leaked password"
        if self._check_password_error():
            print("   ⚠️ Password rejected (possibly leaked), generating new one...")
            new_password = self.generate_password(18)  # Длиннее для большей энтропии
            return self.enter_password(new_password)
        
        # Проверяем что страница изменилась (успешный переход)
        if self.page.url == old_url:
            # Возможно нужно подождать
            time.sleep(1)
        
        self._log(f"URL after password", self.page.url[:60])
        
        return True
    
    def _check_password_error(self) -> bool:
        """Проверяет наличие ошибки о слабом/утёкшем пароле"""
        error_texts = [
            'publicly known',
            'leaked',
            'data set',
            'try a different password',
            'password is too weak',
        ]
        
        for text in error_texts:
            try:
                if self.page.ele(f'text={text}', timeout=0.5):
                    return True
            except:
                pass
        
        return False
    
    def has_login_form(self) -> bool:
        """Проверяет есть ли форма логина на странице"""
        try:
            # Ищем поле email или password на странице логина
            selectors = [
                'input[type="email"]',
                'input[placeholder*="email" i]',
                'input[placeholder*="username" i]',
            ]
            for selector in selectors:
                elements = self.page.query_selector_all(selector)
                if elements:
                    return True
            return False
        except:
            return False
    
    def login_with_credentials(self, email: str, password: str) -> bool:
        """Логинится с email и паролем"""
        print(f"🔐 Logging in as {email}...")
        try:
            self.close_cookie_dialog()
            
            # Вводим email
            email_selectors = [
                'input[type="email"]',
                'input[placeholder*="email" i]',
                'input[placeholder*="username" i]',
                'input[name="email"]',
            ]
            
            email_field = None
            for selector in email_selectors:
                email_field = self.page.query_selector(selector)
                if email_field:
                    break
            
            if email_field:
                email_field.click()
                email_field.fill(email)
                print(f"   ✓ Email entered")
            
            # Нажимаем Continue если есть
            continue_btn = self.page.query_selector('button:has-text("Continue")')
            if continue_btn:
                continue_btn.click()
                time.sleep(2)
            
            # Вводим пароль
            password_selectors = [
                'input[type="password"]',
                'input[placeholder*="password" i]',
            ]
            
            password_field = None
            for selector in password_selectors:
                password_field = self.page.query_selector(selector)
                if password_field:
                    break
            
            if password_field:
                password_field.click()
                password_field.fill(password)
                print(f"   ✓ Password entered")
            
            # Нажимаем Sign in / Continue
            sign_in_btn = self.page.query_selector('button:has-text("Sign in"), button:has-text("Continue")')
            if sign_in_btn:
                sign_in_btn.click()
                time.sleep(3)
                print(f"   ✓ Logged in")
                return True
            
            return False
        except Exception as e:
            print(f"   ❌ Login error: {e}")
            return False
    
    def click_confirm_and_continue(self) -> bool:
        """Нажимает Confirm and continue на странице device authorization"""
        print("🔍 Looking for Confirm and continue button...")
        
        selectors = [
            'text=Confirm and continue',
            '@data-testid=confirm-button',
            'xpath://button[contains(text(), "Confirm")]',
            'tag:button@@text()=Confirm and continue',
        ]
        
        for attempt in range(5):
            for selector in selectors:
                try:
                    btn = self.page.ele(selector, timeout=1)
                    if btn:
                        print(f"   ✓ Found Confirm button (attempt {attempt + 1})")
                        try:
                            btn.click()
                        except:
                            self.page.run_js('arguments[0].click()', btn)
                        time.sleep(1)
                        return True
                except:
                    pass
            time.sleep(0.5)
        
        print("   ⚠️ Confirm and continue button not found")
        return False
    
    def click_allow_access(self) -> bool:
        """Нажимает Allow access"""
        print("✅ Looking for Allow access button...")
        
        for attempt in range(10):
            selectors = [
                'text=Allow access',
                '@data-testid=allow-access-button',
                'xpath://button[contains(text(), "Allow")]',
                'tag:button@@text()=Allow access',
            ]
            
            for selector in selectors:
                try:
                    btn = self.page.ele(selector, timeout=1)
                    if btn:
                        print(f"🔓 Clicking Allow access (attempt {attempt + 1})...")
                        
                        try:
                            btn.click()
                        except:
                            self.page.run_js('arguments[0].click()', btn)
                        
                        time.sleep(1)
                        
                        if '127.0.0.1' in self.page.url:
                            return True
                except Exception:
                    pass
            
            time.sleep(0.5)
        
        print("   ⚠️ Allow access button didn't work")
        self.screenshot("error_allow_access")
        return False
    
    def wait_for_callback(self, timeout: int = None) -> bool:
        """Ждёт редиректа на callback"""
        timeout = timeout or self.settings.get('timeouts', {}).get('oauth_callback', 60)
        print(f"⏳ Waiting for callback redirect ({timeout}s)...")
        
        for _ in range(timeout):
            current_url = self.page.url
            if '127.0.0.1' in current_url and 'oauth/callback' in current_url:
                return True
            time.sleep(1)
        
        return False
    
    @property
    def current_url(self) -> str:
        return self.page.url
    
    def navigate(self, url: str):
        """Переход по URL"""
        print(f"📍 Opening page...")
        self.page.get(url)
        
        print("⏳ Waiting for page load...")
        # Ждём загрузки страницы
        try:
            self.page.wait.doc_loaded(timeout=15)
        except:
            pass
        
        self._log(f"URL", self.page.url[:60] + "..." if len(self.page.url) > 60 else self.page.url)
        
        # Ждём появления основных элементов страницы
        for i in range(20):
            time.sleep(0.3)
            
            # Проверяем что страница загрузилась
            try:
                # Login/Register page
                if self.page.ele('@placeholder=username@example.com', timeout=0.3):
                    print("   ✓ Email field found")
                    break
                if self.page.ele('text=Get started', timeout=0.3):
                    print("   ✓ Page loaded (Get started)")
                    break
                if self.page.ele('text=Sign in', timeout=0.3):
                    print("   ✓ Page loaded (Sign in)")
                    break
                # Device authorization page
                if self.page.ele('text=Authorization requested', timeout=0.3):
                    print("   ✓ Page loaded (Authorization requested)")
                    break
                if self.page.ele('text=Confirm and continue', timeout=0.3):
                    print("   ✓ Page loaded (Confirm and continue)")
                    break
                # Allow access page
                if self.page.ele('text=Allow access', timeout=0.3):
                    print("   ✓ Page loaded (Allow access)")
                    break
                if self.page.ele('text=Allow Kiro', timeout=0.3):
                    print("   ✓ Page loaded (Allow Kiro)")
                    break
            except:
                pass
        
        # Закрываем cookie диалог сразу после загрузки
        self.close_cookie_dialog()
    
    def check_aws_error(self) -> bool:
        """Проверяет наличие ошибки AWS"""
        try:
            error_text = self.page.ele("text=It's not you, it's us", timeout=1)
            if error_text:
                print("⚠️ AWS temporary error, need to wait and retry")
                return True
        except:
            pass
        return False
    
    def _check_aws_error(self) -> bool:
        """Проверяет наличие ошибки AWS на странице (модальное окно)"""
        error_texts = [
            'error processing your request',
            'Please try again',
            "It's not you, it's us",
            'Something went wrong',
        ]
        
        for text in error_texts:
            try:
                if self.page.ele(f'text={text}', timeout=0.5):
                    return True
            except:
                pass
        
        return False
    
    def _close_error_modal(self) -> bool:
        """Закрывает модальное окно с ошибкой AWS"""
        print("   🔴 Attempting to close error modal...")
        
        # AWS Cloudscape UI - специфичные селекторы из HTML
        close_selectors = [
            # Точный селектор из HTML - кнопка Close alert
            'xpath://button[@aria-label="Close alert"]',
            'xpath://button[contains(@class, "awsui_dismiss-button")]',
            'xpath://button[contains(@class, "dismiss-button")]',
            # AWS Cloudscape/Polaris UI
            'xpath://button[contains(@class, "awsui_dismiss")]',
            'xpath://*[contains(@class, "awsui_alert")]//button',
            # Fallback селекторы
            'xpath://button[@aria-label="Close"]',
            'xpath://button[@aria-label="Dismiss"]',
            'aria:Close alert',
            'aria:Close',
            'aria:Dismiss',
        ]
        
        for selector in close_selectors:
            try:
                btn = self.page.ele(selector, timeout=0.3)
                if btn:
                    print(f"   🔴 Found close button: {selector}")
                    try:
                        self.human_click(btn)
                    except:
                        try:
                            self.page.run_js('arguments[0].click()', btn)
                        except:
                            btn.click()
                    time.sleep(0.5)
                    
                    # Проверяем что модалка закрылась
                    if not self._check_aws_error():
                        print("   ✓ Error modal closed")
                        return True
            except:
                pass
        
        # Fallback: нажимаем Escape
        try:
            print("   🔴 Trying Escape key...")
            self.page.run_cdp('Input.dispatchKeyEvent', type='keyDown', key='Escape', code='Escape', windowsVirtualKeyCode=27)
            self.page.run_cdp('Input.dispatchKeyEvent', type='keyUp', key='Escape', code='Escape', windowsVirtualKeyCode=27)
            time.sleep(0.5)
            
            if not self._check_aws_error():
                print("   ✓ Error modal closed via Escape")
                return True
        except:
            pass
        
        # Последний fallback: кликаем вне модалки
        try:
            print("   🔴 Trying click outside modal...")
            self.page.run_js('document.body.click()')
            time.sleep(0.3)
        except:
            pass
        
        return False
    
    def screenshot(self, name: str = "debug") -> Optional[str]:
        """Сохраняет скриншот для отладки"""
        if not self.screenshots_on_error:
            return None
        
        try:
            filename = str(BASE_DIR / f"{name}_{int(time.time())}.png")
            self.page.get_screenshot(path=filename)
            print(f"📸 Screenshot: {filename}")
            return filename
        except Exception as e:
            print(f"⚠️ Screenshot failed: {e}")
            return None
    
    def pause_for_debug(self, message: str = "Paused for debugging"):
        """Пауза для ручной отладки"""
        if self.settings.get('debug', {}).get('pause_on_error', False):
            print(f"\n⏸️ {message}")
            print("   Press Enter to continue...")
            input()
    
    def get_fingerprint_config(self) -> Optional[dict]:
        """Возвращает конфигурацию fingerprint spoofing"""
        if self.fingerprint_spoofer:
            return self.fingerprint_spoofer.get_config()
        return None
    
    def close(self):
        """Закрытие браузера"""
        try:
            self.page.quit()
        except Exception:
            pass
