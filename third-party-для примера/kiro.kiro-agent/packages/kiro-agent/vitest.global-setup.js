import { vi } from 'vitest';

// Mock vscode module to prevent import errors when testing
vi.mock('vscode', () => {
  return {
    window: {
      createOutputChannel: vi.fn(() => ({
        appendLine: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
        clear: vi.fn(),
        trace: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
      showErrorMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showInformationMessage: vi.fn(),
      state: {
        focused: true,
      },
      onDidChangeWindowState: vi.fn(),
    },
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(),
        has: vi.fn(),
        inspect: vi.fn(),
      })),
      workspaceFolders: [],
      onDidChangeConfiguration: vi.fn(),
    },
    commands: {
      registerCommand: vi.fn(),
      executeCommand: vi.fn(),
    },
    env: {
      machineId: 'test-machine-id',
      sessionId: 'test-session-id',
      language: 'en',
      appName: 'Visual Studio Code',
      appRoot: '/test/app/root',
      appHost: 'desktop',
      uriScheme: 'vscode',
    },
    kiroVersion: '1.0.0',
    Uri: {
      file: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
      parse: vi.fn((uri) => ({ fsPath: uri, scheme: 'file', path: uri })),
    },
    ConfigurationTarget: {
      Global: 1,
      Workspace: 2,
      WorkspaceFolder: 3,
    },
    LogLevel: {
      Trace: 0,
      Debug: 1,
      Info: 2,
      Warning: 3,
      Error: 4,
      Critical: 5,
      Off: 6,
    },
    EventEmitter: vi.fn(() => ({
      event: vi.fn(),
      fire: vi.fn(),
      dispose: vi.fn(),
    })),
  };
});
