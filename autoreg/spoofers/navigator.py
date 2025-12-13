"""
Спуфинг navigator properties

Подменяет platform, vendor, languages, plugins, mimeTypes.
"""

from .base import BaseSpoofModule


class NavigatorSpoofModule(BaseSpoofModule):
    """Спуфинг свойств navigator"""
    
    name = "navigator"
    description = "Spoof navigator properties"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    // ============================================
    // BASIC NAVIGATOR PROPERTIES
    // ============================================
    Object.defineProperty(navigator, 'platform', {{
        get: () => '{p.platform}',
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'vendor', {{
        get: () => '{p.vendor}',
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'hardwareConcurrency', {{
        get: () => {p.hardware_concurrency},
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'deviceMemory', {{
        get: () => {p.device_memory},
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'maxTouchPoints', {{
        get: () => {p.max_touch_points},
        configurable: true
    }});
    
    // ============================================
    // LANGUAGE (app-min.js проверяет отдельно)
    // ============================================
    Object.defineProperty(navigator, 'language', {{
        get: () => '{p.locale}',
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'userLanguage', {{
        get: () => '{p.locale}',
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'languages', {{
        get: () => ['{p.locale}', 'en'],
        configurable: true
    }});
    
    // ============================================
    // DO NOT TRACK
    // ============================================
    Object.defineProperty(navigator, 'doNotTrack', {{
        get: () => null,
        configurable: true
    }});
    
    Object.defineProperty(navigator, 'msDoNotTrack', {{
        get: () => undefined,
        configurable: true
    }});
    
    Object.defineProperty(window, 'doNotTrack', {{
        get: () => undefined,
        configurable: true
    }});
    
    // ============================================
    // PLUGINS (app-min.js итерирует через item(r))
    // ============================================
    const createPlugin = (name, filename, description, version = '') => {{
        const mimeTypes = name.includes('PDF') ? [{{
            type: 'application/pdf',
            suffixes: 'pdf',
            description: 'Portable Document Format',
            enabledPlugin: null
        }}] : [];
        
        const plugin = {{
            name,
            filename,
            description,
            version,
            length: mimeTypes.length,
            item: function(i) {{ return mimeTypes[i]; }},
            namedItem: (n) => mimeTypes.find(m => m.type === n),
            [Symbol.iterator]: function* () {{
                for (let i = 0; i < mimeTypes.length; i++) yield mimeTypes[i];
            }}
        }};
        mimeTypes.forEach((mt, i) => {{ plugin[i] = mt; }});
        return plugin;
    }};
    
    const fakePlugins = [
        createPlugin('Chrome PDF Plugin', 'internal-pdf-viewer', 'Portable Document Format'),
        createPlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', ''),
        createPlugin('Native Client', 'internal-nacl-plugin', ''),
    ];
    
    const pluginArray = {{
        length: fakePlugins.length,
        item: function(i) {{ return fakePlugins[i]; }},
        namedItem: (name) => fakePlugins.find(p => p.name === name),
        refresh: () => {{}},
        [Symbol.iterator]: function* () {{
            for (let i = 0; i < fakePlugins.length; i++) yield fakePlugins[i];
        }}
    }};
    fakePlugins.forEach((p, i) => {{ pluginArray[i] = p; }});
    
    Object.defineProperty(navigator, 'plugins', {{
        get: () => pluginArray,
        configurable: true
    }});
    
    // ============================================
    // MIME TYPES
    // ============================================
    const pdfMime = {{
        type: 'application/pdf',
        suffixes: 'pdf',
        description: 'Portable Document Format',
        enabledPlugin: fakePlugins[0]
    }};
    
    const mimeTypeArray = {{
        length: 1,
        item: function(i) {{ return i === 0 ? pdfMime : undefined; }},
        namedItem: (name) => name === 'application/pdf' ? pdfMime : undefined,
        0: pdfMime,
        [Symbol.iterator]: function* () {{ yield pdfMime; }}
    }};
    
    Object.defineProperty(navigator, 'mimeTypes', {{
        get: () => mimeTypeArray,
        configurable: true
    }});
}})();
'''
