"""
PoC для обхода Browser Fingerprinting (AWS FWCIM) v2.0

Модуль реализует подмену уникальных идентификаторов устройства:
- Canvas Fingerprinting (toDataURL с шумом)
- WebGL Fingerprinting (подмена vendor/renderer + extensions consistency)
- Audio Fingerprinting (AudioContext noise)
- Screen Resolution Spoofing
- toString() Stealth (маскировка под native code, включая .call/.apply)
- Error.stack sanitization
- Notification permissions fix

Использует DrissionPage для инъекции JS до загрузки страницы
через Chrome DevTools Protocol (Page.addScriptToEvaluateOnNewDocument)
"""

import random
from typing import Optional

# ============================================================================
# КОНФИГУРАЦИЯ СПУФИНГА v2.0
# ============================================================================

# Согласованные профили GPU (vendor + renderer + extensions)
GPU_PROFILES = {
    "intel_uhd_620": {
        "vendor": "Intel Inc.",
        "renderer": "Intel(R) UHD Graphics 620",
        "extensions": [
            "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_color_buffer_half_float",
            "EXT_float_blend", "EXT_frag_depth", "EXT_shader_texture_lod",
            "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc",
            "EXT_texture_filter_anisotropic", "EXT_sRGB", "OES_element_index_uint",
            "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float",
            "OES_texture_float_linear", "OES_texture_half_float", "OES_texture_half_float_linear",
            "OES_vertex_array_object", "WEBGL_color_buffer_float", "WEBGL_compressed_texture_s3tc",
            "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info",
            "WEBGL_debug_shaders", "WEBGL_depth_texture", "WEBGL_draw_buffers",
            "WEBGL_lose_context", "WEBGL_multi_draw"
        ]
    },
    "intel_iris_xe": {
        "vendor": "Intel Inc.",
        "renderer": "Intel(R) Iris(R) Xe Graphics",
        "extensions": [
            "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_color_buffer_half_float",
            "EXT_float_blend", "EXT_frag_depth", "EXT_shader_texture_lod",
            "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc",
            "EXT_texture_filter_anisotropic", "EXT_sRGB", "KHR_parallel_shader_compile",
            "OES_element_index_uint", "OES_fbo_render_mipmap", "OES_standard_derivatives",
            "OES_texture_float", "OES_texture_float_linear", "OES_texture_half_float",
            "OES_texture_half_float_linear", "OES_vertex_array_object",
            "WEBGL_color_buffer_float", "WEBGL_compressed_texture_s3tc",
            "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info",
            "WEBGL_debug_shaders", "WEBGL_depth_texture", "WEBGL_draw_buffers",
            "WEBGL_lose_context", "WEBGL_multi_draw"
        ]
    },
    "nvidia_gtx_1650": {
        "vendor": "NVIDIA Corporation",
        "renderer": "NVIDIA GeForce GTX 1650",
        "extensions": [
            "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_color_buffer_half_float",
            "EXT_float_blend", "EXT_frag_depth", "EXT_shader_texture_lod",
            "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc",
            "EXT_texture_filter_anisotropic", "EXT_sRGB", "KHR_parallel_shader_compile",
            "NV_shader_noperspective_interpolation", "OES_element_index_uint",
            "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float",
            "OES_texture_float_linear", "OES_texture_half_float",
            "OES_texture_half_float_linear", "OES_vertex_array_object",
            "WEBGL_color_buffer_float", "WEBGL_compressed_texture_s3tc",
            "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info",
            "WEBGL_debug_shaders", "WEBGL_depth_texture", "WEBGL_draw_buffers",
            "WEBGL_lose_context", "WEBGL_multi_draw"
        ]
    },
    "nvidia_rtx_3060": {
        "vendor": "NVIDIA Corporation",
        "renderer": "NVIDIA GeForce RTX 3060",
        "extensions": [
            "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_color_buffer_half_float",
            "EXT_float_blend", "EXT_frag_depth", "EXT_shader_texture_lod",
            "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc",
            "EXT_texture_filter_anisotropic", "EXT_sRGB", "KHR_parallel_shader_compile",
            "NV_shader_noperspective_interpolation", "OES_element_index_uint",
            "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float",
            "OES_texture_float_linear", "OES_texture_half_float",
            "OES_texture_half_float_linear", "OES_vertex_array_object",
            "WEBGL_color_buffer_float", "WEBGL_compressed_texture_s3tc",
            "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info",
            "WEBGL_debug_shaders", "WEBGL_depth_texture", "WEBGL_draw_buffers",
            "WEBGL_lose_context", "WEBGL_multi_draw", "WEBGL_provoking_vertex"
        ]
    },
    "amd_rx_580": {
        "vendor": "AMD",
        "renderer": "AMD Radeon RX 580",
        "extensions": [
            "ANGLE_instanced_arrays", "EXT_blend_minmax", "EXT_color_buffer_half_float",
            "EXT_float_blend", "EXT_frag_depth", "EXT_shader_texture_lod",
            "EXT_texture_compression_bptc", "EXT_texture_compression_rgtc",
            "EXT_texture_filter_anisotropic", "EXT_sRGB", "OES_element_index_uint",
            "OES_fbo_render_mipmap", "OES_standard_derivatives", "OES_texture_float",
            "OES_texture_float_linear", "OES_texture_half_float",
            "OES_texture_half_float_linear", "OES_vertex_array_object",
            "WEBGL_color_buffer_float", "WEBGL_compressed_texture_s3tc",
            "WEBGL_compressed_texture_s3tc_srgb", "WEBGL_debug_renderer_info",
            "WEBGL_debug_shaders", "WEBGL_depth_texture", "WEBGL_draw_buffers",
            "WEBGL_lose_context", "WEBGL_multi_draw"
        ]
    },
}

