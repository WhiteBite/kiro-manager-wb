"""
Спуфинг screen properties

Подменяет width, height, availWidth, availHeight, colorDepth, deviceXDPI.
"""

from .base import BaseSpoofModule


class ScreenSpoofModule(BaseSpoofModule):
    """Спуфинг свойств экрана"""
    
    name = "screen"
    description = "Spoof screen properties"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    // ============================================
    // SCREEN PROPERTIES
    // app-min.js собирает: width-height-availHeight-colorDepth-deviceXDPI-logicalXDPI-fontSmoothing
    // ============================================
    
    Object.defineProperty(screen, 'width', {{
        get: () => {p.screen_width},
        configurable: true
    }});
    
    Object.defineProperty(screen, 'height', {{
        get: () => {p.screen_height},
        configurable: true
    }});
    
    Object.defineProperty(screen, 'availWidth', {{
        get: () => {p.avail_width},
        configurable: true
    }});
    
    Object.defineProperty(screen, 'availHeight', {{
        get: () => {p.avail_height},
        configurable: true
    }});
    
    Object.defineProperty(screen, 'colorDepth', {{
        get: () => {p.color_depth},
        configurable: true
    }});
    
    Object.defineProperty(screen, 'pixelDepth', {{
        get: () => {p.color_depth},
        configurable: true
    }});
    
    // ============================================
    // IE-SPECIFIC (app-min.js проверяет)
    // ============================================
    Object.defineProperty(screen, 'deviceXDPI', {{
        get: () => 96,
        configurable: true
    }});
    
    Object.defineProperty(screen, 'logicalXDPI', {{
        get: () => 96,
        configurable: true
    }});
    
    Object.defineProperty(screen, 'fontSmoothingEnabled', {{
        get: () => true,
        configurable: true
    }});
    
    // ============================================
    // WINDOW DIMENSIONS
    // ============================================
    Object.defineProperty(window, 'innerWidth', {{
        get: () => {p.screen_width},
        configurable: true
    }});
    
    Object.defineProperty(window, 'innerHeight', {{
        get: () => {p.avail_height},
        configurable: true
    }});
    
    Object.defineProperty(window, 'outerWidth', {{
        get: () => {p.screen_width},
        configurable: true
    }});
    
    Object.defineProperty(window, 'outerHeight', {{
        get: () => {p.screen_height},
        configurable: true
    }});
    
    Object.defineProperty(window, 'devicePixelRatio', {{
        get: () => {p.pixel_ratio},
        configurable: true
    }});
}})();
'''
