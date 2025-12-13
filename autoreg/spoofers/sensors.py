"""
Спуфинг Device Sensors API

Подменяет DeviceMotionEvent, DeviceOrientationEvent.
"""

from .base import BaseSpoofModule


class SensorsSpoofModule(BaseSpoofModule):
    """Спуфинг сенсоров устройства"""
    
    name = "sensors"
    description = "Spoof device sensors"
    
    def get_js(self) -> str:
        return '''
(function() {
    'use strict';
    
    // Блокируем DeviceMotionEvent
    if (typeof DeviceMotionEvent !== 'undefined') {
        Object.defineProperty(DeviceMotionEvent, 'requestPermission', {
            value: () => Promise.resolve('denied'),
            configurable: true
        });
    }
    
    // Блокируем DeviceOrientationEvent
    if (typeof DeviceOrientationEvent !== 'undefined') {
        Object.defineProperty(DeviceOrientationEvent, 'requestPermission', {
            value: () => Promise.resolve('denied'),
            configurable: true
        });
    }
    
    // Возвращаем null для событий
    window.addEventListener('devicemotion', (e) => e.stopImmediatePropagation(), true);
    window.addEventListener('deviceorientation', (e) => e.stopImmediatePropagation(), true);
})();
'''
