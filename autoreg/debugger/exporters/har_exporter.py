"""
HAR Exporter - экспорт в HAR формат (HTTP Archive)
"""

import json
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING, List, Dict
from urllib.parse import urlparse, parse_qs

if TYPE_CHECKING:
    from ..core import DebugSession


class HARExporter:
    """
    Экспортирует сетевые запросы в HAR формат.
    
    HAR - стандартный формат для анализа HTTP трафика.
    Можно открыть в Chrome DevTools, HAR Viewer и т.д.
    """
    
    def __init__(self, session: 'DebugSession'):
        self.session = session
    
    def export(self) -> Path:
        """Экспортирует в HAR формат"""
        output_path = self.session.session_dir / 'traffic.har'
        
        har = {
            'log': {
                'version': '1.2',
                'creator': {
                    'name': 'AWS Registration Debugger',
                    'version': '2.0'
                },
                'browser': {
                    'name': 'Chrome',
                    'version': 'Automated'
                },
                'pages': self._build_pages(),
                'entries': self._build_entries()
            }
        }
        
        output_path.write_text(
            json.dumps(har, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )
        
        print(f"[HAR] Exported {len(har['log']['entries'])} entries to {output_path.name}")
        return output_path
    
    def _build_pages(self) -> List[Dict]:
        """Строит список страниц (шагов)"""
        pages = []
        base_time = self.session.start_time
        
        for i, step in enumerate(self.session.steps):
            pages.append({
                'startedDateTime': datetime.fromtimestamp(base_time + step.start_time).isoformat() + 'Z',
                'id': f'page_{i}',
                'title': f'{step.name} ({step.duration:.1f}s)',
                'pageTimings': {
                    'onContentLoad': int(step.duration * 500),
                    'onLoad': int(step.duration * 1000)
                }
            })
        
        return pages
    
    def _build_entries(self) -> List[Dict]:
        """Строит список запросов"""
        entries = []
        base_time = self.session.start_time
        
        for req in self.session.all_requests:
            # Определяем timestamp
            ts = req.get('timestamp', 0)
            if isinstance(ts, float) and ts < 10000:
                # Это относительное время от начала сессии
                started = datetime.fromtimestamp(base_time + ts)
            elif ts > 1000000000000:
                # Это миллисекунды
                started = datetime.fromtimestamp(ts / 1000)
            elif ts > 1000000000:
                # Это секунды
                started = datetime.fromtimestamp(ts)
            else:
                started = datetime.now()
            
            url = req.get('url', '') or req.get('name', '')
            if not url:
                continue
            
            # Парсим URL для queryString
            parsed = urlparse(url)
            query_string = []
            for k, v in parse_qs(parsed.query).items():
                for val in v:
                    query_string.append({'name': k, 'value': val})
            
            entry = {
                'startedDateTime': started.isoformat() + 'Z',
                'time': req.get('duration', 0),
                
                'request': {
                    'method': req.get('method', 'GET'),
                    'url': url,
                    'httpVersion': req.get('protocol', 'HTTP/1.1') or 'HTTP/1.1',
                    'cookies': [],
                    'headers': self._dict_to_headers(req.get('requestHeaders', {})),
                    'queryString': query_string,
                    'headersSize': -1,
                    'bodySize': len(req.get('requestBody', '') or '')
                },
                
                'response': {
                    'status': req.get('status', 0),
                    'statusText': req.get('statusText', '') or self._status_text(req.get('status', 0)),
                    'httpVersion': req.get('protocol', 'HTTP/1.1') or 'HTTP/1.1',
                    'cookies': [],
                    'headers': self._dict_to_headers(req.get('responseHeaders', {})),
                    'content': {
                        'size': req.get('size', 0) or len(req.get('responseBody', '') or ''),
                        'mimeType': self._get_mime_type(req),
                        'text': req.get('responseBody', '') or ''
                    },
                    'redirectURL': '',
                    'headersSize': -1,
                    'bodySize': req.get('size', 0) or len(req.get('responseBody', '') or '')
                },
                
                'cache': {},
                
                'timings': {
                    'blocked': 0,
                    'dns': 0,
                    'connect': 0,
                    'send': 0,
                    'wait': req.get('duration', 0) * 0.8,
                    'receive': req.get('duration', 0) * 0.2,
                    'ssl': 0
                },
                
                'serverIPAddress': '',
                'connection': ''
            }
            
            # Добавляем postData если есть
            if req.get('requestBody'):
                entry['request']['postData'] = {
                    'mimeType': 'application/json',
                    'text': req.get('requestBody', '')
                }
            
            # Добавляем source для отладки
            entry['_source'] = req.get('source', 'unknown')
            entry['_type'] = req.get('type', '')
            
            entries.append(entry)
        
        return entries
    
    def _dict_to_headers(self, headers: Dict) -> List[Dict]:
        """Конвертирует dict в HAR headers формат"""
        return [{'name': k, 'value': str(v)} for k, v in (headers or {}).items()]
    
    def _get_mime_type(self, req: Dict) -> str:
        """Определяет MIME type"""
        headers = req.get('responseHeaders', {})
        if headers:
            for k, v in headers.items():
                if k.lower() == 'content-type':
                    return v.split(';')[0].strip()
        
        # Определяем по URL
        url = req.get('url', '') or req.get('name', '')
        if '.js' in url:
            return 'application/javascript'
        elif '.css' in url:
            return 'text/css'
        elif '.json' in url or 'api/' in url:
            return 'application/json'
        elif '.png' in url:
            return 'image/png'
        elif '.jpg' in url or '.jpeg' in url:
            return 'image/jpeg'
        elif '.svg' in url:
            return 'image/svg+xml'
        elif '.woff' in url or '.woff2' in url:
            return 'font/woff2'
        
        return 'text/plain'
    
    def _status_text(self, status: int) -> str:
        """Возвращает текст статуса"""
        texts = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            301: 'Moved Permanently',
            302: 'Found',
            304: 'Not Modified',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
        }
        return texts.get(status, '')
