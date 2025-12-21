"""
Console Collector - перехват console.log/error/warn
"""

from typing import Dict, List
from .base import BaseCollector


class ConsoleCollector(BaseCollector):
    """
    Перехватывает console.log, console.error, console.warn.
    
    Полезно для:
    - Отладки JavaScript ошибок
    - Понимания что происходит в AWS скриптах
    - Обнаружения проблем с fingerprint
    """
    
    name = "console"
    
    def __init__(self, session):
        super().__init__(session)
        self._logs = []
    
    def inject(self):
        """Инжектит перехватчик console"""
        if not self.page:
            return
        
        interceptor_js = '''
(function() {
    if (window.__consoleInterceptorInstalled) return;
    window.__consoleInterceptorInstalled = true;
    window.__consoleLogs = [];
    
    const maxLogs = 500;
    
    function captureLog(type, args) {
        const entry = {
            timestamp: Date.now(),
            type: type,
            message: args.map(arg => {
                try {
                    if (typeof arg === 'object') {
                        return JSON.stringify(arg).substring(0, 1000);
                    }
                    return String(arg).substring(0, 1000);
                } catch(e) {
                    return '[Unable to stringify]';
                }
            }).join(' ')
        };
        
        window.__consoleLogs.push(entry);
        
        // Ограничиваем размер
        if (window.__consoleLogs.length > maxLogs) {
            window.__consoleLogs = window.__consoleLogs.slice(-maxLogs);
        }
    }
    
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    const origInfo = console.info;
    const origDebug = console.debug;
    
    console.log = function(...args) {
        captureLog('log', args);
        return origLog.apply(console, args);
    };
    
    console.error = function(...args) {
        captureLog('error', args);
        return origError.apply(console, args);
    };
    
    console.warn = function(...args) {
        captureLog('warn', args);
        return origWarn.apply(console, args);
    };
    
    console.info = function(...args) {
        captureLog('info', args);
        return origInfo.apply(console, args);
    };
    
    console.debug = function(...args) {
        captureLog('debug', args);
        return origDebug.apply(console, args);
    };
    
    // Перехватываем глобальные ошибки
    window.addEventListener('error', function(event) {
        captureLog('uncaught_error', [
            event.message,
            'at', event.filename,
            'line', event.lineno,
            'col', event.colno
        ]);
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        captureLog('unhandled_rejection', [
            event.reason ? (event.reason.message || String(event.reason)) : 'Unknown rejection'
        ]);
    });
    
    console.log('[ConsoleCollector] Interceptor installed');
})();
'''
        
        try:
            self.page.run_js(interceptor_js)
            self.page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=interceptor_js)
            self.log("Console interceptor injected")
        except Exception as e:
            self.log(f"Injection failed: {e}")
    
    def collect(self) -> List[Dict]:
        """Собирает перехваченные логи"""
        if not self.page:
            return []
        
        try:
            logs = self.page.run_js('''
                const logs = window.__consoleLogs || [];
                window.__consoleLogs = [];
                return logs;
            ''') or []
            
            # Фильтруем и логируем важные
            for log in logs:
                log_type = log.get('type', '')
                message = log.get('message', '')
                
                # Логируем ошибки и предупреждения
                if log_type in ('error', 'uncaught_error', 'unhandled_rejection'):
                    self.log(f"ERROR: {message[:100]}...")
                elif log_type == 'warn' and any(x in message.lower() for x in ['fingerprint', 'fwcim', 'automation']):
                    self.log(f"WARN: {message[:100]}...")
                
                self._logs.append(log)
            
            return logs
            
        except:
            return []
    
    def on_step_end(self, step):
        """Добавляем логи к шагу"""
        step.console_logs = self._logs.copy()
        self._logs = []
    
    def get_errors(self) -> List[Dict]:
        """Возвращает только ошибки"""
        return [log for log in self._logs if log.get('type') in ('error', 'uncaught_error', 'unhandled_rejection')]
