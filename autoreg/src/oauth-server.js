/**
 * Local OAuth Callback Server
 * Supports both random and predefined port strategies
 * Based on Kiro's implementation (lines 123055-123220)
 */

import http from 'http';
import { URL } from 'url';
import chalk from 'chalk';

export class OAuthCallbackServer {
  /**
   * @param {Object} options - Server configuration
   * @param {string} [options.strategy='random'] - Port strategy: 'random' or 'predefined'
   * @param {Array<number>} [options.ports=[]] - Predefined ports (required for 'predefined' strategy)
   * @param {string} [options.hostname='127.0.0.1'] - Hostname to use ('127.0.0.1' or 'localhost')
   */
  constructor(options = {}) {
    this.strategy = options.strategy || 'random';
    this.ports = options.ports || [];
    this.hostname = options.hostname || '127.0.0.1';
    this.server = null;
    this.redirectUri = null;  // Will be set after server starts
    this.callbackPromise = null;
    this.callbackResolve = null;
    this.callbackReject = null;
    this.timeoutHandle = null;
    this.timeout = 300000; // 5 minutes (longer for manual login)
  }

  /**
   * Start the local HTTP server
   * Supports both random and predefined port strategies
   * Returns dynamic redirectUri with actual port
   */
  async start() {
    if (this.strategy === 'predefined') {
      return this.startWithPredefinedPorts();
    } else {
      return this.startWithRandomPort();
    }
  }

  /**
   * Start server with random port (port 0)
   * Used for IdC authentication (BuilderId, Enterprise)
   * Based on Kiro's implementation (lines 123059-123072)
   */
  async startWithRandomPort() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer(this.handleRequest.bind(this));

      this.server.on('error', (error) => {
        console.error(chalk.red(`Server error: ${error.message}`));
        reject(error);
      });

      this.server.on('listening', () => {
        const address = this.server.address();

        // Build redirectUri with actual port
        this.redirectUri = `http://${this.hostname}:${address.port}/oauth/callback`;

        console.log(chalk.gray(`✓ OAuth callback server listening on ${this.redirectUri}`));
        resolve(this.redirectUri);
      });

