"""
Math Fingerprint Spoof Module

Спуфит Math.sin/cos/tan для уникального fingerprint.
Amazon FWCIM проверяет Math.tan/sin/cos(-1e300)
"""

from .base import BaseSpoofModule


class MathSpoofModule(BaseSpoofModule):
    """Спуфинг Math fingerprint"""
    
    name = "math"
    description = "Math functions fingerprint"
    
    def get_js(self) -> str:
        return """
(function() {
    // Amazon проверяет Math.tan/sin/cos(-1e300)
    // Эти значения уникальны для каждого браузера/платформы
    
    // Сохраняем оригинальные функции
    const originalSin = Math.sin;
    const originalCos = Math.cos;
    const originalTan = Math.tan;
    
    // Значения для Chrome на Windows (наиболее распространённые)
    // Math.tan(-1e300) = 0.4059080203181946
    // Math.sin(-1e300) = 0.8178819121159085
    // Math.cos(-1e300) = -0.5753861119575491
    
    const SPECIAL_VALUE = -1e300;
    const FAKE_TAN = 0.4059080203181946;
    const FAKE_SIN = 0.8178819121159085;
    const FAKE_COS = -0.5753861119575491;
    
    Math.sin = function(x) {
        if (x === SPECIAL_VALUE || x === 1e300) {
            return x === SPECIAL_VALUE ? FAKE_SIN : -FAKE_SIN;
        }
        return originalSin.call(Math, x);
    };
    
    Math.cos = function(x) {
        if (x === SPECIAL_VALUE || x === 1e300) {
            return FAKE_COS;
        }
        return originalCos.call(Math, x);
    };
    
    Math.tan = function(x) {
        if (x === SPECIAL_VALUE || x === 1e300) {
            return x === SPECIAL_VALUE ? FAKE_TAN : -FAKE_TAN;
        }
        return originalTan.call(Math, x);
    };
    
    // Делаем функции неотличимыми от нативных
    Math.sin.toString = () => 'function sin() { [native code] }';
    Math.cos.toString = () => 'function cos() { [native code] }';
    Math.tan.toString = () => 'function tan() { [native code] }';
})();
"""
