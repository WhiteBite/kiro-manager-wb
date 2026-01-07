# 🚀 Быстрый старт - Kiro Manager

## Проблема решена! ✅

**Проблема**: `Python was not found; run without arguments to install from the Microsoft Store`

**Решение**: Используйте готовый executable файл, который не требует Python!

---

## 📥 Скачивание

1. Перейдите в [Releases](https://github.com/WhiteBite/kiro-manager-wb/releases)
2. Скачайте `kiro-manager.exe` из последнего релиза
3. Скачайте `.env.example` (переименуйте в `.env`)

---

## ⚙️ Настройка IMAP

Создайте файл `.env` рядом с `kiro-manager.exe`:

```env
IMAP_SERVER=imap.yandex.ru
IMAP_USER=your-email@example.com
IMAP_PASSWORD=your-imap-app-password
```

### Поддерживаемые провайдеры

| Провайдер | IMAP Server | Port | SSL |
|-----------|-------------|------|-----|
| **Yandex** | `imap.yandex.ru` | 993 | ✅ |
| **Gmail** | `imap.gmail.com` | 993 | ✅ |
| **Outlook** | `outlook.office365.com` | 993 | ✅ |

---

## 🧪 Тестирование

```cmd
# Тест IMAP подключения
kiro-manager.exe imap test
```

**Ожидаемый результат**:
```
🔌 Testing IMAP: imap.yandex.ru:993 as your-email@example.com...
✅ Connected to server
✅ Authentication successful
✅ Found 4 folders
✅ INBOX: 0 messages
✅ IMAP test successful!
```

---

## 📋 Основные команды

```cmd
# Общий статус системы
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

# IMAP тестирование
kiro-manager.exe imap test

# Импорт SSO аккаунта
kiro-manager.exe sso-import
```

---

## 🔧 Troubleshooting

### ❌ "IMAP test error"

**Причины**:
- Неправильные данные в `.env`
- Нет интернета
- Блокировка файрвола

**Решение**:
1. Проверьте данные в `.env`
2. Проверьте интернет соединение
3. Временно отключите файрвол

### ❌ "Executable не запускается"

**Причины**:
- Антивирус блокирует
- Поврежденный файл
- Недостаточно прав

**Решение**:
1. Добавьте в исключения антивируса
2. Перескачайте файл
3. Запустите от имени администратора

### ❌ "Kiro not found"

**Причины**:
- Kiro не установлен
- Нестандартный путь установки

**Решение**:
1. Установите Kiro IDE
2. Укажите путь в `.env`:
   ```env
   KIRO_PATH=C:\Custom\Path\To\Kiro
   ```

---

## 📞 Поддержка

- **GitHub Issues**: [Создать issue](https://github.com/WhiteBite/kiro-manager-wb/issues)
- **Telegram**: [@whitebite_devsoft](https://t.me/whitebite_devsoft)
- **Документация**: [BUILD_EXECUTABLE.md](BUILD_EXECUTABLE.md)

---

## 🎯 Что дальше?

После успешного тестирования IMAP:

1. **Регистрация аккаунтов**: Используйте авторег для создания новых AWS Builder ID
2. **Переключение токенов**: Управляйте несколькими аккаунтами
3. **Мониторинг квот**: Отслеживайте использование API
4. **Патчинг**: Обходите hardware fingerprint блокировки

**Удачи!** 🚀