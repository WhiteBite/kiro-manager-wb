"""
Скрытие следов CDP (Chrome DevTools Protocol)

Некоторые антибот системы детектят использование CDP команд.
"""

from .base import BaseSpoofModule


class CDPHideSpoofModule(BaseSpoofModule):
    """Скрытие следов CDP"""
    
    name = "cdp_hide"
    description = "Hide CDP/DevTools detection traces"
    
    def get_js(self) -> str:
        return '''
(function() {
    'use strict';
    
    // ============================================
    // HIDE CDP TRACES
    // ============================================
    
    // Удаляем cdc_ переменные (ChromeDriver)
    const cdcProps = Object.keys(window).filter(k => k.startsWith('cdc_') || k.startsWith('$cdc_'));
    cdcProps.forEach(prop => {
        try { delete window[prop]; } catch(e) {}
    });
    
    // Скрываем Runtime.evaluate следы
    const originalError = Error;
    window.Error = function(...args) {
        const error = new originalError(...args);
        // Убираем CDP-специфичные строки из stack trace
        if (error.stack) {
            error.stack = error.stack
                .split('\\n')
                .filter(line => !line.includes('Runtime.evaluate') && 
                               !line.includes('__puppeteer') &&
                               !line.includes('__playwright'))
                .join('\\n');
        }
        return error;
    };
    window.Error.prototype = originalError.prototype;
    
    // ============================================
    // PERFORMANCE TIMING PROTECTION
    // ============================================
    
    // Добавляем небольшой шум к performance.now()
    const originalNow = performance.now.bind(performance);
    let lastNow = 0;
    performance.now = function() {
        let now = originalNow();
        // Гарантируем монотонность + небольшой шум
        if (now <= lastNow) now = lastNow + 0.1;
        lastNow = now;
        return now;
    };
    
    // ============================================
    // IFRAME PROTECTION
    // ============================================
    
    // Некоторые детекторы проверяют window.top === window.self
    // в контексте CDP это может быть нарушено
    try {
        if (window.self === window.top) {
            Object.defineProperty(window, 'frameElement', {
                get: () => null,
                configurable: true
            });
        }
    } catch(e) {}
    
    // ============================================
    // CONSOLE PROTECTION
    // ============================================
    
    // Скрываем что консоль была открыта через CDP
    const originalConsole = window.console;
    Object.defineProperty(window, 'console', {
        get: () => originalConsole,
        set: () => {},
        configurable: false
    });
    
})();
'''
