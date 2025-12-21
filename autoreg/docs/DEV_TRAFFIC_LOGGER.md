# Kiro Traffic Logger (DEV TOOL)

Инструмент для разработчиков для анализа HTTP трафика Kiro IDE.

> ⚠️ **Это инструмент для РАЗРАБОТКИ!**  
> Для обычного использования применяйте патч через расширение.

## Зачем нужен?

- Анализ какие данные Kiro отправляет на сервера AWS
- Поиск machineId в запросах/ответах
- Разработка и тестирование патчей
- Отладка проблем с аутентификацией

## Установка

### 1. Установить mitmproxy

```powershell
pip install mitmproxy
```

### 2. Установить сертификат

```powershell
cd autoreg/scripts
.\install_mitmproxy_cert.ps1
```

## Использование

```powershell
cd autoreg/scripts
.\run_kiro_with_proxy.ps1
```

Скрипт:
1. Запустит mitmproxy на порту 8080
2. Запустит Kiro с настроенным прокси
3. Будет логировать весь интересный трафик

## Логи

Логи сохраняются в: `~/.kiro-manager-wb/proxy_logs/`

Формат лога:
```
[HH:MM:SS.mmm] >>> REQUEST #1
[HH:MM:SS.mmm]     Method: POST
[HH:MM:SS.mmm]     URL: https://q.us-east-1.amazonaws.com/generateAssistantResponse
[HH:MM:SS.mmm]     Host: q.us-east-1.amazonaws.com
[HH:MM:SS.mmm]     --- Headers ---
[HH:MM:SS.mmm]     x-kiro-machineid: e54f7e7076984c07634a1dd70053323a0fcf03140bf7d5a33d74958e9afc1bc8
[HH:MM:SS.mmm]     !!! FOUND machineId in header 'x-kiro-machineid': e54f7e7076984c07634a1dd70053323a0fcf03140bf7d5a33d74958e9afc1bc8
```

## Что логируется

### Хосты
- `*.amazonaws.com` - AWS API
- `*.kiro.dev` - Kiro телеметрия
- `*.awsapps.com` - AWS SSO

### Headers
- `User-Agent` - версия Kiro и machineId
- `x-kiro-machineid` - machineId для телеметрии
- `x-amz-*` - AWS заголовки
- `Authorization` - токены (маскируются)

### Body
- JSON запросы/ответы (форматированные)
- Поиск machineId в теле запроса

## Найденные endpoints

| Endpoint | Описание |
|----------|----------|
| `q.us-east-1.amazonaws.com/generateAssistantResponse` | AI запросы |
| `prod.us-east-1.telemetry.desktop.kiro.dev/v1/traces` | Телеметрия (traces) |
| `prod.us-east-1.telemetry.desktop.kiro.dev/v1/metrics` | Телеметрия (metrics) |
| `oidc.us-east-1.amazonaws.com/*` | OAuth авторизация |

## Где используется machineId

1. **Header `x-kiro-machineid`** - телеметрия
2. **Header `x-amz-user-agent`** - формат `KiroIDE-{version}-{machineId}`
3. **Body `machineId`** - в JSON запросах
4. **Body `userAttributes.machineId`** - атрибуты пользователя
