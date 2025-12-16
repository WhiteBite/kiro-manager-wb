"""
History Spoof Module

Спуфит window.history.length для реалистичности.
Amazon FWCIM проверяет history.length
"""

import random
from .base import BaseSpoofModule


class HistorySpoofModule(BaseSpoofModule):
    """Спуфинг History API"""
    
    name = "history"
    description = "History length spoof"
    
    def get_js(self) -> str:
        # Реалистичная длина истории (2-15)
        history_length = random.randint(2, 15)
        
        return f"""
(function() {{
    // Спуфим history.length
    // Реальные пользователи обычно имеют историю 2-15
    const fakeLength = {history_length};
    
    try {{
        Object.defineProperty(window.history, 'length', {{
            get: function() {{ return fakeLength; }},
            configurable: true
        }});
    }} catch(e) {{
        // Fallback через Proxy
        const originalHistory = window.history;
        const historyProxy = new Proxy(originalHistory, {{
            get: function(target, prop) {{
                if (prop === 'length') return fakeLength;
                const value = target[prop];
                if (typeof value === 'function') {{
                    return value.bind(target);
                }}
                return value;
            }}
        }});
        
        try {{
            Object.defineProperty(window, 'history', {{
                get: () => historyProxy,
                configurable: true
            }});
        }} catch(e2) {{}}
    }}
}})();
"""
