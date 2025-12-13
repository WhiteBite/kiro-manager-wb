"""
Спуфинг Geolocation API

Примечание: Основной спуфинг геолокации делается через CDP.
Этот модуль - fallback для JS-based спуфинга.
"""

from .base import BaseSpoofModule


class GeolocationSpoofModule(BaseSpoofModule):
    """Спуфинг геолокации (JS fallback)"""
    
    name = "geolocation"
    description = "Spoof geolocation (JS fallback)"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    const LATITUDE = {p.latitude};
    const LONGITUDE = {p.longitude};
    const ACCURACY = {p.accuracy};
    
    // Переопределяем getCurrentPosition
    if (navigator.geolocation) {{
        const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
        
        navigator.geolocation.getCurrentPosition = function(success, error, options) {{
            success({{
                coords: {{
                    latitude: LATITUDE,
                    longitude: LONGITUDE,
                    accuracy: ACCURACY,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                }},
                timestamp: Date.now()
            }});
        }};
        
        // Переопределяем watchPosition
        navigator.geolocation.watchPosition = function(success, error, options) {{
            success({{
                coords: {{
                    latitude: LATITUDE,
                    longitude: LONGITUDE,
                    accuracy: ACCURACY,
                    altitude: null,
                    altitudeAccuracy: null,
                    heading: null,
                    speed: null
                }},
                timestamp: Date.now()
            }});
            return 1;
        }};
    }}
}})();
'''
