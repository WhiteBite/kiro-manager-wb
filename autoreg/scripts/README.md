# Kiro Manager Scripts

Набор инструментов для диагностики, тестирования и отладки Kiro.

## 🔧 Диагностика и исправление

### kiro_fix_lags.py
Автоматическая диагностика и исправление лагов Kiro.

**Проверяет:**
- Hardware acceleration (SwiftShader = медленно)
- Тяжёлые расширения и утечки памяти
- Файловые watcher'ы (node_modules)
- Telemetry и фоновые процессы

**Использование:**
```bash
# Только диагностика
python autoreg/scripts/kiro_fix_lags.py --diagnose

# Применить автоматические исправления
python autoreg/scripts/kiro_fix_lags.py --fix
```

### check_kiro_gpu.py
Проверка GPU процессов Kiro на использование SwiftShader.

**Использование:**
```bash
python autoreg/scripts/check_kiro_gpu.py
```

### kiro_monitor.py
Мониторинг производительности Kiro в реальном времени.

**Использование:**
```bash
python autoreg/scripts/kiro_monitor.py
```

### kiro_analyzer.py
Анализ логов и метрик Kiro.

**Использование:**
```bash
python autoreg/scripts/kiro_analyzer.py
```

## 🧪 Тестирование

### test_patches.py
Проверка статуса патчей Kiro (machine-id, quota, telemetry).

**Использование:**
```bash
python autoreg/scripts/test_patches.py
```

### test_fingerprint.py
Тестирование anti-fingerprint модулей.

**Использование:**
```bash
python autoreg/scripts/test_fingerprint.py
```

### test_strategy.py
Быстрый тест регистрации с выбранной стратегией.

**Использование:**
```bash
python autoreg/scripts/test_strategy.py
```

## 🔍 Отладка и анализ

### analyze_kiro_traffic.py
Анализ сетевого трафика Kiro (требует mitmproxy).

**Использование:**
```bash
python autoreg/scripts/analyze_kiro_traffic.py
```

### run_kiro_with_proxy.ps1
Запуск Kiro с mitmproxy для перехвата трафика.

**Использование:**
```powershell
.\autoreg\scripts\run_kiro_with_proxy.ps1
```

### install_mitmproxy_cert.ps1
Установка сертификата mitmproxy в систему.

**Использование:**
```powershell
.\autoreg\scripts\install_mitmproxy_cert.ps1
```

## 📊 Утилиты

### patch_status.py
Проверка статуса патчей без запуска полного теста.

**Использование:**
```bash
python autoreg/scripts/patch_status.py
```

### start_llm_api.bat
Запуск LLM API сервера на порту 8421.

**Использование:**
```bash
.\autoreg\scripts\start_llm_api.bat
```

## 📝 Примечания

- Все скрипты полностью автономные (без `input()`)
- Результаты сохраняются в файлы
- Браузер закрывается автоматически
- Debug артефакты → `autoreg/debug_sessions/` (в .gitignore)
