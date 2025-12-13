"""
Спуфинг timezone

Подменяет Date.getTimezoneOffset и Intl.DateTimeFormat.
"""

from .base import BaseSpoofModule


class TimezoneSpoofModule(BaseSpoofModule):
    """Спуфинг таймзоны"""
    
    name = "timezone"
    description = "Spoof timezone offset"
    
    def get_js(self) -> str:
        p = self.profile
        return f'''
(function() {{
    'use strict';
    
    const TIMEZONE_OFFSET = {p.timezone_offset};
    const TIMEZONE_NAME = '{p.timezone}';
    
    // ============================================
    // Date.getTimezoneOffset
    // ============================================
    Date.prototype.getTimezoneOffset = function() {{
        return TIMEZONE_OFFSET;
    }};
    
    // ============================================
    // Intl.DateTimeFormat
    // ============================================
    const originalResolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
    Intl.DateTimeFormat.prototype.resolvedOptions = function() {{
        const options = originalResolvedOptions.call(this);
        options.timeZone = TIMEZONE_NAME;
        return options;
    }};
}})();
'''
