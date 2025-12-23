# Kiro Performance Optimization Guide

## Диагностика лагов

### Инструменты мониторинга

```bash
# Реалтайм мониторинг
python autoreg/scripts/kiro_monitor.py

# С логированием
python autoreg/scripts/kiro_monitor.py --log

# Анализ логов
python autoreg/scripts/kiro_analyzer.py
```

## Быстрые решения

### 1. Перезапуск Extension Host
**Когда:** Extension Host > 800 MB
**Как:** `Ctrl+Shift+P` → "Developer: Restart Extension Host"
**Эффект:** Освобождает память без перезапуска Kiro

### 2. Перезагрузка окна
**Когда:** Webview Renderer > 1 GB
**Как:** `Ctrl+Shift+P` → "Developer: Reload Window"
**Эффект:** Перезагружает UI, сохраняет сессию

### 3. Проверка расширений
**Как:** `Ctrl+Shift+P` → "Developer: Show Running Extensions"
**Действия:** Отключи расширения с потреблением > 100 MB

## Рекомендуемые настройки

Добавь в `settings.json` (File → Preferences → Settings → Open Settings JSON):

```json
{
  // Отключить телеметрию
  "telemetry.telemetryLevel": "off",
  
  // Ограничить историю файлов
  "workbench.localHistory.maxFileSize": 256,
  "workbench.localHistory.maxFileEntries": 10,
  
  // Оптимизация файлового наблюдателя
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/.venv/**": true,
    "**/dist/**": true,
    "**/__pycache__/**": true,
    "**/debug_sessions/**": true
  },
  
  // Отключить превью (опционально)
  "editor.minimap.enabled": false,
  
  // Ограничить автосохранение
  "files.autoSave": "onFocusChange",
  
  // Оптимизация поиска
  "search.followSymlinks": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.venv": true,
    "**/__pycache__": true
  }
}
```

## Типичные проблемы

### Extension Host > 1 GB
**Причина:** Утечка памяти в расширении
**Решение:**
1. Проверь "Show Running Extensions"
2. Отключи тяжёлые расширения
3. Перезапусти Extension Host

### Webview Renderer > 1 GB
**Причина:** Много открытых webview панелей
**Решение:**
1. Закрой лишние превью
2. Закрой неиспользуемые терминалы
3. Перезагрузи окно

### GPU (Software) активен
**Причина:** Hardware acceleration отключен
**Решение:** Включи GPU acceleration в настройках

### Много процессов (> 30)
**Причина:** Несколько окон Kiro открыто
**Решение:** Закрой лишние окна

## Автоматический мониторинг

### Запуск в фоне

```bash
# Windows (PowerShell)
Start-Process python -ArgumentList "autoreg/scripts/kiro_monitor.py --log --interval 5" -WindowStyle Hidden

# Остановка
Get-Process python | Where-Object {$_.CommandLine -like "*kiro_monitor*"} | Stop-Process
```

### Анализ по расписанию

Создай задачу в Task Scheduler:
- Триггер: каждый час
- Действие: `python autoreg/scripts/kiro_analyzer.py`
- Результат: отчёт в `~/.kiro-manager-wb/`

## Пороговые значения

| Метрика | Норма | Предупреждение | Критично |
|---------|-------|----------------|----------|
| Общая RAM | < 2 GB | 2-4 GB | > 4 GB |
| Extension Host | < 500 MB | 500-800 MB | > 800 MB |
| Webview Renderer | < 500 MB | 500-1000 MB | > 1 GB |
| Main Process | < 500 MB | 500-800 MB | > 1 GB |
| Процессов | < 20 | 20-30 | > 30 |

## Профилактика

1. **Перезапускай Extension Host** раз в 2-3 часа при активной работе
2. **Закрывай лишние webview** панели
3. **Мониторь память** при работе с большими файлами
4. **Обновляй расширения** - новые версии часто фиксят утечки
5. **Перезапускай Kiro** раз в день при длительной работе

## Дополнительные инструменты

### Chrome DevTools для Kiro
`Ctrl+Shift+I` → вкладка Memory → Take Heap Snapshot
Позволяет найти утечки в webview

### Process Explorer (Windows)
Детальный анализ процессов Kiro с графиками памяти/CPU

### Performance Profiler
`Ctrl+Shift+P` → "Developer: Startup Performance"
Показывает время загрузки расширений
