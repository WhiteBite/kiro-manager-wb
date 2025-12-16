"""
JS Capabilities Spoof Module

Спуфит проверки capabilities (audio, video, webWorker, touch, etc.)
Amazon FWCIM проверяет jsCapabilities()
"""

from .base import BaseSpoofModule


class CapabilitiesSpoofModule(BaseSpoofModule):
    """Спуфинг JS Capabilities"""
    
    name = "capabilities"
    description = "JS/CSS capabilities spoof"
    
    def get_js(self) -> str:
        return """
(function() {
    // Amazon проверяет:
    // - audio: document.createElement('audio').canPlayType
    // - video: document.createElement('video').canPlayType
    // - geolocation: navigator.geolocation
    // - localStorage: window.localStorage
    // - touch: 'ontouchend' in window
    // - webWorker: window.Worker
    
    // Убеждаемся что все capabilities выглядят как у реального браузера
    
    // 1. Audio/Video canPlayType должны возвращать правильные значения
    const audioElement = document.createElement('audio');
    const videoElement = document.createElement('video');
    
    // Проверяем что canPlayType существует и работает
    if (!audioElement.canPlayType) {
        HTMLAudioElement.prototype.canPlayType = function(type) {
            const supported = {
                'audio/mpeg': 'probably',
                'audio/mp3': 'probably',
                'audio/ogg': 'probably',
                'audio/wav': 'probably',
                'audio/webm': 'probably',
                'audio/aac': 'probably',
                'audio/mp4': 'probably'
            };
            return supported[type.split(';')[0]] || '';
        };
    }
    
    if (!videoElement.canPlayType) {
        HTMLVideoElement.prototype.canPlayType = function(type) {
            const supported = {
                'video/mp4': 'probably',
                'video/webm': 'probably',
                'video/ogg': 'probably',
                'video/mpeg': 'probably'
            };
            return supported[type.split(';')[0]] || '';
        };
    }
    
    // 2. Убеждаемся что localStorage доступен
    if (!window.localStorage) {
        try {
            Object.defineProperty(window, 'localStorage', {
                value: {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {},
                    clear: () => {},
                    length: 0
                },
                configurable: true
            });
        } catch(e) {}
    }
    
    // 3. Touch - НЕ добавляем ontouchend для desktop
    // Amazon проверяет 'ontouchend' in window
    // Для desktop это должно быть false
    if ('ontouchend' in window && !navigator.maxTouchPoints) {
        try {
            delete window.ontouchend;
        } catch(e) {}
    }
    
    // 4. WebWorker должен существовать
    if (!window.Worker) {
        // Не спуфим, просто проверяем
        console.log('[SPOOF] WebWorker not available');
    }
    
    // 5. Geolocation должен существовать
    if (!navigator.geolocation) {
        Object.defineProperty(navigator, 'geolocation', {
            value: {
                getCurrentPosition: (success, error) => {
                    if (error) error({ code: 1, message: 'Permission denied' });
                },
                watchPosition: () => 0,
                clearWatch: () => {}
            },
            configurable: true
        });
    }
})();
"""
