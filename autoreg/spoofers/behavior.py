"""
Модуль для имитации человеческого поведения

Это Python-модуль (не JS!) для реалистичного взаимодействия с браузером.
Используется для обхода поведенческого анализа AWS FWCIM.
"""

import random
import time


class BehaviorSpoofModule:
    """
    Имитация человеческого поведения при взаимодействии с браузером.
    
    Использование:
        behavior = BehaviorSpoofModule()
        behavior.human_delay()  # Пауза между действиями
        behavior.human_type(element, "text")  # Печать с задержками
    """
    
    name = "behavior"
    description = "Human-like behavior simulation (Python)"
    
    def __init__(self):
        # Настройки задержек
        self.typing_delay_range = (0.05, 0.15)      # Между символами
        self.action_delay_range = (0.3, 1.0)        # Между действиями
        self.think_delay_range = (0.5, 2.0)         # "Думает" перед действием
        
        # Вероятности
        self.typo_probability = 0.02                # Вероятность опечатки
        self.pause_probability = 0.1                # Вероятность паузы при печати
    
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
    
    def human_type(self, element, text: str, clear_first: bool = True):
        """
        Печатает текст с человеческими задержками.
        
        Args:
            element: Элемент для ввода (DrissionPage element)
            text: Текст для ввода
            clear_first: Очистить поле перед вводом
        """
        element.click()
        self.human_delay(0.1, 0.3)
        
        if clear_first:
            element.clear()
            self.human_delay(0.1, 0.2)
        
        for i, char in enumerate(text):
            # Иногда делаем опечатку и исправляем
            if random.random() < self.typo_probability and i < len(text) - 1:
                wrong_char = random.choice('qwertyuiopasdfghjklzxcvbnm')
                element.input(wrong_char)
                self.typing_delay()
                # Backspace
                element.input('\b')
                self.typing_delay()
            
            element.input(char)
            self.typing_delay()
    
    def human_click(self, element, pre_delay: bool = True):
        """Кликает с человеческой задержкой"""
        if pre_delay:
            self.human_delay(0.2, 0.5)
        element.click()
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
