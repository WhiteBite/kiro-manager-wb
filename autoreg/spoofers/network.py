"""
Спуфинг Network Information API

Подменяет navigator.connection.
"""

from .base import BaseSpoofModule


class NetworkSpoofModule(BaseSpoofModule):
    """Спуфинг Network Information API"""
    
    name = "network"
    description = "Spoof network connection info"
    
    def get_js(self) -> str:
        return '''
(function() {
    'use strict';
    
    const fakeConnection = {
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false,
        addEventListener: () => {},
        removeEventListener: () => {}
    };
    
    Object.defineProperty(navigator, 'connection', {
        get: () => fakeConnection,
        configurable: true
    });
    
    // Также для webkit
    Object.defineProperty(navigator, 'webkitConnection', {
        get: () => fakeConnection,
        configurable: true
    });
})();
'''