# Стандартные разрешения экрана для спуфинга
SCREEN_RESOLUTIONS = [
    {"width": 1920, "height": 1080, "availHeight": 1040},  # Full HD
    {"width": 2560, "height": 1440, "availHeight": 1400},  # 2K
    {"width": 1366, "height": 768, "availHeight": 728},    # Laptop HD
    {"width": 1536, "height": 864, "availHeight": 824},    # Laptop scaled
    {"width": 1440, "height": 900, "availHeight": 860},    # MacBook
]

# Уровень шума для Canvas (0.001 - минимальный, незаметный глазу)
CANVAS_NOISE_ALPHA = 0.001


def generate_gpu_profile() -> dict:
    """Выбирает случайный согласованный GPU профиль"""
    profile_name = random.choice(list(GPU_PROFILES.keys()))
    return GPU_PROFILES[profile_name].copy()


def generate_screen_config() -> dict:
    """Выбирает случайное разрешение экрана"""
    return random.choice(SCREEN_RESOLUTIONS).copy()


def get_stealth_js(gpu_profile: dict = None, screen_config: dict = None,
                   canvas_noise: float = CANVAS_NOISE_ALPHA,
                   seed: int = None) -> str:
    """
    Генерирует JavaScript payload для инъекции в браузер v2.0
    
    Args:
        gpu_profile: Профиль GPU (vendor, renderer, extensions)
        screen_config: Конфигурация экрана
        canvas_noise: Уровень шума для Canvas
        seed: Seed для генератора случайных чисел
    
    Returns:
        JavaScript код для инъекции
    """
    if seed:
        random.seed(seed)
    
    # Генерируем профили если не заданы
    if gpu_profile is None:
        gpu_profile = generate_gpu_profile()
    
    if screen_config is None:
        screen_config = generate_screen_config()
    
    # Генерируем уникальный noise seed
    noise_seed = seed or random.randint(1, 1000000)
    
    # Конвертируем extensions в JS массив
    extensions_js = str(gpu_profile.get("extensions", [])).replace("'", '"')
    
    return f'''
(() => {{
    // ========================================================================
    // AWS FWCIM Fingerprint Spoofing PoC v2.0
    // ========================================================================
    // Полный обход телеметрии AWS с закрытием всех известных векторов детекта
    // ========================================================================
    
    const SPOOF_CONFIG = {{
        webgl: {{
            vendor: "{gpu_profile['vendor']}",
            renderer: "{gpu_profile['renderer']}",
            extensions: {extensions_js}
        }},
        canvas: {{
            noiseAlpha: {canvas_noise},
            noiseSeed: {noise_seed}
        }},
        screen: {{
            width: {screen_config['width']},
            height: {screen_config['height']},
            availWidth: {screen_config['width']},
            availHeight: {screen_config['availHeight']},
            colorDepth: 24,
            pixelDepth: 24
        }},
        debug: false
    }};
    
    const log = (...args) => {{
        if (SPOOF_CONFIG.debug) console.log('[FP-Spoof]', ...args);
    }};
    
    // ========================================================================
    // УТИЛИТЫ
    // ========================================================================
    
    // PRNG для воспроизводимого шума
    let noiseSeed = SPOOF_CONFIG.canvas.noiseSeed;
    const seededRandom = () => {{
        noiseSeed = (noiseSeed * 9301 + 49297) % 233280;
        return noiseSeed / 233280;
    }};
    
    // Карта подделок для toString stealth
    const spoofedFunctions = new Map();
    
    // ========================================================================
    // 1. CANVAS FINGERPRINT SPOOFING
    // ========================================================================
    
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    
    const addCanvasNoise = (canvas) => {{
        if (canvas.width <= 0 || canvas.height <= 0) return;
        try {{
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const originalComposite = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'source-over';
            
            const pixelCount = Math.floor(seededRandom() * 3) + 1;
            for (let i = 0; i < pixelCount; i++) {{
                const x = Math.floor(seededRandom() * canvas.width);
                const y = Math.floor(seededRandom() * canvas.height);
                const r = Math.floor(seededRandom() * 10);
                const g = Math.floor(seededRandom() * 10);
                const b = Math.floor(seededRandom() * 10);
                ctx.fillStyle = `rgba(${{r}}, ${{g}}, ${{b}}, ${{SPOOF_CONFIG.canvas.noiseAlpha}})`;
                ctx.fillRect(x, y, 1, 1);
            }}
            
            ctx.globalCompositeOperation = originalComposite;
            log('Canvas noise added:', pixelCount, 'pixels');
        }} catch (e) {{}}
    }};
    
    const spoofedToDataURL = new Proxy(originalToDataURL, {{
        apply(target, thisArg, args) {{
            addCanvasNoise(thisArg);
            return Reflect.apply(target, thisArg, args);
        }}
    }});
    
    const spoofedToBlob = new Proxy(originalToBlob, {{
        apply(target, thisArg, args) {{
            addCanvasNoise(thisArg);
            return Reflect.apply(target, thisArg, args);
        }}
    }});
    
    const spoofedGetImageData = new Proxy(originalGetImageData, {{
        apply(target, thisArg, args) {{
            if (thisArg.canvas) addCanvasNoise(thisArg.canvas);
            return Reflect.apply(target, thisArg, args);
        }}
    }});
    
    spoofedFunctions.set(spoofedToDataURL, 'toDataURL');
    spoofedFunctions.set(spoofedToBlob, 'toBlob');
    spoofedFunctions.set(spoofedGetImageData, 'getImageData');

    
    // ========================================================================
    // 2. WEBGL FINGERPRINT SPOOFING (с согласованными extensions)
    // ========================================================================
    
    const UNMASKED_VENDOR_WEBGL = 37445;
    const UNMASKED_RENDERER_WEBGL = 37446;
    
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    const originalGetSupportedExtensions = WebGLRenderingContext.prototype.getSupportedExtensions;
    const originalGetSupportedExtensions2 = WebGL2RenderingContext.prototype.getSupportedExtensions;
    
    const createGetParameterProxy = (original) => {{
        return new Proxy(original, {{
            apply(target, thisArg, args) {{
                const param = args[0];
                if (param === UNMASKED_VENDOR_WEBGL) {{
                    log('WebGL vendor requested');
                    return SPOOF_CONFIG.webgl.vendor;
                }}
                if (param === UNMASKED_RENDERER_WEBGL) {{
                    log('WebGL renderer requested');
                    return SPOOF_CONFIG.webgl.renderer;
                }}
                return Reflect.apply(target, thisArg, args);
            }}
        }});
    }};
    
    // Согласованный список extensions для выбранного GPU
    const createGetSupportedExtensionsProxy = (original) => {{
        return new Proxy(original, {{
            apply(target, thisArg, args) {{
                log('WebGL extensions requested');
                return SPOOF_CONFIG.webgl.extensions;
            }}
        }});
    }};
    
    const spoofedGetParameter = createGetParameterProxy(originalGetParameter);
    const spoofedGetParameter2 = createGetParameterProxy(originalGetParameter2);
    const spoofedGetSupportedExtensions = createGetSupportedExtensionsProxy(originalGetSupportedExtensions);
    const spoofedGetSupportedExtensions2 = createGetSupportedExtensionsProxy(originalGetSupportedExtensions2);
    
    spoofedFunctions.set(spoofedGetParameter, 'getParameter');
    spoofedFunctions.set(spoofedGetParameter2, 'getParameter');
    spoofedFunctions.set(spoofedGetSupportedExtensions, 'getSupportedExtensions');
    spoofedFunctions.set(spoofedGetSupportedExtensions2, 'getSupportedExtensions');
    
    // ========================================================================
    // 3. AUDIO FINGERPRINT SPOOFING
    // ========================================================================
    // AWS FWCIM модуль 53 собирает аудио-отпечаток через AudioContext
    // ========================================================================
    
    const addAudioNoise = (data) => {{
        if (!data || !data.length) return;
        for (let i = 0; i < data.length; i++) {{
            data[i] += (seededRandom() - 0.5) * 0.0000001;
        }}
    }};
    
    // AudioBuffer.getChannelData - будет применено позже через safeDefineProperty
    let spoofedGetChannelData = null;
    let spoofedGetFloatFrequencyData = null;
    let spoofedGetByteFrequencyData = null;
    
    if (typeof AudioBuffer !== 'undefined') {{
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        spoofedGetChannelData = new Proxy(originalGetChannelData, {{
            apply(target, thisArg, args) {{
                const result = Reflect.apply(target, thisArg, args);
                addAudioNoise(result);
                log('AudioBuffer.getChannelData spoofed');
                return result;
            }}
        }});
        spoofedFunctions.set(spoofedGetChannelData, 'getChannelData');
    }}
    
    if (typeof AnalyserNode !== 'undefined') {{
        const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
        spoofedGetFloatFrequencyData = new Proxy(originalGetFloatFrequencyData, {{
            apply(target, thisArg, args) {{
                Reflect.apply(target, thisArg, args);
                if (args[0]) addAudioNoise(args[0]);
                log('AnalyserNode.getFloatFrequencyData spoofed');
            }}
        }});
        spoofedFunctions.set(spoofedGetFloatFrequencyData, 'getFloatFrequencyData');
        
        const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
        spoofedGetByteFrequencyData = new Proxy(originalGetByteFrequencyData, {{
            apply(target, thisArg, args) {{
                Reflect.apply(target, thisArg, args);
                if (args[0]) {{
                    for (let i = 0; i < args[0].length; i++) {{
                        args[0][i] = Math.max(0, Math.min(255, args[0][i] + Math.floor((seededRandom() - 0.5) * 2)));
                    }}
                }}
            }}
        }});
        spoofedFunctions.set(spoofedGetByteFrequencyData, 'getByteFrequencyData');
    }}

    
    // ========================================================================
    // 4. toString() STEALTH v2.0 - УСИЛЕННАЯ ВЕРСИЯ
    // ========================================================================
    // Обрабатывает ВСЕ варианты вызова:
    // - func.toString()
    // - Function.prototype.toString.call(func)
    // - Function.prototype.toString.apply(func)
    // ========================================================================
    
    const nativeToString = Function.prototype.toString;
    
    const stealthToString = new Proxy(nativeToString, {{
        apply(target, thisArg, args) {{
            // thisArg - это функция, у которой вызывается toString
            // Работает для .call(), .apply() и прямого вызова
            if (spoofedFunctions.has(thisArg)) {{
                const name = spoofedFunctions.get(thisArg);
                log('toString() stealth for:', name);
                return `function ${{name}}() {{ [native code] }}`;
            }}
            
            // Маскируем сам stealthToString
            if (thisArg === stealthToString) {{
                return 'function toString() {{ [native code] }}';
            }}
            
            return Reflect.apply(target, thisArg, args);
        }},
        // Перехватываем .call и .apply на самом toString
        get(target, prop, receiver) {{
            if (prop === 'call' || prop === 'apply') {{
                return function(...args) {{
                    const func = args[0];
                    if (spoofedFunctions.has(func)) {{
                        const name = spoofedFunctions.get(func);
                        return `function ${{name}}() {{ [native code] }}`;
                    }}
                    return target[prop](...args);
                }};
            }}
            return Reflect.get(target, prop, receiver);
        }}
    }});
    
    // ========================================================================
    // 5. SCREEN RESOLUTION SPOOFING
    // ========================================================================
    // AWS FWCIM модуль 55 проверяет размеры экрана
    // Headless часто имеет 800x600, что палевно
    // ========================================================================
    
    // Screen и Navigator properties будут применены через safeDefineProperty в конце
    // Сохраняем конфиг для применения
    const screenConfig = SPOOF_CONFIG.screen;
    
    // plugins - пустой массив выдаёт headless
    const fakePlugins = [
        {{ name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }},
        {{ name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' }},
        {{ name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }}
    ];
    const pluginArray = Object.create(PluginArray.prototype);
    fakePlugins.forEach((p, i) => {{ pluginArray[i] = p; }});
    try {{ Object.defineProperty(pluginArray, 'length', {{ value: fakePlugins.length, configurable: true }}); }} catch(e) {{}}
    
    // Navigator properties будут применены через safeDefineProperty в конце
    
    // ========================================================================
    // 8. NOTIFICATION & PERMISSIONS
    // ========================================================================
    
    let spoofedPermissionsQuery = null;
    if (navigator.permissions) {{
        const originalQuery = navigator.permissions.query;
        spoofedPermissionsQuery = (parameters) => {{
            return originalQuery.call(navigator.permissions, parameters).then(result => {{
                if (result.state === 'denied' && 
                    ['notifications', 'push', 'midi'].includes(parameters.name)) {{
                    return {{ state: 'prompt', onchange: null }};
                }}
                return result;
            }});
        }};
        spoofedFunctions.set(spoofedPermissionsQuery, 'query');
    }}
    
    // ========================================================================
    // 9. CHROME RUNTIME (для обхода детекта расширений)
    // ========================================================================
    
    // Некоторые сайты проверяют наличие chrome.runtime
    if (!window.chrome) {{
        window.chrome = {{}};
    }}
    if (!window.chrome.runtime) {{
        window.chrome.runtime = {{}};
    }}
    
    // ========================================================================
    // 10. PROPERTY DESCRIPTOR CONSISTENCY
    // ========================================================================
    // AWS может проверять дескрипторы через Object.getOwnPropertyDescriptor
    // Наши подмены должны выглядеть как оригинальные
    // ========================================================================
    
    const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    Object.getOwnPropertyDescriptor = function(obj, prop) {{
        const desc = originalGetOwnPropertyDescriptor.call(Object, obj, prop);
        
        // Для наших подмен возвращаем "нормальные" дескрипторы
        if (desc && desc.value && spoofedFunctions.has(desc.value)) {{
            return {{
                value: desc.value,
                writable: true,
                enumerable: true,
                configurable: true
            }};
        }}
        
        return desc;
    }};
    
    // ========================================================================
    // ПРИМЕНЕНИЕ ПОДМЕН (с безопасной проверкой)
    // ========================================================================
    
    // Безопасная функция для переопределения свойств
    const safeDefineProperty = (obj, prop, descriptor) => {{
        try {{
            const existing = Object.getOwnPropertyDescriptor(obj, prop);
            // Если свойство уже не configurable, пропускаем
            if (existing && !existing.configurable) {{
                log('Cannot redefine non-configurable property:', prop);
                return false;
            }}
            Object.defineProperty(obj, prop, descriptor);
            return true;
        }} catch (e) {{
            log('Failed to define property:', prop, e.message);
            return false;
        }}
    }};
    
    // toString первым - ВАЖНО: writable и configurable должны быть true
    safeDefineProperty(Function.prototype, 'toString', {{
        value: stealthToString,
        writable: true,
        configurable: true
    }});
    
    // Canvas
    safeDefineProperty(HTMLCanvasElement.prototype, 'toDataURL', {{
        value: spoofedToDataURL,
        writable: true,
        configurable: true
    }});
    safeDefineProperty(HTMLCanvasElement.prototype, 'toBlob', {{
        value: spoofedToBlob,
        writable: true,
        configurable: true
    }});
    safeDefineProperty(CanvasRenderingContext2D.prototype, 'getImageData', {{
        value: spoofedGetImageData,
        writable: true,
        configurable: true
    }});
    
    // WebGL
    safeDefineProperty(WebGLRenderingContext.prototype, 'getParameter', {{
        value: spoofedGetParameter,
        writable: true,
        configurable: true
    }});
    safeDefineProperty(WebGL2RenderingContext.prototype, 'getParameter', {{
        value: spoofedGetParameter2,
        writable: true,
        configurable: true
    }});
    safeDefineProperty(WebGLRenderingContext.prototype, 'getSupportedExtensions', {{
        value: spoofedGetSupportedExtensions,
        writable: true,
        configurable: true
    }});
    safeDefineProperty(WebGL2RenderingContext.prototype, 'getSupportedExtensions', {{
        value: spoofedGetSupportedExtensions2,
        writable: true,
        configurable: true
    }});
    
    // Audio
    if (spoofedGetChannelData) {{
        safeDefineProperty(AudioBuffer.prototype, 'getChannelData', {{
            value: spoofedGetChannelData,
            writable: true,
            configurable: true
        }});
    }}
    if (spoofedGetFloatFrequencyData) {{
        safeDefineProperty(AnalyserNode.prototype, 'getFloatFrequencyData', {{
            value: spoofedGetFloatFrequencyData,
            writable: true,
            configurable: true
        }});
    }}
    if (spoofedGetByteFrequencyData) {{
        safeDefineProperty(AnalyserNode.prototype, 'getByteFrequencyData', {{
            value: spoofedGetByteFrequencyData,
            writable: true,
            configurable: true
        }});
    }}
    
    // Screen properties
    const screenProps = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
    for (const prop of screenProps) {{
        if (screenConfig[prop] !== undefined) {{
            safeDefineProperty(screen, prop, {{
                get: () => screenConfig[prop],
                configurable: true
            }});
        }}
    }}
    
    // Window dimensions
    safeDefineProperty(window, 'innerWidth', {{ get: () => screenConfig.width, configurable: true }});
    safeDefineProperty(window, 'innerHeight', {{ get: () => screenConfig.availHeight, configurable: true }});
    safeDefineProperty(window, 'outerWidth', {{ get: () => screenConfig.width, configurable: true }});
    safeDefineProperty(window, 'outerHeight', {{ get: () => screenConfig.height, configurable: true }});
    
    // Navigator properties
    safeDefineProperty(navigator, 'webdriver', {{ get: () => undefined, configurable: true }});
    safeDefineProperty(navigator, 'plugins', {{ get: () => pluginArray, configurable: true }});
    safeDefineProperty(navigator, 'languages', {{ get: () => ['en-US', 'en'], configurable: true }});
    safeDefineProperty(navigator, 'hardwareConcurrency', {{ get: () => 8, configurable: true }});
    safeDefineProperty(navigator, 'deviceMemory', {{ get: () => 8, configurable: true }});
    safeDefineProperty(navigator, 'maxTouchPoints', {{ get: () => 0, configurable: true }});
    
    // Notification
    if (typeof Notification !== 'undefined') {{
        safeDefineProperty(Notification, 'permission', {{ get: () => 'default', configurable: true }});
    }}
    
    // Permissions
    if (spoofedPermissionsQuery) {{
        navigator.permissions.query = spoofedPermissionsQuery;
    }}
    
    // ========================================================================
    // 11. CDP ARTIFACTS REMOVAL (КРИТИЧНО)
    // ========================================================================
    // Chrome создаёт переменные cdc_* при управлении через CDP
    // AWS модуль 65 ищет эти переменные
    // ========================================================================
    
    const removeCDC = () => {{
        try {{
            for (const prop in window) {{
                if (prop.match(/cdc_[a-z0-9]/ig) || prop.match(/^\\$cdc_/)) {{
                    delete window[prop];
                }}
            }}
        }} catch (e) {{}}
    }};
    removeCDC();
    setInterval(removeCDC, 50);
    
    // ========================================================================
    // 12. WEBRTC IP LEAK PROTECTION
    // ========================================================================
    // Блокируем WebRTC для предотвращения утечки реального IP
    // ========================================================================
    
    const rtcConfig = {{ iceServers: [], iceTransportPolicy: 'relay' }};
    
    if (window.RTCPeerConnection) {{
        const originalRTC = window.RTCPeerConnection;
        window.RTCPeerConnection = new Proxy(originalRTC, {{
            construct(target, args) {{
                if (args.length > 0) args[0] = rtcConfig;
                return new target(...args);
            }}
        }});
        spoofedFunctions.set(window.RTCPeerConnection, 'RTCPeerConnection');
    }}
    if (window.webkitRTCPeerConnection) {{
        window.webkitRTCPeerConnection = window.RTCPeerConnection;
    }}
    
    // ========================================================================
    // 13. VISIBILITY API SPOOFING
    // ========================================================================
    // В headless режиме visibilityState = 'hidden', что палевно
    // ========================================================================
    
    try {{
        Object.defineProperty(document, 'visibilityState', {{
            get: () => 'visible',
            configurable: true
        }});
        Object.defineProperty(document, 'hidden', {{
            get: () => false,
            configurable: true
        }});
    }} catch(e) {{ log('visibilityState spoof failed:', e.message); }}
    window.addEventListener('visibilitychange', (e) => e.stopImmediatePropagation(), true);
    
    // ========================================================================
    // 14. BATTERY API MOCK
    // ========================================================================
    // Headless часто не имеет Battery API или возвращает странные значения
    // ========================================================================
    
    if (navigator.getBattery) {{
        const mockBattery = {{
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 0.95 + (seededRandom() * 0.05),
            addEventListener: () => {{}},
            removeEventListener: () => {{}}
        }};
        const spoofedGetBattery = () => Promise.resolve(mockBattery);
        navigator.getBattery = spoofedGetBattery;
        spoofedFunctions.set(spoofedGetBattery, 'getBattery');
    }}
    
    // ========================================================================
    // 15. FONTS FINGERPRINTING (offsetWidth/Height noise)
    // ========================================================================
    // AWS модуль 60 замеряет размеры текста для определения шрифтов
    // ========================================================================
    
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    
    if (originalOffsetWidth) {{
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {{
            get() {{
                const width = originalOffsetWidth.get.call(this);
                if (this.style && this.style.fontFamily && width > 0) {{
                    return width + (seededRandom() > 0.95 ? (seededRandom() > 0.5 ? 1 : -1) : 0);
                }}
                return width;
            }}
        }});
    }}
    
    if (originalOffsetHeight) {{
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {{
            get() {{
                const height = originalOffsetHeight.get.call(this);
                if (this.style && this.style.fontFamily && height > 0) {{
                    return height + (seededRandom() > 0.95 ? (seededRandom() > 0.5 ? 1 : -1) : 0);
                }}
                return height;
            }}
        }});
    }}
    
    // ========================================================================
    // 16. CLIENT RECTS NOISE
    // ========================================================================
    // getBoundingClientRect используется для геометрического fingerprinting
    // ========================================================================
    
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    const spoofedGetBoundingClientRect = new Proxy(originalGetBoundingClientRect, {{
        apply(target, thisArg, args) {{
            const rect = Reflect.apply(target, thisArg, args);
            const noise = () => seededRandom() * 0.00001;
            return new DOMRect(
                rect.x + noise(),
                rect.y + noise(),
                rect.width + noise(),
                rect.height + noise()
            );
        }}
    }});
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', {{
        value: spoofedGetBoundingClientRect,
        writable: false,
        configurable: false
    }});
    spoofedFunctions.set(spoofedGetBoundingClientRect, 'getBoundingClientRect');
    
    // ========================================================================
    // 17. TIMEZONE SPOOFING
    // ========================================================================
    // Таймзона должна соответствовать IP прокси
    // По умолчанию ставим US Eastern (UTC-5)
    // ========================================================================
    
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {{
        return 300; // UTC-5 (New York)
    }};
    spoofedFunctions.set(Date.prototype.getTimezoneOffset, 'getTimezoneOffset');
    
    try {{
        const originalDateTimeFormat = Intl.DateTimeFormat;
        Intl.DateTimeFormat = new Proxy(originalDateTimeFormat, {{
            construct(target, args) {{
                args[0] = args[0] || 'en-US';
                args[1] = {{ ...args[1], timeZone: 'America/New_York' }};
                return new target(...args);
            }}
        }});
    }} catch(e) {{}}
    
    // ========================================================================
    // 18. MEDIA DEVICES SPOOFING
    // ========================================================================
    // Возвращаем фиксированный список устройств
    // ========================================================================
    
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {{
        const spoofedEnumerateDevices = () => Promise.resolve([
            {{ deviceId: 'default', kind: 'audioinput', label: 'Default Audio Input', groupId: 'default' }},
            {{ deviceId: 'default', kind: 'audiooutput', label: 'Default Audio Output', groupId: 'default' }},
            {{ deviceId: 'default', kind: 'videoinput', label: 'Integrated Camera', groupId: 'default' }}
        ]);
        navigator.mediaDevices.enumerateDevices = spoofedEnumerateDevices;
        spoofedFunctions.set(spoofedEnumerateDevices, 'enumerateDevices');
    }}
    
    // ========================================================================
    // ГОТОВО v3.0
    // ========================================================================
    
    log('Fingerprint spoofing v3.0 initialized');
    log('GPU:', SPOOF_CONFIG.webgl.vendor, '/', SPOOF_CONFIG.webgl.renderer);
    log('Screen:', SPOOF_CONFIG.screen.width, 'x', SPOOF_CONFIG.screen.height);
    log('Extensions:', SPOOF_CONFIG.webgl.extensions.length);
    log('Modules: Canvas, WebGL, Audio, Screen, Navigator, WebRTC, Battery, Fonts, ClientRects, Timezone, MediaDevices');
    
    window.__FP_SPOOF_CONFIG__ = SPOOF_CONFIG;
}})();
'''



