#!/usr/bin/env python3
"""
Kiro Performance Analyzer
Анализирует логи мониторинга и даёт рекомендации по оптимизации.
"""

import csv
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple


def analyze_memory_growth(log_file: Path) -> Dict:
    """Анализирует рост памяти по процессам."""
    process_snapshots = defaultdict(list)
    
    with open(log_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row['pid']
            timestamp = datetime.fromisoformat(row['timestamp'])
            memory = float(row['memory_mb'])
            process_type = row['type']
            
            process_snapshots[pid].append({
                'timestamp': timestamp,
                'memory': memory,
                'type': process_type
            })
    
    # Анализ роста
    leaks = []
    for pid, snapshots in process_snapshots.items():
        if len(snapshots) < 2:
            continue
        
        first = snapshots[0]
        last = snapshots[-1]
        growth = last['memory'] - first['memory']
        duration = (last['timestamp'] - first['timestamp']).total_seconds()
        
        if duration > 0:
            growth_rate = growth / (duration / 60)  # MB/min
            
            if growth_rate > 50:  # > 50 MB/min
                leaks.append({
                    'pid': pid,
                    'type': first['type'],
                    'initial': first['memory'],
                    'final': last['memory'],
                    'growth': growth,
                    'rate': growth_rate,
                    'duration': duration
                })
    
    return {
        'leaks': sorted(leaks, key=lambda x: x['rate'], reverse=True),
        'total_processes': len(process_snapshots)
    }


def get_recommendations(analysis: Dict) -> List[str]:
    """Генерирует рекомендации на основе анализа."""
    recommendations = []
    
    leaks = analysis['leaks']
    
    if not leaks:
        recommendations.append("✅ Утечек памяти не обнаружено")
        return recommendations
    
    for leak in leaks:
        if "Extension Host" in leak['type']:
            recommendations.append(
                f"🔴 КРИТИЧНО: Extension Host (PID {leak['pid']}) течёт {leak['rate']:.1f} MB/min\n"
                f"   Начало: {leak['initial']:.0f} MB → Конец: {leak['final']:.0f} MB (+{leak['growth']:.0f} MB)\n"
                f"   Действия:\n"
                f"   1. Ctrl+Shift+P → 'Developer: Show Running Extensions'\n"
                f"   2. Отключи расширения с большим потреблением памяти\n"
                f"   3. Перезапусти Extension Host: Ctrl+Shift+P → 'Developer: Restart Extension Host'"
            )
        elif "Webview Renderer" in leak['type']:
            recommendations.append(
                f"🟠 Webview Renderer (PID {leak['pid']}) течёт {leak['rate']:.1f} MB/min\n"
                f"   Начало: {leak['initial']:.0f} MB → Конец: {leak['final']:.0f} MB (+{leak['growth']:.0f} MB)\n"
                f"   Действия:\n"
                f"   1. Закрой лишние webview панели (превью, терминалы)\n"
                f"   2. Перезагрузи окно: Ctrl+Shift+P → 'Developer: Reload Window'"
            )
        elif "Main Process" in leak['type']:
            recommendations.append(
                f"🟡 Main Process (PID {leak['pid']}) течёт {leak['rate']:.1f} MB/min\n"
                f"   Начало: {leak['initial']:.0f} MB → Конец: {leak['final']:.0f} MB (+{leak['growth']:.0f} MB)\n"
                f"   Действия: Перезапусти Kiro"
            )
    
    return recommendations


def main():
    log_dir = Path.home() / ".kiro-manager-wb"
    log_files = sorted(log_dir.glob("kiro_monitor_*.csv"), key=lambda p: p.stat().st_mtime, reverse=True)
    
    if not log_files:
        print("❌ Логи мониторинга не найдены")
        print(f"Запусти: python autoreg/scripts/kiro_monitor.py --log")
        sys.exit(1)
    
    log_file = log_files[0]
    print(f"📊 Анализ лога: {log_file.name}\n")
    
    analysis = analyze_memory_growth(log_file)
    recommendations = get_recommendations(analysis)
    
    print("=" * 80)
    print("  🔍 РЕЗУЛЬТАТЫ АНАЛИЗА")
    print("=" * 80)
    print(f"\nВсего процессов: {analysis['total_processes']}")
    print(f"Обнаружено утечек: {len(analysis['leaks'])}\n")
    
    if recommendations:
        print("=" * 80)
        print("  💡 РЕКОМЕНДАЦИИ")
        print("=" * 80)
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec}\n")
    
    # Сохранить отчёт
    report_file = log_dir / f"kiro_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("KIRO PERFORMANCE ANALYSIS REPORT\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Log file: {log_file.name}\n")
        f.write(f"Total processes: {analysis['total_processes']}\n")
        f.write(f"Memory leaks detected: {len(analysis['leaks'])}\n\n")
        
        for i, rec in enumerate(recommendations, 1):
            f.write(f"{i}. {rec}\n\n")
    
    print(f"📝 Отчёт сохранён: {report_file}")


if __name__ == "__main__":
    main()
