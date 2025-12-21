"""
Анализатор трафика Kiro - поиск идентификаторов и fingerprints

Анализирует логи mitmproxy и находит:
- machineId
- IP адреса
- UUID/GUID
- Токены и ключи
- Версии ПО
- Имена пользователей/компьютеров
- Любые другие потенциальные идентификаторы

Использование:
    python analyze_kiro_traffic.py [log_file]
    
Если log_file не указан - берёт последний лог из ~/.kiro-extension/proxy_logs/
"""

import re
import json
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# Директория с логами
LOG_DIR = Path.home() / ".kiro-extension" / "proxy_logs"

# Паттерны для поиска идентификаторов
PATTERNS = {
    "machineId (64 hex)": re.compile(r'\b[a-f0-9]{64}\b', re.IGNORECASE),
    "UUID/GUID": re.compile(r'\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b', re.IGNORECASE),
    "SHA-256 hash": re.compile(r'\b[a-f0-9]{64}\b', re.IGNORECASE),
    "MD5 hash": re.compile(r'\b[a-f0-9]{32}\b', re.IGNORECASE),
    "Bearer token": re.compile(r'Bearer\s+([A-Za-z0-9_-]+\.?[A-Za-z0-9_-]*\.?[A-Za-z0-9_-]*)', re.IGNORECASE),
    "AWS access key": re.compile(r'\b(AKIA[A-Z0-9]{16})\b'),
    "IP address": re.compile(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b'),
    "Email": re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    "Windows path": re.compile(r'[A-Z]:\\[^"\'<>|\r\n]+', re.IGNORECASE),
    "Unix path": re.compile(r'/(?:home|Users)/[^"\'<>|\r\n\s]+'),
    "Version string": re.compile(r'\b\d+\.\d+\.\d+(?:\.\d+)?\b'),
    "Hostname": re.compile(r'"hostname":\s*"([^"]+)"'),
    "Username": re.compile(r'"(?:user|username|userName)":\s*"([^"]+)"', re.IGNORECASE),
    "Session ID": re.compile(r'"(?:session|sessionId)":\s*"([^"]+)"', re.IGNORECASE),
    "Client ID": re.compile(r'"(?:client|clientId)":\s*"([^"]+)"', re.IGNORECASE),
    "Device ID": re.compile(r'"(?:device|deviceId)":\s*"([^"]+)"', re.IGNORECASE),
    "Trace ID": re.compile(r'"traceId":\s*"([^"]+)"'),
    "Span ID": re.compile(r'"spanId":\s*"([^"]+)"'),
}

# Известные безопасные значения (не идентификаторы)
SAFE_VALUES = {
    "127.0.0.1", "localhost", "0.0.0.0",
    "0.0.1", "0.8.0", "1.0.0", "2.0.0",  # версии
}

# Интересные ключи в JSON
INTERESTING_KEYS = [
    "machineId", "machine_id", "deviceId", "device_id",
    "userId", "user_id", "username", "userName",
    "hostname", "computerName", "platform",
    "sessionId", "session_id", "clientId", "client_id",
    "fingerprint", "hwid", "uuid", "guid",
    "ip", "ipAddress", "ip_address",
    "email", "accountId", "account_id",
]


class TrafficAnalyzer:
    def __init__(self):
        self.findings = defaultdict(lambda: defaultdict(set))  # category -> value -> contexts
        self.endpoints = defaultdict(int)  # URL -> count
        self.headers_seen = defaultdict(set)  # header_name -> values
        self.json_keys = defaultdict(set)  # key -> values
        
    def analyze_file(self, filepath: Path):
        """Анализирует лог файл"""
        print(f"\n{'='*60}")
        print(f"Analyzing: {filepath.name}")
        print(f"{'='*60}\n")
        
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        
        # Разбиваем на запросы
        requests = content.split(">>> REQUEST")
        
        for req in requests[1:]:  # пропускаем первый пустой
            self._analyze_request(req)
        
        self._print_report()
    
    def _analyze_request(self, request_text: str):
        """Анализирует один запрос"""
        lines = request_text.strip().split('\n')
        
        # Извлекаем URL
        for line in lines:
            if line.strip().startswith("URL:"):
                url = line.split("URL:", 1)[1].strip()
                # Убираем query params для группировки
                base_url = url.split('?')[0]
                self.endpoints[base_url] += 1
        
        # Ищем паттерны
        for category, pattern in PATTERNS.items():
            matches = pattern.findall(request_text)
            for match in matches:
                if isinstance(match, tuple):
                    match = match[0]
                if match not in SAFE_VALUES and len(match) > 3:
                    # Находим контекст (строку где найдено)
                    for line in lines:
                        if match in line:
                            context = line.strip()[:100]
                            self.findings[category][match].add(context)
                            break
        
        # Ищем JSON и анализируем ключи
        self._analyze_json(request_text)
    
    def _analyze_json(self, text: str):
        """Извлекает и анализирует JSON из текста"""
        # Ищем JSON объекты
        json_pattern = re.compile(r'\{[^{}]*\}|\[[^\[\]]*\]')
        
        for match in json_pattern.finditer(text):
            try:
                data = json.loads(match.group())
                self._extract_json_values(data)
            except:
                pass
        
        # Также ищем ключи напрямую
        for key in INTERESTING_KEYS:
            pattern = re.compile(rf'"{key}":\s*"([^"]+)"', re.IGNORECASE)
            for match in pattern.finditer(text):
                value = match.group(1)
                if value and len(value) > 2:
                    self.json_keys[key].add(value)
    
    def _extract_json_values(self, data, prefix=""):
        """Рекурсивно извлекает значения из JSON"""
        if isinstance(data, dict):
            for key, value in data.items():
                full_key = f"{prefix}.{key}" if prefix else key
                
                if key.lower() in [k.lower() for k in INTERESTING_KEYS]:
                    if isinstance(value, str) and len(value) > 2:
                        self.json_keys[key].add(value)
                
                self._extract_json_values(value, full_key)
        elif isinstance(data, list):
            for item in data:
                self._extract_json_values(item, prefix)
    
    def _print_report(self):
        """Выводит отчёт"""
        print("\n" + "="*60)
        print("📊 ANALYSIS REPORT")
        print("="*60)
        
        # Endpoints
        print("\n🌐 ENDPOINTS ACCESSED:")
        print("-"*40)
        for url, count in sorted(self.endpoints.items(), key=lambda x: -x[1]):
            print(f"  [{count:3}x] {url[:80]}")
        
        # Идентификаторы по категориям
        print("\n\n🔍 POTENTIAL IDENTIFIERS FOUND:")
        print("-"*40)
        
        for category, values in sorted(self.findings.items()):
            if values:
                print(f"\n  📌 {category}:")
                for value, contexts in sorted(values.items()):
                    # Показываем укороченное значение
                    short_val = value[:40] + "..." if len(value) > 40 else value
                    print(f"      • {short_val}")
                    # Показываем один контекст
                    if contexts:
                        ctx = list(contexts)[0][:60]
                        print(f"        └─ {ctx}...")
        
        # JSON ключи
        print("\n\n🔑 INTERESTING JSON KEYS:")
        print("-"*40)
        for key, values in sorted(self.json_keys.items()):
            if values:
                print(f"\n  {key}:")
                for val in list(values)[:5]:  # макс 5 значений
                    short_val = val[:50] + "..." if len(val) > 50 else val
                    print(f"      • {short_val}")
                if len(values) > 5:
                    print(f"      ... and {len(values)-5} more")
        
        # Рекомендации
        print("\n\n⚠️  RECOMMENDATIONS:")
        print("-"*40)
        
        if "machineId (64 hex)" in self.findings:
            print("  ❗ machineId found - needs to be spoofed!")
        
        if "IP address" in self.findings:
            ips = self.findings["IP address"]
            external_ips = [ip for ip in ips if not ip.startswith(("127.", "192.168.", "10.", "172."))]
            if external_ips:
                print("  ❗ External IP addresses found - consider VPN")
        
        if "Windows path" in self.findings or "Unix path" in self.findings:
            print("  ❗ File paths with username found - may leak identity")
        
        if "Email" in self.findings:
            print("  ❗ Email addresses found in traffic")
        
        print("\n" + "="*60)


def get_latest_log() -> Path:
    """Получает последний лог файл"""
    if not LOG_DIR.exists():
        print(f"Log directory not found: {LOG_DIR}")
        sys.exit(1)
    
    logs = sorted(LOG_DIR.glob("kiro_traffic_*.log"), reverse=True)
    if not logs:
        print("No log files found")
        sys.exit(1)
    
    return logs[0]


def main():
    if len(sys.argv) > 1:
        log_file = Path(sys.argv[1])
    else:
        log_file = get_latest_log()
    
    if not log_file.exists():
        print(f"File not found: {log_file}")
        sys.exit(1)
    
    analyzer = TrafficAnalyzer()
    analyzer.analyze_file(log_file)


if __name__ == "__main__":
    main()
