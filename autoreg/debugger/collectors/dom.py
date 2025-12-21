"""
DOM Collector - снимки состояния страницы
"""

import time
from typing import Dict, List
from .base import BaseCollector


class DOMCollector(BaseCollector):
    """
    Собирает снимки состояния DOM.
    
    Записывает:
    - URL, title
    - Формы и их поля
    - Кнопки (особенно с data-testid)
    - Сообщения об ошибках
    - Индикаторы загрузки
    """
    
    name = "dom"
    
    def __init__(self, session):
        super().__init__(session)
        self._snapshots = []
    
    def inject(self):
        """DOM не требует инжекта"""
        self.log("DOM monitoring enabled")
    
    def collect(self) -> Dict:
        """Собирает снимок DOM"""
        return self.snapshot()
    
    def snapshot(self, label: str = "") -> Dict:
        """
        Делает полный снимок состояния страницы.
        
        Args:
            label: Метка для снимка
        
        Returns:
            Словарь с данными о странице
        """
        if not self.page:
            return {}
        
        try:
            data = self.page.run_js('''
                return {
                    url: location.href,
                    title: document.title,
                    
                    // Текст страницы (первые 3000 символов)
                    bodyText: document.body ? document.body.innerText.substring(0, 3000) : '',
                    
                    // Формы
                    forms: Array.from(document.forms).slice(0, 10).map(f => ({
                        id: f.id || '',
                        name: f.name || '',
                        action: f.action || '',
                        method: f.method || 'GET',
                        inputs: Array.from(f.elements).slice(0, 30).map(e => ({
                            tag: e.tagName,
                            name: e.name || e.id || '',
                            type: e.type || '',
                            placeholder: e.placeholder || '',
                            value: e.type === 'password' ? '***' : (e.value || '').substring(0, 100),
                            disabled: e.disabled,
                            required: e.required,
                            testId: e.getAttribute('data-testid') || ''
                        }))
                    })),
                    
                    // Кнопки
                    buttons: Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"], a[class*="button"]'))
                        .slice(0, 30).map(b => ({
                            tag: b.tagName,
                            text: (b.textContent || b.value || '').trim().substring(0, 100),
                            type: b.type || '',
                            disabled: b.disabled || false,
                            visible: b.offsetParent !== null,
                            testId: b.getAttribute('data-testid') || '',
                            className: (b.className || '').substring(0, 100),
                            href: b.href || ''
                        })),
                    
                    // Ошибки
                    errors: Array.from(document.querySelectorAll(
                        '[class*="error"], [class*="Error"], .alert-danger, [role="alert"], ' +
                        '[class*="invalid"], [class*="warning"], .error-message'
                    )).slice(0, 10).map(e => ({
                        text: e.textContent.trim().substring(0, 300),
                        className: (e.className || '').substring(0, 100),
                        visible: e.offsetParent !== null
                    })),
                    
                    // Индикаторы загрузки
                    loadingIndicators: Array.from(document.querySelectorAll(
                        '.loading, .spinner, [class*="loading"], [class*="spinner"], ' +
                        '[class*="progress"], .awsui-spinner'
                    )).slice(0, 5).map(e => ({
                        className: (e.className || '').substring(0, 100),
                        visible: e.offsetParent !== null
                    })),
                    
                    // Скрытые поля (могут содержать токены)
                    hiddenInputs: Array.from(document.querySelectorAll('input[type="hidden"]'))
                        .slice(0, 20).map(i => ({
                            name: i.name || '',
                            value: i.value.substring(0, 200)
                        })),
                    
                    // Мета-информация
                    meta: {
                        hasRedirecting: (document.body ? document.body.innerText : '').toLowerCase().includes('redirect'),
                        hasLoading: !!document.querySelector('.loading, .spinner, [class*="loading"]'),
                        hasError: !!document.querySelector('[class*="error"], [role="alert"]'),
                        documentReady: document.readyState,
                        scrollY: window.scrollY,
                        innerHeight: window.innerHeight,
                        innerWidth: window.innerWidth
                    }
                };
            ''') or {}
            
            # Добавляем метаданные
            data['timestamp'] = self.session._elapsed()
            data['label'] = label
            
            # Сохраняем
            self._snapshots.append(data)
            
            if label:
                self.log(f"Snapshot '{label}': {data.get('title', '')[:30]} | {len(data.get('forms', []))} forms | {len(data.get('buttons', []))} buttons")
            
            # Проверяем важные состояния
            meta = data.get('meta', {})
            if meta.get('hasRedirecting'):
                self.log("Page shows 'Redirecting...'")
            if meta.get('hasError'):
                errors = data.get('errors', [])
                if errors:
                    self.log(f"Error on page: {errors[0].get('text', '')[:50]}...")
            
            return data
            
        except Exception as e:
            self.log(f"Snapshot failed: {e}")
            return {}
    
    def on_step_end(self, step):
        """Добавляем снимки к шагу"""
        step.dom_snapshots = self._snapshots.copy()
        self._snapshots = []
