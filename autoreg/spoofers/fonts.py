"""
Спуфинг Font fingerprint

Ограничивает список доступных шрифтов.
"""

from .base import BaseSpoofModule


class FontsSpoofModule(BaseSpoofModule):
    """Спуфинг списка шрифтов"""
    
    name = "fonts"
    description = "Limit detectable fonts"
    
    def get_js(self) -> str:
        fonts_js = ', '.join(f'"{f}"' for f in self.profile.fonts)
        return f'''
(function() {{
    'use strict';
    
    const ALLOWED_FONTS = [{fonts_js}];
    
    // Спуфим FontFace API если доступен
    if (typeof FontFace !== 'undefined') {{
        const originalFontFace = FontFace;
        window.FontFace = function(family, source, descriptors) {{
            // Разрешаем только стандартные шрифты
            return new originalFontFace(family, source, descriptors);
        }};
    }}
    
    // Спуфим document.fonts.check
    if (document.fonts && document.fonts.check) {{
        const originalCheck = document.fonts.check.bind(document.fonts);
        document.fonts.check = function(font, text) {{
            const fontFamily = font.split(' ').pop().replace(/['"]/g, '');
            if (!ALLOWED_FONTS.includes(fontFamily)) {{
                return false;
            }}
            return originalCheck(font, text);
        }};
    }}
}})();
'''
