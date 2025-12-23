#!/usr/bin/env python3
"""
Kiro Lag Fixer - автоматическая диагностика и исправление лагов.

Проверяет:
1. Hardware acceleration (SwiftShader = медленно)
2. Тяжёлые расширения
3. Утечки памяти в webview
4. Файловые watcher'ы (node_modules и т.д.)
5. Telemetry и другие фоновые процессы

Usage:
    python kiro_fix_lags.py --diagnose    # Только диагностика
    python kiro_fix_lags.py --fix         # Применить исправления
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

try:
    import psutil
except ImportError:
    print("❌ Установи psutil: pip install psutil")
    sys.exit(1)


@dataclass
class DiagnosticResult:
    """Результат диагностики."""
    issue: str
    severity: str  # "critical", "warning", "info"
    description: str
    fix: Optional[str] = None
    auto_fixable: bool = False


class KiroLagDiagnostic:
    """Диагностика и исправление лагов Kiro."""
    
    def __init__(self):
        self.kiro_data = Path.home() / "AppData" / "Roaming" / "Kiro"
        self.settings_file = self.kiro_data / "User" / "settings.json"
        self.argv_file = self.kiro_data / "argv.json"
        self.results: list[DiagnosticResult] = []
    
    def get_kiro_processes(self) -> list[psutil.Process]:
        """Получает все процессы Kiro."""
        processes = []
        for proc in psutil.process_iter(['name', 'cmdline', 'memory_info', 'cpu_times']):
            try:
                if proc.info['name'] and 'kiro' in proc.info['name'].lower():
                    processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        return processes
    
    def check_memory_usage(self):
        """Проверка потребления памяти."""
        processes = self.get_kiro_processes()
        total_mem_gb = sum(p.memory_info().rss for p in processes) / (1024**3)
        
        if total_mem_gb > 8:
            self.results.append(DiagnosticResult(
                issue="Критическое потребление памяти",
                severity="critical",
                description=f"Kiro использует {total_mem_gb:.1f} GB RAM. Это ненормально!",
                fix="Перезапусти Kiro или закрой лишние окна/расширения",
                auto_fixable=False
            ))
        elif total_mem_gb > 4:
            self.results.append(DiagnosticResult(
                issue="Высокое потребление памяти",
                severity="warning",
                description=f"Kiro использует {total_mem_gb:.1f} GB RAM",
                fix="Рекомендуется перезапустить Extension Host (Ctrl+Shift+P → Restart Extension Host)",
                auto_fixable=False
            ))
    
    def check_gpu_acceleration(self):
        """Проверка hardware acceleration."""
        processes = self.get_kiro_processes()
        
        for proc in processes:
            try:
                cmdline = " ".join(proc.cmdline()).lower()
                if "--type=gpu-process" in cmdline and "swiftshader" in cmdline:
                    self.results.append(DiagnosticResult(
                        issue="Software rendering (SwiftShader)",
                        severity="critical",
                        description="GPU acceleration отключён! Kiro использует медленный software rendering",
                        fix="Включить hardware acceleration в argv.json",
                        auto_fixable=True
                    ))
                    return
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    
    def check_settings(self):
        """Проверка settings.json на проблемные настройки."""
        if not self.settings_file.exists():
            return
        
        try:
            with open(self.settings_file, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            
            # Hardware acceleration
            if settings.get("disable-hardware-acceleration") is True:
                self.results.append(DiagnosticResult(
                    issue="Hardware acceleration отключён",
                    severity="critical",
                    description="В настройках отключено аппаратное ускорение",
                    fix='Удалить "disable-hardware-acceleration": true из settings.json',
                    auto_fixable=True
                ))
            
            # Telemetry
            if settings.get("telemetry.telemetryLevel") != "off":
                self.results.append(DiagnosticResult(
                    issue="Telemetry включена",
                    severity="info",
                    description="Телеметрия может замедлять работу",
                    fix='Установить "telemetry.telemetryLevel": "off"',
                    auto_fixable=True
                ))
            
            # File watchers
            watcher_exclude = settings.get("files.watcherExclude", {})
            if "**/node_modules/**" not in watcher_exclude:
                self.results.append(DiagnosticResult(
                    issue="node_modules не исключены из watcher",
                    severity="warning",
                    description="Kiro следит за изменениями в node_modules (медленно!)",
                    fix='Добавить "**/node_modules/**": true в files.watcherExclude',
                    auto_fixable=True
                ))
            
        except Exception as e:
            print(f"⚠️  Не удалось прочитать settings.json: {e}")
    
    def check_argv(self):
        """Проверка argv.json."""
        if not self.argv_file.exists():
            return
        
        try:
            with open(self.argv_file, 'r', encoding='utf-8') as f:
                argv = json.load(f)
            
            # Проверка на disable-gpu
            if argv.get("disable-gpu") is True:
                self.results.append(DiagnosticResult(
                    issue="GPU полностью отключён",
                    severity="critical",
                    description="В argv.json установлен disable-gpu",
                    fix='Удалить "disable-gpu": true из argv.json',
                    auto_fixable=True
                ))
            
        except Exception as e:
            print(f"⚠️  Не удалось прочитать argv.json: {e}")
    
    def check_extension_host(self):
        """Проверка Extension Host на утечки памяти."""
        processes = self.get_kiro_processes()
        
        for proc in processes:
            try:
                cmdline = " ".join(proc.cmdline()).lower()
                if "node.mojom.nodeservice" in cmdline:
                    mem_mb = proc.memory_info().rss / (1024**2)
                    if mem_mb > 1500:
                        self.results.append(DiagnosticResult(
                            issue="Extension Host утечка памяти",
                            severity="critical",
                            description=f"Extension Host использует {mem_mb:.0f} MB (PID {proc.pid})",
                            fix="Проверь расширения: Ctrl+Shift+P → Developer: Show Running Extensions",
                            auto_fixable=False
                        ))
                    elif mem_mb > 800:
                        self.results.append(DiagnosticResult(
                            issue="Extension Host тяжёлый",
                            severity="warning",
                            description=f"Extension Host использует {mem_mb:.0f} MB",
                            fix="Отключи ненужные расширения",
                            auto_fixable=False
                        ))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
    
    def apply_fixes(self):
        """Применяет автоматические исправления."""
        fixed = []
        
        # Исправление settings.json
        if self.settings_file.exists():
            try:
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                
                modified = False
                
                # Удалить disable-hardware-acceleration
                if settings.get("disable-hardware-acceleration") is True:
                    del settings["disable-hardware-acceleration"]
                    modified = True
                    fixed.append("✅ Включён hardware acceleration")
                
                # Отключить telemetry
                if settings.get("telemetry.telemetryLevel") != "off":
                    settings["telemetry.telemetryLevel"] = "off"
                    modified = True
                    fixed.append("✅ Отключена telemetry")
                
                # Исключить node_modules из watcher
                if "files.watcherExclude" not in settings:
                    settings["files.watcherExclude"] = {}
                
                watcher_exclude = settings["files.watcherExclude"]
                if "**/node_modules/**" not in watcher_exclude:
                    watcher_exclude["**/node_modules/**"] = True
                    watcher_exclude["**/.git/objects/**"] = True
                    watcher_exclude["**/.git/subtree-cache/**"] = True
                    watcher_exclude["**/node_modules/*/**"] = True
                    modified = True
                    fixed.append("✅ Исключены node_modules из file watcher")
                
                if modified:
                    # Бэкап
                    backup = self.settings_file.with_suffix('.json.backup')
                    with open(backup, 'w', encoding='utf-8') as f:
                        json.dump(settings, f, indent=2)
                    
                    # Сохранить
                    with open(self.settings_file, 'w', encoding='utf-8') as f:
                        json.dump(settings, f, indent=2)
                    
                    print(f"📝 Бэкап сохранён: {backup}")
                
            except Exception as e:
                print(f"❌ Ошибка при исправлении settings.json: {e}")
        
        # Исправление argv.json
        if self.argv_file.exists():
            try:
                with open(self.argv_file, 'r', encoding='utf-8') as f:
                    argv = json.load(f)
                
                if argv.get("disable-gpu") is True:
                    del argv["disable-gpu"]
                    
                    with open(self.argv_file, 'w', encoding='utf-8') as f:
                        json.dump(argv, f, indent=2)
                    
                    fixed.append("✅ Включён GPU в argv.json")
                    
            except Exception as e:
                print(f"❌ Ошибка при исправлении argv.json: {e}")
        
        return fixed
    
    def run_diagnosis(self):
        """Запускает полную диагностику."""
        print("🔍 Диагностика лагов Kiro...\n")
        
        self.check_memory_usage()
        self.check_gpu_acceleration()
        self.check_settings()
        self.check_argv()
        self.check_extension_host()
        
        return self.results
    
    def print_results(self):
        """Выводит результаты диагностики."""
        if not self.results:
            print("✅ Проблем не обнаружено!")
            return
        
        critical = [r for r in self.results if r.severity == "critical"]
        warnings = [r for r in self.results if r.severity == "warning"]
        info = [r for r in self.results if r.severity == "info"]
        
        if critical:
            print("🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:")
            for r in critical:
                print(f"\n  • {r.issue}")
                print(f"    {r.description}")
                if r.fix:
                    print(f"    💡 {r.fix}")
                    if r.auto_fixable:
                        print(f"    ⚡ Можно исправить автоматически")
        
        if warnings:
            print("\n🟡 ПРЕДУПРЕЖДЕНИЯ:")
            for r in warnings:
                print(f"\n  • {r.issue}")
                print(f"    {r.description}")
                if r.fix:
                    print(f"    💡 {r.fix}")
        
        if info:
            print("\n🔵 ИНФОРМАЦИЯ:")
            for r in info:
                print(f"\n  • {r.issue}")
                print(f"    {r.description}")
                if r.fix:
                    print(f"    💡 {r.fix}")


def main():
    parser = argparse.ArgumentParser(description="Kiro Lag Diagnostic & Fixer")
    parser.add_argument('--diagnose', action='store_true', help='Только диагностика')
    parser.add_argument('--fix', action='store_true', help='Применить исправления')
    
    args = parser.parse_args()
    
    diagnostic = KiroLagDiagnostic()
    diagnostic.run_diagnosis()
    diagnostic.print_results()
    
    if args.fix:
        print("\n" + "="*60)
        print("🔧 Применение исправлений...")
        print("="*60 + "\n")
        
        fixed = diagnostic.apply_fixes()
        
        if fixed:
            for fix in fixed:
                print(fix)
            print("\n⚠️  ВАЖНО: Перезапусти Kiro чтобы изменения вступили в силу!")
        else:
            print("Нет автоматических исправлений для применения")
    
    elif not args.diagnose:
        # По умолчанию только диагностика
        auto_fixable = [r for r in diagnostic.results if r.auto_fixable]
        if auto_fixable:
            print("\n" + "="*60)
            print(f"💡 Найдено {len(auto_fixable)} проблем с автоматическим исправлением")
            print("   Запусти с --fix чтобы применить исправления")
            print("="*60)


if __name__ == "__main__":
    main()
