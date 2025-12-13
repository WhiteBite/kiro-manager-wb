"""
Спуфинг WebRTC

Скрывает реальный IP через WebRTC.
"""

from .base import BaseSpoofModule


class WebRTCSpoofModule(BaseSpoofModule):
    """Спуфинг WebRTC для скрытия IP"""
    
    name = "webrtc"
    description = "Block WebRTC IP leak"
    
    def get_js(self) -> str:
        return '''
(function() {
    'use strict';
    
    // Блокируем WebRTC IP leak
    if (typeof RTCPeerConnection !== 'undefined') {
        const originalRTCPeerConnection = RTCPeerConnection;
        
        RTCPeerConnection = function(config, constraints) {
            // Форсируем использование только TURN серверов
            if (config && config.iceServers) {
                config.iceServers = config.iceServers.filter(server => {
                    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
                    return urls.some(url => url.startsWith('turn:'));
                });
            }
            return new originalRTCPeerConnection(config, constraints);
        };
        
        RTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
        
        // Также для webkit
        if (typeof webkitRTCPeerConnection !== 'undefined') {
            window.webkitRTCPeerConnection = RTCPeerConnection;
        }
    }
})();
'''
