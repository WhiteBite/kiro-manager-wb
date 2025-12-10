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

# Константы для обратной совместимости
SELECTORS = {
    'cookie_reject': ['text=Отклонить', 'text=Продолжить, не принимая', 'text=Reject'],
    'email_input': ['@placeholder=username@example.com', 'aria:Email', '@type=email'],
    'continue_btn': ['text=Continue', '@data-testid=test-primary-button'],
    'name_input': ['@placeholder=Maria José Silva', 'aria:Name'],
    'signup_continue': ['text=Continue', '@data-testid=signup-next-button'],
    'code_input': ['@placeholder=6-digit', 'aria:Verification code'],
    'password_input': ['aria:Password', '@type=password', '@placeholder=Password'],
    'confirm_password': ['aria:Confirm password', '@placeholder=Re-enter password'],
    'allow_access': ['text=Allow access', '@data-testid=allow-access-button'],
}

BROWSER_ARGS = [
    '--disable-blink-features=AutomationControlled',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
]

PASSWORD_LENGTH = 16
PASSWORD_CHARS = {
    'upper': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'lower': 'abcdefghijklmnopqrstuvwxyz',
    'digits': '0123456789',
    'special': '!@#$%',
}

def load_settings():
    return get_config().to_dict()

def get_setting(path, default=None):
    return get_config().get(path, default)

BASE_DIR = get_paths().autoreg_dir


