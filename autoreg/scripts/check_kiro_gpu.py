#!/usr/bin/env python3
"""
Проверка GPU в процессах Kiro.
Определяет используется ли SwiftShader (software rendering).
"""

import sys
try:
    import psutil
except ImportError:
    print("❌ Установи psutil: pip install psutil")
    sys.exit(1)


def check_kiro_gpu():
    """Проверяет GPU процессы Kiro."""
    print("🔍 Проверка GPU в Kiro...\n")
    
    gpu_processes = []
    
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info']):
        try:
            if proc.info['name'] and 'kiro' in proc.info['name'].lower():
                cmdline = proc.info['cmdline'] or []
                cmdline_str = " ".join(cmdline).lower()
                
                if "--type=gpu-process" in cmdline_str:
                    mem_mb = proc.info['memory_info'].rss / (1024**2)
                    
                    is_swiftshader = "swiftshader" in cmdline_str
                    use_angle = "--use-angle=" in cmdline_str
                    
                    # Извлекаем параметры
                    angle_backend = "unknown"
                    if use_angle:
                        for arg in cmdline:
                            if arg.startswith("--use-angle="):
                                angle_backend = arg.split("=")[1]
                                break
                    
                    gpu_processes.append({
                        'pid': proc.info['pid'],
                        'memory_mb': mem_mb,
                        'swiftshader': is_swiftshader,
                        'angle': angle_backend,
                        'cmdline': cmdline_str
                    })
        
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    
    if not gpu_processes:
        print("❌ GPU процессы Kiro не найдены")
        return
    
    print(f"Найдено GPU процессов: {len(gpu_processes)}\n")
    
    for i, gpu in enumerate(gpu_processes, 1):
        print(f"GPU Process #{i} (PID {gpu['pid']}):")
        print(f"  Память: {gpu['memory_mb']:.0f} MB")
        
        if gpu['swiftshader']:
            print(f"  Режим: 🔴 SwiftShader (Software Rendering)")
            print(f"  ANGLE: {gpu['angle']}")
            print(f"  ⚠️  ПРОБЛЕМА: Используется программный рендеринг!")
            print(f"  💡 Это причина лагов!")
        else:
            print(f"  Режим: ✅ Hardware Acceleration")
            print(f"  ANGLE: {gpu['angle']}")
        
        print()
    
    # Итоговый вердикт
    has_swiftshader = any(g['swiftshader'] for g in gpu_processes)
    
    print("=" * 60)
    if has_swiftshader:
        print("🔴 ВЕРДИКТ: Kiro использует Software Rendering")
        print("\nПричины:")
        print("  1. Драйвера видеокарты устарели или не установлены")
        print("  2. Видеокарта в блоклисте Chromium")
        print("  3. Проблемы с DirectX/OpenGL")
        print("\nРешения:")
        print("  1. Обнови драйвера видеокарты")
        print("  2. Проверь: Ctrl+Shift+P → 'Preferences: Configure Runtime Arguments'")
        print("  3. Добавь в argv.json: \"ignore-gpu-blocklist\": true")
    else:
        print("✅ ВЕРДИКТ: Hardware Acceleration работает")
        print("   Лаги не связаны с GPU")


if __name__ == "__main__":
    check_kiro_gpu()