      // Listen on random port (port 0)
      this.server.listen(0, this.hostname);
    });
  }

  /**
   * Start server with predefined port list
   * Used for Social authentication (Google, GitHub)
   * Based on Kiro's implementation (line 107919: await this.authServer.start(ie2))
   * Tries ports in order until one succeeds
   */
  async startWithPredefinedPorts() {
    if (!this.ports || this.ports.length === 0) {
      throw new Error('Predefined port strategy requires a non-empty ports array');
    }

    let lastError = null;

    // Try each port in order
    for (const port of this.ports) {
      try {
        const redirectUri = await this.tryPort(port);
        return redirectUri;
      } catch (error) {
        lastError = error;
        // Continue to next port
      }
    }

    // All ports failed
    throw new Error(
      `Failed to start server on any predefined port. Last error: ${lastError?.message}`
    );
  }

  /**
   * Try to start server on a specific port
   */
  async tryPort(port) {
    return new Promise((resolve, reject) => {
      const server = http.createServer(this.handleRequest.bind(this));

      const onError = (error) => {
        server.close();
        reject(error);
      };

      const onListening = () => {
        const address = server.address();

        // Build redirectUri with actual port
        this.redirectUri = `http://${this.hostname}:${address.port}/oauth/callback`;

        console.log(chalk.gray(`✓ OAuth callback server listening on ${this.redirectUri}`));

        // Store the successful server
        this.server = server;

        // Remove error listener
        server.removeListener('error', onError);

        resolve(this.redirectUri);
      };

      server.once('error', onError);
      server.once('listening', onListening);

      // Try to listen on this specific port
      server.listen(port, this.hostname);
    });
  }

  /**
   * Wait for OAuth callback
   */
  async waitForCallback() {
    if (!this.callbackPromise) {
      this.callbackPromise = new Promise((resolve, reject) => {
        this.callbackResolve = resolve;
        this.callbackReject = reject;

        this.timeoutHandle = setTimeout(() => {
          this.callbackReject(new Error('OAuth callback timeout (5 minutes)'));
          this.resetCallbacks();
        }, this.timeout);
      });
    }
    return this.callbackPromise;
  }

  /**
   * Handle incoming HTTP requests
   */
  handleRequest(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      // Only handle /oauth/callback path
      if (url.pathname === '/oauth/callback') {
        this.handleOAuthCallback(req, res, url.searchParams);
      } else {
        this.send404Response(res);
      }
    } catch (error) {
      console.error(chalk.red(`Request handling error: ${error.message}`));
      this.sendErrorResponse(res, { error: 'internal_error', description: error.message });
    }
  }

  /**
   * Handle OAuth callback
   * Based on Kiro's implementation (lines 123134-123156)
   */
  handleOAuthCallback(req, res, searchParams) {
    console.log(chalk.cyan('\n📥 Received OAuth callback'));

    // Check for OAuth errors
    if (searchParams.has('error')) {
      const error = searchParams.get('error');
      const description = searchParams.get('error_description') || 'Unknown error';
      const state = searchParams.get('state');

      console.error(chalk.red(`✗ OAuth error: ${error} - ${description}`));

      this.sendErrorResponse(res, { error, description, state });
      this.callbackReject(new Error(`OAuth error: ${error} - ${description}`));
      this.resetCallbacks();
      return;
    }

    // Extract authorization code and state
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      console.error(chalk.red('✗ Missing code or state parameter'));
      this.sendValidationErrorResponse(res, 'Missing code or state parameter');
      this.callbackReject(new Error('OAuth callback missing authorization code or state'));
      this.resetCallbacks();
      return;
    }

    console.log(chalk.green('✓ Authorization code received'));
    console.log(chalk.gray(`  Code: ${code.substring(0, 20)}...`));
    console.log(chalk.gray(`  State: ${state}`));

    // Send success response to browser
    this.sendSuccessResponse(res);

    // Resolve the callback promise
    this.callbackResolve({ code, state });
    this.resetCallbacks();
  }

  /**
   * Send success HTML response
   */
  sendSuccessResponse(res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Authentication Successful</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      color: #2d3748;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    p {
      color: #718096;
      margin: 0;
      line-height: 1.6;
    }
    .close-hint {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
      font-size: 0.875rem;
      color: #a0aec0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>Authentication Successful!</h1>
    <p>You have successfully authenticated.</p>
    <p>You can now close this window and return to the CLI.</p>
    <div class="close-hint">This window will close automatically in 3 seconds...</div>
  </div>
  <script>
    setTimeout(() => window.close(), 3000);
  </script>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html)
    });
    res.end(html);
  }

  /**
   * Send error HTML response
   */
  sendErrorResponse(res, { error, description, state }) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Authentication Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .container {
      background: white;
      padding: 3rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 400px;
    }
    .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      color: #2d3748;
      margin: 0 0 1rem 0;
      font-size: 1.5rem;
    }
    .error-details {
      background: #fff5f5;
      border: 1px solid #feb2b2;
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 1rem 0;
      text-align: left;
    }
    .error-code {
      font-family: monospace;
      color: #c53030;
      font-weight: bold;
    }
    .error-description {
      color: #718096;
      margin-top: 0.5rem;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-icon">❌</div>
    <h1>Authentication Failed</h1>
    <div class="error-details">
      <div class="error-code">${this.escapeHtml(error)}</div>
      <div class="error-description">${this.escapeHtml(description)}</div>
    </div>
    <p>Please try again or contact support if the problem persists.</p>
  </div>
</body>
</html>`;

    res.writeHead(400, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html)
    });
    res.end(html);
  }

  /**
   * Send validation error response
   */
  sendValidationErrorResponse(res, message) {
    this.sendErrorResponse(res, {
      error: 'invalid_request',
      description: message,
      state: null
    });
  }

  /**
   * Send 404 response
   */
  send404Response(res) {
    const html = '<h1>404 Not Found</h1>';
    res.writeHead(404, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html)
    });
    res.end(html);
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Reset callback handlers
   */
  resetCallbacks() {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
    this.callbackPromise = null;
    this.callbackResolve = null;
    this.callbackReject = null;
  }

  /**
   * Stop the server
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log(chalk.gray('✓ OAuth callback server stopped'));
          resolve();
        });
        this.server = null;
      } else {
        resolve();
      }
    });
  }
}