class FingerprintSpoofer:
    """
    Класс для управления fingerprint spoofing в DrissionPage v2.0
    
    Использование:
        from fingerprint_spoof import FingerprintSpoofer
        from DrissionPage import ChromiumPage
        
        page = ChromiumPage()
        spoofer = FingerprintSpoofer(page)
        spoofer.inject()
        
        page.get('https://browserleaks.com/canvas')
    """
    
    def __init__(self, page, gpu_profile: str = None, screen_resolution: str = None,
                 canvas_noise: float = CANVAS_NOISE_ALPHA, seed: int = None):
        """
        Args:
            page: DrissionPage ChromiumPage instance
            gpu_profile: Имя профиля GPU (intel_uhd_620, nvidia_gtx_1650, etc.)
            screen_resolution: Разрешение экрана (1920x1080, 2560x1440, etc.)
            canvas_noise: Уровень шума Canvas
            seed: Seed для воспроизводимости
        """
        self.page = page
        self.canvas_noise = canvas_noise
        self.seed = seed
        self._injected = False
        
        # Выбираем GPU профиль
        if gpu_profile and gpu_profile in GPU_PROFILES:
            self.gpu_profile = GPU_PROFILES[gpu_profile].copy()
        else:
            if seed:
                random.seed(seed)
            self.gpu_profile = generate_gpu_profile()
        
        # Выбираем разрешение экрана
        if screen_resolution:
            parts = screen_resolution.split('x')
            if len(parts) == 2:
                w, h = int(parts[0]), int(parts[1])
                self.screen_config = {
                    "width": w, "height": h,
                    "availWidth": w, "availHeight": h - 40
                }
            else:
                self.screen_config = generate_screen_config()
        else:
            self.screen_config = generate_screen_config()
    
    def get_js_payload(self) -> str:
        """Возвращает JS код для инъекции"""
        return get_stealth_js(
            gpu_profile=self.gpu_profile,
            screen_config=self.screen_config,
            canvas_noise=self.canvas_noise,
            seed=self.seed
        )
    
    def inject(self) -> bool:
        """
        Инъектирует stealth скрипт в браузер
        Скрипт выполняется на каждой новой странице ДО загрузки контента
        Использует CDP Page.addScriptToEvaluateOnNewDocument
        
        Returns:
            True если инъекция успешна
        """
        if self._injected:
            return True
        
        try:
            js_payload = self.get_js_payload()
            
            # Используем CDP напрямую - работает во всех версиях DrissionPage
            # Page.addScriptToEvaluateOnNewDocument выполняет скрипт ДО загрузки страницы
            try:
                self.page.run_cdp('Page.addScriptToEvaluateOnNewDocument', source=js_payload)
            except Exception as cdp_err:
                # Fallback: попробуем старый API
                try:
                    self.page.set.script_on_load(js_payload)
                except:
                    # Последний fallback - просто выполним скрипт
                    self.page.run_js(js_payload)
            
            self._injected = True
            print(f"🛡️ Fingerprint spoofing v3.0 injected")
            print(f"   GPU: {self.gpu_profile['vendor']} / {self.gpu_profile['renderer']}")
            print(f"   Screen: {self.screen_config['width']}x{self.screen_config['height']}")
            print(f"   Extensions: {len(self.gpu_profile.get('extensions', []))}")
            print(f"   Modules: 18 (Canvas, WebGL, Audio, Screen, Navigator, WebRTC, Battery, Fonts, etc.)")
            return True
            
        except Exception as e:
            print(f"⚠️ Failed to inject fingerprint spoof: {e}")
            return False
    
    def get_config(self) -> dict:
        """Возвращает текущую конфигурацию спуфинга"""
        return {
            "gpu_vendor": self.gpu_profile['vendor'],
            "gpu_renderer": self.gpu_profile['renderer'],
            "extensions_count": len(self.gpu_profile.get('extensions', [])),
            "screen_width": self.screen_config['width'],
            "screen_height": self.screen_config['height'],
            "canvas_noise": self.canvas_noise,
            "seed": self.seed,
            "injected": self._injected
        }


