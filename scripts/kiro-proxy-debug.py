"""
mitmproxy addon для логирования запросов Kiro.
Ищем machineId и другие идентификаторы.

Запуск:
1. mitmdump -s scripts/kiro-proxy-debug.py -p 8080
2. В другом терминале: scripts/start-kiro-proxy.bat
"""

import json
import re
from datetime import datetime
from mitmproxy import http, ctx

# Файл для логов
LOG_FILE = "kiro_requests.log"

# Паттерны для поиска
PATTERNS = {
    'machineId': re.compile(r'machineId["\s:]+([a-f0-9]{32,64})', re.I),
    'x-kiro-machineid': re.compile(r'x-kiro-machineid', re.I),
    'deviceId': re.compile(r'deviceId["\s:]+([a-f0-9-]{32,64})', re.I),
    'clientId': re.compile(r'clientId["\s:]+([a-zA-Z0-9_-]+)', re.I),
}

# Интересные хосты
INTERESTING_HOSTS = [
    'amazonaws.com',
    'codewhisperer',
    'oidc',
    'telemetry',
    'kiro',
    'aws',
]

def log(msg: str):
    """Логировать в файл и консоль"""
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')

def is_interesting(host: str) -> bool:
    """Проверить интересный ли хост"""
    return any(h in host.lower() for h in INTERESTING_HOSTS)

def find_ids(text: str) -> dict:
    """Найти идентификаторы в тексте"""
    found = {}
    for name, pattern in PATTERNS.items():
        matches = pattern.findall(text)
        if matches:
            found[name] = matches[0] if len(matches) == 1 else matches
    return found

class KiroLogger:
    def request(self, flow: http.HTTPFlow):
        """Логировать запросы"""
        req = flow.request
        host = req.host
        
        if not is_interesting(host):
            return
        
        log(f"\n{'='*60}")
        log(f">>> {req.method} {req.pretty_url}")
        
        # Заголовки
        interesting_headers = {}
        for k, v in req.headers.items():
            k_lower = k.lower()
            if any(x in k_lower for x in ['machine', 'device', 'client', 'auth', 'user-agent', 'x-kiro', 'x-amz']):
                interesting_headers[k] = v
                # Проверяем machineId в заголовках
                if 'machine' in k_lower:
                    log(f"!!! FOUND machineId in header: {k}={v}")
        
        if interesting_headers:
            log(f"Headers: {json.dumps(interesting_headers, indent=2)}")
        
        # Тело запроса
        if req.content:
            try:
                body = req.content.decode('utf-8')
                # Ищем идентификаторы
                ids = find_ids(body)
                if ids:
                    log(f"!!! FOUND IDs in body: {json.dumps(ids)}")
                
                # Логируем тело если JSON
                if 'json' in req.headers.get('content-type', ''):
                    try:
                        parsed = json.loads(body)
                        log(f"Body: {json.dumps(parsed, indent=2)[:2000]}")
                    except:
                        log(f"Body (raw): {body[:1000]}")
            except:
                pass

    def response(self, flow: http.HTTPFlow):
        """Логировать ответы"""
        req = flow.request
        resp = flow.response
        host = req.host
        
        if not is_interesting(host):
            return
        
        log(f"<<< {resp.status_code} {req.pretty_url}")
        
        # Проверяем на ошибки
        if resp.status_code >= 400:
            log(f"!!! ERROR {resp.status_code}")
            if resp.content:
                try:
                    body = resp.content.decode('utf-8')
                    log(f"Error body: {body[:1000]}")
                except:
                    pass

addons = [KiroLogger()]