class BrowserAutomation:
    """Автоматизация браузера для регистрации с обходом fingerprinting"""
    
    def __init__(self, headless: bool = None, spoof_fingerprint: bool = True):
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
        
        if browser_settings.get('incognito', True):
            co.set_argument('--incognito')
        
        if browser_settings.get('devtools', False):
            co.set_argument('--auto-open-devtools-for-tabs')
        
        for arg in BROWSER_ARGS:
            co.set_argument(arg)
        
        self.page = ChromiumPage(co)
        self.fingerprint_spoofer = None
        self._cookie_closed = False  # Флаг чтобы не закрывать cookie много раз
        
        # Инъекция fingerprint spoofing
        if spoof_fingerprint:
            self._init_fingerprint_spoof()
        
        self._log("Browser initialized", f"headless={headless}, spoof={spoof_fingerprint}")
    
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
    
    # ========================================================================
    # HUMAN-LIKE INPUT (Обход поведенческого анализа AWS FWCIM)
    # ========================================================================
    
    def human_type(self, element, text: str, click_first: bool = True, fast: bool = False):
        """
        Вводит текст с человеческими задержками между нажатиями.
        AWS FWCIM модуль 54 анализирует keyPressTimeIntervals.
        
        Args:
            element: Элемент для ввода
            text: Текст для ввода
            click_first: Кликнуть на элемент перед вводом
            fast: Быстрый режим (меньше задержки)
        """
        if click_first:
            element.click()
            time.sleep(random.uniform(0.05, 0.15))
        
        for i, char in enumerate(text):
            element.input(char)
            
            # Случайная задержка между символами
            if fast:
                base_delay = random.uniform(0.02, 0.05)  # 20-50ms для быстрого режима
            else:
                base_delay = random.uniform(0.03, 0.08)  # 30-80ms обычный режим
            
            # Иногда делаем паузу подольше (как будто думаем) - редко
            if random.random() < 0.03:
                base_delay += random.uniform(0.1, 0.3)
            
            # После пробела или спецсимволов - чуть дольше
            if char in ' @._-':
                base_delay += random.uniform(0.03, 0.08)
            
            time.sleep(base_delay)
    
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
        """Генерация безопасного пароля"""
        chars = ''.join(PASSWORD_CHARS.values())
        
        password = [
            random.choice(PASSWORD_CHARS['upper']),
            random.choice(PASSWORD_CHARS['lower']),
            random.choice(PASSWORD_CHARS['digits']),
            random.choice(PASSWORD_CHARS['special']),
        ]
        password += [random.choice(chars) for _ in range(length - 4)]
        random.shuffle(password)
        
        return ''.join(password)
    
    def close_cookie_dialog(self, force: bool = False):
        """Закрывает диалог cookie если он появился (только один раз)"""
        if self._cookie_closed and not force:
            return False
            
        self._log("Checking for cookie dialog...")
        
        # Расширенный список селекторов для cookie диалога
        cookie_selectors = [
            'text=Отклонить',
            'text=Reject', 
            'text=Decline',
            'text=Продолжить, не принимая',
            'text=Continue without accepting',
            '@data-id=awsccc-cb-btn-decline',
            'xpath://button[contains(text(), "Отклонить")]',
            'xpath://button[contains(text(), "Reject")]',
            'xpath://button[contains(text(), "Decline")]',
        ]
        
        for selector in cookie_selectors:
            try:
                btn = self.page.ele(selector, timeout=0.5)
                if btn:
                    print(f"   🍪 Found cookie button: {selector}")
                    try:
                        # Пробуем JS клик (обходит перекрытие)
                        self.page.run_js('arguments[0].click()', btn)
                    except:
                        btn.click()
                    time.sleep(0.3)
                    self._cookie_closed = True
                    return True
            except Exception:
                pass
        
        return False
    
    def enter_email(self, email: str) -> bool:
        """Вводит email"""
        print(f"📧 Entering email: {email}")
        
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
        """Нажимает кнопку Continue"""
        print("➡️ Clicking Continue...")
        
        # Закрываем cookie если ещё не закрыли
        self.close_cookie_dialog()
        
        # Пробуем кликнуть Continue
        for attempt in range(3):
            if self._click_if_exists(SELECTORS['continue_btn'], timeout=2):
                time.sleep(0.5)
                return True
            time.sleep(0.3)
        
        raise Exception("Continue button not found")
    
    def enter_name(self, name: str) -> bool:
        """Вводит имя"""
        print(f"📝 Entering name: {name}")
        
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
        
        # Используем CDP для надёжного ввода (как для пароля)
        try:
            name_input.click()
            time.sleep(0.2)
            self.page.run_js('arguments[0].focus()', name_input)
            time.sleep(0.1)
            
            # Очищаем поле
            name_input.clear()
            time.sleep(0.1)
            
            # Вводим через CDP посимвольно
            print(f"   Typing name via CDP...")
            for char in name:
                self.page.run_cdp('Input.insertText', text=char)
                time.sleep(random.uniform(0.03, 0.08))
            
            # Проверяем что ввелось
            time.sleep(0.2)
            val = name_input.attr('value') or ''
            print(f"   Name field value: '{val}'")
            
            if len(val) < len(name) // 2:
                # Fallback на human_type
                print(f"   ⚠️ CDP input incomplete, trying human_type...")
                name_input.clear()
                self.human_type(name_input, name, click_first=False)
                
        except Exception as e:
            print(f"   ⚠️ CDP failed: {e}, using human_type...")
            name_input.clear()
            self.human_type(name_input, name)
        
        time.sleep(0.3)
        self._click_if_exists(SELECTORS['signup_continue'], timeout=3)
        time.sleep(random.uniform(0.5, 1.5))
        
        return True
    
    def enter_verification_code(self, code: str) -> bool:
        """Вводит код верификации"""
        print(f"🔐 Entering code: {code}")
        
        # Закрываем cookie если появился
        self.close_cookie_dialog()
        
        code_input = self._find_element(SELECTORS['code_input'], timeout=30)
        if not code_input:
            raise Exception("Verification code field not found")
        
        # Код вводим тоже с задержками
        self.human_type(code_input, code)
        
        self._click_if_exists(SELECTORS['continue_btn'], timeout=3)
        time.sleep(random.uniform(0.5, 1.5))
        
        return True
    
    def enter_password(self, password: str) -> bool:
        """Вводит и подтверждает пароль"""
        print("🔑 Entering password...")
        
        # Ищем поля СТРОГО по placeholder - это гарантирует правильный порядок
        pwd1 = self.page.ele('@placeholder=Enter password', timeout=10)
        pwd2 = self.page.ele('@placeholder=Re-enter password', timeout=3)
        
        if not pwd1:
            print("   ⚠️ First password field not found")
            self._debug_inputs()
            return False
        
        if not pwd2:
            print("   ⚠️ Second password field not found")
        
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
        
        # Вводим в ПЕРВОЕ поле (Enter password)
        print(f"   === Field 1: Enter password ===")
        success1 = False
        try:
            success1 = input_via_cdp(pwd1, password, "Password")
            if success1:
                print(f"   ✓ Field 1 done")
        except Exception as e:
            print(f"   ⚠️ CDP failed: {e}")
        
        if not success1:
            print(f"   Trying fallback for field 1...")
            pwd1.click()
            time.sleep(0.1)
            pwd1.clear()
            self.human_type(pwd1, password, click_first=False)
        
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
        
        time.sleep(0.5)
        print("➡️ Clicking Continue after password...")
        self._click_if_exists(SELECTORS['continue_btn'], timeout=3)
        time.sleep(2)
        
        self._log(f"URL after password", self.page.url[:60])
        
        return True
    
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
        for i in range(10):
            time.sleep(0.5)
            current = self.page.url
            self._log(f"URL", current[:60] + "..." if len(current) > 60 else current)
            
            if 'signin.aws' in current or 'view.awsapps.com' in current:
                break
    
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
