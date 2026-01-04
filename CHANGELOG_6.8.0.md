# Changelog v6.8.0 - Standalone Executable

## 🎉 Новые возможности

### 📦 Standalone Executable
- **Решена проблема**: `Python was not found` на компьютерах пользователей
- Создан `kiro-manager.exe` - не требует установки Python
- Размер: ~50-80 MB (включает Python runtime и все зависимости)
- Поддержка всех функций CLI через executable

### 🔌 IMAP Профили в расширении
- Добавлены предустановленные IMAP профили в VS Code настройки
- **Yandex**: `testmail@whitebite.ru` (catch-all) - готов к использованию
- **Gmail**: шаблон для настройки (требует App Password)
- **Outlook**: шаблон для настройки
- Новая команда: `Kiro: Test IMAP Connection`

### 🧪 IMAP Тестирование
- Новая CLI команда: `kiro-manager.exe imap test`
- Проверка подключения к серверу
- Проверка авторизации
- Подсчет сообщений в INBOX
- Детальная диагностика ошибок

### 🏗️ Автоматическая сборка
- GitHub Actions workflow для сборки executable
- Автоматическое тестирование собранного файла
- Загрузка в Releases при создании тега
- Кэширование зависимостей для ускорения сборки

## 🔧 Улучшения

### PyInstaller оптимизация
- Обновлен `.spec` файл с полным списком зависимостей
- Исключены ненужные библиотеки (GUI, научные, тестовые)
- Добавлена поддержка UPX сжатия
- Улучшена обработка IMAP и email модулей

### Документация
- **BUILD_EXECUTABLE.md** - подробная инструкция по сборке
- **QUICK_START.md** - быстрый старт для пользователей
- Обновлен README.md с информацией об executable
- Примеры конфигурации для всех IMAP провайдеров

### Скрипты сборки
- `build-executable.bat` - простая сборка для Windows
- `scripts/build-executable.ts` - TypeScript скрипт с проверками
- `npm run build:executable` - интеграция в package.json

## 📋 Новые команды

### CLI команды
```bash
# IMAP управление
kiro-manager.exe imap test          # Тест IMAP подключения

# Существующие команды теперь работают без Python
kiro-manager.exe status             # Общий статус
kiro-manager.exe tokens list        # Список токенов
kiro-manager.exe quota --all        # Квоты всех аккаунтов
kiro-manager.exe patch apply        # Применить патч
```

### VS Code команды
- `Kiro: Test IMAP Connection` - тест IMAP из расширения

## ⚙️ Конфигурация

### Новые настройки VS Code
```json
{
  "kiroAccountSwitcher.imap.profiles": [
    {
      "name": "Yandex (testmail@whitebite.ru)",
      "host": "imap.yandex.ru",
      "port": 993,
      "ssl": true,
      "email": "testmail@whitebite.ru",
      "password": "aosusinxnuwnnuzl",
      "description": "Catch-all email for registration"
    }
  ]
}
```

### Обновленный .env.example
```env
# IMAP Configuration for catch-all email
IMAP_SERVER=imap.yandex.ru
IMAP_USER=testmail@whitebite.ru
IMAP_PASSWORD=aosusinxnuwnnuzl

# Optional: Custom Machine ID
CUSTOM_MACHINE_ID=1234567890abcdef...
```

## 🐛 Исправления

- Улучшена обработка ошибок в PyInstaller spec
- Исправлены пути к статическим файлам в executable
- Добавлена проверка Python/Python3 в скриптах сборки
- Улучшена диагностика IMAP ошибок

## 📦 Файлы релиза

- `kiro-manager-wb-6.8.0.vsix` - VS Code расширение
- `kiro-manager.exe` - Standalone executable (Windows)
- `.env.example` - Пример конфигурации
- `BUILD_EXECUTABLE.md` - Инструкция по сборке
- `QUICK_START.md` - Быстрый старт

## 🔄 Миграция

### Для пользователей без Python
1. Скачайте `kiro-manager.exe` из релиза
2. Создайте `.env` файл с IMAP настройками
3. Тестируйте: `kiro-manager.exe imap test`

### Для существующих пользователей
- Обновите расширение как обычно
- IMAP профили добавятся автоматически в настройки
- Python версия продолжает работать без изменений

## 🎯 Что дальше (v6.9.0)

- Linux/macOS executable поддержка
- GUI версия standalone приложения
- Интеграция с системным трэем
- Автоматические обновления executable

---

**Полный changelog**: https://github.com/WhiteBite/kiro-manager-wb/compare/v6.7.3...v6.8.0