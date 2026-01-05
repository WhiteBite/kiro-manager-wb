# Design Document: Fix Patch Status

## Overview

Исправление проблемы отображения статуса патча в UI расширения. Текущая проблема: CLI и Python backend корректно определяют статус (`isPatched: true`), но UI показывает "Kiro not installed".

Корневая причина: в функции `checkPatchStatus` результат executable проверяется только при `result.success === true`, но JSON может быть валидным даже при `success: false`. Также `error: null` в JSON интерпретируется как наличие ошибки.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Webview UI                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Settings Panel → Patch Status Display               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ getPatchStatus message
┌─────────────────────────────────────────────────────────────┐
│                   AccountsProvider                           │
│  sendPatchStatus(status) → postMessage to webview           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ checkPatchStatus()
┌─────────────────────────────────────────────────────────────┐
│                   autoreg.ts                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Try executable (kiro-cli.exe)                    │    │
│  │     - Check context.extensionPath/dist/bin/          │    │
│  │     - Check ~/.kiro-manager-wb/bin/                  │    │
│  │  2. Fallback to Python (patch_status.py)             │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    kiro-cli.exe         │     │   patch_status.py       │
│  patch status --json    │     │   (Python fallback)     │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
                    JSON Response:
                    {
                      isPatched: boolean,
                      kiroVersion: string,
                      patchVersion: string,
                      currentMachineId: string,
                      error: string | null
                    }
```

## Components and Interfaces

### 1. PatchStatusResult Interface (existing)

```typescript
interface PatchStatusResult {
  isPatched: boolean;
  kiroVersion?: string;
  patchVersion?: string;
  latestPatchVersion?: string;
  currentMachineId?: string;
  needsUpdate?: boolean;
  updateReason?: string;
  error?: string;  // undefined means no error, not null
}
```

### 2. checkPatchStatus Function (to be fixed)

```typescript
async function checkPatchStatus(context: ExtensionContext): Promise<PatchStatusResult> {
  // 1. Try executable first
  if (isExecutableAvailable(context)) {
    const result = await runExecutable(context, ['patch', 'status', '--json']);
    
    // Try to parse JSON even if exit code is non-zero
    if (result.output) {
      try {
        const parsed = JSON.parse(result.output.trim());
        return {
          isPatched: parsed.isPatched || false,
          kiroVersion: parsed.kiroVersion,
          patchVersion: parsed.patchVersion,
          currentMachineId: parsed.currentMachineId,
          // Handle null error correctly
          error: parsed.error === null ? undefined : parsed.error
        };
      } catch {
        // JSON parse failed, continue to fallback
        console.log('[PatchStatus] JSON parse failed, trying Python fallback');
      }
    }
  }
  
  // 2. Fallback to Python
  // ... existing Python fallback code
}
```

### 3. updatePatchStatus Function in scripts.ts (to be fixed)

```typescript
function updatePatchStatus(status) {
  if (!status) return;
  
  const statusEl = document.getElementById('patchStatusText');
  
  if (statusEl) {
    // Check for actual error (not null, not undefined, not empty string)
    if (status.error && status.error !== 'null') {
      statusEl.textContent = status.error;
      statusEl.className = 'patch-status error';
    } else if (status.isPatched) {
      // ... success display
    } else {
      // ... not patched display
    }
  }
}
```

## Data Models

### PatchStatus JSON from CLI

```json
{
  "isPatched": true,
  "kiroVersion": "0.8.0",
  "patchVersion": "6.5.0",
  "currentMachineId": "1127db8c749ebf2f...",
  "error": null
}
```

Key insight: `error: null` means NO error, but current code treats any truthy `error` field as error.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Path Resolution Order

*For any* extension context, the Patch_Status_Service SHALL check paths in order: `extensionPath/dist/bin/` → `~/.kiro-manager-wb/bin/` → Python fallback, stopping at the first available method.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: JSON Parsing Resilience

*For any* executable output containing valid JSON, the Patch_Status_Service SHALL successfully parse it regardless of exit code, and SHALL correctly interpret `error: null` as no error.

**Validates: Requirements 2.1, 2.2, 2.4**

### Property 3: Fallback on Parse Failure

*For any* executable output that is not valid JSON, the Patch_Status_Service SHALL fall back to Python script without throwing an exception.

**Validates: Requirements 2.3**

### Property 4: No False "Not Installed" Errors

*For any* status where `isPatched: true`, the UI SHALL NOT display "Kiro not installed" or similar error messages, even if status check encountered transient errors.

**Validates: Requirements 3.3**

### Property 5: Logging Completeness

*For any* status check operation, the Patch_Status_Service SHALL log: method used, path/arguments (if executable), and final result or error.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

## Error Handling

| Error Condition | Handling |
|-----------------|----------|
| Executable not found | Fall back to Python silently |
| Executable returns non-zero exit | Try to parse JSON anyway |
| JSON parse fails | Fall back to Python |
| Python fails | Return error with specific message |
| `error: null` in JSON | Treat as no error |
| `error: "Kiro not installed"` | Display with installation hint |

## Testing Strategy

### Unit Tests

1. **Path resolution tests**: Mock fs.existsSync to test path checking order
2. **JSON parsing tests**: Test various JSON outputs including `error: null`
3. **UI state tests**: Test updatePatchStatus with different status objects

### Property-Based Tests

Using fast-check for TypeScript:

1. **Property 2 test**: Generate random valid JSON with various `error` values (null, undefined, string, missing), verify correct interpretation
2. **Property 3 test**: Generate random invalid JSON strings, verify fallback is triggered without exception

### Integration Tests

1. Run actual `kiro-cli.exe patch status --json` and verify parsing
2. Test full flow from webview message to UI update
