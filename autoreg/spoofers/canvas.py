"""
Спуфинг Canvas fingerprint

Добавляет консистентный шум к toDataURL и getImageData.
"""

from .base import BaseSpoofModule


class CanvasSpoofModule(BaseSpoofModule):
    """Спуфинг Canvas fingerprint"""
    
    name = "canvas"
    description = "Spoof canvas fingerprint with noise"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    const NOISE_SEED = {p.noise_seed};
    
    // ============================================
    // PRNG для консистентного шума (Mulberry32)
    // ============================================
    const mulberry32 = (seed) => {{
        return () => {{
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }};
    }};
    
    const rng = mulberry32(NOISE_SEED);
    
    // ============================================
    // toDataURL - добавляем шум
    // ============================================
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type, quality) {{
        if (this.width > 0 && this.height > 0) {{
            try {{
                const ctx = this.getContext('2d');
                if (ctx) {{
                    const w = Math.min(this.width, 4);
                    const h = Math.min(this.height, 4);
                    const imageData = ctx.getImageData(0, 0, w, h);
                    const data = imageData.data;
                    
                    for (let i = 0; i < data.length; i += 4) {{
                        const noise = Math.floor(rng() * 3) - 1;
                        data[i] = Math.max(0, Math.min(255, data[i] + noise));
                    }}
                    ctx.putImageData(imageData, 0, 0);
                }}
            }} catch(e) {{}}
        }}
        return originalToDataURL.call(this, type, quality);
    }};
    
    // ============================================
    // getImageData - добавляем шум
    // ============================================
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {{
        const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
        const data = imageData.data;
        
        for (let i = 0; i < Math.min(data.length, 64); i += 4) {{
            const noise = Math.floor(rng() * 3) - 1;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
        }}
        return imageData;
    }};
}})();
'''
