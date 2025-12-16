"""
Performance Timing Spoof Module

Спуфит window.performance.timing для консистентности.
Amazon FWCIM собирает performance.timing.toJSON()
"""

from .base import BaseSpoofModule


class PerformanceSpoofModule(BaseSpoofModule):
    """Спуфинг Performance API"""
    
    name = "performance"
    description = "Performance timing spoof"
    
    def get_js(self) -> str:
        return """
(function() {
    // Спуфим performance.timing для консистентности
    const originalTiming = window.performance.timing;
    
    if (originalTiming && originalTiming.toJSON) {
        const originalToJSON = originalTiming.toJSON.bind(originalTiming);
        
        // Добавляем небольшой шум к timing значениям
        Object.defineProperty(originalTiming, 'toJSON', {
            value: function() {
                const data = originalToJSON();
                // Не модифицируем, просто возвращаем оригинал
                // Важно чтобы timing выглядел реалистично
                return data;
            },
            configurable: true
        });
    }
    
    // Убеждаемся что performance.now() работает корректно
    // и не выдаёт слишком точные значения (fingerprint protection)
    const originalNow = performance.now.bind(performance);
    Object.defineProperty(performance, 'now', {
        value: function() {
            // Округляем до 0.1ms для защиты от timing attacks
            return Math.round(originalNow() * 10) / 10;
        },
        configurable: true
    });
})();
"""
