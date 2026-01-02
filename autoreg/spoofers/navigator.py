"""
Спуфинг navigator properties

Подменяет platform, vendor, languages, plugins, mimeTypes.
КРИТИЧНО: Правильно спуфит prototype для PluginArray/Plugin/MimeTypeArray!
"""

from .base import BaseSpoofModule


class NavigatorSpoofModule(BaseSpoofModule):
    """Спуфинг свойств navigator"""
    
    name = "navigator"
    description = "Spoof navigator properties (with prototype fix)"
    
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
    // PROTOTYPE FIX FOR PLUGINARRAY/PLUGIN/MIMETYPEARRAY
    // КРИТИЧНО: AWS FWCIM проверяет constructor.name!
    // ============================================
    
    // Сохраняем оригинальные прототипы
    const originalPluginArray = window.PluginArray;
    const originalPlugin = window.Plugin;
    const originalMimeTypeArray = window.MimeTypeArray;
    const originalMimeType = window.MimeType;
    
    // Фиксим Symbol.toStringTag для правильного Object.prototype.toString.call()
    try {{
        if (originalPluginArray && originalPluginArray.prototype) {{
            Object.defineProperty(originalPluginArray.prototype, Symbol.toStringTag, {{
                value: 'PluginArray',
                configurable: true
            }});
        }}
    }} catch(e) {{}}
    
    try {{
        if (originalPlugin && originalPlugin.prototype) {{
            Object.defineProperty(originalPlugin.prototype, Symbol.toStringTag, {{
                value: 'Plugin',
                configurable: true
            }});
        }}
    }} catch(e) {{}}
    
    try {{
        if (originalMimeTypeArray && originalMimeTypeArray.prototype) {{
            Object.defineProperty(originalMimeTypeArray.prototype, Symbol.toStringTag, {{
                value: 'MimeTypeArray',
                configurable: true
            }});
        }}
    }} catch(e) {{}}
    
    try {{
        if (originalMimeType && originalMimeType.prototype) {{
            Object.defineProperty(originalMimeType.prototype, Symbol.toStringTag, {{
                value: 'MimeType',
                configurable: true
            }});
        }}
    }} catch(e) {{}}
    
    // ============================================
    // PLUGINS (app-min.js итерирует через item(r))
    // Используем оригинальные прототипы!
    // ============================================
    
    // Создаём MimeType с правильным прототипом
    const createMimeType = (type, suffixes, description, enabledPlugin) => {{
        const mt = Object.create(originalMimeType ? originalMimeType.prototype : Object.prototype);
        Object.defineProperties(mt, {{
            type: {{ value: type, enumerable: true }},
            suffixes: {{ value: suffixes, enumerable: true }},
            description: {{ value: description, enumerable: true }},
            enabledPlugin: {{ value: enabledPlugin, enumerable: true }}
        }});
        return mt;
    }};
    
    // Создаём Plugin с правильным прототипом
    const createPlugin = (name, filename, description, mimeTypes = []) => {{
        const plugin = Object.create(originalPlugin ? originalPlugin.prototype : Object.prototype);
        
        Object.defineProperties(plugin, {{
            name: {{ value: name, enumerable: true }},
            filename: {{ value: filename, enumerable: true }},
            description: {{ value: description, enumerable: true }},
            version: {{ value: '', enumerable: true }},
            length: {{ value: mimeTypes.length, enumerable: true }}
        }});
        
        // Добавляем методы
        plugin.item = function(i) {{ return mimeTypes[i]; }};
        plugin.namedItem = function(n) {{ return mimeTypes.find(m => m.type === n); }};
        plugin[Symbol.iterator] = function* () {{
            for (let i = 0; i < mimeTypes.length; i++) yield mimeTypes[i];
        }};
        
        // Добавляем индексированный доступ
        mimeTypes.forEach((mt, i) => {{
            Object.defineProperty(plugin, i, {{ value: mt, enumerable: true }});
        }});
        
        return plugin;
    }};
    
    // Создаём PDF MimeType
    const pdfMimeType = createMimeType('application/pdf', 'pdf', 'Portable Document Format', null);
    
    // Создаём плагины
    const plugin1 = createPlugin('Chrome PDF Plugin', 'internal-pdf-viewer', 'Portable Document Format', [pdfMimeType]);
    const plugin2 = createPlugin('Chrome PDF Viewer', 'mhjfbmdgcfjbbpaeojofohoefgiehjai', '', [pdfMimeType]);
    const plugin3 = createPlugin('Native Client', 'internal-nacl-plugin', '', []);
    
    // Обновляем enabledPlugin
    Object.defineProperty(pdfMimeType, 'enabledPlugin', {{ value: plugin1, enumerable: true }});
    
    const fakePlugins = [plugin1, plugin2, plugin3];
    
    // Создаём PluginArray с правильным прототипом
    const pluginArray = Object.create(originalPluginArray ? originalPluginArray.prototype : Object.prototype);
    
    Object.defineProperty(pluginArray, 'length', {{ value: fakePlugins.length, enumerable: true }});
    
    pluginArray.item = function(i) {{ return fakePlugins[i]; }};
    pluginArray.namedItem = function(name) {{ return fakePlugins.find(p => p.name === name); }};
    pluginArray.refresh = function() {{}};
    pluginArray[Symbol.iterator] = function* () {{
        for (let i = 0; i < fakePlugins.length; i++) yield fakePlugins[i];
    }};
    
    fakePlugins.forEach((p, i) => {{
        Object.defineProperty(pluginArray, i, {{ value: p, enumerable: true }});
    }});
    
    Object.defineProperty(navigator, 'plugins', {{
        get: () => pluginArray,
        configurable: true
    }});
    
    // ============================================
    // MIME TYPES с правильным прототипом
    // ============================================
    const mimeTypeArray = Object.create(originalMimeTypeArray ? originalMimeTypeArray.prototype : Object.prototype);
    
    Object.defineProperty(mimeTypeArray, 'length', {{ value: 1, enumerable: true }});
    Object.defineProperty(mimeTypeArray, 0, {{ value: pdfMimeType, enumerable: true }});
    
    mimeTypeArray.item = function(i) {{ return i === 0 ? pdfMimeType : undefined; }};
    mimeTypeArray.namedItem = function(name) {{ return name === 'application/pdf' ? pdfMimeType : undefined; }};
    mimeTypeArray[Symbol.iterator] = function* () {{ yield pdfMimeType; }};
    
    Object.defineProperty(navigator, 'mimeTypes', {{
        get: () => mimeTypeArray,
        configurable: true
    }});
    
    // ============================================
    // PERMISSIONS API FIX
    // Headless браузеры часто имеют 'denied' для notifications
    // ============================================
    if (navigator.permissions && navigator.permissions.query) {{
        const originalQuery = navigator.permissions.query.bind(navigator.permissions);
        navigator.permissions.query = function(params) {{
            // Для notifications возвращаем 'prompt' вместо 'denied'
            if (params.name === 'notifications') {{
                return Promise.resolve({{
                    state: 'prompt',
                    onchange: null,
                    addEventListener: function() {{}},
                    removeEventListener: function() {{}},
                    dispatchEvent: function() {{ return true; }}
                }});
            }}
            return originalQuery(params);
        }};
    }}
    
    // Также спуфим Notification.permission
    try {{
        Object.defineProperty(Notification, 'permission', {{
            get: () => 'default',
            configurable: true
        }});
    }} catch(e) {{}}
}})();
'''
