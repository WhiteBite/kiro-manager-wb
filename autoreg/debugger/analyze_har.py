#!/usr/bin/env python3
"""
Анализатор HAR файлов

Использование:
    python -m debugger.analyze_har path/to/file.har
    python debugger/analyze_har.py ../1.har
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from debugger.analyzers import RequestAnalyzer, FingerprintAnalyzer


def analyze_har(har_path: str):
    """Анализирует HAR файл"""
    
    print(f"\nAnalyzing: {har_path}")
    print("="*60)
    
    # Request analysis
    req_analyzer = RequestAnalyzer(har_path=har_path)
    req_analyzer.print_report()
    
    # Fingerprint analysis
    fp_analyzer = FingerprintAnalyzer(requests=req_analyzer.requests)
    fp_analyzer.print_report()
    
    # Дополнительная информация
    print("\n" + "="*60)
    print("ADDITIONAL INFO")
    print("="*60)
    
    # Ищем redirect запросы
    redirects = [r for r in req_analyzer.requests if r.get('status') in (301, 302, 303, 307, 308)]
    if redirects:
        print(f"\nREDIRECTS ({len(redirects)}):")
        for r in redirects[:10]:
            location = r.get('responseHeaders', {}).get('location', r.get('responseHeaders', {}).get('Location', ''))
            print(f"  {r.get('status')} {r.get('url')[:50]}...")
            if location:
                print(f"       -> {location[:60]}...")
    
    # Ищем OAuth запросы
    oauth_reqs = [r for r in req_analyzer.requests if 'oauth' in r.get('url', '').lower() or 'token' in r.get('url', '').lower()]
    if oauth_reqs:
        print(f"\nOAUTH REQUESTS ({len(oauth_reqs)}):")
        for r in oauth_reqs[:10]:
            print(f"  {r.get('method')} {r.get('url')[:60]}... -> {r.get('status')}")
    
    # Ищем signin запросы
    signin_reqs = [r for r in req_analyzer.requests if 'signin' in r.get('url', '').lower()]
    if signin_reqs:
        print(f"\nSIGNIN REQUESTS ({len(signin_reqs)}):")
        for r in signin_reqs[:15]:
            print(f"  {r.get('method'):4} {r.get('status'):3} [{r.get('duration', 0):5}ms] {r.get('url')[:60]}...")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python analyze_har.py <path_to_har_file>")
        print("\nExample:")
        print("  python analyze_har.py ../1.har")
        sys.exit(1)
    
    har_path = sys.argv[1]
    
    if not os.path.exists(har_path):
        print(f"Error: File not found: {har_path}")
        sys.exit(1)
    
    analyze_har(har_path)
