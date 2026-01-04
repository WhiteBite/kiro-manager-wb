# Requirements Document

## Introduction

Исправление проблемы отображения статуса патча Kiro в UI расширения. CLI и Python backend корректно определяют статус патча, но UI показывает ошибку "Kiro not installed" несмотря на то, что патч установлен.

## Glossary

- **Patch_Status_Service**: TypeScript сервис, запрашивающий статус патча через executable или Python fallback
- **Kiro_CLI**: Исполняемый файл `kiro-cli.exe`, выполняющий команды патчинга
- **Webview_UI**: Интерфейс расширения, отображающий статус патча пользователю
- **Extension_Context**: Контекст VS Code расширения, содержащий пути к ресурсам

## Requirements

### Requirement 1: Корректное определение пути к executable

**User Story:** As a user, I want the extension to correctly locate the bundled executable, so that patch status is displayed accurately.

#### Acceptance Criteria

1. WHEN the extension starts, THE Patch_Status_Service SHALL check for executable in `context.extensionPath/dist/bin/`
2. WHEN executable not found in extension path, THE Patch_Status_Service SHALL check `~/.kiro-manager-wb/bin/`
3. WHEN executable exists, THE Patch_Status_Service SHALL use it for status checks
4. IF executable not found in any location, THEN THE Patch_Status_Service SHALL fall back to Python script

### Requirement 2: Надёжный парсинг результата executable

**User Story:** As a user, I want the patch status to be correctly parsed from CLI output, so that I see accurate information in UI.

#### Acceptance Criteria

1. WHEN executable returns JSON with exit code 0, THE Patch_Status_Service SHALL parse and return the status
2. WHEN executable returns valid JSON but non-zero exit code, THE Patch_Status_Service SHALL still attempt to parse JSON
3. WHEN JSON parsing fails, THE Patch_Status_Service SHALL fall back to Python script
4. WHEN status contains `error: null`, THE Patch_Status_Service SHALL treat it as no error

### Requirement 3: Корректная обработка ошибок

**User Story:** As a user, I want to see meaningful error messages when patch status cannot be determined, so that I can troubleshoot issues.

#### Acceptance Criteria

1. WHEN Kiro installation path cannot be found, THE Webview_UI SHALL display "Kiro not found" with installation hint
2. WHEN executable and Python both fail, THE Webview_UI SHALL display specific error message
3. WHEN patch is installed but status check fails, THE Webview_UI SHALL NOT show "Kiro not installed"

### Requirement 4: Отображение статуса в UI

**User Story:** As a user, I want to see the correct patch status in the Settings panel, so that I know if patching is needed.

#### Acceptance Criteria

1. WHEN patch is installed, THE Webview_UI SHALL display "Патч установлен ✓" with version info
2. WHEN patch needs update, THE Webview_UI SHALL display warning with update button
3. WHEN patch is not installed, THE Webview_UI SHALL display "Не установлен" with patch button
4. WHEN checking status, THE Webview_UI SHALL display loading indicator

### Requirement 5: Логирование для отладки

**User Story:** As a developer, I want detailed logs of patch status checks, so that I can debug issues.

#### Acceptance Criteria

1. WHEN status check starts, THE Patch_Status_Service SHALL log the method being used (executable/Python)
2. WHEN executable is called, THE Patch_Status_Service SHALL log the full path and arguments
3. WHEN error occurs, THE Patch_Status_Service SHALL log detailed error information
4. WHEN status is received, THE Patch_Status_Service SHALL log the parsed result