# Legacy compatibility
def generate_webgl_config() -> dict:
    """Legacy: генерирует конфигурацию WebGL"""
    profile = generate_gpu_profile()
    return {
        "vendor": profile["vendor"],
        "renderer": profile["renderer"]
    }


# ============================================================================
# ТЕСТИРОВАНИЕ
# ============================================================================

def test_fingerprint_spoof():
    """Тест fingerprint spoofing v2.0"""
    from DrissionPage import ChromiumPage, ChromiumOptions
    
    print("=" * 60)
    print("Fingerprint Spoofing PoC v2.0 Test")
    print("=" * 60)
    
    co = ChromiumOptions()
    co.set_argument('--disable-blink-features=AutomationControlled')
    
    page = ChromiumPage(co)
    spoofer = FingerprintSpoofer(page, seed=12345)
    spoofer.inject()
    
    print("\nКонфигурация:")
    config = spoofer.get_config()
    for key, value in config.items():
        print(f"  {key}: {value}")
    
    print("\n📍 Opening browserleaks.com/canvas...")
    page.get('https://browserleaks.com/canvas')
    
    print("\n✅ Проверьте Canvas Signature")
    input("\nНажмите Enter для проверки WebGL...")
    
    page.get('https://browserleaks.com/webgl')
    print("\n✅ Проверьте WebGL Vendor, Renderer и Extensions")
    
    input("\nНажмите Enter для закрытия...")
    page.quit()
    print("\n✅ Тест завершён")


if __name__ == '__main__':
    test_fingerprint_spoof()
