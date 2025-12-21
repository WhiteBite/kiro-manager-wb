# Kiro Patcher Management

## Что делает патч v4.0

Патч модифицирует встроенное расширение Kiro (`kiro.kiroAgent`) для поддержки динамической смены `machineId` при переключении аккаунтов.

**Два патча:**
1. **PATCH 1**: Добавляет проверку файла `~/.kiro-extension/machine-id.txt` в функцию `getMachineId()`
2. **PATCH 2**: Заменяет статический `MACHINE_ID` на динамический вызов `getMachineId()` в `userAttributes()`

## Быстрые команды

### Применить патч
```powershell
python -c "import sys; sys.path.insert(0, 'autoreg'); from services.kiro_patcher_service import KiroPatcherService; patcher = KiroPatcherService(); result = patcher.patch(skip_running_check=True); print(result.message)"
```

### Откатить патч
```powershell
python -c "import sys; sys.path.insert(0, 'autoreg'); from services.kiro_patcher_service import KiroPatcherService; patcher = KiroPatcherService(); result = patcher.unpatch(skip_running_check=True); print(result.message)"
```

### Проверить статус патча
```powershell
python -c "import sys; sys.path.insert(0, 'autoreg'); from services.kiro_patcher_service import KiroPatcherService; import json; patcher = KiroPatcherService(); status = patcher.check_status(); print(json.dumps({'is_patched': status.is_patched, 'version': status.patch_version, 'kiro_version': status.kiro_version}, indent=2))"
```

## Важно

- **Всегда закрывай Kiro** перед применением/откатом патча
- **Бэкапы создаются автоматически** в `~/.kiro-extension/backups/kiro-patches/`
- **После обновления Kiro** патч нужно применить заново

## Если что-то сломалось

1. Закрой Kiro
2. Откати патч командой выше
3. Перезапусти Kiro
4. Чат должен заработать

## Как работает переключение аккаунтов

1. Расширение записывает новый `machineId` в файл `~/.kiro-extension/machine-id.txt`
2. Патч читает этот файл при каждом вызове `getMachineId()`
3. AWS видит разные `machineId` для разных аккаунтов
4. Баны за "unusual activity" предотвращены

## История версий

- **v4.0.0** (текущая) - Минимальный безопасный патч, инжекция кода вместо замены функции
- **v3.0.0** - Не работает, ломает расширение из-за file watcher
- **v2.0.0** - Не работает, ломает расширение из-за неправильной замены функции
