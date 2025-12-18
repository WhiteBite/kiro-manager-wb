"""
Debug Recorder - записывает действия браузера для отладки
"""

import os
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any


class DebugRecorder:
    """
    Записывает все действия браузера для последующего анализа.
    Сохраняет: скриншоты, HTML, логи, сетевые запросы.
    """
    
    def __init__(self, session_name: str = None, output_dir: str = None):
        """
        Args:
            session_name: Имя сессии (по умолчанию timestamp)
            output_dir: Директория для записи (по умолчанию autoreg/debug_sessions)
        """
        self.enabled = os.environ.get('DEBUG_RECORDING', '0') == '1'
        
        if not self.enabled:
            return
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        self.session_name = session_name or f"session_{timestamp}"
        
        # Создаём директорию для сессии
        base_dir = Path(output_dir) if output_dir else Path(__file__).parent.parent / 'debug_sessions'
        self.session_dir = base_dir / self.session_name
        self.session_dir.mkdir(parents=True, exist_ok=True)
        
        # Счётчики для именования файлов
        self._step_counter = 0
        self._screenshot_counter = 0
        
        # Лог действий
        self._actions: List[Dict[str, Any]] = []
        
        # Метаданные сессии
        self._metadata = {
            'session_name': self.session_name,
            'started_at': datetime.now().isoformat(),
            'platform': os.name,
        }
        
        print(f"[DEBUG] Recording enabled: {self.session_dir}")
    
    def record_action(self, action_type: str, details: Dict[str, Any] = None, 
                     page=None, screenshot: bool = True):
        """
        Записывает действие.
        
        Args:
            action_type: Тип действия (navigate, click, type, wait, etc.)
            details: Детали действия
            page: Объект страницы для скриншота
            screenshot: Делать ли скриншот
        """
        if not self.enabled:
            return
        
        self._step_counter += 1
        timestamp = datetime.now().isoformat()
        
        action = {
            'step': self._step_counter,
            'timestamp': timestamp,
            'type': action_type,
            'details': details or {},
        }
        
        # Добавляем URL если есть page
        if page:
            try:
                action['url'] = page.url
            except:
                pass
        
        # Делаем скриншот
        if screenshot and page:
            screenshot_path = self._take_screenshot(page, f"step_{self._step_counter:03d}_{action_type}")
            if screenshot_path:
                action['screenshot'] = screenshot_path.name
        
        self._actions.append(action)
        
        # Сохраняем лог после каждого действия
        self._save_log()
    
    def record_page_html(self, page, name: str = None):
        """Сохраняет HTML страницы"""
        if not self.enabled:
            return
        
        try:
            html = page.html
            filename = f"{self._step_counter:03d}_{name or 'page'}.html"
            filepath = self.session_dir / filename
            filepath.write_text(html, encoding='utf-8')
            return filepath
        except Exception as e:
            print(f"[DEBUG] Failed to save HTML: {e}")
            return None
    
    def record_network(self, logs: List[Dict]):
        """Сохраняет сетевые логи"""
        if not self.enabled:
            return
        
        filepath = self.session_dir / 'network_logs.json'
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(logs, f, indent=2, ensure_ascii=False)
    
    def record_error(self, error: str, page=None):
        """Записывает ошибку с полным контекстом"""
        if not self.enabled:
            return
        
        self.record_action('error', {'message': error}, page, screenshot=True)
        
        # Сохраняем HTML при ошибке
        if page:
            self.record_page_html(page, 'error_page')
    
    def _take_screenshot(self, page, name: str) -> Optional[Path]:
        """Делает скриншот"""
        try:
            self._screenshot_counter += 1
            filename = f"{name}.png"
            filepath = self.session_dir / filename
            page.get_screenshot(path=str(filepath))
            return filepath
        except Exception as e:
            print(f"[DEBUG] Screenshot failed: {e}")
            return None
    
    def _save_log(self):
        """Сохраняет лог действий"""
        log_data = {
            'metadata': self._metadata,
            'actions': self._actions,
        }
        
        filepath = self.session_dir / 'actions.json'
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
    
    def finish(self):
        """Завершает запись сессии"""
        if not self.enabled:
            return
        
        self._metadata['finished_at'] = datetime.now().isoformat()
        self._metadata['total_steps'] = self._step_counter
        self._save_log()
        
        print(f"[DEBUG] Session saved: {self.session_dir}")
        print(f"[DEBUG] Total steps: {self._step_counter}")


# Глобальный рекордер
_recorder: Optional[DebugRecorder] = None


def get_recorder() -> Optional[DebugRecorder]:
    """Возвращает глобальный рекордер"""
    return _recorder


def init_recorder(session_name: str = None) -> DebugRecorder:
    """Инициализирует глобальный рекордер"""
    global _recorder
    _recorder = DebugRecorder(session_name)
    return _recorder


def record(action_type: str, details: Dict = None, page=None, screenshot: bool = True):
    """Shortcut для записи действия"""
    if _recorder:
        _recorder.record_action(action_type, details, page, screenshot)
