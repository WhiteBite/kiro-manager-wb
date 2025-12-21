"""
Kiro Traffic Logger - логирование трафика Kiro IDE для разработки

DEV TOOL: Используется для анализа трафика Kiro и разработки патчей.
Для обычного использования применяйте патч через расширение!

Использование:
1. Установить mitmproxy: pip install mitmproxy
2. Установить сертификат: autoreg/scripts/install_mitmproxy_cert.ps1
3. Запустить: autoreg/scripts/run_kiro_with_proxy.ps1

Логи сохраняются в: ~/.kiro-extension/proxy_logs/
"""

import json
import re
import os
from datetime import datetime
from pathlib import Path
from mitmproxy import http, ctx

# Директория для логов
LOG_DIR = Path.home() / ".kiro-extension" / "proxy_logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Лог файл
LOG_FILE = LOG_DIR / f"kiro_traffic_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

# Паттерн machineId - 64 hex символа
MACHINE_ID_REGEX = re.compile(r'[a-f0-9]{64}', re.IGNORECASE)

# Интересующие хосты
INTERESTING_HOSTS = [
    'amazonaws.com',
    'aws.amazon.com',
    'awsapps.com',
    'kiro.dev',
    'amazon.com',
]

# Интересные headers для логирования
INTERESTING_HEADERS = [
    'user-agent', 
    'x-amz', 
    'authorization', 
    'x-kiro',
    'content-type',
]


def log(msg: str):
    """Логирование в файл и консоль"""
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def find_machine_ids(content: str) -> list[str]:
    """Ищет все machineId (64 hex) в контенте"""
    return list(set(MACHINE_ID_REGEX.findall(content)))


def is_interesting_host(host: str) -> bool:
    """Проверяет, интересен ли нам этот хост"""
    return any(h in host for h in INTERESTING_HOSTS)


class KiroTrafficLogger:
    """mitmproxy addon для логирования трафика Kiro (DEV TOOL)"""
    
    def __init__(self):
        self.request_count = 0
        self.machine_ids_seen = set()
        
        log(f"{'='*60}")
        log(f"=== Kiro Traffic Logger (DEV MODE) ===")
        log(f"Log file: {LOG_FILE}")
        log(f"{'='*60}")
        log("")
        log("This is a development tool for analyzing Kiro traffic.")
        log("For normal use, apply the patch via the extension!")
        log("")
    
    def request(self, flow: http.HTTPFlow):
        """Логирование исходящих запросов"""
        host = flow.request.host
        
        if not is_interesting_host(host):
            return
        
        self.request_count += 1
        
        log(f"\n{'='*60}")
        log(f">>> REQUEST #{self.request_count}")
        log(f"    Method: {flow.request.method}")
        log(f"    URL: {flow.request.url}")
        log(f"    Host: {host}")
        
        # Логируем интересные headers
        log(f"    --- Headers ---")
        for name, value in flow.request.headers.items():
            name_lower = name.lower()
            if any(h in name_lower for h in INTERESTING_HEADERS):
                # Маскируем токены
                display_value = value
                if 'authorization' in name_lower and len(value) > 50:
                    display_value = value[:50] + '...[MASKED]'
                log(f"    {name}: {display_value}")
            
            # Ищем machineId в headers
            machine_ids = find_machine_ids(value)
            for mid in machine_ids:
                if mid not in self.machine_ids_seen:
                    self.machine_ids_seen.add(mid)
                    log(f"    !!! FOUND machineId in header '{name}': {mid}")
        
        # Логируем body
        if flow.request.content:
            try:
                body = flow.request.content.decode('utf-8')
                
                # Ищем machineId в body
                machine_ids = find_machine_ids(body)
                for mid in machine_ids:
                    if mid not in self.machine_ids_seen:
                        self.machine_ids_seen.add(mid)
                        log(f"    !!! FOUND machineId in body: {mid}")
                
                # Логируем JSON body красиво
                log(f"    --- Body ---")
                if body.startswith('{') or body.startswith('['):
                    try:
                        data = json.loads(body)
                        pretty = json.dumps(data, indent=2, ensure_ascii=False)
                        # Ограничиваем размер
                        if len(pretty) > 2000:
                            pretty = pretty[:2000] + '\n    ...[TRUNCATED]'
                        for line in pretty.split('\n'):
                            log(f"    {line}")
                    except:
                        log(f"    {body[:500]}...")
                elif len(body) < 1000:
                    log(f"    {body}")
                else:
                    log(f"    {body[:500]}...[TRUNCATED]")
                    
            except:
                log(f"    <binary {len(flow.request.content)} bytes>")
    
    def response(self, flow: http.HTTPFlow):
        """Логирование ответов"""
        host = flow.request.host
        
        if not is_interesting_host(host):
            return
        
        log(f"<<< RESPONSE {flow.response.status_code} for {flow.request.method} {flow.request.path[:50]}...")
        
        # Логируем ошибки подробно
        if flow.response.status_code >= 400:
            log(f"    !!! ERROR RESPONSE !!!")
            if flow.response.content:
                try:
                    body = flow.response.content.decode('utf-8')
                    log(f"    Error body: {body[:500]}")
                except:
                    pass
        
        # Ищем machineId в ответе
        if flow.response.content:
            try:
                body = flow.response.content.decode('utf-8')
                machine_ids = find_machine_ids(body)
                for mid in machine_ids:
                    if mid not in self.machine_ids_seen:
                        self.machine_ids_seen.add(mid)
                        log(f"    !!! FOUND machineId in response: {mid}")
            except:
                pass


addons = [KiroTrafficLogger()]
