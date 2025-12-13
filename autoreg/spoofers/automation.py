"""
Спуфинг для обхода детекции автоматизации

Скрывает признаки Selenium, Puppeteer, Playwright, PhantomJS.
Основано на проверках из AWS FWCIM app-min.js.
"""

from .base import BaseSpoofModule


class AutomationSpoofModule(BaseSpoofModule):
    """Скрытие признаков автоматизации браузера"""
    
    name = "automation"
    description = "Hide automation/webdriver detection"
    
    def get_js(self) -> str:
        return '''
(function() {
    'use strict';
    
    // ============================================
    // WEBDRIVER FLAG (критично!)
    // ============================================
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
        configurable: true
    });
    
    // ============================================
    // AUTOMATION PROPERTIES
    // Списки из app-min.js: WEBDRIVER_DOCUMENT_PROPERTIES, 
    // WEBDRIVER_WINDOW_PROPERTIES, WEBDRIVER_NAVIGATOR_PROPERTIES
    // ============================================
    
    const windowProps = [
        // WEBDRIVER_WINDOW_PROPERTIES
        '__webdriverFunc', 'domAutomation', 'domAutomationController',
        '__lastWatirAlert', '__lastWatirConfirm', '__lastWatirPrompt',
        '_WEBDRIVER_ELEM_CACHE',
        // PHANTOM_WINDOW_PROPERTIES
        '_phantom', 'callPhantom', 'phantom',
        // Puppeteer/Playwright
        '__puppeteer_evaluation_script__', '__playwright', '__nightmare',
        // Selenium
        'webdriver', '__webdriver_script_func', '__webdriver_script_function'
    ];
    
    const documentProps = [
        // WEBDRIVER_DOCUMENT_PROPERTIES
        '__selenium_evaluate', '__webdriver_evaluate', '__driver_evaluate',
        '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped',
        '__selenium_unwrapped', '__fxdriver_unwrapped', '__webdriver_script_fn',
        '_Selenium_IDE_Recorder', '_selenium', 'calledSelenium',
        '$cdc_asdjflasutopfhvcZLmcfl_', '$chrome_asyncScriptInfo',
        '__$webdriverAsyncExecutor'
    ];
    
    // Удаляем из window
    windowProps.forEach(prop => {
        try {
            if (prop in window) delete window[prop];
        } catch(e) {}
    });
    
    // Удаляем из document
    documentProps.forEach(prop => {
        try {
            if (prop in document) delete document[prop];
        } catch(e) {}
    });
    
    // ============================================
    // CHROME RUNTIME (headless detection)
    // ============================================
    if (!window.chrome) window.chrome = {};
    
    if (!window.chrome.runtime) {
        window.chrome.runtime = {
            connect: () => {},
            sendMessage: () => {},
            onMessage: { addListener: () => {}, removeListener: () => {} },
            onConnect: { addListener: () => {}, removeListener: () => {} },
            id: undefined
        };
    }
    
    // chrome.csi
    if (!window.chrome.csi) {
        window.chrome.csi = () => ({
            startE: Date.now(),
            onloadT: Date.now(),
            pageT: Date.now() + Math.random() * 1000,
            tran: 15
        });
    }
    
    // chrome.loadTimes
    if (!window.chrome.loadTimes) {
        const now = Date.now() / 1000;
        window.chrome.loadTimes = () => ({
            commitLoadTime: now,
            connectionInfo: 'h2',
            finishDocumentLoadTime: now,
            finishLoadTime: now,
            firstPaintAfterLoadTime: 0,
            firstPaintTime: now,
            navigationType: 'Other',
            npnNegotiatedProtocol: 'h2',
            requestTime: now,
            startLoadTime: now,
            wasAlternateProtocolAvailable: false,
            wasFetchedViaSpdy: true,
            wasNpnNegotiated: true
        });
    }
    
    // ============================================
    // PERMISSIONS API
    // ============================================
    if (navigator.permissions && navigator.permissions.query) {
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = (params) => {
            if (params.name === 'notifications') {
                return Promise.resolve({ state: 'prompt', onchange: null });
            }
            return originalQuery(params);
        };
    }
})();
'''
