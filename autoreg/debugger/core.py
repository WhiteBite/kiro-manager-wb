"""
Core Debug Session - центральный класс дебаггера
"""

import time
import json
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Any


@dataclass
class DebugStep:
    """Один шаг регистрации"""
    name: str
    start_time: float
    end_time: float = 0
    duration: float = 0
    url_before: str = ""
    url_after: str = ""
    error: Optional[str] = None
    notes: List[str] = field(default_factory=list)
    
    # Данные от коллекторов
    requests: List[Dict] = field(default_factory=list)
    cookies_before: Dict = field(default_factory=dict)
    cookies_after: Dict = field(default_factory=dict)
    dom_snapshots: List[Dict] = field(default_factory=list)
    console_logs: List[Dict] = field(default_factory=list)


class DebugSession:
    """
    Центральный класс для сбора debug информации.
    
    Использование:
        session = DebugSession("my_debug")
        session.attach(browser_page)
        
        session.start_step("email_input")
        # ... действия ...
        session.end_step()
        
        session.save()
    """
    
    def __init__(self, name: str = None, output_dir: str = None):
        """
        Args:
            name: Имя сессии (по умолчанию timestamp)
            output_dir: Папка для сохранения (по умолчанию debug_sessions/)
        """
        self.session_id = name or f"debug_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.output_dir = Path(output_dir or Path(__file__).parent.parent / 'debug_sessions')
        self.output_dir.mkdir(exist_ok=True)
        
        self.session_dir = self.output_dir / self.session_id
        self.session_dir.mkdir(exist_ok=True)
        
        # Состояние
        self.page = None
        self.start_time = time.time()
        self.steps: List[DebugStep] = []
        self.current_step: Optional[DebugStep] = None
        
        # Глобальные данные
        self.url_history: List[tuple] = []  # (timestamp, url)
        self.all_requests: List[Dict] = []
        self.all_cookies: List[tuple] = []  # (timestamp, cookies)
        
        # Коллекторы (инициализируются при attach)
        self._collectors = []
        self._exporters = []
        
        self._log(f"Session created: {self.session_id}")
        self._log(f"Output: {self.session_dir}")
    
    def _elapsed(self) -> float:
        """Время с начала сессии"""
        return time.time() - self.start_time
    
    def _log(self, msg: str, level: str = "INFO"):
        """Логирование"""
        timestamp = f"[{self._elapsed():7.2f}s]"
        print(f"{timestamp} [{level}] {msg}")
    
    def attach(self, page):
        """
        Подключает дебаггер к странице браузера.
        
        Args:
            page: DrissionPage ChromiumPage instance
        """
        self.page = page
        self._log(f"Attached to page: {page.url[:50]}...")
        
        # Инициализируем коллекторы
        from .collectors import NetworkCollector, CookieCollector, DOMCollector, ConsoleCollector, CDPCollector
        
        self._collectors = [
            NetworkCollector(self),
            CookieCollector(self),
            DOMCollector(self),
            ConsoleCollector(self),
            CDPCollector(self),
        ]
        
        # Инжектим перехватчики
        for collector in self._collectors:
            collector.inject()
        
        self._log(f"Collectors initialized: {len(self._collectors)}")
    
    def start_step(self, name: str):
        """Начинает новый шаг"""
        if self.current_step:
            self.end_step()
        
        # Собираем начальное состояние
        cookies_before = self._get_cookies()
        url_before = self.page.url if self.page else ""
        
        self.current_step = DebugStep(
            name=name,
            start_time=self._elapsed(),
            url_before=url_before,
            cookies_before=cookies_before,
        )
        
        self._log(f"=== STEP: {name} ===")
        
        # Уведомляем коллекторы
        for collector in self._collectors:
            collector.on_step_start(name)
    
    def end_step(self, error: str = None):
        """Завершает текущий шаг"""
        if not self.current_step:
            return
        
        step = self.current_step
        step.end_time = self._elapsed()
        step.duration = step.end_time - step.start_time
        step.url_after = self.page.url if self.page else ""
        step.cookies_after = self._get_cookies()
        step.error = error
        
        # Собираем данные от коллекторов
        for collector in self._collectors:
            collector.on_step_end(step)
        
        self.steps.append(step)
        self._log(f"=== END {step.name} ({step.duration:.1f}s) ===")
        
        # Обновляем URL history
        if not self.url_history or self.url_history[-1][1] != step.url_after:
            self.url_history.append((self._elapsed(), step.url_after))
        
        self.current_step = None
    
    def note(self, msg: str):
        """Добавляет заметку к текущему шагу"""
        self._log(f"  NOTE: {msg}")
        if self.current_step:
            self.current_step.notes.append(f"[{self._elapsed():.1f}s] {msg}")
    
    def _get_cookies(self) -> Dict:
        """Получает все cookies"""
        if not self.page:
            return {}
        try:
            return self.page.run_js('''
                const result = {};
                document.cookie.split(';').forEach(c => {
                    const [name, ...rest] = c.trim().split('=');
                    if (name) result[name] = rest.join('=');
                });
                return result;
            ''') or {}
        except:
            return {}
    
    def collect(self):
        """Собирает данные от всех коллекторов (вызывать периодически)"""
        for collector in self._collectors:
            collector.collect()
    
    def monitor(self, duration: float = 10, interval: float = 0.5, 
                stop_condition: callable = None) -> bool:
        """
        Мониторит страницу в течение времени.
        
        Args:
            duration: Длительность мониторинга в секундах
            interval: Интервал сбора данных
            stop_condition: Функция проверки условия остановки (возвращает True для остановки)
        
        Returns:
            True если stop_condition сработал
        """
        start = time.time()
        last_url = self.page.url if self.page else ""
        
        while time.time() - start < duration:
            # Собираем данные
            self.collect()
            
            # Проверяем URL
            current_url = self.page.url if self.page else ""
            if current_url != last_url:
                self.note(f"URL changed: {current_url[:60]}...")
                last_url = current_url
            
            # Проверяем условие остановки
            if stop_condition and stop_condition():
                return True
            
            time.sleep(interval)
        
        return False
    
    def save(self) -> str:
        """
        Сохраняет все данные сессии.
        
        Returns:
            Путь к основному файлу отчёта
        """
        # Завершаем текущий шаг если есть
        if self.current_step:
            self.end_step()
        
        # Собираем финальные данные
        self.collect()
        
        # Формируем отчёт
        report = {
            'session_id': self.session_id,
            'timestamp': datetime.now().isoformat(),
            'total_duration': self._elapsed(),
            
            'summary': {
                'total_steps': len(self.steps),
                'total_requests': len(self.all_requests),
                'total_url_changes': len(self.url_history),
                'final_url': self.page.url if self.page else '',
                'final_cookies': self._get_cookies(),
            },
            
            'steps': [asdict(s) for s in self.steps],
            'url_history': self.url_history,
            'all_requests': self.all_requests[-500:],  # Последние 500
        }
        
        # Сохраняем JSON
        report_path = self.session_dir / 'report.json'
        report_path.write_text(json.dumps(report, indent=2, default=str, ensure_ascii=False), encoding='utf-8')
        
        # Вызываем экспортеры
        from .exporters import JSONExporter, HTMLExporter
        
        JSONExporter(self).export()
        HTMLExporter(self).export()
        
        self._log(f"Session saved: {self.session_dir}")
        
        return str(report_path)
