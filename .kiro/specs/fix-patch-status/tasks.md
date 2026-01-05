# Implementation Plan: Fix Patch Status

## Overview

Исправление проблемы отображения статуса патча. Основные изменения в `checkPatchStatus()` и `updatePatchStatus()`.

## Tasks

- [ ] 1. Исправить парсинг JSON в checkPatchStatus
  - [x] 1.1 Изменить логику проверки результата executable
    - Убрать зависимость от `result.success`
    - Пытаться парсить JSON если есть `result.output`
    - _Requirements: 2.1, 2.2_
  - [x] 1.2 Исправить обработку `error: null`
    - Преобразовывать `null` в `undefined`
    - Не передавать `error` если значение falsy
    - _Requirements: 2.4_
  - [x] 1.3 Добавить логирование для отладки
    - Логировать метод (executable/Python)
    - Логировать путь к executable
    - Логировать результат парсинга
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 2. Исправить отображение в UI
  - [ ] 2.1 Исправить updatePatchStatus в scripts.ts
    - Проверять `error` на truthy И не равно строке "null"
    - Корректно отображать статус при `error: null`
    - _Requirements: 3.3, 4.1_
  - [ ] 2.2 Улучшить сообщения об ошибках
    - Различать "Kiro not installed" и "Status check failed"
    - Добавить hint для установки Kiro
    - _Requirements: 3.1, 3.2_

- [ ] 3. Checkpoint - Проверить исправления
  - Запустить расширение и проверить статус патча
  - Убедиться что UI показывает корректный статус
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 4. Добавить тесты
  - [ ]* 4.1 Unit тест для парсинга JSON с error: null
    - Тест что `{isPatched: true, error: null}` парсится корректно
    - _Requirements: 2.4_
  - [ ]* 4.2 Unit тест для fallback логики
    - Тест что при невалидном JSON происходит fallback
    - _Requirements: 2.3_

## Notes

- Задачи с `*` опциональны (тесты)
- Основной фикс в задачах 1 и 2
- После задачи 3 можно проверить что проблема решена
