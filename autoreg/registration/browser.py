"""
Браузерная автоматизация для регистрации AWS Builder ID
"""

import os
import time
import random
import platform
import functools
from typing import Optional, Callable
from DrissionPage import ChromiumPage, ChromiumOptions

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Force unbuffered output for real-time logging
print = functools.partial(print, flush=True)

# Импортируем спуфинг
from spoof import apply_pre_navigation_spoofing
from spoofers.behavior import BehaviorSpoofModule
from spoofers.profile_storage import ProfileStorage


def find_chrome_path() -> Optional[str]:
    """Find Chrome/Chromium executable path on different platforms"""
    system = platform.system()
    
    if system == 'Windows':
        # Common Chrome paths on Windows
        possible_paths = [
            os.path.expandvars(r'%ProgramFiles%\Google\Chrome\Application\chrome.exe'),
            os.path.expandvars(r'%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe'),
            os.path.expandvars(r'%LocalAppData%\Google\Chrome\Application\chrome.exe'),
            os.path.expandvars(r'%ProgramFiles%\Chromium\Application\chrome.exe'),
            os.path.expandvars(r'%LocalAppData%\Chromium\Application\chrome.exe'),
            # Edge as fallback
            os.path.expandvars(r'%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe'),
            os.path.expandvars(r'%ProgramFiles%\Microsoft\Edge\Application\msedge.exe'),
        ]
    elif system == 'Darwin':  # macOS
        possible_paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
            os.path.expanduser('~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
        ]
    else:  # Linux
        possible_paths = [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium',
        ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    
    return None

from core.config import get_config
from core.paths import get_paths

# Селекторы на основе анализа Playwright (декабрь 2025)
# AWS использует data-testid для стабильных селекторов
SELECTORS = {
    'cookie_accept': [
        'text=Accept',  # Английский
        'text=Принять',  # Русский
        'xpath://button[contains(text(), "Accept")]',
        'xpath://button[contains(text(), "Принять")]',
        '[data-id="awsccc-cb-btn-accept"]',
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

# Таймауты по умолчанию (оптимизированы)
DEFAULT_TIMEOUTS = {
    'page_load': 5,  # Уменьшено с 10
    'element_wait': 1,  # Уменьшено с 3
    'page_transition': 3,  # Уменьшено с 5
    'poll_interval': 0.1,  # Интервал проверки элементов
}

def load_settings():
    return get_config().to_dict()

def get_setting(path, default=None):
    return get_config().get(path, default)

BASE_DIR = get_paths().autoreg_dir


class BrowserAutomation:
    """Автоматизация браузера для регистрации"""
    
    def __init__(self, headless: bool = None, email: str = None):
        """
        Args:
            headless: Запуск без GUI (по умолчанию из настроек)
            email: Email аккаунта (для сохранения профиля спуфинга)
        """
        self._email = email
        settings = load_settings()
        browser_settings = settings.get('browser', {})
        
        # headless можно переопределить параметром
        if headless is None:
            headless = browser_settings.get('headless', False)
        
        self.settings = settings
        self.headless = headless
        self.verbose = settings.get('debug', {}).get('verbose', False)
        self.screenshots_on_error = browser_settings.get('screenshots_on_error', True)
        
        # Настройка браузера
        co = ChromiumOptions()
        
        # Использовать свободный порт (избегаем конфликта с запущенным Chrome)
        co.auto_port()
        
        # Найти и установить путь к Chrome (критично для Windows)
        chrome_path = find_chrome_path()
        if chrome_path:
            co.set_browser_path(chrome_path)
            print(f"[Browser] Using: {chrome_path}")
        else:
            print("[Browser] Warning: Chrome not found, using system default")
        
        if headless:
            co.headless()
            # Дополнительные аргументы для стабильного headless
            co.set_argument('--disable-gpu')
            co.set_argument('--no-sandbox')
            co.set_argument('--disable-dev-shm-usage')
        
        # Скрываем automation infobars
        co.set_argument('--disable-infobars')
        co.set_argument('--no-first-run')
        co.set_argument('--no-default-browser-check')
        
        # Force English language to avoid Chinese error messages
        co.set_argument('--lang=en-US')
        co.set_argument('--accept-lang=en-US,en')
        
        # НЕ используем --disable-blink-features=AutomationControlled
        # Он показывает предупреждение которое палит автоматизацию!
        
        # Размер окна - большое для корректного отображения AWS UI
        co.set_argument('--window-size=1920,1080')
        co.set_argument('--start-maximized')
        
        if browser_settings.get('incognito', True):
            co.set_argument('--incognito')
        
        if browser_settings.get('devtools', False):
            co.set_argument('--auto-open-devtools-for-tabs')
        
        for arg in BROWSER_ARGS:
            co.set_argument(arg)
        
        print(f"[Browser] Initializing ChromiumPage (headless={headless})...")
        try:
            self.page = ChromiumPage(co)
            print("[Browser] ChromiumPage initialized successfully")
            
            # КРИТИЧНО: Максимизируем окно для корректного отображения AWS UI
            if not headless:
                try:
                    self.page.set.window.max()
                    print("   [W] Window maximized")
                except:
                    # Fallback: устанавливаем большой размер вручную
                    try:
                        self.page.set.window.size(1920, 1080)
                        print("   [W] Window resized to 1920x1080")
                    except:
                        pass
        except Exception as e:
            error_msg = str(e).encode('ascii', 'replace').decode('ascii')
            print(f"[Browser] ERROR: Failed to initialize browser: {error_msg}")
            raise
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
            
            print("   [C] Cleared browser cookies, cache and storage")
        except Exception as e:
            print(f"   [!] Failed to clear cookies: {e}")
        
        # КРИТИЧНО: Применяем спуфинг ДО навигации на страницу
        # Это гарантирует что AWS FWCIM получит подменённые данные
        # Проверяем env переменную SPOOFING_ENABLED (по умолчанию включено)
        spoofing_enabled = os.environ.get('SPOOFING_ENABLED', '1') == '1'
        
        if spoofing_enabled:
            try:
                # Используем ProfileStorage для консистентного fingerprint
                profile = None
                if self._email:
                    from core.paths import get_paths
                    storage = ProfileStorage(get_paths().tokens_dir)
                    profile = storage.get_or_create(self._email)
                    self._profile_storage = storage
                
                self._spoofer = apply_pre_navigation_spoofing(self.page, profile)
                print("   [S] Anti-fingerprint spoofing applied")
            except Exception as e:
                print(f"   [!] Spoofing failed: {e}")
                self._spoofer = None
        else:
            print("   [S] Spoofing disabled by settings")
            self._spoofer = None
        
        # Инициализируем модуль человеческого поведения
        self._behavior = BehaviorSpoofModule()
        
        # Настройка реалистичного ввода (по умолчанию включено для обхода FWCIM)
        self._realistic_typing = browser_settings.get('realistic_typing', True)
        
        if self._realistic_typing:
            # Реалистичные задержки для обхода поведенческого анализа
            print("   [B] Realistic typing enabled (slower but safer)")
        else:
            # Быстрые задержки для скорости
            self._behavior.typing_delay_range = (0.03, 0.08)
            self._behavior.action_delay_range = (0.1, 0.3)
            print("   [B] Fast typing mode (faster but may be detected)")
        
        # Включаем перехват сетевых запросов
        self._setup_network_logging()
        
        self._log("Browser initialized", f"headless={headless}")
    
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
                    print(f"   [W] API Request: {params.get('request', {}).get('method')} {url}")
            
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
                    print(f"   [W] API Response: {status} {url}")
            
            # DrissionPage не поддерживает CDP events напрямую, используем альтернативу
            print("   [N] Network logging enabled (will capture via Performance API)")
            
        except Exception as e:
            print(f"   [!] Network logging setup failed: {e}")
    
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
        
        print(f"   [F] Network logs saved: {filepath}")
        return filepath
    def _log(self, message: str, detail: str = ""):
        """Логирование с учётом verbose режима"""
        if self.verbose or not detail:
            print(f"[*] {message}" + (f" ({detail})" if detail else ""))
    
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
        Оптимизировано: использует быстрый polling вместо медленных циклов.
        
        Args:
            context_key: Ключ из PAGE_CONTEXTS ('email', 'name', 'verification', 'password')
            timeout: Таймаут в секундах
        
        Returns:
            True если контекст найден
        """
        timeout = timeout or DEFAULT_TIMEOUTS['page_transition']
        poll_interval = DEFAULT_TIMEOUTS['poll_interval']
        contexts = PAGE_CONTEXTS.get(context_key, [])
        
        if not contexts:
            return True
        
        print(f"   [...] Waiting for page: {context_key}...")
        
        # Строим комбинированный селектор для всех контекстов
        combined_selectors = [f'text={ctx}' for ctx in contexts]
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            for selector in combined_selectors:
                try:
                    if self.page.ele(selector, timeout=poll_interval):
                        elapsed = time.time() - start_time
                        print(f"   [OK] Page context found in {elapsed:.2f}s")
                        time.sleep(0.1)  # Минимальная пауза для React
                        return True
                except:
                    pass
        
        print(f"   [!] Page context not found: {context_key}")
        return False
    
    def wait_for_url_change(self, old_url: str, timeout: int = None) -> bool:
        """
        Ждёт изменения URL после действия.
        Оптимизировано: быстрый polling с минимальными задержками.
        
        Args:
            old_url: Предыдущий URL
            timeout: Таймаут в секундах
        
        Returns:
            True если URL изменился
        """
        timeout = timeout or DEFAULT_TIMEOUTS['page_transition']
        poll_interval = DEFAULT_TIMEOUTS['poll_interval']
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            if self.page.url != old_url:
                time.sleep(0.15)  # Минимальная пауза для загрузки
                return True
            time.sleep(poll_interval)
        
        return False
    
    def wait_for_element(self, selectors: list, timeout: int = None) -> Optional[object]:
        """
        Умное ожидание элемента с быстрым polling.
        
        Args:
            selectors: Список селекторов для поиска
            timeout: Таймаут в секундах
        
        Returns:
            Найденный элемент или None
        """
        timeout = timeout or DEFAULT_TIMEOUTS['element_wait']
        poll_interval = DEFAULT_TIMEOUTS['poll_interval']
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            for selector in selectors:
                try:
                    elem = self.page.ele(selector, timeout=poll_interval)
                    if elem:
                        return elem
                except:
                    pass
        return None
    
    # ========================================================================
    # HUMAN-LIKE INPUT (Обход поведенческого анализа AWS FWCIM)
    # ========================================================================
    
    def human_type(self, element, text: str, click_first: bool = True, fast: bool = None, field_type: str = 'default'):
        """
        Вводит текст с человеческими задержками.
        
        Args:
            element: Элемент для ввода
            text: Текст для ввода
            click_first: Кликнуть на элемент перед вводом
            fast: Быстрый режим (None = использовать настройку realistic_typing)
            field_type: Тип поля для BehaviorSpoofModule ('email', 'password', 'name', 'code')
        """
        # Определяем режим: если fast не указан, используем настройку
        use_fast = fast if fast is not None else not self._realistic_typing
        
        if use_fast:
            # Быстрый режим: execCommand для совместимости с React
            if click_first:
                element.click()
                self._behavior.human_delay(0.02, 0.05)
            
            self.page.run_js('''
                const input = arguments[0];
                const text = arguments[1];
                input.focus();
                input.value = '';
                input.select();
                document.execCommand('insertText', false, text);
            ''', element, text)
            
            self._behavior.human_delay(0.03, 0.08)
        else:
            # Реалистичный режим: посимвольный ввод с человеческими задержками
            self._behavior.human_type(element, text, clear_first=click_first, field_type=field_type)
    
    def human_click(self, element, with_delay: bool = True):
        """
        Кликает по элементу с человеческой задержкой.
        
        Args:
            element: Элемент для клика
            with_delay: Добавить задержку до/после клика
        """
        self._behavior.human_js_click(self.page, element, pre_delay=with_delay)
    
    def simulate_human_activity(self):
        """
        Симулирует активность реального пользователя.
        Вызывать периодически для обхода поведенческого анализа.
        """
        # Случайные движения мыши
        self._behavior.random_mouse_movement(self, count=random.randint(1, 3))
        
        # Иногда скроллим страницу
        if random.random() < 0.3:
            direction = random.choice(['up', 'down'])
            self._behavior.scroll_page(self, direction=direction)
    
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
    
    def _accept_cookie_banner(self):
        """Принимает cookie banner кликом на Accept/Принять."""
        try:
            # Кликаем Accept/Принять
            result = self.page.run_js('''
                // Пробуем кликнуть кнопку принятия cookie
                const acceptButtons = [
                    '[data-id="awsccc-cb-btn-accept"]',
                    'button[data-id*="accept"]',
                    '#awsccc-cb-btn-accept'
                ];
                for (const sel of acceptButtons) {
                    const btn = document.querySelector(sel);
                    if (btn && btn.offsetParent !== null) {
                        btn.click();
                        return 'clicked';
                    }
                }
                return 'not_found';
            ''')
            if result == 'clicked':
                print("   [C] Cookie banner accepted")
                return True
        except:
            pass
        return False
    
    def _hide_cookie_banner(self):
        """Скрывает cookie banner через CSS (fallback если клик не сработал)."""
        try:
            self.page.run_js('''
                // Скрываем все возможные cookie элементы через CSS
                const selectors = [
                    '#awsccc-cb-content',
                    '#awsccc-cb', 
                    '.awsccc-cs-overlay',
                    '.awscc-cookie-banner',
                    '.awsccc-cb-container'
                ];
                selectors.forEach(sel => {
                    const el = document.querySelector(sel);
                    if (el) el.style.display = 'none';
                });
                // Также удаляем overlay который блокирует клики
                document.querySelectorAll('.awsccc-cs-overlay, .modal-backdrop').forEach(el => el.remove());
            ''')
        except:
            pass
    
    def close_cookie_dialog(self, force: bool = False):
        """Принимает или скрывает диалог cookie."""
        if self._cookie_closed and not force:
            return False
        
        # Сначала пробуем кликнуть Accept
        if self._accept_cookie_banner():
            self._cookie_closed = True
            return True
        
        # Fallback: скрываем через CSS
        self._hide_cookie_banner()
        self._cookie_closed = True
        return True
    
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
        print(f"[KEY] Entering device code: {user_code}")
        
        # Ждём загрузки страницы device authorization
        print("   [...] Waiting for device authorization page...")
        for _ in range(15):
            try:
                # Проверяем что мы на странице device
                if self.page.ele('text=Authorization requested', timeout=0.5):
                    print("   [OK] Device authorization page loaded")
                    break
                if self.page.ele('text=Enter the code', timeout=0.5):
                    print("   [OK] Device authorization page loaded")
                    break
                # Форма логина на странице device
                if self.page.ele('text=Sign in', timeout=0.5):
                    print("   [OK] Login form on device page")
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
            print("   [K] Login form detected, logging in first...")
            if not self._login_on_device_page(email, password):
                print("   [!] Login failed")
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
                print(f"   [S] Found {len(all_inputs)} inputs on attempt {attempt + 1}")
                
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
                    print(f"   [OK] Found code input field")
                    break
                
                if code_input:
                    break
                    
            except Exception as e:
                print(f"   [!] Error searching inputs: {e}")
            
            time.sleep(0.5)
        
        if not code_input:
            print("   [!] Device code input not found")
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
            print("   [->] Clicking Confirm and continue...")
            self.human_click(confirm_btn)
            time.sleep(2)
            return True
        
        print("   [!] Confirm button not found")
        return False
    
    def _login_on_device_page(self, email: str, password: str) -> bool:
        """
        Логинится на странице device (когда показывается форма логина после регистрации).
        AWS показывает только поле пароля, т.к. email уже известен.
        """
        print(f"   [K] Logging in on device page...")
        
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
            print("   [!] Password field not found on device page")
            return False
        
        # Вводим пароль
        print(f"   Entering password...")
        self._behavior.human_click(pwd_field)
        self.page.run_js('arguments[0].focus()', pwd_field)
        self._behavior.human_delay(0.1, 0.2)
        
        # Вводим через CDP с человеческими задержками
        for char in password:
            self.page.run_cdp('Input.insertText', text=char)
            self._behavior.human_delay(0.03, 0.1)
        
        time.sleep(0.5)
        
        # Ещё раз закрываем cookie если появился снова
        self.close_cookie_dialog(force=True)
        time.sleep(0.3)
        
        # Debug: показываем все кнопки на странице
        try:
            buttons = self.page.eles('tag:button')
            print(f"   [S] Found {len(buttons)} buttons:")
            for i, btn in enumerate(buttons[:5]):
                btn_text = btn.text or ''
                btn_type = btn.attr('type') or ''
                btn_testid = btn.attr('data-testid') or ''
                print(f"      Button {i}: text='{btn_text[:30]}', type='{btn_type}', testid='{btn_testid}'")
        except Exception as e:
            print(f"   [!] Error listing buttons: {e}")
        
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
            print(f"   [->] Clicking Sign in button...")
            self.human_click(sign_in_btn)
            time.sleep(3)
            print("   [OK] Logged in")
            return True
        
        # Fallback: кликаем первую кнопку submit
        try:
            submit_btn = self.page.ele('tag:button@@type=submit', timeout=2)
            if submit_btn:
                print(f"   [->] Clicking submit button (fallback)...")
                self.human_click(submit_btn)
                time.sleep(3)
                print("   [OK] Logged in (fallback)")
                return True
        except:
            pass
        
        print("   [!] Sign in button not found")
        self.screenshot("error_login_no_button")
        return False
    
    def enter_email(self, email: str) -> bool:
        """Вводит email. Оптимизировано для скорости."""
        print(f"[M] Entering email: {email}")
        
        # Закрываем cookie один раз
        self.close_cookie_dialog(force=True)
        
        # Минимальная пауза перед вводом (для React)
        time.sleep(0.15)
        
        # Быстрые селекторы в порядке приоритета
        selectors = [
            '@placeholder=username@example.com',
            '@type=email',
            'xpath://input[@data-testid="test-input"]',
        ]
        
        email_input = None
        for selector in selectors:
            try:
                email_input = self.page.ele(selector, timeout=0.5)
                if email_input:
                    self._log(f"Found email field", selector)
                    break
            except:
                pass
        
        if not email_input:
            self._debug_inputs()
            self.screenshot("error_no_email")
            raise Exception("Email field not found")
        
        # КРИТИЧНО: Ввод email через JS без опечаток - email должен быть точным!
        self.page.run_js('''
            const input = arguments[0];
            const email = arguments[1];
            input.focus();
            input.value = '';
            input.select();
            document.execCommand('insertText', false, email);
        ''', email_input, email)
        
        time.sleep(0.1)
        # Проверяем что ввелось правильно
        entered = email_input.attr('value') or ''
        if entered != email:
            print(f"   [!] Email mismatch: expected '{email}', got '{entered}'")
            # Повторная попытка
            email_input.clear()
            email_input.input(email)
        
        return True
    
    def _debug_inputs(self):
        """Выводит отладочную информацию о input элементах"""
        print("   [S] Debug: searching for input elements...")
        try:
            inputs = self.page.eles('tag:input')
            for i, inp in enumerate(inputs[:5]):
                print(f"      Input {i}: type={inp.attr('type')}, placeholder={inp.attr('placeholder')}")
        except Exception as e:
            print(f"      Error: {e}")
    
    def click_continue(self) -> bool:
        """Нажимает кнопку Continue после email и ждёт страницу имени"""
        print("[->] Clicking Continue...")
        
        # Запоминаем URL до клика
        url_before = self.page.url
        
        # Быстрый клик Continue
        if not self._click_if_exists(SELECTORS['continue_btn'], timeout=1):
            raise Exception("Continue button not found")
        
        # ВАЖНО: Ждём загрузку страницы после клика
        try:
            self.page.wait.doc_loaded(timeout=10)
        except:
            pass
        
        # Ждём изменения URL или появления нового контента
        time.sleep(1)
        url_after = self.page.url
        print(f"   [URL] Before: {url_before[:60]}...")
        print(f"   [URL] After: {url_after[:60]}...")
        
        # КРИТИЧНО: Принимаем cookie диалог - он появляется после клика Continue
        # и перекрывает страницу имени!
        self.close_cookie_dialog(force=True)
        time.sleep(0.5)
        
        # Ожидание страницы имени - ищем ТЕКСТ "Enter your name" или placeholder с "Silva"
        print("   [...] Waiting for name page...")
        
        name_page_selectors = [
            'text=Enter your name',  # Заголовок страницы
            '@placeholder=Maria José Silva',  # Placeholder поля имени
            'xpath://input[contains(@placeholder, "Silva")]',
            'xpath://input[@type="text"]',  # Любое текстовое поле
        ]
        
        start_time = time.time()
        timeout = 20  # Увеличено для медленных соединений
        cookie_retry = 0
        last_debug = 0
        
        while time.time() - start_time < timeout:
            # Периодически пробуем принять cookie (может появиться с задержкой)
            if cookie_retry < 5 and time.time() - start_time > cookie_retry * 2:
                self.close_cookie_dialog(force=True)
                cookie_retry += 1
            
            # Debug каждые 5 секунд
            elapsed = time.time() - start_time
            if elapsed - last_debug > 5:
                print(f"   [DEBUG] {elapsed:.0f}s - URL: {self.page.url[:50]}...")
                # Показываем что есть на странице
                try:
                    title = self.page.title
                    print(f"   [DEBUG] Title: {title}")
                    # Ищем любые заголовки
                    h1 = self.page.ele('tag:h1', timeout=0.2)
                    if h1:
                        print(f"   [DEBUG] H1: {h1.text[:50] if h1.text else 'empty'}")
                except:
                    pass
                last_debug = elapsed
            
            for selector in name_page_selectors:
                try:
                    if self.page.ele(selector, timeout=0.3):
                        elapsed = time.time() - start_time
                        print(f"   [OK] Name page loaded in {elapsed:.2f}s")
                        return True
                except:
                    pass
        
        # Финальная отладка перед ошибкой
        print("   [X] FAILED: Name page did not load!")
        print(f"   [DEBUG] Final URL: {self.page.url}")
        try:
            print(f"   [DEBUG] Final Title: {self.page.title}")
            body_text = self.page.ele('tag:body').text[:200] if self.page.ele('tag:body') else 'no body'
            print(f"   [DEBUG] Body text: {body_text}")
        except Exception as e:
            print(f"   [DEBUG] Error getting page info: {e}")
        
        self.screenshot("error_no_name_page")
        raise Exception("Name page did not load after email")
    
    def enter_name(self, name: str) -> bool:
        """Вводит имя. Оптимизировано для скорости."""
        print(f"[N] Entering name: {name}")
        
        # КРИТИЧНО: Закрываем cookie диалог ПЕРЕД поиском поля
        self._hide_cookie_banner()
        
        # ВАЖНО: Проверяем что мы на странице имени, а не email!
        # Ищем текст "Enter your name" или placeholder с "Silva"
        on_name_page = False
        for _ in range(10):
            try:
                if self.page.ele('text=Enter your name', timeout=0.3):
                    on_name_page = True
                    break
                if self.page.ele('@placeholder=Maria José Silva', timeout=0.3):
                    on_name_page = True
                    break
            except:
                pass
            time.sleep(0.3)
        
        if not on_name_page:
            print("   [!] WARNING: Not on name page! Current URL:", self.page.url[:60])
            # Попробуем ещё раз кликнуть Continue и подождать
            self._click_if_exists(SELECTORS['continue_btn'], timeout=1)
            time.sleep(2)
            # Проверяем ещё раз
            for _ in range(5):
                try:
                    if self.page.ele('@placeholder=Maria José Silva', timeout=0.5):
                        on_name_page = True
                        print("   [OK] Now on name page after retry")
                        break
                except:
                    pass
                time.sleep(0.5)
            
            if not on_name_page:
                print("   [X] Still not on name page, aborting!")
                self.screenshot("error_not_on_name_page")
                raise Exception("Failed to navigate to name page")
        
        name_input = None
        start_time = time.time()
        
        # ПРИОРИТЕТ 1: Ищем по placeholder "Maria José Silva" - это точно поле имени
        try:
            name_input = self.page.ele('@placeholder=Maria José Silva', timeout=0.5)
            if name_input:
                print(f"   Found name field via placeholder (Maria José Silva)")
        except:
            pass
        
        # Fallback 1: placeholder с "Silva" (уникальный для страницы имени)
        if not name_input:
            try:
                name_input = self.page.ele('xpath://input[contains(@placeholder, "Silva")]', timeout=0.3)
                if name_input:
                    print(f"   Found name field via placeholder: Silva")
            except:
                pass
        
        # Fallback 2: data-testid
        if not name_input:
            try:
                name_input = self.page.ele('@data-testid=name-input', timeout=0.2)
                if name_input:
                    print(f"   Found name field via data-testid")
            except:
                pass
        
        # Fallback 3: CSS селектор (ТОЛЬКО если на странице имени!)
        if not name_input and on_name_page:
            try:
                name_input = self.page.ele('css:input[type="text"]:not([hidden])', timeout=0.3)
                if name_input:
                    print(f"   Found name field via CSS (fast)")
            except:
                pass
        
        elapsed = time.time() - start_time
        if elapsed > 0.5:
            print(f"   [!] Name field search took {elapsed:.2f}s")
        
        if not name_input:
            print("   [X] Name field not found!")
            return False
        
        # КРИТИЧНО: Ввод имени через JS без опечаток
        self.page.run_js('''
            const input = arguments[0];
            const name = arguments[1];
            input.focus();
            input.value = '';
            input.select();
            document.execCommand('insertText', false, name);
            input.dispatchEvent(new Event('blur', { bubbles: true }));
        ''', name_input, name)
        
        time.sleep(0.1)
        
        # Кликаем Continue
        print("   [->] Clicking Continue...")
        self._click_if_exists(SELECTORS['continue_btn'], timeout=1)
        
        # ВАЖНО: Ждём загрузку страницы после клика
        try:
            self.page.wait.doc_loaded(timeout=10)
        except:
            pass
        
        # Принимаем cookie если появился
        time.sleep(0.5)
        self.close_cookie_dialog(force=True)
        
        # Ожидание страницы верификации
        print("   [...] Waiting for verification page...")
        verification_selectors = ['text=Verify your email', 'text=Verification code', '@placeholder=6-digit']
        
        start_time = time.time()
        timeout = 20
        retry_count = 0
        max_retries = 2
        cookie_retry = 0
        
        while time.time() - start_time < timeout:
            # Периодически принимаем cookie
            if cookie_retry < 5 and time.time() - start_time > cookie_retry * 2:
                self.close_cookie_dialog(force=True)
                cookie_retry += 1
            
            # Проверяем на ошибку AWS
            if self._check_aws_error():
                self._close_error_modal()
                if retry_count < max_retries:
                    retry_count += 1
                    print(f"   [R] Retry {retry_count}/{max_retries}")
                    # Retry - ищем поле имени заново
                    retry_input = self.page.ele('css:input[type="text"]:not([hidden])', timeout=1)
                    if retry_input:
                        self.page.run_js('''
                            const input = arguments[0];
                            const name = arguments[1];
                            input.focus();
                            input.select();
                            document.execCommand('insertText', false, name);
                        ''', retry_input, name)
                    self._click_if_exists(SELECTORS['continue_btn'], timeout=1)
                    continue
            
            for selector in verification_selectors:
                try:
                    if self.page.ele(selector, timeout=0.3):
                        elapsed = time.time() - start_time
                        print(f"   [OK] Verification page loaded in {elapsed:.2f}s")
                        return True
                except:
                    pass
        
        # Отладка перед ошибкой
        print("   [X] FAILED: Verification page did not load!")
        print(f"   [DEBUG] URL: {self.page.url}")
        try:
            print(f"   [DEBUG] Title: {self.page.title}")
        except:
            pass
        self.screenshot("error_no_verification_page")
        raise Exception("Verification page did not load after entering name")
    
    def enter_verification_code(self, code: str) -> bool:
        """Вводит код верификации. Оптимизировано для скорости."""
        print(f"[K] Entering code: {code}")
        
        # Закрываем cookie один раз
        self.close_cookie_dialog(force=True)
        
        code_input = self._find_element(SELECTORS['code_input'], timeout=10)
        if not code_input:
            raise Exception("Verification code field not found")
        
        # КРИТИЧНО: Очищаем поле и вводим код напрямую через JS (без опечаток!)
        # Код верификации должен быть введён точно
        self.page.run_js('''
            const input = arguments[0];
            const code = arguments[1];
            input.focus();
            input.value = '';
            input.select();
            document.execCommand('insertText', false, code);
        ''', code_input, code)
        
        time.sleep(0.1)
        print(f"   Entered code: '{code_input.attr('value') or ''}'")
        
        # Кликаем Continue/Verify с retry
        verify_selectors = [
            '@data-testid=email-verification-verify-button',
            'text=Verify',
            'text=Continue',
            '@data-testid=test-primary-button',
        ]
        
        print("   [->] Clicking Verify/Continue...")
        clicked = False
        for attempt in range(3):
            for selector in verify_selectors:
                try:
                    btn = self.page.ele(selector, timeout=0.5)
                    if btn:
                        self._behavior.human_js_click(self.page, btn, pre_delay=False)
                        clicked = True
                        print(f"   [OK] Clicked: {selector}")
                        break
                except:
                    pass
            if clicked:
                break
            self._behavior.human_delay(0.15, 0.3)
        
        if not clicked:
            print("   [!] Verify button not found, trying Enter key...")
            try:
                self.page.run_cdp('Input.dispatchKeyEvent', type='keyDown', key='Enter', code='Enter', windowsVirtualKeyCode=13)
                self.page.run_cdp('Input.dispatchKeyEvent', type='keyUp', key='Enter', code='Enter', windowsVirtualKeyCode=13)
            except:
                pass
        
        # Оптимизированное ожидание страницы пароля
        print("   [...] Waiting for password page...")
        password_selectors = ['text=Create your password', 'text=Set your password', '@placeholder=Enter password']
        
        start_time = time.time()
        timeout = 15  # Увеличено для надёжности
        
        while time.time() - start_time < timeout:
            for selector in password_selectors:
                try:
                    if self.page.ele(selector, timeout=0.1):
                        elapsed = time.time() - start_time
                        print(f"   [OK] Password page loaded in {elapsed:.2f}s")
                        return True
                except:
                    pass
            
            # Проверяем на ошибку AWS
            if self._check_aws_error():
                print("   [!] AWS error detected, closing modal...")
                self._close_error_modal()
                time.sleep(0.3)
        
        print("   [X] FAILED: Password page did not load!")
        self.screenshot("error_no_password_page")
        raise Exception("Password page did not load after verification code")
    
    def enter_password(self, password: str) -> bool:
        """Вводит и подтверждает пароль"""
        print("[KEY] Entering password...")
        
        # Быстрое ожидание контекста
        self.wait_for_page_context('password', timeout=5)
        time.sleep(0.15)  # Минимальная пауза для React
        
        # Ищем password поля
        pwd_fields = self.page.eles('tag:input@@type=password', timeout=3)
        print(f"   Found {len(pwd_fields)} password fields")
        
        pwd1, pwd2 = None, None
        
        # Быстрая стратегия определения полей
        for field in pwd_fields:
            ph = (field.attr('placeholder') or '').lower()
            if 're-enter' in ph or 'confirm' in ph:
                pwd2 = field
            elif not pwd1:
                pwd1 = field
        
        if not pwd1 and pwd_fields:
            pwd1 = pwd_fields[0]
        if not pwd2 and len(pwd_fields) >= 2:
            pwd2 = pwd_fields[1]
        
        if not pwd1:
            print("   [!] No password fields found!")
            self.screenshot("error_no_password")
            return False
        
        # Ввод пароля с человеческим поведением (медленно - вспоминаем пароль)
        print("   Entering password...")
        self.human_type(pwd1, password, field_type='password')
        
        if pwd2:
            self._behavior.human_delay(0.2, 0.4)  # Пауза перед повторным вводом
            print("   Confirming password...")
            self.human_type(pwd2, password, field_type='password')
        
        time.sleep(0.15)
        print("[->] Clicking Continue...")
        old_url = self.page.url
        self._click_if_exists(SELECTORS['continue_btn'], timeout=1)
        
        # Проверяем на ошибку "leaked password"
        time.sleep(0.3)
        if self._check_password_error():
            print("   [!] Password rejected, generating new one...")
            return self.enter_password(self.generate_password(18))
        
        # Быстрая проверка перехода
        self.wait_for_url_change(old_url, timeout=3)
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
        print(f"[K] Logging in as {email}...")
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
                self._behavior.human_click(email_field)
                email_field.fill(email)
                print(f"   [OK] Email entered")
            
            # Нажимаем Continue если есть
            continue_btn = self.page.query_selector('button:has-text("Continue")')
            if continue_btn:
                self._behavior.human_click(continue_btn)
                self._behavior.human_delay(1.5, 2.5)
            
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
                self._behavior.human_click(password_field)
                password_field.fill(password)
                print(f"   [OK] Password entered")
            
            # Нажимаем Sign in / Continue
            sign_in_btn = self.page.query_selector('button:has-text("Sign in"), button:has-text("Continue")')
            if sign_in_btn:
                self._behavior.human_click(sign_in_btn)
                self._behavior.human_delay(2.0, 3.5)
                print(f"   [OK] Logged in")
                return True
            
            return False
        except Exception as e:
            print(f"   [X] Login error: {e}")
            return False
    
    def click_confirm_and_continue(self) -> bool:
        """Нажимает Confirm and continue на странице device authorization"""
        print("[S] Looking for Confirm and continue button...")
        
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
                        print(f"   [OK] Found Confirm button (attempt {attempt + 1})")
                        self._behavior.human_js_click(self.page, btn)
                        return True
                except:
                    pass
            self._behavior.human_delay(0.4, 0.7)
        
        print("   [!] Confirm and continue button not found")
        return False
    
    def click_allow_access(self) -> bool:
        """Нажимает Allow access. ОПТИМИЗИРОВАНО: быстрый поиск и клик."""
        print("[OK] Looking for Allow access button...")
        print(f"   Current URL: {self.page.url[:80]}...")
        
        # Скрываем cookie через CSS (мгновенно, без проверок)
        self._hide_cookie_banner()
        
        # ОПТИМИЗАЦИЯ: Ждём кнопку напрямую, без отдельного ожидания страницы
        # Используем waitUntil с коротким polling
        btn = None
        btn_selector = None  # Сохраняем селектор для повторного поиска
        start_time = time.time()
        max_wait = 5  # Уменьшено с 10 итераций по 0.3с
        
        # Приоритетные селекторы (самые быстрые первыми)
        fast_selectors = [
            '@data-testid=allow-access-button',
            'css:button[data-testid="allow-access-button"]',
            'css:button[type="submit"]',  # Часто кнопка submit
        ]
        fallback_selectors = [
            'text=Allow access',
            'text=Allow',
            'text=Authorize',
            'text=Continue',
            'text=Accept',  # Новый flow может использовать Accept
            'text=Confirm',
            'xpath://button[contains(text(), "Allow")]',
            'xpath://button[contains(text(), "Authorize")]',
            'xpath://button[contains(text(), "Accept")]',
            'xpath://button[contains(text(), "Confirm")]',
            'css:button.awsui-button-variant-primary',  # AWS UI primary button
            'css:button[class*="primary"]',
            'css:button[type="submit"]',  # Submit button
            '@data-testid=confirm-button',
            '@data-testid=accept-button',
        ]
        
        # Фаза 1: Быстрый поиск по data-testid (0.5 сек макс)
        for selector in fast_selectors:
            try:
                btn = self.page.ele(selector, timeout=0.25)
                if btn:
                    btn_selector = selector
                    print(f"   [OK] Found button via {selector[:30]}")
                    break
            except:
                pass
        
        # Фаза 2: Fallback селекторы если нужно
        if not btn:
            for _ in range(20):  # ~5 сек максимум
                for selector in fallback_selectors:
                    try:
                        btn = self.page.ele(selector, timeout=0.15)
                        if btn:
                            btn_selector = selector
                            print(f"   [OK] Found button via fallback")
                            break
                    except:
                        pass
                if btn:
                    break
                time.sleep(0.1)
        
        if not btn:
            print("   [!] Allow access button not found")
            self.screenshot("error_no_allow_button")
            return False
        
        # Логируем что нашли
        try:
            btn_text = btn.text or btn.attr('value') or 'no text'
            btn_class = btn.attr('class') or 'no class'
            print(f"   [DEBUG] Button text: '{btn_text}', class: '{btn_class[:50]}'")
        except:
            pass
        
        # Ждём пока страница стабилизируется
        time.sleep(1)
        
        # Клик с разными методами
        for attempt in range(3):
            # Проверяем disabled (с защитой от NoneElement)
            try:
                if btn and btn.attr('disabled'):
                    print(f"   [!] Button is disabled, waiting...")
                    time.sleep(1)
                    # Перезапрашиваем элемент
                    if btn_selector:
                        btn = self.page.ele(btn_selector, timeout=0.5)
                    continue
            except:
                pass
            
            print(f"[UNLOCK] Clicking Allow access (attempt {attempt + 1})...")
            
            # Метод 1: Прямой клик через DrissionPage
            try:
                btn.click()
                time.sleep(0.5)
                if '127.0.0.1' in self.page.url:
                    print("   [OK] Redirected to callback!")
                    return True
            except Exception as e:
                print(f"   [!] Direct click failed: {e}")
            
            # Метод 2: JS click
            try:
                self.page.run_js('arguments[0].click()', btn)
                time.sleep(0.5)
                if '127.0.0.1' in self.page.url:
                    print("   [OK] Redirected to callback!")
                    return True
            except Exception as e:
                print(f"   [!] JS click failed: {e}")
            
            # Метод 3: Behavior click
            try:
                self._behavior.human_js_click(self.page, btn)
                time.sleep(0.5)
                if '127.0.0.1' in self.page.url:
                    print("   [OK] Redirected to callback!")
                    return True
            except:
                pass
            
            # Перезапрашиваем элемент (избегаем stale)
            if btn_selector:
                try:
                    btn = self.page.ele(btn_selector, timeout=0.5)
                except:
                    pass
            
            time.sleep(1)
        
        # Последняя проверка
        if '127.0.0.1' in self.page.url:
            return True
        
        print("   [!] Allow access button didn't work")
        self.screenshot("error_allow_access")
        return False
    
    def wait_for_callback(self, timeout: int = None) -> bool:
        """Ждёт редиректа на callback"""
        timeout = timeout or self.settings.get('timeouts', {}).get('oauth_callback', 60)
        print(f"[...] Waiting for callback redirect ({timeout}s)...")
        
        for _ in range(timeout):
            current_url = self.page.url
            if '127.0.0.1' in current_url and 'oauth/callback' in current_url:
                return True
            time.sleep(1)
        
        return False
    
    @property
    def current_url(self) -> str:
        return self.page.url
    
    def prewarm(self):
        """
        Прогрев браузера - посещаем несколько сайтов перед AWS.
        Создаёт реальную историю и выглядит естественнее.
        """
        print("[W] Warming up browser...")
        
        # Сайты для прогрева (быстрые, популярные)
        warmup_sites = [
            'https://www.google.com',
            'https://github.com',
        ]
        
        # Выбираем 1-2 случайных сайта
        sites_to_visit = random.sample(warmup_sites, k=random.randint(1, 2))
        
        for site in sites_to_visit:
            try:
                print(f"   Visiting {site}...")
                self.page.get(site)
                
                # Ждём загрузку
                try:
                    self.page.wait.doc_loaded(timeout=5)
                except:
                    pass
                
                # Имитируем просмотр (1-3 сек)
                self._behavior.simulate_page_reading(self.page, duration=random.uniform(1.0, 3.0))
                
                # Случайный скролл
                if random.random() < 0.5:
                    self._behavior.scroll_page(self, direction='down', amount=random.randint(100, 300))
                
            except Exception as e:
                print(f"   [!] Warmup failed for {site}: {e}")
        
        print("   [OK] Browser warmed up")
    
    def navigate(self, url: str):
        """Переход по URL."""
        print(f"[>] Opening page...")
        self.page.get(url)
        
        # Ждём загрузку документа
        print("   [...] Waiting for page load...")
        try:
            self.page.wait.doc_loaded(timeout=8)
        except:
            pass
        
        # Ждём появления элементов страницы (email input или заголовок)
        page_ready = False
        for _ in range(20):  # 2 секунды максимум
            try:
                if self.page.ele('@placeholder=username@example.com', timeout=0.1):
                    page_ready = True
                    break
                if self.page.ele('text=Get started', timeout=0.05):
                    page_ready = True
                    break
            except:
                pass
        
        if page_ready:
            print(f"   [OK] Page elements loaded")
        else:
            print(f"   [!] Page elements not detected, continuing anyway")
        
        # Скрываем cookie
        self._hide_cookie_banner()
    
    def check_aws_error(self) -> bool:
        """Проверяет наличие ошибки AWS"""
        try:
            error_text = self.page.ele("text=It's not you, it's us", timeout=1)
            if error_text:
                print("[!] AWS temporary error, need to wait and retry")
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
        print("   [!] Attempting to close error modal...")
        
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
                    print(f"   [!] Found close button: {selector}")
                    self._behavior.human_js_click(self.page, btn)
                    
                    # Проверяем что модалка закрылась
                    if not self._check_aws_error():
                        print("   [OK] Error modal closed")
                        return True
            except:
                pass
        
        # Fallback: нажимаем Escape
        try:
            print("   [!] Trying Escape key...")
            self._behavior.human_delay(0.1, 0.3)
            self.page.run_cdp('Input.dispatchKeyEvent', type='keyDown', key='Escape', code='Escape', windowsVirtualKeyCode=27)
            self.page.run_cdp('Input.dispatchKeyEvent', type='keyUp', key='Escape', code='Escape', windowsVirtualKeyCode=27)
            self._behavior.human_delay(0.3, 0.6)
            
            if not self._check_aws_error():
                print("   [OK] Error modal closed via Escape")
                return True
        except:
            pass
        
        # Последний fallback: кликаем вне модалки
        try:
            print("   [!] Trying click outside modal...")
            self._behavior.human_delay(0.1, 0.2)
            self.page.run_js('document.body.click()')
            self._behavior.human_delay(0.2, 0.4)
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
            print(f"[SCREENSHOT] Screenshot: {filename}")
            return filename
        except Exception as e:
            print(f"[!] Screenshot failed: {e}")
            return None
    
    def pause_for_debug(self, message: str = "Paused for debugging"):
        """Пауза для ручной отладки"""
        if self.settings.get('debug', {}).get('pause_on_error', False):
            print(f"\n⏸️ {message}")
            print("   Press Enter to continue...")
            input()
    
    def close(self):
        """Закрытие браузера"""
        try:
            self.page.quit()
        except Exception:
            pass
