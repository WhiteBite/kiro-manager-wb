#!/usr/bin/env python3
"""
Анализ существующей debug сессии

Использование:
    python -m debugger.analyze_session debug_20251220_174313
    python -m debugger.analyze_session --latest
"""

import sys
import json
from pathlib import Path


def find_latest_session(sessions_dir: Path) -> Path:
    """Находит последнюю сессию"""
    sessions = sorted(
        [d for d in sessions_dir.iterdir() if d.is_dir() and d.name.startswith('debug_')],
        key=lambda x: x.stat().st_mtime,
        reverse=True
    )
    if not sessions:
        raise FileNotFoundError("No debug sessions found")
    return sessions[0]


def analyze_session(session_dir: Path):
    """Анализирует сессию"""
    print(f"\n{'='*60}")
    print(f"ANALYZING: {session_dir.name}")
    print(f"{'='*60}")
    
    # Читаем report.json если есть
    report_file = session_dir / 'report.json'
    if report_file.exists():
        report = json.loads(report_file.read_text(encoding='utf-8'))
        
        print(f"\nSession ID: {report.get('session_id')}")
        print(f"Duration: {report.get('total_duration', 0):.1f}s")
        
        summary = report.get('summary', {})
        print(f"\nSummary:")
        print(f"  Steps: {summary.get('total_steps', 0)}")
        print(f"  Requests: {summary.get('total_requests', 0)}")
        print(f"  URL Changes: {summary.get('total_url_changes', 0)}")
        print(f"  Final URL: {summary.get('final_url', '')[:60]}...")
        
        # Cookies
        cookies = summary.get('final_cookies', {})
        print(f"\nImportant Cookies:")
        important = ['workflow-step-id', 'directory-csrf-token', 'login-interview-token']
        for name in important:
            value = cookies.get(name, 'NOT SET')
            print(f"  {name}: {str(value)[:40]}")
        
        # Steps
        print(f"\nSteps:")
        for step in report.get('steps', []):
            status = '✅' if not step.get('error') else '❌'
            print(f"  {status} {step['name']}: {step.get('duration', 0):.1f}s")
            if step.get('error'):
                print(f"      Error: {step['error']}")
            for note in step.get('notes', [])[-3:]:
                print(f"      📝 {note}")
    
    # Проверяем HAR
    har_file = session_dir / 'traffic.har'
    if har_file.exists():
        har = json.loads(har_file.read_text(encoding='utf-8'))
        entries = har.get('log', {}).get('entries', [])
        print(f"\nHAR: {len(entries)} entries")
        
        # Показываем важные запросы
        important_urls = ['signin', 'oauth', 'token', 'fwcim', 'shortbread', 'api/']
        important_entries = [e for e in entries if any(x in e.get('request', {}).get('url', '').lower() for x in important_urls)]
        
        if important_entries:
            print(f"\nImportant requests ({len(important_entries)}):")
            for entry in important_entries[:10]:
                req = entry.get('request', {})
                resp = entry.get('response', {})
                url = req.get('url', '')[:50]
                status = resp.get('status', 0)
                print(f"  [{status}] {req.get('method', 'GET')} {url}...")
    
    # Проверяем скриншоты
    screenshots = list(session_dir.glob('*.png'))
    if screenshots:
        print(f"\nScreenshots: {len(screenshots)}")
        for ss in screenshots:
            print(f"  📷 {ss.name}")
    
    # Проверяем HTML отчёт
    html_file = session_dir / 'report.html'
    if html_file.exists():
        print(f"\n📊 HTML Report: {html_file}")
    
    print(f"\n{'='*60}\n")


def main():
    sessions_dir = Path(__file__).parent.parent / 'debug_sessions'
    
    if len(sys.argv) < 2 or sys.argv[1] == '--latest':
        session_dir = find_latest_session(sessions_dir)
    else:
        session_name = sys.argv[1]
        session_dir = sessions_dir / session_name
        if not session_dir.exists():
            print(f"Session not found: {session_name}")
            print(f"\nAvailable sessions:")
            for d in sorted(sessions_dir.iterdir()):
                if d.is_dir() and d.name.startswith('debug_'):
                    print(f"  {d.name}")
            sys.exit(1)
    
    analyze_session(session_dir)


if __name__ == '__main__':
    main()
