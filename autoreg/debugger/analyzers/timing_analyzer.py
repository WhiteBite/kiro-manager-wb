"""
Timing Analyzer - анализ времени выполнения
"""

from typing import List, Dict, Any
from dataclasses import asdict


class TimingAnalyzer:
    """
    Анализирует тайминги шагов регистрации.
    
    Помогает найти:
    - Какой шаг занимает больше всего времени
    - Где происходят задержки
    - Сравнение с ожидаемыми значениями
    """
    
    # Ожидаемые тайминги (в секундах)
    EXPECTED_TIMINGS = {
        'init': 5,
        'oauth_start': 2,
        'browser_init': 10,
        'navigate': 10,
        'email_input': 15,
        'name_input': 10,
        'verification_code': 60,  # Ожидание email
        'password_input': 15,
        'password_submit': 30,  # Критический момент
        'allow_access': 10,
        'oauth_callback': 10,
    }
    
    def __init__(self, steps: List = None):
        """
        Args:
            steps: Список DebugStep из сессии
        """
        self.steps = steps or []
    
    def analyze(self) -> Dict[str, Any]:
        """Полный анализ таймингов"""
        return {
            'summary': self.get_summary(),
            'by_step': self.get_step_timings(),
            'slowest': self.find_slowest_steps(),
            'anomalies': self.find_anomalies(),
            'timeline': self.get_timeline(),
        }
    
    def get_summary(self) -> Dict:
        """Общая статистика"""
        if not self.steps:
            return {'total': 0}
        
        durations = [s.duration for s in self.steps]
        
        return {
            'total_duration': sum(durations),
            'steps_count': len(self.steps),
            'avg_step_duration': sum(durations) / len(durations),
            'max_step_duration': max(durations),
            'min_step_duration': min(durations),
        }
    
    def get_step_timings(self) -> List[Dict]:
        """Тайминги по шагам"""
        result = []
        
        for step in self.steps:
            expected = self.EXPECTED_TIMINGS.get(step.name, 30)
            deviation = step.duration - expected
            
            result.append({
                'name': step.name,
                'duration': step.duration,
                'expected': expected,
                'deviation': deviation,
                'deviation_percent': (deviation / expected * 100) if expected > 0 else 0,
                'status': 'slow' if deviation > expected * 0.5 else 'ok',
                'error': step.error,
            })
        
        return result
    
    def find_slowest_steps(self, top_n: int = 5) -> List[Dict]:
        """Находит самые медленные шаги"""
        timings = self.get_step_timings()
        return sorted(timings, key=lambda x: x['duration'], reverse=True)[:top_n]
    
    def find_anomalies(self) -> List[Dict]:
        """Находит аномальные тайминги"""
        anomalies = []
        
        for step in self.steps:
            expected = self.EXPECTED_TIMINGS.get(step.name, 30)
            
            # Слишком долго (>2x ожидаемого)
            if step.duration > expected * 2:
                anomalies.append({
                    'type': 'too_slow',
                    'step': step.name,
                    'duration': step.duration,
                    'expected': expected,
                    'ratio': step.duration / expected,
                })
            
            # Ошибка
            if step.error:
                anomalies.append({
                    'type': 'error',
                    'step': step.name,
                    'error': step.error,
                })
        
        return anomalies
    
    def get_timeline(self) -> List[Dict]:
        """Возвращает timeline для визуализации"""
        timeline = []
        
        for step in self.steps:
            timeline.append({
                'name': step.name,
                'start': step.start_time,
                'end': step.end_time,
                'duration': step.duration,
            })
        
        return timeline
    
    def print_report(self):
        """Выводит отчёт в консоль"""
        analysis = self.analyze()
        
        print("\n" + "="*60)
        print("TIMING ANALYSIS REPORT")
        print("="*60)
        
        summary = analysis['summary']
        print(f"\nSUMMARY:")
        print(f"  Total duration: {summary.get('total_duration', 0):.1f}s")
        print(f"  Steps: {summary.get('steps_count', 0)}")
        print(f"  Avg step: {summary.get('avg_step_duration', 0):.1f}s")
        
        print(f"\nSTEP TIMINGS:")
        print(f"  {'Step':<20} {'Duration':>10} {'Expected':>10} {'Status':>10}")
        print(f"  {'-'*20} {'-'*10} {'-'*10} {'-'*10}")
        
        for step in analysis['by_step']:
            status_icon = "⚠️" if step['status'] == 'slow' else "✓"
            print(f"  {step['name']:<20} {step['duration']:>9.1f}s {step['expected']:>9.1f}s {status_icon:>10}")
        
        anomalies = analysis['anomalies']
        if anomalies:
            print(f"\n⚠️  ANOMALIES:")
            for a in anomalies:
                if a['type'] == 'too_slow':
                    print(f"  {a['step']}: {a['duration']:.1f}s (expected {a['expected']:.1f}s, {a['ratio']:.1f}x slower)")
                elif a['type'] == 'error':
                    print(f"  {a['step']}: ERROR - {a['error']}")
        
        print("\n" + "="*60)
