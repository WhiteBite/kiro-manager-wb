#!/usr/bin/env node
/**
 * AWS Builder ID OAuth CLI
 * Handles OAuth flow for Kiro/AWS Builder ID authentication
 */

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { URL, URLSearchParams } = require('url');

// Configuration
const CONFIG = {
  clientId: 'kiro-cli',
  region: 'us-east-1',
  scopes: ['openid', 'aws.cognito.signin.user.admin', 'profile', 'email'],
  redirectUri: 'http://127.0.0.1:8765/callback',
  authEndpoint: 'https://oidc.us-east-1.amazonaws.com/authorize',
  tokenEndpoint: 'https://oidc.us-east-1.amazonaws.com/token',
  registerEndpoint: 'https://oidc.us-east-1.amazonaws.com/client/register'
};

// PKCE helpers
function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

function generateState() {
  return base64URLEncode(crypto.randomBytes(16));
}

// Dynamic client registration
async function registerClient() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      clientName: 'Kiro Account Switcher',
      clientType: 'public',
      scopes: CONFIG.scopes,
      grantTypes: ['authorization_code', 'refresh_token'],
      redirectUris: [CONFIG.redirectUri],
      issuerUrl: 'https://oidc.us-east-1.amazonaws.com'
    });

    const url = new URL(CONFIG.registerEndpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse registration response'));
          }
        } else {
          // Use default client if registration fails
          resolve({ clientId: CONFIG.clientId, clientSecret: null });
        }
      });
    });

    req.on('error', () => {
      // Use default client on error
      resolve({ clientId: CONFIG.clientId, clientSecret: null });
    });

    req.write(data);
    req.end();
  });
}

// Token exchange
async function exchangeCodeForToken(code, codeVerifier, clientId) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      redirect_uri: CONFIG.redirectUri,
      code_verifier: codeVerifier
    });

    const data = params.toString();
    const url = new URL(CONFIG.tokenEndpoint);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Failed to parse token response'));
          }
        } else {
          reject(new Error(`Token exchange failed: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Get tokens directory
function getTokensDir() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const tokensDir = path.join(homeDir, '.kiro-batch-login', 'tokens');
  
  if (!fs.existsSync(tokensDir)) {
    fs.mkdirSync(tokensDir, { recursive: true });
  }
  
  return tokensDir;
}

// Save token
function saveToken(tokenData, accountName) {
  const tokensDir = getTokensDir();
  const timestamp = Date.now();
  const safeName = accountName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `token-BuilderId-IdC-${safeName}-${timestamp}.json`;
  const filepath = path.join(tokensDir, filename);
  
  const tokenFile = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + (tokenData.expires_in * 1000),
    tokenType: tokenData.token_type || 'Bearer',
    accountName: accountName,
    provider: 'BuilderId',
    createdAt: new Date().toISOString()
  };
  
  fs.writeFileSync(filepath, JSON.stringify(tokenFile, null, 2));
  console.log(`Token saved to: ${filepath}`);
  
  return filepath;
}

// Main OAuth flow
async function startOAuthFlow(provider, accountName) {
  console.log(`Starting OAuth flow for ${provider}...`);
  
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  // Try to register client dynamically
  let clientId = CONFIG.clientId;
  try {
    const registration = await registerClient();
    if (registration.clientId) {
      clientId = registration.clientId;
    }
  } catch (e) {
    console.log('Using default client ID');
  }
  
  // Build authorization URL
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: CONFIG.redirectUri,
    scope: CONFIG.scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `${CONFIG.authEndpoint}?${authParams.toString()}`;
  console.log(`\nAuthorization URL:\n${authUrl}\n`);
  
  // Start local server for callback
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://${req.headers.host}`);
      
      if (reqUrl.pathname === '/callback') {
        const code = reqUrl.searchParams.get('code');
        const returnedState = reqUrl.searchParams.get('state');
        const error = reqUrl.searchParams.get('error');
        
        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>Error: ${error}</h1></body></html>`);
          server.close();
          reject(new Error(error));
          return;
        }
        
        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>State mismatch</h1></body></html>');
          server.close();
          reject(new Error('State mismatch'));
          return;
        }
        
        if (code) {
          try {
            console.log('Received authorization code, exchanging for token...');
            const tokenData = await exchangeCodeForToken(code, codeVerifier, clientId);
            console.log('Authentication successful!');
            
            const tokenPath = saveToken(tokenData, accountName);
            
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
              <head><style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       display: flex; justify-content: center; align-items: center; 
                       height: 100vh; margin: 0; background: #1e1e1e; color: #fff; }
                .container { text-align: center; }
                h1 { color: #3fb68b; }
              </style></head>
              <body>
                <div class="container">
                  <h1>✓ Authentication Successful!</h1>
                  <p>You can close this window and return to Kiro.</p>
                </div>
              </body>
              </html>
            `);
            
            server.close();
            resolve(tokenPath);
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end(`<html><body><h1>Error: ${e.message}</h1></body></html>`);
            server.close();
            reject(e);
          }
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(8765, '127.0.0.1', () => {
      console.log('OAuth callback server listening on http://127.0.0.1:8765');
      
      // Open browser if not in NO_BROWSER mode
      if (!process.env.NO_BROWSER) {
        const open = process.platform === 'darwin' ? 'open' :
                     process.platform === 'win32' ? 'start' : 'xdg-open';
        require('child_process').exec(`${open} "${authUrl}"`);
      }
    });
    
    server.on('error', (e) => {
      if (e.code === 'EADDRINUSE') {
        reject(new Error('Port 8765 is already in use'));
      } else {
        reject(e);
      }
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout'));
    }, 300000);
  });
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'login') {
    const providerIdx = args.indexOf('--provider');
    const accountIdx = args.indexOf('--account');
    
    const provider = providerIdx !== -1 ? args[providerIdx + 1] : 'BuilderId';
    const accountName = accountIdx !== -1 ? args[accountIdx + 1] : 'auto';
    
    try {
      const tokenPath = await startOAuthFlow(provider, accountName);
      console.log(`\nLogin successful! Token saved.`);
      process.exit(0);
    } catch (e) {
      console.error(`Login failed: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log('Usage: node index.js login [--provider BuilderId] [--account name]');
    process.exit(1);
  }
}

main();
