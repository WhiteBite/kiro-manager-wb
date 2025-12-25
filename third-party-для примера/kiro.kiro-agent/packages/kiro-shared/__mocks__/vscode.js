export const window = {
  createOutputChannel: () => ({
    trace: () => {},
    debug: () => {},
    info: () => {},
    error: () => {},
    warn: () => {},
    clear: () => {},
  }),
  showQuickPick: (options) => Promise.resolve(options[0]),
  showInformationMessage: () => {},
  showErrorMessage: () => {},
  onDidChangeWindowState: () => {},
  state: {
    focused: true,
    active: true,
  },
};

export const env = {
  openExternal: () => {},
  asExternalUri: (x) => x,
};

export const Uri = {
  parse: (x) => x,
};

export const workspace = {
  getConfiguration: () => ({
    get: () => false,
  }),
};

/**
 *
 */
export class EventEmitter {
  constructor() {
    this.handlers = [];
    this.event = (handler) => {
      this.handlers.push(handler);
    };
  }

  /**
   * Fires the event
   */
  fire(...args) {
    this.handlers.forEach((handler) => handler(...args));
  }
}
