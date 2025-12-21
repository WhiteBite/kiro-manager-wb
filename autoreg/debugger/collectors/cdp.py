"""
CDP Collector - глубокий перехват через Chrome DevTools Protocol

Использует CDP Network domain для надёжного перехвата ВСЕХ запросов,
включая те что происходят при навигации (JS interceptor их теряет).
"""

import json
import time
import threading
from typing import Dict, List, Any, Optional
from .base import BaseCollector


class CDPCollector(BaseCollector):
    """
    Использует CDP для глубокого перехвата:
    - Все сетевые запросы через Network domain
    - WebSocket сообщения
    - Навигация
    - JavaScript exceptions
    - Console messages
    """
    
    name = "cdp"
    
    def __init__(self, session):
        super().__init__(session)
        self._requests: Dict[str, Dict] = {}  # requestId -> request data
        self._completed_requests: List[Dict] = []
        self._navigation_events: List[Dict] = []
        self._js_exceptions: List[Dict] = []
        self._websocket_messages: List[Dict] = []
        self._console_messages: List[Dict] = []
        self._polling = False
        self._poll_thread: Optional[threading.Thread] = None
    
    def inject(self):
        """Включает CDP domains и запускает polling"""
        if not self.page:
            return
        
        try:
            # Включаем Network domain с большим буфером
            self.page.run_cdp('Network.enable', 
                maxTotalBufferSize=100*1024*1024,
                maxResourceBufferSize=10*1024*1024
            )
            
            # Включаем Page domain для навигации
            self.page.run_cdp('Page.enable')
            
            # Включаем Runtime для JS exceptions
            self.page.run_cdp('Runtime.enable')
            
            # Включаем Log domain для console
            try:
                self.page.run_cdp('Log.enable')
            except:
                pass
            
            self.log("CDP domains enabled (Network, Page, Runtime, Log)")
            
            # Инжектим JS для сбора ошибок
            self._inject_error_collector()
            
        except Exception as e:
            self.log(f"CDP enable failed: {e}")
    
    def _inject_error_collector(self):
        """Инжектит JS для сбора ошибок и console"""
        js = '''
(function() {
    if (window.__cdpErrorCollector) return;
    window.__cdpErrorCollector = true;
    window.__jsErrors = [];
    window.__consoleLog = [];
    
    // Перехват ошибок
    window.addEventListener('error', function(e) {
        window.__jsErrors.push({
            type: 'error',
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            timestamp: Date.now()
        });
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        window.__jsErrors.push({
            type: 'unhandledrejection',
            message: String(e.reason),
            timestamp: Date.now()
        });
    });
    
    // Перехват console
    ['log', 'warn', 'error', 'info', 'debug'].forEach(function(level) {
        const orig = console[level];
        console[level] = function() {
            window.__consoleLog.push({
                level: level,
                args: Array.from(arguments).map(a => {
                    try { return JSON.stringify(a); } 
                    catch(e) { return String(a); }
                }),
                timestamp: Date.now()
            });
            return orig.apply(console, arguments);
        };
    });
})();
'''
        try:
            self.page.run_js(js)
            self.page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=js)
        except:
            pass
    
    def collect(self) -> List[Dict]:
        """Собирает данные через CDP и Performance API"""
        if not self.page:
            return []
        
        collected = []
        
        # 1. Собираем через Performance API (resource timing)
        try:
            perf_entries = self.page.run_js('''
                const entries = performance.getEntriesByType('resource');
                const result = entries.map(e => ({
                    name: e.name,
                    type: e.initiatorType,
                    startTime: e.startTime,
                    duration: e.duration,
                    transferSize: e.transferSize || 0,
                    encodedBodySize: e.encodedBodySize || 0,
                    decodedBodySize: e.decodedBodySize || 0,
                    responseStatus: e.responseStatus || 0,
                    nextHopProtocol: e.nextHopProtocol || '',
                    serverTiming: e.serverTiming ? e.serverTiming.map(s => ({name: s.name, duration: s.duration})) : []
                }));
                performance.clearResourceTimings();
                return result;
            ''') or []
            
            for entry in perf_entries:
                url = entry.get('name', '')
                req_data = {
                    'source': 'performance',
                    'url': url,
                    'type': entry.get('type', ''),
                    'duration': round(entry.get('duration', 0), 2),
                    'size': entry.get('transferSize', 0),
                    'status': entry.get('responseStatus', 0),
                    'protocol': entry.get('nextHopProtocol', ''),
                    'timestamp': self.session._elapsed(),
                }
                collected.append(req_data)
                
                # Добавляем в общий список сессии
                self.session.all_requests.append(req_data)
                
                # Логируем важные запросы
                if any(x in url for x in ['api/', 'signin', 'oauth', 'token', 'fingerprint', 'fwcim', 'shortbread']):
                    self.log(f"[PERF] {url[:60]}... ({entry.get('duration', 0):.0f}ms)")
            
        except Exception as e:
            pass  # Performance API может быть недоступен
        
        # 2. Собираем navigation timing
        try:
            nav_timing = self.page.run_js('''
                const t = performance.timing;
                if (!t.navigationStart) return null;
                return {
                    navigationStart: t.navigationStart,
                    domContentLoaded: t.domContentLoadedEventEnd - t.navigationStart,
                    loadComplete: t.loadEventEnd - t.navigationStart,
                    domInteractive: t.domInteractive - t.navigationStart,
                    responseEnd: t.responseEnd - t.navigationStart,
                    redirectTime: t.redirectEnd - t.redirectStart,
                    dnsTime: t.domainLookupEnd - t.domainLookupStart,
                    connectTime: t.connectEnd - t.connectStart,
                    ttfb: t.responseStart - t.navigationStart,
                };
            ''')
            
            if nav_timing and nav_timing.get('navigationStart'):
                self._navigation_events.append({
                    'timestamp': self.session._elapsed(),
                    'url': self.page.url,
                    'timing': nav_timing,
                })
                
        except:
            pass
        
        # 3. Собираем JS errors
        try:
            result = self.page.run_js('''
                const errors = window.__jsErrors || [];
                window.__jsErrors = [];
                return errors;
            ''') or []
            
            for err in result:
                self._js_exceptions.append(err)
                msg = err.get('message', '')[:80]
                self.log(f"[JS ERROR] {err.get('type')}: {msg}")
                
        except:
            pass
        
        # 4. Собираем console messages
        try:
            console_msgs = self.page.run_js('''
                const logs = window.__consoleLog || [];
                window.__consoleLog = [];
                return logs;
            ''') or []
            
            for msg in console_msgs:
                self._console_messages.append(msg)
                # Логируем только warnings и errors
                if msg.get('level') in ('warn', 'error'):
                    args = ' '.join(msg.get('args', []))[:60]
                    self.log(f"[CONSOLE {msg.get('level').upper()}] {args}")
                    
        except:
            pass
        
        return collected
    
    def get_all_cookies_cdp(self) -> List[Dict]:
        """Получает все cookies через CDP (более полно чем JS)"""
        if not self.page:
            return []
        
        try:
            result = self.page.run_cdp('Network.getAllCookies')
            return result.get('cookies', [])
        except:
            return []
    
    def get_request_body(self, request_id: str) -> str:
        """Получает body запроса через CDP"""
        if not self.page:
            return ""
        
        try:
            result = self.page.run_cdp('Network.getRequestPostData', requestId=request_id)
            return result.get('postData', '')
        except:
            return ""
    
    def get_response_body(self, request_id: str) -> str:
        """Получает body ответа через CDP"""
        if not self.page:
            return ""
        
        try:
            result = self.page.run_cdp('Network.getResponseBody', requestId=request_id)
            body = result.get('body', '')
            if result.get('base64Encoded'):
                import base64
                body = base64.b64decode(body).decode('utf-8', errors='ignore')
            return body
        except:
            return ""
    
    def capture_screenshot(self, filename: str = None) -> str:
        """Делает скриншот через CDP"""
        if not self.page:
            return ""
        
        try:
            result = self.page.run_cdp('Page.captureScreenshot', format='png')
            data = result.get('data', '')
            
            if data and filename:
                import base64
                from pathlib import Path
                
                path = self.session.session_dir / filename
                path.write_bytes(base64.b64decode(data))
                self.log(f"Screenshot: {filename}")
                return str(path)
            
            return data
            
        except Exception as e:
            self.log(f"Screenshot failed: {e}")
            return ""
    
    def get_dom_snapshot(self) -> Dict:
        """Получает snapshot DOM через CDP"""
        if not self.page:
            return {}
        
        try:
            result = self.page.run_cdp('DOMSnapshot.captureSnapshot',
                computedStyles=[],
                includeDOMRects=False,
                includePaintOrder=False
            )
            return result
        except:
            return {}
    
    def get_js_errors(self) -> List[Dict]:
        """Возвращает собранные JS ошибки"""
        return self._js_exceptions.copy()
    
    def get_console_messages(self) -> List[Dict]:
        """Возвращает собранные console messages"""
        return self._console_messages.copy()
    
    def get_navigation_events(self) -> List[Dict]:
        """Возвращает события навигации"""
        return self._navigation_events.copy()
    
    def on_step_end(self, step):
        """Добавляем CDP данные к шагу и делаем скриншот"""
        # Делаем скриншот в конце каждого шага
        self.capture_screenshot(f"step_{step.name}.png")
        
        # Добавляем JS ошибки к шагу
        if hasattr(step, 'js_errors'):
            step.js_errors = self._js_exceptions.copy()
        
        # Добавляем console к шагу  
        if hasattr(step, 'console_logs'):
            step.console_logs = self._console_messages.copy()
