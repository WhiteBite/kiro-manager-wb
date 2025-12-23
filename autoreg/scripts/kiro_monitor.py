#!/usr/bin/env python3
"""
Kiro Memory & Performance Monitor
Мониторинг потребления ресурсов процессами Kiro в реальном времени.

Usage:
    python kiro_monitor.py              # Интерактивный режим (обновление каждые 2 сек)
    python kiro_monitor.py --once       # Однократный снимок
    python kiro_monitor.py --log        # Логирование в файл
    python kiro_monitor.py --interval 5 # Интервал обновления (сек)
"""

import argparse
import csv
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

try:
    import psutil
except ImportError:
    print("Установи psutil: pip install psutil")
    sys.exit(1)


@dataclass
class KiroProcess:
    """Информация о процессе Kiro."""
    pid: int
    name: str
    process_type: str
    memory_mb: float
    cpu_percent: float
    cpu_time: float
    threads: int
    create_time: datetime


def get_process_type(cmdline: list[str]) -> str:
    """Определяет тип процесса Kiro по командной строке."""
    cmd = " ".join(cmdline).lower()
    
    if "--type=renderer" in cmd:
        if "vscode-webview" in cmd:
            return "🌐 Webview Renderer"
        return "🖼️ Renderer"
    elif "--type=gpu-process" in cmd:
        if "swiftshader" in cmd:
            return "🎨 GPU (Software)"
        return "🎮 GPU"
    elif "node.mojom.nodeservice" in cmd:
        return "⚡ Extension Host"
    elif "--type=utility" in cmd:
        return "🔧 Utility"
    elif "--type=crashpad" in cmd or "crashpad" in cmd:
        return "💥 Crashpad"
    elif "--type=" not in cmd and "kiro.exe" in cmd:
        return "🏠 Main Process"
    else:
        return "❓ Other"


def get_kiro_processes() -> list[KiroProcess]:
    """Получает список всех процессов Kiro с метриками."""
    processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info', 
                                      'cpu_percent', 'cpu_times', 'num_threads',
                                      'create_time']):
        try:
            if proc.info['name'] and 'kiro' in proc.info['name'].lower():
                cmdline = proc.info['cmdline'] or []
                memory = proc.info['memory_info']
                cpu_times = proc.info['cpu_times']
                
                processes.append(KiroProcess(
                    pid=proc.info['pid'],
                    name=proc.info['name'],
                    process_type=get_process_type(cmdline),
                    memory_mb=memory.rss / (1024 * 1024) if memory else 0,
                    cpu_percent=proc.info['cpu_percent'] or 0,
                    cpu_time=(cpu_times.user + cpu_times.system) if cpu_times else 0,
                    threads=proc.info['num_threads'] or 0,
                    create_time=datetime.fromtimestamp(proc.info['create_time']) 
                                if proc.info['create_time'] else datetime.now()
                ))
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            continue
    
    return sorted(processes, key=lambda p: p.memory_mb, reverse=True)


