"""
JSON Exporter - экспорт в JSON формат
"""

import json
from pathlib import Path
from dataclasses import asdict
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..core import DebugSession


class JSONExporter:
    """
    Экспортирует данные сессии в JSON.
    
    Создаёт файлы:
    - report.json - полный отчёт
    - requests.json - все сетевые запросы
    - cookies.json - история cookies
    - steps.json - шаги с деталями
    """
    
    def __init__(self, session: 'DebugSession'):
        self.session = session
    
    def export(self) -> Path:
        """Экспортирует все данные"""
        output_dir = self.session.session_dir
        
        # Полный отчёт
        report = {
            'session_id': self.session.session_id,
            'total_duration': self.session._elapsed(),
            'summary': {
                'steps': len(self.session.steps),
                'requests': len(self.session.all_requests),
                'url_changes': len(self.session.url_history),
                'final_url': self.session.page.url if self.session.page else '',
            },
            'steps': [asdict(s) for s in self.session.steps],
            'url_history': self.session.url_history,
        }
        
        self._write_json(output_dir / 'report.json', report)
        
        # Отдельно запросы (могут быть большими)
        self._write_json(output_dir / 'requests.json', {
            'total': len(self.session.all_requests),
            'requests': self.session.all_requests
        })
        
        # История cookies
        self._write_json(output_dir / 'cookies.json', {
            'history': self.session.all_cookies[-100:]  # Последние 100
        })
        
        # Детальные шаги
        steps_detail = []
        for step in self.session.steps:
            step_data = asdict(step)
            steps_detail.append(step_data)
        
        self._write_json(output_dir / 'steps.json', steps_detail)
        
        return output_dir / 'report.json'
    
    def _write_json(self, path: Path, data: dict):
        """Записывает JSON файл"""
        path.write_text(
            json.dumps(data, indent=2, default=str, ensure_ascii=False),
            encoding='utf-8'
        )
