"""
Fingerprint Analyzer - анализ fingerprint данных
"""

import json
import base64
from typing import List, Dict, Any


class FingerprintAnalyzer:
    """
    Анализирует fingerprint данные отправляемые AWS.
    
    AWS использует FWCIM (Fraud Web Client Identity Module) для:
    - Сбора fingerprint браузера
    - Поведенческого анализа
    - Детекции автоматизации
    """
    
    # Известные endpoints fingerprint
    FINGERPRINT_ENDPOINTS = [
        '/metrics/fingerprint',
        '/fwcim/',
        '/collect',
        '/beacon',
        '/telemetry',
    ]
    
    # Подозрительные значения в fingerprint
    SUSPICIOUS_VALUES = [
        'headless',
        'webdriver',
        'selenium',
        'puppeteer',
        'playwright',
        'automation',
        'phantomjs',
        'nightmare',
    ]
    
    def __init__(self, requests: List[Dict] = None):
        """
        Args:
            requests: Список сетевых запросов
        """
        self.requests = requests or []
        self.fingerprint_requests = self._extract_fingerprint_requests()
    
    def _extract_fingerprint_requests(self) -> List[Dict]:
        """Извлекает запросы связанные с fingerprint"""
        fp_requests = []
        
        for req in self.requests:
            url = req.get('url', '').lower()
            
            if any(ep in url for ep in self.FINGERPRINT_ENDPOINTS):
                fp_requests.append(req)
        
        return fp_requests
    
    def analyze(self) -> Dict[str, Any]:
        """Полный анализ fingerprint"""
        return {
            'summary': self.get_summary(),
            'requests': self.get_fingerprint_details(),
            'suspicious_findings': self.find_suspicious(),
            'decoded_payloads': self.decode_payloads(),
        }
    
    def get_summary(self) -> Dict:
        """Общая статистика"""
        return {
            'total_fingerprint_requests': len(self.fingerprint_requests),
            'endpoints_used': list(set(
                req.get('url', '').split('?')[0] 
                for req in self.fingerprint_requests
            )),
        }
    
    def get_fingerprint_details(self) -> List[Dict]:
        """Детали fingerprint запросов"""
        details = []
        
        for req in self.fingerprint_requests:
            details.append({
                'url': req.get('url', ''),
                'method': req.get('method', ''),
                'status': req.get('status', 0),
                'request_body_size': len(req.get('requestBody', '') or ''),
                'response_size': len(req.get('responseBody', '') or ''),
            })
        
        return details
    
    def find_suspicious(self) -> List[Dict]:
        """Находит подозрительные данные в fingerprint"""
        suspicious = []
        
        for req in self.fingerprint_requests:
            body = (req.get('requestBody', '') or '').lower()
            response = (req.get('responseBody', '') or '').lower()
            
            for value in self.SUSPICIOUS_VALUES:
                if value in body:
                    suspicious.append({
                        'type': 'request_body',
                        'url': req.get('url', ''),
                        'suspicious_value': value,
                        'context': self._extract_context(body, value),
                    })
                
                if value in response:
                    suspicious.append({
                        'type': 'response',
                        'url': req.get('url', ''),
                        'suspicious_value': value,
                        'context': self._extract_context(response, value),
                    })
        
        return suspicious
    
    def _extract_context(self, text: str, keyword: str, context_size: int = 50) -> str:
        """Извлекает контекст вокруг ключевого слова"""
        idx = text.lower().find(keyword.lower())
        if idx == -1:
            return ""
        
        start = max(0, idx - context_size)
        end = min(len(text), idx + len(keyword) + context_size)
        
        return text[start:end]
    
    def decode_payloads(self) -> List[Dict]:
        """Пытается декодировать payload'ы fingerprint"""
        decoded = []
        
        for req in self.fingerprint_requests:
            body = req.get('requestBody', '') or ''
            
            # Пробуем JSON
            try:
                data = json.loads(body)
                decoded.append({
                    'url': req.get('url', ''),
                    'format': 'json',
                    'data': self._sanitize_data(data),
                })
                continue
            except:
                pass
            
            # Пробуем base64
            try:
                if len(body) > 20 and body.replace('+', '').replace('/', '').replace('=', '').isalnum():
                    decoded_bytes = base64.b64decode(body)
                    decoded_str = decoded_bytes.decode('utf-8', errors='ignore')
                    
                    # Пробуем JSON внутри base64
                    try:
                        data = json.loads(decoded_str)
                        decoded.append({
                            'url': req.get('url', ''),
                            'format': 'base64_json',
                            'data': self._sanitize_data(data),
                        })
                        continue
                    except:
                        pass
                    
                    decoded.append({
                        'url': req.get('url', ''),
                        'format': 'base64_text',
                        'data': decoded_str[:500],
                    })
            except:
                pass
        
        return decoded
    
    def _sanitize_data(self, data: Any, max_depth: int = 3, current_depth: int = 0) -> Any:
        """Санитизирует данные для вывода (ограничивает глубину и размер)"""
        if current_depth >= max_depth:
            return "..."
        
        if isinstance(data, dict):
            return {
                k: self._sanitize_data(v, max_depth, current_depth + 1)
                for k, v in list(data.items())[:20]
            }
        elif isinstance(data, list):
            return [
                self._sanitize_data(item, max_depth, current_depth + 1)
                for item in data[:10]
            ]
        elif isinstance(data, str):
            return data[:200] + "..." if len(data) > 200 else data
        else:
            return data
    
    def print_report(self):
        """Выводит отчёт в консоль"""
        analysis = self.analyze()
        
        print("\n" + "="*60)
        print("FINGERPRINT ANALYSIS REPORT")
        print("="*60)
        
        summary = analysis['summary']
        print(f"\nSUMMARY:")
        print(f"  Fingerprint requests: {summary.get('total_fingerprint_requests', 0)}")
        print(f"  Endpoints: {', '.join(summary.get('endpoints_used', []))}")
        
        suspicious = analysis['suspicious_findings']
        if suspicious:
            print(f"\n⚠️  SUSPICIOUS FINDINGS:")
            for s in suspicious:
                print(f"  [{s['type']}] Found '{s['suspicious_value']}' in {s['url'][:50]}...")
                if s.get('context'):
                    print(f"       Context: ...{s['context']}...")
        else:
            print(f"\n✓ No suspicious values detected in fingerprint data")
        
        decoded = analysis['decoded_payloads']
        if decoded:
            print(f"\nDECODED PAYLOADS:")
            for d in decoded[:3]:
                print(f"  [{d['format']}] {d['url'][:50]}...")
                if isinstance(d['data'], dict):
                    for k, v in list(d['data'].items())[:5]:
                        print(f"       {k}: {str(v)[:50]}...")
        
        print("\n" + "="*60)
