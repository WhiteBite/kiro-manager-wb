# Сборка Executable для Kiro Manager

Этот документ описывает как собрать standalone executable файл, который не требует установки Python на компьютере пользователя.

## Требования для сборки

- Python 3.11+ 
- pip (обычно идет с Python)
- Windows (для .exe файла)

## Быстрая сборка (Windows)

1. **Установите Python** (если еще не установлен):
   - Скачайте с https://www.python.org/downloads/
   - При установке отметьте "Add Python to PATH"

2. **Запустите batch файл**:
   ```cmd
   build-executable.bat
   ```

3. **Готово!** Executable будет в `dist/executable/kiro-manager.exe`

## Ручная сборка

### Шаг 1: Установка зависимостей

```bash
cd autoreg
pip install -r requirements.txt
pip install pyinstaller
```

### Шаг 2: Сборка

```bash
pyinstaller kiro-manager.spec --clean --noconfirm
```

### Шаг 3: Копирование результата

```bash
mkdir ../dist/executable
copy dist/kiro-manager.exe ../dist/executable/
copy .env.example ../dist/executable/
```

## Использование Executable

### Конфигурация

Создайте файл `.env` рядом с `kiro-manager.exe`:

```env
IMAP_SERVER=imap.yandex.ru
IMAP_USER=testmail@example.com
IMAP_PASSWORD=your-imap-app-password
```

### Тестирование IMAP

```cmd
kiro-manager.exe imap test
```

Ожидаемый вывод:
```
🔌 Testing IMAP: imap.yandex.ru:993 as testmail@example.com...
✅ Connected to server
✅ Authentication successful
✅ Found 4 folders
✅ INBOX: 0 messages
✅ IMAP test successful!
```

### Основные команды

```cmd
# Общий статус
kiro-manager.exe status

# Управление токенами
kiro-manager.exe tokens list
kiro-manager.exe tokens switch <name>

# Проверка квот
kiro-manager.exe quota
kiro-manager.exe quota --all

# Управление Machine ID
kiro-manager.exe machine status
kiro-manager.exe machine reset

# Патчинг Kiro
kiro-manager.exe patch status
kiro-manager.exe patch apply
kiro-manager.exe patch restart

# Управление Kiro IDE
kiro-manager.exe kiro status
kiro-manager.exe kiro restart
```

## Размер файла

Ожидаемый размер executable: ~50-80 MB

Это нормально для Python приложения с зависимостями. Файл включает:
- Python runtime
- Все библиотеки (FastAPI, DrissionPage, etc.)
- Наш код

## Поддерживаемые IMAP серверы

- **Yandex**: `imap.yandex.ru:993` (SSL)
- **Gmail**: `imap.gmail.com:993` (SSL, требует App Password)
- **Outlook**: `outlook.office365.com:993` (SSL)

## Troubleshooting

### "Python was not found"

Это означает что Python не установлен или не добавлен в PATH.

**Решение**: Установите Python с https://www.python.org/downloads/

### "PyInstaller failed"

Возможные причины:
- Недостаточно места на диске
- Антивирус блокирует сборку
- Отсутствуют зависимости

**Решение**: 
1. Освободите место (нужно ~500MB для сборки)
2. Временно отключите антивирус
3. Переустановите зависимости: `pip install -r requirements.txt --force-reinstall`

### "IMAP test failed"

Проверьте:
- Правильность данных в `.env`
- Интернет соединение
- Настройки файрвола

### Executable не запускается

- Проверьте что файл не поврежден
- Запустите из командной строки для просмотра ошибок
- Убедитесь что антивирус не блокирует файл

## GitHub Actions (автоматическая сборка)

Можно настроить автоматическую сборку через GitHub Actions:

```yaml
name: Build Executable
on: [push, pull_request]
jobs:
  build:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    - run: |
        cd autoreg
        pip install -r requirements.txt
        pip install pyinstaller
        pyinstaller kiro-manager.spec --clean --noconfirm
    - uses: actions/upload-artifact@v3
      with:
        name: kiro-manager-executable
        path: autoreg/dist/kiro-manager.exe
```

## Альтернативы

Если сборка не работает, можно использовать:

1. **Portable Python** + наш код
2. **Docker** контейнер
3. **Nuitka** вместо PyInstaller
4. **cx_Freeze** как альтернатива PyInstaller

## Поддержка

При проблемах создайте issue с:
- Версией Python (`python --version`)
- Версией PyInstaller (`pyinstaller --version`)
- Полным логом ошибки
- Операционной системой