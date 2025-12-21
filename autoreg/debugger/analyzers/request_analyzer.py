"""
Request Analyzer - анализ сетевых запросов
"""

import json
from typing import List, Dict, Any
from pathlib import Path


class RequestAnalyzer:
    """
    Анализирует сетевые запросы для выявления проблем.
    
    Проверяет:
    - Медленные запросы
    - Ошибки (4xx, 5xx)
    - Подозрительные паттерны (блокировка, rate limiting)
    - Fingerprint запросы
    """
    
    def __init__(self, requests: List[Dict] = None, har_path: str = None):
        """
        Args:
            requests: Список запросов из DebugSession
            har_path: Путь к HAR файлу
        """
        if har_path:
            self.requests = self._load_har(har_path)
        else:
            self.requests = requests or []
    
    def _load_har(self, path: str) -> List[Dict]:
        """Загружает запросы из HAR файла"""
        with open(path, 'r', encoding='utf-8') as f:
            har = json.load(f)
        
        requests = []
        for entry in har.get('log', {}).get('entries', []):
            req = entry.get('request', {})
            resp = entry.get('response', {})
            
            requests.append({
                'url': req.get('url', ''),
                'method': req.get('method', 'GET'),
                'status': resp.get('status', 0),
                'duration': entry.get('time', 0),
                'requestBody': req.get('postData', {}).get('text', ''),
                'responseBody': resp.get('content', {}).get('text', ''),
                'requestHeaders': {h['name']: h['value'] for h in req.get('headers', [])},
                'responseHeaders': {h['name']: h['value'] for h in resp.get('headers', [])},
            })
        
        return requests
    
    def analyze(self) -> Dict[str, Any]:
        """Полный анализ запросов"""
        return {
            'summary': self.get_summary(),
            'slow_requests': self.find_slow_requests(),
            'errors': self.find_errors(),
            'fingerprint_requests': self.find_fingerprint_requests(),
            'suspicious_patterns': self.find_suspicious_patterns(),
            'api_requests': self.find_api_requests(),
        }
    
    def get_summary(self) -> Dict:
        """Общая статистика"""
        total = len(self.requests)
        if not total:
            return {'total': 0}
        
        durations = [r.get('duration', 0) for r in self.requests]
        statuses = [r.get('status', 0) for r in self.requests]
        
        return {
            'total': total,
            'avg_duration_ms': sum(durations) / total,
            'max_duration_ms': max(durations),
            'min_duration_ms': min(durations),
            'errors_count': len([s for s in statuses if s >= 400]),
            'success_count': len([s for s in statuses if 200 <= s < 400]),
        }
    
    def find_slow_requests(self, threshold_ms: int = 2000) -> List[Dict]:
        """Находит медленные запросы"""
        slow = []
        for req in self.requests:
            duration = req.get('duration', 0)
            if duration > threshold_ms:
                slow.append({
                    'url': req.get('url', ''),
                    'method': req.get('method', ''),
                    'duration_ms': duration,
                    'status': req.get('status', 0),
                })
        
        return sorted(slow, key=lambda x: x['duration_ms'], reverse=True)
    
    def find_errors(self) -> List[Dict]:
        """Находит запросы с ошибками"""
        errors = []
        for req in self.requests:
            status = req.get('status', 0)
            if status >= 400 or req.get('error'):
                errors.append({
                    'url': req.get('url', ''),
                    'method': req.get('method', ''),
                    'status': status,
                    'error': req.get('error', ''),
                    'response_preview': (req.get('responseBody', '') or '')[:200],
                })
        
        return errors
    
    def find_fingerprint_requests(self) -> List[Dict]:
        """Находит запросы связанные с fingerprint"""
        keywords = ['fingerprint', 'fwcim', 'metrics', 'telemetry', 'beacon', 'collect']
        
        fp_requests = []
        for req in self.requests:
            url = req.get('url', '').lower()
            if any(kw in url for kw in keywords):
                fp_requests.append({
                    'url': req.get('url', ''),
                    'method': req.get('method', ''),
                    'status': req.get('status', 0),
                    'request_body_preview': (req.get('requestBody', '') or '')[:500],
                    'response_preview': (req.get('responseBody', '') or '')[:200],
                })
        
        return fp_requests
    
    def find_suspicious_patterns(self) -> List[Dict]:
        """Находит подозрительные паттерны"""
        patterns = []
        
        # Проверяем на rate limiting
        rate_limit_indicators = ['429', 'rate limit', 'too many requests', 'throttl']
        for req in self.requests:
            status = req.get('status', 0)
            response = (req.get('responseBody', '') or '').lower()
            
            if status == 429 or any(ind in response for ind in rate_limit_indicators):
                patterns.append({
                    'type': 'rate_limiting',
                    'url': req.get('url', ''),
                    'status': status,
                    'evidence': response[:200],
                })
        
        # Проверяем на блокировку
        block_indicators = ['blocked', 'forbidden', 'access denied', 'captcha', 'challenge']
        for req in self.requests:
            status = req.get('status', 0)
            response = (req.get('responseBody', '') or '').lower()
            
            if status == 403 or any(ind in response for ind in block_indicators):
                patterns.append({
                    'type': 'blocked',
                    'url': req.get('url', ''),
                    'status': status,
                    'evidence': response[:200],
                })
        
        # Проверяем на automation detection
        automation_indicators = ['automation', 'bot', 'selenium', 'webdriver', 'headless']
        for req in self.requests:
            response = (req.get('responseBody', '') or '').lower()
            
            if any(ind in response for ind in automation_indicators):
                patterns.append({
                    'type': 'automation_detection',
                    'url': req.get('url', ''),
                    'evidence': response[:200],
                })
        
        return patterns
    
    def find_api_requests(self) -> List[Dict]:
        """Находит API запросы AWS"""
        api_patterns = [
            'signin.aws',
            'profile.aws',
            'oidc.',
            'awsapps.com',
            '/api/',
            'send-otp',
            'verify',
            'login',
            'signup',
        ]
        
        api_requests = []
        for req in self.requests:
            url = req.get('url', '').lower()
            if any(p in url for p in api_patterns):
                api_requests.append({
                    'url': req.get('url', ''),
                    'method': req.get('method', ''),
                    'status': req.get('status', 0),
                    'duration_ms': req.get('duration', 0),
                })
        
        return api_requests
    
    def print_report(self):
        """Выводит отчёт в консоль"""
        analysis = self.analyze()
        
        print("\n" + "="*60)
        print("REQUEST ANALYSIS REPORT")
        print("="*60)
        
        summary = analysis['summary']
        print(f"\nSUMMARY:")
        print(f"  Total requests: {summary.get('total', 0)}")
        print(f"  Avg duration: {summary.get('avg_duration_ms', 0):.0f}ms")
        print(f"  Max duration: {summary.get('max_duration_ms', 0):.0f}ms")
        print(f"  Errors: {summary.get('errors_count', 0)}")
        
        slow = analysis['slow_requests'][:10]
        if slow:
            print(f"\nSLOW REQUESTS (>{2000}ms):")
            for req in slow:
                print(f"  [{req['duration_ms']:5}ms] {req['method']:4} {req['status']:3} {req['url'][:60]}...")
        
        errors = analysis['errors']
        if errors:
            print(f"\nERRORS:")
            for err in errors[:10]:
                print(f"  [{err['status']}] {err['method']} {err['url'][:60]}...")
                if err.get('response_preview'):
                    print(f"       {err['response_preview'][:80]}...")
        
        suspicious = analysis['suspicious_patterns']
        if suspicious:
            print(f"\n⚠️  SUSPICIOUS PATTERNS:")
            for pat in suspicious:
                print(f"  [{pat['type']}] {pat['url'][:60]}...")
        
        fp = analysis['fingerprint_requests']
        if fp:
            print(f"\nFINGERPRINT REQUESTS:")
            for req in fp[:5]:
                print(f"  {req['method']} {req['url'][:60]}... -> {req['status']}")
        
        print("\n" + "="*60)
