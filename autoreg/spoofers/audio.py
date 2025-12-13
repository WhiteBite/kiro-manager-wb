"""
Спуфинг AudioContext fingerprint

Добавляет шум к AudioContext для изменения аудио-фингерпринта.
"""

from .base import BaseSpoofModule


class AudioSpoofModule(BaseSpoofModule):
    """Спуфинг AudioContext fingerprint"""
    
    name = "audio"
    description = "Spoof audio context fingerprint"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    const NOISE_SEED = {p.noise_seed};
    
    // Простой PRNG
    let seed = NOISE_SEED;
    const random = () => {{
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
    }};
    
    // ============================================
    // AudioContext spoofing
    // ============================================
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {{
        const AC = AudioContext || webkitAudioContext;
        const originalGetChannelData = AudioBuffer.prototype.getChannelData;
        
        AudioBuffer.prototype.getChannelData = function(channel) {{
            const data = originalGetChannelData.call(this, channel);
            
            // Добавляем минимальный шум к первым 100 сэмплам
            for (let i = 0; i < Math.min(data.length, 100); i++) {{
                data[i] += (random() - 0.5) * 0.0001;
            }}
            
            return data;
        }};
        
        // Спуфим createAnalyser
        const originalCreateAnalyser = AC.prototype.createAnalyser;
        AC.prototype.createAnalyser = function() {{
            const analyser = originalCreateAnalyser.call(this);
            const originalGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
            
            analyser.getFloatFrequencyData = function(array) {{
                originalGetFloatFrequencyData(array);
                for (let i = 0; i < Math.min(array.length, 10); i++) {{
                    array[i] += (random() - 0.5) * 0.1;
                }}
            }};
            
            return analyser;
        }};
    }}
}})();
'''
