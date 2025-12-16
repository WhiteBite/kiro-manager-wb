"""
Модуль для имитации человеческого поведения

Это Python-модуль (не JS!) для реалистичного взаимодействия с браузером.
Используется для обхода поведенческого анализа AWS FWCIM.

Особенности:
- Случайные опечатки и исправления
- Паузы "на подумать" перед вводом
- Разная скорость для разных типов полей
- Реалистичные движения мыши по кривой Безье
"""

import random
import time
import string


class BehaviorSpoofModule:
    """
    Имитация человеческого поведения при взаимодействии с браузером.
    
    Использование:
        behavior = BehaviorSpoofModule()
        behavior.human_delay()  # Пауза между действиями
        behavior.human_type(element, "text", field_type="email")  # Печать с задержками
    """
    
    name = "behavior"
    description = "Human-like behavior simulation (Python)"
    
    # Типы полей и их характеристики скорости
    FIELD_SPEEDS = {
        'email': {'delay': (0.03, 0.08), 'typo_prob': 0.01},      # Email - быстро, мало ошибок (знакомый текст)
        'password': {'delay': (0.08, 0.18), 'typo_prob': 0.03},   # Пароль - медленнее, больше ошибок
        'name': {'delay': (0.05, 0.12), 'typo_prob': 0.02},       # Имя - средняя скорость
        'code': {'delay': (0.15, 0.30), 'typo_prob': 0.05},       # Код верификации - медленно, внимательно
        'default': {'delay': (0.05, 0.15), 'typo_prob': 0.02}     # По умолчанию
    }
    
    # Соседние клавиши для реалистичных опечаток
    NEARBY_KEYS = {
        'q': 'wa', 'w': 'qeas', 'e': 'wrsd', 'r': 'etdf', 't': 'ryfg',
        'y': 'tugh', 'u': 'yihj', 'i': 'uojk', 'o': 'iplk', 'p': 'ol',
        'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhbv',
        'h': 'gyujnb', 'j': 'huikmn', 'k': 'jiolm', 'l': 'kop',
        'z': 'asx', 'x': 'zsdc', 'c': 'xdfv', 'v': 'cfgb', 'b': 'vghn',
        'n': 'bhjm', 'm': 'njk',
        '1': '2q', '2': '13qw', '3': '24we', '4': '35er', '5': '46rt',
        '6': '57ty', '7': '68yu', '8': '79ui', '9': '80io', '0': '9p'
    }
    
    def __init__(self):
        # Настройки задержек
        self.typing_delay_range = (0.05, 0.15)      # Между символами
        self.action_delay_range = (0.3, 1.0)        # Между действиями
        self.think_delay_range = (0.5, 2.0)         # "Думает" перед действием
        
        # Вероятности
        self.typo_probability = 0.02                # Вероятность опечатки
        self.pause_probability = 0.1                # Вероятность паузы при печати
        
        # Статистика сессии (для более реалистичного поведения)
        self._chars_typed = 0
        self._typos_made = 0
        self._session_start = time.time()
    
    def human_delay(self, min_delay: float = None, max_delay: float = None):
        """Человеческая задержка между действиями"""
        min_d = min_delay or self.action_delay_range[0]
        max_d = max_delay or self.action_delay_range[1]
        time.sleep(random.uniform(min_d, max_d))
    
    def think_delay(self):
        """Задержка "размышления" перед действием"""
        time.sleep(random.uniform(*self.think_delay_range))
    
    def typing_delay(self):
        """Задержка между нажатиями клавиш"""
        delay = random.uniform(*self.typing_delay_range)
        
        # Иногда делаем паузу
        if random.random() < self.pause_probability:
            delay += random.uniform(0.3, 0.8)
        
        time.sleep(delay)
    
    def simulate_reading(self, duration: float = None):
        """Симулирует чтение страницы"""
        if duration is None:
            duration = random.uniform(1.0, 3.0)
        time.sleep(duration)
    
    def human_type(self, element, text: str, clear_first: bool = True, field_type: str = 'default'):
        """
        Печатает текст с человеческими задержками.
        
        Args:
            element: Элемент для ввода (DrissionPage element)
            text: Текст для ввода
            clear_first: Очистить поле перед вводом
            field_type: Тип поля ('email', 'password', 'name', 'code', 'default')
        """
        # Получаем настройки для типа поля
        field_config = self.FIELD_SPEEDS.get(field_type, self.FIELD_SPEEDS['default'])
        delay_range = field_config['delay']
        typo_prob = field_config['typo_prob']
        
        # Пауза "на подумать" перед вводом (особенно для паролей и кодов)
        if field_type in ('password', 'code'):
            self.think_before_typing(field_type)
        
        element.click()
        self.human_delay(0.1, 0.3)
        
        if clear_first:
            element.clear()
            self.human_delay(0.1, 0.2)
        
        i = 0
        while i < len(text):
            char = text[i]
            
            # Случайная пауза "на подумать" в середине ввода
            if random.random() < 0.03 and i > 0 and i < len(text) - 1:
                time.sleep(random.uniform(0.3, 0.8))
            
            # Опечатка с реалистичным исправлением
            if random.random() < typo_prob and i < len(text) - 1:
                typo_char = self._get_typo_char(char)
                if typo_char:
                    element.input(typo_char)
                    self._chars_typed += 1
                    self._typos_made += 1
                    
                    # Задержка перед осознанием ошибки
                    time.sleep(random.uniform(0.1, 0.4))
                    
                    # Иногда печатаем ещё 1-2 символа перед исправлением
                    extra_chars = 0
                    if random.random() < 0.3 and i + 1 < len(text):
                        extra_chars = random.randint(1, min(2, len(text) - i - 1))
                        for j in range(extra_chars):
                            element.input(text[i + 1 + j])
                            time.sleep(random.uniform(*delay_range))
                    
                    # Пауза "заметили ошибку"
                    time.sleep(random.uniform(0.2, 0.5))
                    
                    # Удаляем ошибочные символы
                    for _ in range(1 + extra_chars):
                        element.input('\b')
                        time.sleep(random.uniform(0.05, 0.1))
            
            # Вводим правильный символ
            element.input(char)
            self._chars_typed += 1
            
            # Задержка между символами
            delay = random.uniform(*delay_range)
            
            # Дополнительная пауза после определённых символов
            if char in '.,!?@':
                delay += random.uniform(0.1, 0.3)
            elif char == ' ':
                delay += random.uniform(0.05, 0.15)
            
            time.sleep(delay)
            i += 1
    
    def _get_typo_char(self, char: str) -> str | None:
        """Возвращает реалистичную опечатку для символа"""
        char_lower = char.lower()
        
        # Используем соседние клавиши
        if char_lower in self.NEARBY_KEYS:
            nearby = self.NEARBY_KEYS[char_lower]
            typo = random.choice(nearby)
            # Сохраняем регистр
            return typo.upper() if char.isupper() else typo
        
        # Для других символов - случайная буква
        if char.isalpha():
            typo = random.choice(string.ascii_lowercase)
            return typo.upper() if char.isupper() else typo
        
        return None
    
    def think_before_typing(self, field_type: str = 'default'):
        """
        Пауза "на подумать" перед вводом.
        Разная длительность для разных типов полей.
        """
        if field_type == 'password':
            # Вспоминаем пароль
            time.sleep(random.uniform(0.8, 2.0))
        elif field_type == 'code':
            # Смотрим на код в письме/SMS
            time.sleep(random.uniform(1.0, 2.5))
        elif field_type == 'email':
            # Email обычно помним хорошо
            time.sleep(random.uniform(0.2, 0.5))
        else:
            time.sleep(random.uniform(0.3, 0.8))
    
    def human_click(self, element, pre_delay: bool = True):
        """Кликает с человеческой задержкой"""
        if pre_delay:
            self.human_delay(0.2, 0.5)
        element.click()
        self.human_delay(0.1, 0.3)
    
    def human_js_click(self, page, element, pre_delay: bool = True):
        """Кликает через JS с человеческой задержкой и скроллом"""
        if pre_delay:
            self.human_delay(0.15, 0.4)
        
        try:
            # Скроллим к элементу плавно
            page.run_js('''
                arguments[0].scrollIntoView({behavior: "smooth", block: "center"});
            ''', element)
            self.human_delay(0.1, 0.25)
            
            # Клик
            page.run_js('arguments[0].click()', element)
        except:
            try:
                element.click()
            except:
                pass
        
        self.human_delay(0.1, 0.3)
    
    def random_mouse_movement(self, browser, count: int = None):
        """
        Случайные движения мыши по странице.
        
        Args:
            browser: BrowserAutomation instance (должен иметь .page)
            count: Количество движений
        """
        if count is None:
            count = random.randint(2, 5)
        
        try:
            for _ in range(count):
                x = random.randint(100, 800)
                y = random.randint(100, 600)
                
                browser.page.run_js(f'''
                    const event = new MouseEvent('mousemove', {{
                        clientX: {x},
                        clientY: {y},
                        bubbles: true
                    }});
                    document.dispatchEvent(event);
                ''')
                
                time.sleep(random.uniform(0.1, 0.3))
        except Exception:
            pass
    
    def scroll_page(self, browser, direction: str = 'down', amount: int = None):
        """
        Прокручивает страницу.
        
        Args:
            browser: BrowserAutomation instance
            direction: 'up' или 'down'
            amount: Количество пикселей
        """
        if amount is None:
            amount = random.randint(100, 400)
        
        if direction == 'up':
            amount = -amount
        
        try:
            browser.page.run_js(f'window.scrollBy(0, {amount});')
            self.human_delay(0.2, 0.5)
        except Exception:
            pass


    def bezier_mouse_move(self, page, start_x: int, start_y: int, end_x: int, end_y: int, steps: int = 20):
        """
        Движение мыши по кривой Безье (более реалистично).
        
        Args:
            page: DrissionPage page instance
            start_x, start_y: Начальная позиция
            end_x, end_y: Конечная позиция
            steps: Количество шагов
        """
        import math
        
        # Контрольные точки для кривой Безье
        # Добавляем случайное отклонение
        ctrl1_x = start_x + (end_x - start_x) * 0.3 + random.randint(-50, 50)
        ctrl1_y = start_y + (end_y - start_y) * 0.1 + random.randint(-30, 30)
        ctrl2_x = start_x + (end_x - start_x) * 0.7 + random.randint(-50, 50)
        ctrl2_y = start_y + (end_y - start_y) * 0.9 + random.randint(-30, 30)
        
        def bezier(t, p0, p1, p2, p3):
            """Кубическая кривая Безье"""
            return (
                (1-t)**3 * p0 +
                3 * (1-t)**2 * t * p1 +
                3 * (1-t) * t**2 * p2 +
                t**3 * p3
            )
        
        try:
            for i in range(steps + 1):
                t = i / steps
                x = int(bezier(t, start_x, ctrl1_x, ctrl2_x, end_x))
                y = int(bezier(t, start_y, ctrl1_y, ctrl2_y, end_y))
                
                page.run_js(f'''
                    const event = new MouseEvent('mousemove', {{
                        clientX: {x},
                        clientY: {y},
                        bubbles: true
                    }});
                    document.dispatchEvent(event);
                ''')
                
                # Случайная задержка между шагами
                time.sleep(random.uniform(0.005, 0.02))
        except Exception:
            pass
    
    def human_click_with_movement(self, page, element, from_pos: tuple = None):
        """
        Кликает по элементу с реалистичным движением мыши.
        
        Args:
            page: DrissionPage page instance
            element: Элемент для клика
            from_pos: Начальная позиция (x, y), если None - случайная
        """
        try:
            # Получаем позицию элемента
            rect = page.run_js('''
                const rect = arguments[0].getBoundingClientRect();
                return {x: rect.x + rect.width/2, y: rect.y + rect.height/2};
            ''', element)
            
            end_x = int(rect['x'])
            end_y = int(rect['y'])
            
            # Начальная позиция
            if from_pos:
                start_x, start_y = from_pos
            else:
                start_x = random.randint(100, 800)
                start_y = random.randint(100, 600)
            
            # Движение к элементу
            self.bezier_mouse_move(page, start_x, start_y, end_x, end_y)
            
            # Небольшая пауза перед кликом
            time.sleep(random.uniform(0.05, 0.15))
            
            # Клик
            element.click()
            
            return (end_x, end_y)  # Возвращаем позицию для следующего движения
        except Exception as e:
            # Fallback на обычный клик
            element.click()
            return None
    
    # ========================================================================
    # ADVANCED HUMAN SIMULATION
    # ========================================================================
    
    def simulate_page_reading(self, page, duration: float = None):
        """
        Симулирует чтение страницы: движения глаз (мыши), скролл, паузы.
        
        Args:
            page: DrissionPage instance
            duration: Длительность симуляции (None = случайная 2-5 сек)
        """
        if duration is None:
            duration = random.uniform(2.0, 5.0)
        
        start_time = time.time()
        
        while time.time() - start_time < duration:
            action = random.choice(['mouse_move', 'scroll', 'pause'])
            
            if action == 'mouse_move':
                # Движение мыши как при чтении (сверху вниз, слева направо)
                x = random.randint(200, 900)
                y = random.randint(150, 500)
                try:
                    page.run_js(f'''
                        document.dispatchEvent(new MouseEvent('mousemove', {{
                            clientX: {x}, clientY: {y}, bubbles: true
                        }}));
                    ''')
                except:
                    pass
                time.sleep(random.uniform(0.1, 0.3))
            
            elif action == 'scroll':
                # Небольшой скролл
                scroll_amount = random.randint(50, 150)
                direction = random.choice([1, -1])
                try:
                    page.run_js(f'window.scrollBy(0, {scroll_amount * direction});')
                except:
                    pass
                time.sleep(random.uniform(0.2, 0.5))
            
            else:  # pause
                time.sleep(random.uniform(0.3, 0.8))
    
    def simulate_form_hesitation(self, page):
        """
        Симулирует колебание перед заполнением формы.
        Человек обычно осматривает форму перед вводом.
        """
        # Движения мыши по форме
        form_positions = [
            (300, 200), (500, 200), (300, 300), (500, 300), (400, 400)
        ]
        
        for x, y in random.sample(form_positions, k=random.randint(2, 4)):
            x += random.randint(-30, 30)
            y += random.randint(-30, 30)
            try:
                page.run_js(f'''
                    document.dispatchEvent(new MouseEvent('mousemove', {{
                        clientX: {x}, clientY: {y}, bubbles: true
                    }}));
                ''')
            except:
                pass
            time.sleep(random.uniform(0.1, 0.25))
        
        # Пауза "на подумать"
        time.sleep(random.uniform(0.3, 0.8))
    
    def simulate_distraction(self, page, probability: float = 0.15):
        """
        Симулирует отвлечение пользователя (с заданной вероятностью).
        Человек иногда отвлекается во время заполнения форм.
        
        Args:
            page: DrissionPage instance
            probability: Вероятность отвлечения (0.0 - 1.0)
        """
        if random.random() > probability:
            return
        
        distraction_type = random.choice(['long_pause', 'scroll_away', 'mouse_wander'])
        
        if distraction_type == 'long_pause':
            # Просто долгая пауза (отвлёкся на телефон/чат)
            time.sleep(random.uniform(2.0, 5.0))
        
        elif distraction_type == 'scroll_away':
            # Скролл в сторону и обратно
            try:
                page.run_js(f'window.scrollBy(0, {random.randint(100, 300)});')
                time.sleep(random.uniform(0.5, 1.5))
                page.run_js(f'window.scrollBy(0, {random.randint(-300, -100)});')
            except:
                pass
            time.sleep(random.uniform(0.3, 0.6))
        
        elif distraction_type == 'mouse_wander':
            # Мышь уходит в угол экрана
            corners = [(50, 50), (1200, 50), (50, 700), (1200, 700)]
            corner = random.choice(corners)
            try:
                page.run_js(f'''
                    document.dispatchEvent(new MouseEvent('mousemove', {{
                        clientX: {corner[0]}, clientY: {corner[1]}, bubbles: true
                    }}));
                ''')
            except:
                pass
            time.sleep(random.uniform(1.0, 3.0))
    
    def hover_before_click(self, page, element, duration: float = None):
        """
        Наводит мышь на элемент перед кликом (как реальный пользователь).
        
        Args:
            page: DrissionPage instance
            element: Элемент для наведения
            duration: Время наведения перед кликом
        """
        if duration is None:
            duration = random.uniform(0.1, 0.4)
        
        try:
            # Получаем позицию элемента
            rect = page.run_js('''
                const rect = arguments[0].getBoundingClientRect();
                return {
                    x: rect.x + rect.width/2 + (Math.random() - 0.5) * rect.width * 0.3,
                    y: rect.y + rect.height/2 + (Math.random() - 0.5) * rect.height * 0.3
                };
            ''', element)
            
            # Hover event
            page.run_js(f'''
                const el = arguments[0];
                el.dispatchEvent(new MouseEvent('mouseenter', {{ bubbles: true }}));
                el.dispatchEvent(new MouseEvent('mouseover', {{ bubbles: true }}));
            ''', element)
            
            time.sleep(duration)
        except:
            pass
    
    def natural_scroll_to_element(self, page, element):
        """
        Плавно скроллит к элементу (не мгновенно).
        
        Args:
            page: DrissionPage instance
            element: Элемент к которому скроллить
        """
        try:
            # Получаем текущую позицию и позицию элемента
            positions = page.run_js('''
                const el = arguments[0];
                const rect = el.getBoundingClientRect();
                return {
                    currentY: window.scrollY,
                    targetY: window.scrollY + rect.top - window.innerHeight / 3,
                    viewportHeight: window.innerHeight
                };
            ''', element)
            
            current_y = positions['currentY']
            target_y = positions['targetY']
            
            # Скроллим пошагово
            distance = target_y - current_y
            steps = max(5, abs(int(distance / 50)))
            
            for i in range(steps):
                progress = (i + 1) / steps
                # Easing function (ease-out)
                eased = 1 - (1 - progress) ** 2
                new_y = current_y + distance * eased
                
                page.run_js(f'window.scrollTo(0, {int(new_y)});')
                time.sleep(random.uniform(0.02, 0.05))
            
            # Финальная позиция
            page.run_js(f'window.scrollTo(0, {int(target_y)});')
            time.sleep(random.uniform(0.1, 0.2))
            
        except Exception:
            # Fallback на обычный скролл
            try:
                page.run_js('arguments[0].scrollIntoView({behavior: "smooth", block: "center"});', element)
                time.sleep(0.3)
            except:
                pass
    
    def random_micro_movements(self, page, count: int = None):
        """
        Микро-движения мыши (тремор руки, небольшие корректировки).
        Делает поведение более человечным.
        
        Args:
            page: DrissionPage instance
            count: Количество микро-движений
        """
        if count is None:
            count = random.randint(3, 8)
        
        try:
            # Получаем текущую позицию (примерно центр экрана)
            base_x = random.randint(400, 800)
            base_y = random.randint(300, 500)
            
            for _ in range(count):
                # Небольшое отклонение (1-5 пикселей)
                dx = random.randint(-5, 5)
                dy = random.randint(-5, 5)
                
                page.run_js(f'''
                    document.dispatchEvent(new MouseEvent('mousemove', {{
                        clientX: {base_x + dx},
                        clientY: {base_y + dy},
                        bubbles: true
                    }}));
                ''')
                
                time.sleep(random.uniform(0.02, 0.08))
                
                base_x += dx
                base_y += dy
        except:
            pass
