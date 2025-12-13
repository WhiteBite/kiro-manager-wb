"""
Спуфинг Battery API

Возвращает фейковые данные о батарее.
"""

from .base import BaseSpoofModule


class BatterySpoofModule(BaseSpoofModule):
    """Спуфинг Battery API"""
    
    name = "battery"
    description = "Spoof battery status"
    
    def get_js(self) -> str:
        return '''
(function() {
    'use strict';
    
    if (navigator.getBattery) {
        const fakeBattery = {
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1.0,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
        };
        
        navigator.getBattery = () => Promise.resolve(fakeBattery);
    }
})();
'''
