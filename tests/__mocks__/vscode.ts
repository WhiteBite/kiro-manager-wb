/**
 * Mock for vscode module in tests
 */

export const window = {
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    withProgress: jest.fn((options, task) => task({ report: jest.fn() })),
};

export const workspace = {
    getConfiguration: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
    })),
};

export const env = {
    clipboard: {
        writeText: jest.fn(),
    },
    openExternal: jest.fn(),
};

export const Uri = {
    file: jest.fn((path: string) => ({ fsPath: path })),
    parse: jest.fn((uri: string) => ({ toString: () => uri })),
};

export const ProgressLocation = {
    Notification: 1,
    Window: 10,
    SourceControl: 15,
};

export const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
};
