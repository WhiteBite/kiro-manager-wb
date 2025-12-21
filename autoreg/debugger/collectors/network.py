"""
Network Collector - перехват сетевых запросов
"""

import time
from typing import Dict, List
from .base import BaseCollector


class NetworkCollector(BaseCollector):
    """
    Перехватывает все сетевые запросы (fetch, XHR).
    
    Записывает:
    - URL, method, headers
    - Request body
    - Response status, headers, body
    - Timing (duration)
    """
    
    name = "network"
    
    def __init__(self, session):
        super().__init__(session)
        self._step_requests = []
    
    def inject(self):
        """Инжектит перехватчики fetch и XHR"""
        if not self.page:
            return
        
        interceptor_js = '''
(function() {
    if (window.__networkInterceptorInstalled) return;
    window.__networkInterceptorInstalled = true;
    window.__capturedRequests = [];
    
    // === FETCH INTERCEPTOR ===
    const origFetch = window.fetch;
    window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : input.url;
        const method = init?.method || 'GET';
        const startTime = performance.now();
        const requestId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Capture request body
        let requestBody = null;
        if (init?.body) {
            try {
                if (typeof init.body === 'string') {
                    requestBody = init.body.substring(0, 5000);
                } else if (init.body instanceof FormData) {
                    requestBody = '[FormData]';
                } else {
                    requestBody = String(init.body).substring(0, 5000);
                }
            } catch(e) {
                requestBody = '[Unable to capture]';
            }
        }
        
        // Capture request headers
        let requestHeaders = {};
        if (init?.headers) {
            try {
                if (init.headers instanceof Headers) {
                    init.headers.forEach((v, k) => requestHeaders[k] = v);
                } else {
                    requestHeaders = {...init.headers};
                }
            } catch(e) {}
        }
        
        try {
            const response = await origFetch.apply(this, arguments);
            const duration = performance.now() - startTime;
            
            // Capture response body
            let responseBody = null;
            try {
                const clone = response.clone();
                const text = await clone.text();
                responseBody = text.substring(0, 10000);
            } catch(e) {}
            
            // Capture response headers
            let responseHeaders = {};
            try {
                response.headers.forEach((v, k) => responseHeaders[k] = v);
            } catch(e) {}
            
            window.__capturedRequests.push({
                id: requestId,
                timestamp: Date.now(),
                type: 'fetch',
                url: url,
                method: method,
                requestHeaders: requestHeaders,
                requestBody: requestBody,
                status: response.status,
                statusText: response.statusText,
                responseHeaders: responseHeaders,
                responseBody: responseBody,
                duration: Math.round(duration),
                error: null
            });
            
            return response;
        } catch(err) {
            window.__capturedRequests.push({
                id: requestId,
                timestamp: Date.now(),
                type: 'fetch',
                url: url,
                method: method,
                requestHeaders: requestHeaders,
                requestBody: requestBody,
                status: 0,
                statusText: '',
                responseHeaders: {},
                responseBody: null,
                duration: Math.round(performance.now() - startTime),
                error: err.message
            });
            throw err;
        }
    };
    
    // === XHR INTERCEPTOR ===
    const origXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
        const xhr = new origXHR();
        const data = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: 'xhr',
            timestamp: 0,
            url: '',
            method: '',
            requestHeaders: {},
            requestBody: null,
            status: 0,
            statusText: '',
            responseHeaders: {},
            responseBody: null,
            duration: 0,
            error: null
        };
        let startTime = 0;
        
        const origOpen = xhr.open;
        xhr.open = function(method, url) {
            data.method = method;
            data.url = url;
            data.timestamp = Date.now();
            startTime = performance.now();
            return origOpen.apply(this, arguments);
        };
        
        const origSetHeader = xhr.setRequestHeader;
        xhr.setRequestHeader = function(name, value) {
            data.requestHeaders[name] = value;
            return origSetHeader.apply(this, arguments);
        };
        
        const origSend = xhr.send;
        xhr.send = function(body) {
            if (body) {
                try {
                    data.requestBody = String(body).substring(0, 5000);
                } catch(e) {}
            }
            
            xhr.addEventListener('load', function() {
                data.status = xhr.status;
                data.statusText = xhr.statusText;
                data.duration = Math.round(performance.now() - startTime);
                
                try {
                    data.responseBody = (xhr.responseText || '').substring(0, 10000);
                } catch(e) {}
                
                try {
                    const headers = xhr.getAllResponseHeaders();
                    headers.split('\\r\\n').forEach(line => {
                        const [name, ...rest] = line.split(': ');
                        if (name) data.responseHeaders[name] = rest.join(': ');
                    });
                } catch(e) {}
                
                window.__capturedRequests.push({...data});
            });
            
            xhr.addEventListener('error', function() {
                data.error = 'XHR Error';
                data.duration = Math.round(performance.now() - startTime);
                window.__capturedRequests.push({...data});
            });
            
            xhr.addEventListener('timeout', function() {
                data.error = 'XHR Timeout';
                data.duration = Math.round(performance.now() - startTime);
                window.__capturedRequests.push({...data});
            });
            
            return origSend.apply(this, arguments);
        };
        
        return xhr;
    };
    
    console.log('[NetworkCollector] Interceptors installed');
})();
'''
        
        try:
            # Инжектим в текущую страницу
            self.page.run_js(interceptor_js)
            
            # Инжектим для новых страниц
            self.page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=interceptor_js)
            
            self.log("Interceptors injected")
        except Exception as e:
            self.log(f"Injection failed: {e}")
    
    def collect(self) -> List[Dict]:
        """Собирает перехваченные запросы"""
        if not self.page:
            return []
        
        try:
            requests = self.page.run_js('''
                const reqs = window.__capturedRequests || [];
                window.__capturedRequests = [];
                return reqs;
            ''') or []
            
            # Добавляем в общий список
            for req in requests:
                self.session.all_requests.append(req)
                self._step_requests.append(req)
                
                # Логируем важные запросы
                url = req.get('url', '')
                if any(x in url for x in ['api/', 'signin', 'oauth', 'token', 'fingerprint']):
                    status = req.get('status', 0)
                    duration = req.get('duration', 0)
                    self.log(f"{req.get('method')} {url[:50]}... -> {status} ({duration}ms)")
            
            return requests
        except:
            return []
    
    def on_step_start(self, step_name: str):
        """Очищаем буфер запросов для нового шага"""
        self._step_requests = []
    
    def on_step_end(self, step):
        """Добавляем запросы к шагу"""
        step.requests = self._step_requests.copy()
        self._step_requests = []
