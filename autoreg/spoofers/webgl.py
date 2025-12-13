"""
Спуфинг WebGL fingerprint

Подменяет UNMASKED_VENDOR_WEBGL и UNMASKED_RENDERER_WEBGL.
"""

from .base import BaseSpoofModule


class WebGLSpoofModule(BaseSpoofModule):
    """Спуфинг WebGL параметров"""
    
    name = "webgl"
    description = "Spoof WebGL vendor/renderer"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    const WEBGL_VENDOR = '{p.webgl_vendor}';
    const WEBGL_RENDERER = '{p.webgl_renderer}';
    
    // ============================================
    // WEBGL PARAMETERS
    // app-min.js проверяет: UNMASKED_VENDOR_WEBGL (37445), UNMASKED_RENDERER_WEBGL (37446)
    // ============================================
    
    const spoofWebGL = (proto) => {{
        const originalGetParameter = proto.getParameter;
        proto.getParameter = function(param) {{
            if (param === 37445) return WEBGL_VENDOR;   // UNMASKED_VENDOR_WEBGL
            if (param === 37446) return WEBGL_RENDERER; // UNMASKED_RENDERER_WEBGL
            if (param === 7936) return WEBGL_VENDOR;    // VENDOR
            if (param === 7937) return WEBGL_RENDERER;  // RENDERER
            return originalGetParameter.call(this, param);
        }};
        
        // Спуфим getExtension для WEBGL_debug_renderer_info
        const originalGetExtension = proto.getExtension;
        proto.getExtension = function(name) {{
            const ext = originalGetExtension.call(this, name);
            if (name === 'WEBGL_debug_renderer_info' && ext) {{
                return {{
                    UNMASKED_VENDOR_WEBGL: 37445,
                    UNMASKED_RENDERER_WEBGL: 37446
                }};
            }}
            return ext;
        }};
    }};
    
    try {{
        spoofWebGL(WebGLRenderingContext.prototype);
        if (typeof WebGL2RenderingContext !== 'undefined') {{
            spoofWebGL(WebGL2RenderingContext.prototype);
        }}
    }} catch(e) {{}}
}})();
'''