def format_time(seconds: float) -> str:
    """Форматирует время в читаемый вид."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        return f"{seconds/60:.1f}m"
    else:
        return f"{seconds/3600:.1f}h"


def format_memory(mb: float) -> str:
    """Форматирует память с цветовой индикацией."""
    if mb > 1000:
        return f"\033[91m{mb:.0f} MB\033[0m"  # Красный > 1GB
    elif mb > 500:
        return f"\033[93m{mb:.0f} MB\033[0m"  # Жёлтый > 500MB
    else:
        return f"\033[92m{mb:.0f} MB\033[0m"  # Зелёный


def print_header():
    """Печатает заголовок таблицы."""
    print("\033[2J\033[H", end="")  # Очистка экрана
    print("=" * 80)
    print(f"  🔍 KIRO MONITOR | {datetime.now().strftime('%H:%M:%S')} | Ctrl+C для выхода")
    print("=" * 80)


def print_processes(processes: list[KiroProcess], show_colors: bool = True):
    """Выводит таблицу процессов."""
    total_mem = sum(p.memory_mb for p in processes)
    total_cpu = sum(p.cpu_percent for p in processes)
    
    # Заголовок таблицы
    print(f"\n{'PID':>7} | {'Тип':<22} | {'RAM':>12} | {'CPU%':>6} | {'CPU Time':>8} | {'Threads':>7}")
    print("-" * 80)
    
    # Процессы
    for p in processes:
        mem_str = format_memory(p.memory_mb) if show_colors else f"{p.memory_mb:.0f} MB"
        print(f"{p.pid:>7} | {p.process_type:<22} | {mem_str:>20} | {p.cpu_percent:>5.1f}% | {format_time(p.cpu_time):>8} | {p.threads:>7}")
    
    # Итого
    print("-" * 80)
    total_mem_str = format_memory(total_mem) if show_colors else f"{total_mem:.0f} MB"
    print(f"{'TOTAL':>7} | {len(processes)} processes{' '*11} | {total_mem_str:>20} | {total_cpu:>5.1f}% |")
    
    # Предупреждения
    print("\n" + "=" * 80)
    warnings = []
    
    if total_mem > 4000:
        warnings.append("⚠️  КРИТИЧНО: Общее потребление RAM > 4 GB!")
    elif total_mem > 2000:
        warnings.append("⚠️  Высокое потребление RAM > 2 GB")
    
    heavy_processes = [p for p in processes if p.memory_mb > 1000]
    if heavy_processes:
        for p in heavy_processes:
            warnings.append(f"🔴 PID {p.pid} ({p.process_type}): {p.memory_mb:.0f} MB - возможна утечка памяти")
    
    ext_host = [p for p in processes if "Extension Host" in p.process_type]
    if ext_host and ext_host[0].memory_mb > 800:
        warnings.append("💡 Extension Host тяжёлый - проверь расширения (Developer: Show Running Extensions)")
    
    if warnings:
        for w in warnings:
            print(w)
    else:
        print("✅ Всё в норме")


def log_to_csv(processes: list[KiroProcess], log_file: Path):
    """Записывает метрики в CSV файл."""
    file_exists = log_file.exists()
    
    with open(log_file, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        if not file_exists:
            writer.writerow(['timestamp', 'pid', 'type', 'memory_mb', 'cpu_percent', 
                           'cpu_time', 'threads', 'total_memory_mb', 'total_processes'])
        
        timestamp = datetime.now().isoformat()
        total_mem = sum(p.memory_mb for p in processes)
        
        for p in processes:
            writer.writerow([
                timestamp, p.pid, p.process_type, f"{p.memory_mb:.1f}",
                f"{p.cpu_percent:.1f}", f"{p.cpu_time:.1f}", p.threads,
                f"{total_mem:.1f}", len(processes)
            ])


def monitor_once():
    """Однократный снимок состояния."""
    processes = get_kiro_processes()
    
    if not processes:
        print("Процессы Kiro не найдены")
        return
    
    print_header()
    print_processes(processes)


def monitor_loop(interval: float = 2.0, log_file: Optional[Path] = None):
    """Цикл мониторинга в реальном времени."""
    print("Запуск мониторинга... (Ctrl+C для выхода)")
    
    # Первый вызов cpu_percent для инициализации
    for proc in psutil.process_iter(['cpu_percent']):
        pass
    time.sleep(0.1)
    
    try:
        while True:
            processes = get_kiro_processes()
            
            if not processes:
                print("\033[2J\033[H", end="")
                print("Процессы Kiro не найдены. Ожидание...")
                time.sleep(interval)
                continue
            
            print_header()
            print_processes(processes)
            
            if log_file:
                log_to_csv(processes, log_file)
                print(f"\n📝 Логирование в: {log_file}")
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\n\n👋 Мониторинг остановлен")


def main():
    parser = argparse.ArgumentParser(description="Kiro Memory & Performance Monitor")
    parser.add_argument('--once', action='store_true', help='Однократный снимок')
    parser.add_argument('--log', action='store_true', help='Логировать в CSV файл')
    parser.add_argument('--interval', type=float, default=2.0, help='Интервал обновления (сек)')
    parser.add_argument('--output', type=str, help='Путь к файлу лога')
    
    args = parser.parse_args()
    
    log_file = None
    if args.log:
        if args.output:
            log_file = Path(args.output)
        else:
            log_dir = Path.home() / ".kiro-manager-wb"
            log_dir.mkdir(exist_ok=True)
            log_file = log_dir / f"kiro_monitor_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    if args.once:
        monitor_once()
    else:
        monitor_loop(interval=args.interval, log_file=log_file)


if __name__ == "__main__":
    main()
