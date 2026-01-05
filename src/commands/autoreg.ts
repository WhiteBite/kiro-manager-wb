/**
 * Auto-registration commands
 * Handles automatic account registration and SSO import
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KiroAccountsProvider } from '../providers/AccountsProvider';
import { ImapProfileProvider } from '../providers/ImapProfileProvider';
import { autoregProcess } from '../process-manager';
import { PythonEnvManager } from '../utils/python-env';
import { runExecutable, isExecutableAvailable, ensureExecutable } from '../utils/executable-runner';

// Get autoreg directory
export function getAutoregDir(context: vscode.ExtensionContext): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const workspacePath = path.join(workspaceFolder, 'kiro-manager-wb', 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-manager-wb');
  const bundledPath = path.join(context.extensionPath, 'autoreg');

  // Priority 1: Workspace path (for development)
  if (fs.existsSync(path.join(workspacePath, 'registration', 'register.py'))) {
    return workspacePath;
  }

  // Priority 2: Bundled autoreg - always sync to home path
  if (fs.existsSync(bundledPath)) {
    const versionFile = path.join(homePath, '.version');
    const extensionVersion = context.extension.packageJSON.version;
    let installedVersion = '';

    try {
      if (fs.existsSync(versionFile)) {
        installedVersion = fs.readFileSync(versionFile, 'utf-8').trim();
      }
    } catch { }

    const requiredFiles = [
      path.join(homePath, 'registration', 'register.py'),
      path.join(homePath, 'spoofers', 'profile_storage.py'),
    ];
    const hasAllFiles = requiredFiles.every(f => fs.existsSync(f));
    const needsSync = installedVersion !== extensionVersion || !hasAllFiles;

    if (needsSync) {
      const reason = installedVersion !== extensionVersion
        ? `version ${installedVersion || 'none'} -> ${extensionVersion}`
        : 'missing required files';
      console.log(`Updating autoreg (${reason})`);
      copyRecursive(bundledPath, homePath);
      fs.writeFileSync(versionFile, extensionVersion);
      console.log('Autoreg updated to:', homePath);
    }

    return homePath;
  }

  // Priority 3: Existing home path (legacy)
  if (fs.existsSync(path.join(homePath, 'registration', 'register.py'))) {
    return homePath;
  }

  return '';
}

function copyRecursive(src: string, dst: string) {
  if (!fs.existsSync(dst)) {
    fs.mkdirSync(dst, { recursive: true });
  }
  const items = fs.readdirSync(src);
  for (const item of items) {
    const srcPath = path.join(src, item);
    const dstPath = path.join(dst, item);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

// Cache for PythonEnvManager instances
const envManagerCache = new Map<string, PythonEnvManager>();

function getEnvManager(autoregDir: string): PythonEnvManager {
  if (!envManagerCache.has(autoregDir)) {
    envManagerCache.set(autoregDir, new PythonEnvManager(autoregDir));
  }
  return envManagerCache.get(autoregDir)!;
}

export async function getPythonCommand(): Promise<string> {
  // Async version to avoid blocking event loop
  const { spawn } = require('child_process');

  const checkPython = (cmd: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const proc = spawn(cmd, ['--version'], { shell: true });
      proc.on('close', (code: number) => resolve(code === 0));
      proc.on('error', () => resolve(false));
      setTimeout(() => { proc.kill(); resolve(false); }, 3000);
    });
  };

  if (await checkPython('python3')) return 'python3';
  if (await checkPython('python')) return 'python';
  return 'python';
}

// Sync version for backward compatibility (use sparingly!)
export function getPythonCommandSync(): string {
  const { spawnSync } = require('child_process');
  const py3 = spawnSync('python3', ['--version'], { encoding: 'utf8', timeout: 3000 });
  if (py3.status === 0) return 'python3';
  const py = spawnSync('python', ['--version'], { encoding: 'utf8', timeout: 3000 });
  if (py.status === 0) return 'python';
  return 'python';
}

async function setupPythonEnv(autoregDir: string, provider: KiroAccountsProvider): Promise<PythonEnvManager | null> {
  const envManager = getEnvManager(autoregDir);

  provider.setStatus('{"step":0,"totalSteps":8,"stepName":"Setup","detail":"Setting up Python environment..."}');

  const result = await envManager.setup((msg) => provider.addLog(msg));

  if (!result.success) {
    provider.addLog(`❌ ${result.error}`);
    provider.setStatus('');
    return null;
  }

  return envManager;
}

export async function runAutoReg(context: vscode.ExtensionContext, provider: KiroAccountsProvider, count?: number): Promise<boolean> {
  const ok = await supportsCliRegistration(context);
  if (ok) return runAutoRegWithCli(context, provider, count);
  return runAutoRegWithPython(context, provider, count);
}

/**
 * Run auto-registration using bundled executable (DISABLED - missing command)
 */
async function runAutoRegWithExecutable(context: vscode.ExtensionContext, provider: KiroAccountsProvider, count?: number): Promise<boolean> {
  provider.addLog('⚠️ Executable registration unavailable');
  return runAutoRegWithPython(context, provider, count);
}

async function supportsCliRegistration(context: vscode.ExtensionContext): Promise<boolean> {
  const result = await runExecutable(context, ['register-auto', '--help'], undefined, undefined, 'cli');
  return result.success;
}

async function runAutoRegWithCli(context: vscode.ExtensionContext, provider: KiroAccountsProvider, count?: number): Promise<boolean> {
  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const headless = config.get<boolean>('autoreg.headless', false);
  const spoofing = config.get<boolean>('autoreg.spoofing', true);
  const strategy = config.get<string>('autoreg.strategy', 'automated');

  const profileProvider = ImapProfileProvider.getInstance(context);
  await profileProvider.load();
  const activeProfile = profileProvider.getActive();
  if (!activeProfile) {
    provider.addLog('⚠️ No IMAP profile configured');
    return false;
  }

  const envProfile = profileProvider.getActiveProfileEnv();
  let currentProxy: string | undefined;
  if (activeProfile?.proxy?.enabled && activeProfile.proxy.urls && activeProfile.proxy.urls.length > 0) {
    const proxyIndex = activeProfile.proxy.currentIndex || 0;
    currentProxy = activeProfile.proxy.urls[proxyIndex % activeProfile.proxy.urls.length];
    activeProfile.proxy.currentIndex = (proxyIndex + 1) % activeProfile.proxy.urls.length;
  }

  const env: Record<string, string> = {
    IMAP_SERVER: envProfile.IMAP_SERVER,
    IMAP_USER: envProfile.IMAP_USER,
    IMAP_PASSWORD: envProfile.IMAP_PASSWORD,
    IMAP_PORT: envProfile.IMAP_PORT || '993',
    EMAIL_DOMAIN: envProfile.EMAIL_DOMAIN || '',
    EMAIL_STRATEGY: envProfile.EMAIL_STRATEGY,
    EMAIL_POOL: envProfile.EMAIL_POOL || '',
    PROFILE_ID: envProfile.PROFILE_ID,
    SPOOFING_ENABLED: spoofing ? '1' : '0',
    OAUTH_PROVIDER: 'Google',
    ...(currentProxy && { HTTPS_PROXY: currentProxy }),
    ...(!currentProxy && process.env.HTTP_PROXY && { HTTP_PROXY: process.env.HTTP_PROXY }),
    ...(!currentProxy && process.env.HTTPS_PROXY && { HTTPS_PROXY: process.env.HTTPS_PROXY })
  };

  const args: string[] = ['register-auto', '--strategy', strategy];
  if (headless) args.push('--headless');
  if (count && count > 1) args.push('--count', String(count));

  provider.setStatus('{"step":1,"totalSteps":8,"stepName":"Starting","detail":"Initializing..."}');
  const result = await runExecutable(context, args, env, (line) => provider.addLog(line), 'cli');

  if (result.success) {
    provider.addLog('✅ Registration completed successfully!');
    provider.setStatus('');
    vscode.commands.executeCommand('kiroAccountSwitcher.refreshAccounts');
    return true;
  } else {
    provider.addLog(`❌ Registration failed: ${result.error || 'Unknown error'}`);
    provider.setStatus('');
    return false;
  }
}

/**
 * Run auto-registration using Python (legacy fallback)
 */
async function runAutoRegWithPython(context: vscode.ExtensionContext, provider: KiroAccountsProvider, count?: number): Promise<boolean> {
  const autoregDir = getAutoregDir(context);
  const finalPath = autoregDir ? path.join(autoregDir, 'registration', 'register.py') : '';

  if (!finalPath || !fs.existsSync(finalPath)) {
    provider.addLog('⚠️ Auto-reg script not found. Place autoreg folder in workspace or ~/.kiro-manager-wb/');
    return false;
  }

  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const headless = config.get<boolean>('autoreg.headless', false);
  const spoofing = config.get<boolean>('autoreg.spoofing', true);
  const deviceFlow = config.get<boolean>('autoreg.deviceFlow', false);
  const strategy = config.get<string>('autoreg.strategy', 'automated');
  const deferQuotaCheck = config.get<boolean>('autoreg.deferQuotaCheck', true);

  // Get IMAP settings from active profile ONLY (no fallback to VS Code settings)
  const profileProvider = ImapProfileProvider.getInstance(context);
  await profileProvider.load(); // Ensure latest data is loaded
  const activeProfile = profileProvider.getActive();

  if (!activeProfile) {
    provider.addLog('⚠️ No IMAP profile configured. Create a profile first.');
    // Focus the webview so user can configure IMAP profiles
    vscode.commands.executeCommand('kiroAccountSwitcher.focus');
    return false;
  }

  // Log strategy info (no confirmation dialog needed - user already selected in UI)
  provider.addLog(`Registration strategy: ${strategy} (ban risk: ${strategy === 'webview' ? 'low <10%' : 'medium-high 40-90%'})`);

  const profileEnv = profileProvider.getActiveProfileEnv();
  provider.addLog(`Active profile: ${activeProfile.name} (${activeProfile.id})`);
  provider.addLog(`Email strategy: ${activeProfile.strategy.type}`);
  if (strategy === 'automated' && deferQuotaCheck) {
    provider.addLog(`Defer quota check: enabled (reduces ban risk)`);
  }
  provider.addLog(`IMAP: ${activeProfile.imap.user}@${activeProfile.imap.server}`);

  const imapServer = profileEnv.IMAP_SERVER;
  const imapUser = profileEnv.IMAP_USER;
  const imapPassword = profileEnv.IMAP_PASSWORD;
  const imapPort = profileEnv.IMAP_PORT || '993';
  const emailDomain = profileEnv.EMAIL_DOMAIN || '';
  const emailStrategy = profileEnv.EMAIL_STRATEGY;
  const emailPool = profileEnv.EMAIL_POOL || '';
  const profileId = profileEnv.PROFILE_ID;

  provider.addLog(`Platform: ${process.platform}`);

  // Setup Python virtual environment
  const envManager = await setupPythonEnv(autoregDir, provider);
  if (!envManager) {
    provider.setStatus('❌ Python setup failed. Install Python 3.8+');
    return false;
  }

  const pythonPath = envManager.getPythonPath();
  provider.addLog(`✓ Using venv Python: ${pythonPath}`);

  provider.setStatus('{"step":1,"totalSteps":8,"stepName":"Starting","detail":"Initializing..."}');

  // Choose script based on strategy
  let scriptArgs: string[];

  // Get proxy from pool with round-robin rotation
  let currentProxy: string | undefined;
  if (activeProfile?.proxy?.enabled && activeProfile.proxy.urls && activeProfile.proxy.urls.length > 0) {
    const proxyIndex = activeProfile.proxy.currentIndex || 0;
    currentProxy = activeProfile.proxy.urls[proxyIndex % activeProfile.proxy.urls.length];
    // Update index for next registration (will be saved after successful registration)
    activeProfile.proxy.currentIndex = (proxyIndex + 1) % activeProfile.proxy.urls.length;
    provider.addLog(`[PROXY] Using proxy ${proxyIndex + 1}/${activeProfile.proxy.urls.length}: ${currentProxy.replace(/:[^:@]+@/, ':***@')}`);
  }

  // Build environment variables (common for both strategies)
  const env: Record<string, string> = {
    IMAP_SERVER: imapServer,
    IMAP_USER: imapUser,
    IMAP_PASSWORD: imapPassword,
    IMAP_PORT: imapPort,
    EMAIL_DOMAIN: emailDomain,
    EMAIL_STRATEGY: emailStrategy,
    EMAIL_POOL: emailPool,
    PROFILE_ID: profileId,
    SPOOFING_ENABLED: spoofing ? '1' : '0',
    DEVICE_FLOW: deviceFlow ? '1' : '0',
    // Login name from scheduled registration (if set)
    ...(process.env.KIRO_LOGIN_NAME && { KIRO_LOGIN_NAME: process.env.KIRO_LOGIN_NAME }),
    // Proxy from profile pool (takes priority) or from parent process
    ...(currentProxy && { HTTPS_PROXY: currentProxy }),
    ...(!currentProxy && process.env.HTTP_PROXY && { HTTP_PROXY: process.env.HTTP_PROXY }),
    ...(!currentProxy && process.env.HTTPS_PROXY && { HTTPS_PROXY: process.env.HTTPS_PROXY }),
    ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED && { NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED })
  };

  if (strategy === 'webview') {
    // WebView strategy - use cli_registration
    scriptArgs = ['cli_registration.py', 'register-auto'];
    scriptArgs.push('--strategy', 'webview');

    // Get OAuth provider setting
    let oauthProvider = config.get<string>('autoreg.oauthProvider', 'ask');

    // NEVER show QuickPick for automated strategy or if user wants to avoid menus
    if (!oauthProvider || oauthProvider === 'ask') {
      // Default to Google to avoid the menu
      oauthProvider = 'Google';
      provider.addLog(`ℹ️ Using default OAuth provider: ${oauthProvider} (to avoid VS Code menus)`);
    }

    // Pass provider to Python script via environment
    env.OAUTH_PROVIDER = oauthProvider;
    provider.addLog(`OAuth provider: ${oauthProvider}`);

    if (count && count > 1) {
      provider.addLog('⚠️ WebView strategy: registering one account at a time');
      scriptArgs.push('--count', '1');
    }
    provider.addLog(`Starting WebView registration...`);
    provider.addLog(`Working dir: ${autoregDir}`);
    provider.addLog(`Profile: ${activeProfile?.name || 'Legacy settings'}`);
    provider.addLog(`Email strategy: ${emailStrategy}`);
  } else {
    // Automated strategy (legacy)
    scriptArgs = ['-m', 'registration.register_auto'];
    if (headless) scriptArgs.push('--headless');
    if (deviceFlow) scriptArgs.push('--device-flow');
    // Note: register_auto.py registers one account at a time
    if (count && count > 1) {
      provider.addLog(`⚠️ Will register ${count} accounts one by one`);
    }
    provider.addLog(`Starting autoreg...`);
    provider.addLog(`Working dir: ${autoregDir}`);
    provider.addLog(`Profile: ${activeProfile?.name || 'Legacy settings'}`);
    provider.addLog(`Strategy: ${emailStrategy}`);
    provider.addLog(`Headless: ${headless ? 'ON' : 'OFF'}, DeviceFlow: ${deviceFlow ? 'ON' : 'OFF'}`);
  }

  // Use ProcessManager for better control
  autoregProcess.removeAllListeners();

  return new Promise((resolve) => {
    // Track actual registration result from stdout
    let registrationSuccess = false;
    let registrationFailed = false;

    autoregProcess.on('stdout', (data: string) => {
      const lines = data.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        provider.addLog(line);
        parseProgressLine(line, provider);

        // Track actual result from Python output
        if (line.includes('[OK] SUCCESS') || line.includes('✅ Authentication successful')) {
          registrationSuccess = true;
        } else if (line.includes('[X] FAILED') || line.includes('[X] ERROR') || line.includes('❌')) {
          registrationFailed = true;
        }

        // Auto-confirm prompts (y/n, да/нет)
        if (line.includes('(y/n)') || line.includes('(да/нет)') || line.includes('Начать?') || line.includes('Start?')) {
          provider.addLog('→ Auto-confirming: y');
          autoregProcess.write('y\n');
        }
      }
    });

    autoregProcess.on('stderr', (data: string) => {
      const lines = data.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        if (!line.includes('DevTools') && !line.includes('GPU process')) {
          provider.addLog(`⚠️ ${line}`);
        }
      }
    });

    autoregProcess.on('close', async (code: number) => {
      // Check actual result, not just exit code
      if (registrationSuccess && !registrationFailed) {
        provider.addLog('✓ Registration complete');

        // Save updated proxy index after successful registration
        if (activeProfile?.proxy?.enabled && activeProfile.proxy.urls && activeProfile.proxy.urls.length > 0) {
          await profileProvider.update(activeProfile.id, { proxy: activeProfile.proxy });
          provider.addLog(`[PROXY] Saved next proxy index: ${activeProfile.proxy.currentIndex}`);
        }

        provider.addLog('✅ Account registered successfully!');
        resolve(true);
      } else {
        if (registrationFailed) {
          provider.addLog('❌ Registration failed. Check logs for details.');
        } else if (code !== 0 && code !== null) {
          provider.addLog(`❌ Process exited with code ${code}`);
        }
        resolve(false);
      }
      provider.setStatus('');
      provider.refresh();
      provider.addLog('🔄 Refreshed account list');
    });

    autoregProcess.on('stopped', () => {
      provider.addLog('⏹ Auto-reg stopped by user');
      provider.setStatus('');
      provider.refresh();
      resolve(false);
    });

    autoregProcess.on('error', (err: Error) => {
      provider.addLog(`✗ Error: ${err.message}`);
      provider.setStatus('');
      resolve(false);
    });

    autoregProcess.on('paused', () => {
      provider.addLog('⏸ Auto-reg paused');
      provider.refresh();
    });

    autoregProcess.on('resumed', () => {
      provider.addLog('▶ Auto-reg resumed');
      provider.refresh();
    });

    // Start with venv Python
    autoregProcess.start(pythonPath, ['-u', ...scriptArgs], {
      cwd: autoregDir,
      env: {
        ...process.env,
        ...env,
        VIRTUAL_ENV: path.join(autoregDir, '.venv'),
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      }
    });
  });
}

function parseProgressLine(line: string, provider: KiroAccountsProvider) {
  // Format 1: PROGRESS:{"step":1,"totalSteps":8,"stepName":"...","detail":"..."}
  if (line.startsWith('PROGRESS:')) {
    try {
      const json = line.substring(9); // Remove "PROGRESS:" prefix
      const data = JSON.parse(json);
      provider.setStatus(JSON.stringify(data));
      return;
    } catch { }
  }

  // Format 2: [1/8] StepName: detail
  const match = line.match(/\[(\d+)\/(\d+)\]\s*([^:]+):\s*(.+)/);
  if (match) {
    const [, step, total, stepName, detail] = match;
    provider.setStatus(JSON.stringify({
      step: parseInt(step),
      totalSteps: parseInt(total),
      stepName: stepName.trim(),
      detail: detail.trim()
    }));
  }
}

/**
 * Patch Kiro to use custom Machine ID
 * Uses executable if available, falls back to Python cli.py
 */
export async function patchKiro(context: vscode.ExtensionContext, provider: KiroAccountsProvider, force: boolean = false) {
  provider.addLog('🔧 Patching Kiro...');

  // First try to use executable
  const { runExecutable, isExecutableAvailable } = await import('../utils/executable-runner');
  
  if (isExecutableAvailable(context)) {
    const args = ['patch', 'apply', '--skip-check'];
    if (force) args.push('--force');
    
    const result = await runExecutable(context, args, undefined, (line) => {
      provider.addLog(line);
    });
    
    if (result.success) {
      provider.addLog('✅ Kiro patched successfully! Restart Kiro for changes to take effect.');
      // Refresh patch status
      const status = await checkPatchStatus(context);
      provider.sendPatchStatus(status);
    } else {
      provider.addLog(`❌ Patch failed: ${result.error || 'Unknown error'}`);
    }
    return;
  }

  // Fallback to Python
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    provider.addLog('❌ Autoreg not found');
    return;
  }

  const envManager = getEnvManager(autoregDir);

  // Ensure venv is set up
  if (!envManager.isVenvValid()) {
    const result = await envManager.setup((msg) => provider.addLog(msg));
    if (!result.success) {
      provider.addLog(`❌ ${result.error}`);
      return;
    }
  }

  const args = ['cli.py', 'patch', 'apply', '--skip-check'];
  if (force) args.push('--force');

  const result = envManager.runScriptSync(args);

  if (result.stdout) {
    result.stdout.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      provider.addLog(line);
    });
  }

  if (result.stderr) {
    result.stderr.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      if (!line.includes('InsecureRequestWarning')) {
        provider.addLog(`⚠️ ${line}`);
      }
    });
  }

  if (result.status === 0) {
    provider.addLog('✅ Kiro patched successfully! Restart Kiro for changes to take effect.');
    // Refresh patch status
    const status = await checkPatchStatus(context);
    provider.sendPatchStatus(status);
  } else {
    provider.addLog(`❌ Patch failed (code ${result.status}). Check console for details.`);
  }
}

export interface HotPatchResult {
  success: boolean;
  error?: string;
}

/**
 * Hot-patch Kiro without closing it
 * Works on all platforms:
 * - Windows: files not locked by Electron
 * - Linux/macOS: unlink semantics allow overwriting open files
 * Called automatically on extension startup when patch update is needed
 */
export async function patchKiroHot(context: vscode.ExtensionContext): Promise<HotPatchResult> {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    return { success: false, error: 'Autoreg not found' };
  }

  const envManager = getEnvManager(autoregDir);

  // Ensure venv is set up
  if (!envManager.isVenvValid()) {
    const result = await envManager.setup(() => { });
    if (!result.success) {
      return { success: false, error: result.error };
    }
  }

  // Use --skip-check to bypass "Kiro is running" check
  // All platforms allow writing to files loaded by Electron
  const args = ['cli.py', 'patch', 'apply', '--skip-check', '--force'];
  const result = envManager.runScriptSync(args);

  if (result.status === 0) {
    return { success: true };
  } else {
    const errorText = result.stderr || result.stdout || '';

    // Check for permission/lock errors
    if (errorText.includes('Permission denied') || errorText.includes('EBUSY') || errorText.includes('being used')) {
      return {
        success: false,
        error: 'File is locked. Please close Kiro and try again from Settings.'
      };
    }

    return { success: false, error: errorText || 'Unknown error' };
  }
}

/**
 * Remove Kiro patch (restore original)
 */
export async function unpatchKiro(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
  provider.addLog('🔧 Removing Kiro patch...');

  // First try to use executable
  const { runExecutable, isExecutableAvailable } = await import('../utils/executable-runner');
  
  if (isExecutableAvailable(context)) {
    const result = await runExecutable(context, ['patch', 'remove', '--skip-check'], undefined, (line) => {
      provider.addLog(line);
    });
    
    if (result.success) {
      provider.addLog('✅ Kiro patch removed! Restart Kiro for changes to take effect.');
      // Refresh patch status
      const status = await checkPatchStatus(context);
      provider.sendPatchStatus(status);
    } else {
      provider.addLog(`❌ Unpatch failed: ${result.error || 'Unknown error'}`);
    }
    return;
  }

  // Fallback to Python
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    provider.addLog('❌ Autoreg not found');
    return;
  }

  const envManager = getEnvManager(autoregDir);
  const args = ['cli.py', 'patch', 'remove', '--skip-check'];
  const result = envManager.runScriptSync(args);

  if (result.stdout) {
    result.stdout.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      provider.addLog(line);
    });
  }

  if (result.status === 0) {
    provider.addLog('✅ Kiro patch removed! Restart Kiro for changes to take effect.');
    // Refresh patch status
    const status = await checkPatchStatus(context);
    provider.sendPatchStatus(status);
  } else {
    provider.addLog(`❌ Unpatch failed (code ${result.status}). Check console for details.`);
  }
}

/**
 * Generate new custom Machine ID
 */
export async function generateMachineId(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
  provider.addLog('🔄 Generating new Machine ID...');

  // First try to use executable
  const { runExecutable, isExecutableAvailable } = await import('../utils/executable-runner');
  
  if (isExecutableAvailable(context)) {
    const result = await runExecutable(context, ['patch', 'generate-id'], undefined, (line) => {
      provider.addLog(line);
    });
    
    if (result.success) {
      provider.addLog('✅ New Machine ID generated!');
      // Refresh patch status
      const status = await checkPatchStatus(context);
      provider.sendPatchStatus(status);
    } else {
      provider.addLog(`❌ Failed to generate ID: ${result.error || 'Unknown error'}`);
    }
    return;
  }

  // Fallback to Python
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    provider.addLog('❌ Autoreg not found');
    return;
  }

  const envManager = getEnvManager(autoregDir);
  const args = ['cli.py', 'patch', 'generate-id'];
  const result = envManager.runScriptSync(args);

  if (result.stdout) {
    result.stdout.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      provider.addLog(line);
    });
  }

  if (result.status === 0) {
    provider.addLog('✅ New Machine ID generated! Restart Kiro for changes to take effect.');
  } else {
    provider.addLog(`❌ Generation failed (code ${result.status}). Check console for details.`);
  }
}

export interface PatchStatusResult {
  isPatched: boolean;
  kiroVersion?: string;
  patchVersion?: string;
  latestPatchVersion?: string;
  currentMachineId?: string;
  needsUpdate?: boolean;
  updateReason?: string;
  error?: string;
}

/**
 * Get patch status
 */
export async function getPatchStatus(context: vscode.ExtensionContext): Promise<PatchStatusResult> {
  return checkPatchStatus(context);
}

/**
 * Check patch status - can be called from extension.ts on startup
 */
export async function checkPatchStatus(context: vscode.ExtensionContext): Promise<PatchStatusResult> {
  // First try to use executable
  const { runExecutable, isExecutableAvailable } = await import('../utils/executable-runner');
  
  if (isExecutableAvailable(context)) {
    try {
      console.log('[PatchStatus] Using executable method');
      const result = await runExecutable(context, ['patch', 'status', '--json']);
      
      // Try to parse JSON even if exit code is non-zero (CLI may return valid JSON with non-zero exit)
      if (result.output) {
        try {
          const parsed = JSON.parse(result.output.trim());
          console.log('[PatchStatus] Parsed result:', JSON.stringify(parsed));
          
          // Handle error: null correctly - treat null as no error
          const hasError = parsed.error !== null && parsed.error !== undefined && parsed.error !== '';
          
          return {
            isPatched: parsed.isPatched || false,
            kiroVersion: parsed.kiroVersion,
            patchVersion: parsed.patchVersion,
            latestPatchVersion: parsed.latestPatchVersion,
            currentMachineId: parsed.currentMachineId,
            needsUpdate: parsed.needsUpdate,
            updateReason: parsed.updateReason,
            error: hasError ? parsed.error : undefined
          };
        } catch (parseErr) {
          // JSON parse failed, continue to Python fallback
          console.log('[PatchStatus] JSON parse failed:', parseErr);
        }
      }
    } catch (execErr) {
      // Executable failed, continue to Python fallback
      console.log('[PatchStatus] Executable failed:', execErr);
    }
  }

  // Fallback to Python script
  const bundledPath = path.join(context.extensionPath, 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-manager-wb');

  // Prefer bundled for scripts, fallback to home
  let autoregDir = '';
  if (fs.existsSync(path.join(bundledPath, 'services', 'kiro_patcher_service.py'))) {
    autoregDir = bundledPath;
  } else if (fs.existsSync(path.join(homePath, 'services', 'kiro_patcher_service.py'))) {
    autoregDir = homePath;
  }

  if (!autoregDir) {
    return { isPatched: false, error: 'Patcher service not found' };
  }

  // Use dedicated script file to avoid inline Python issues on Windows
  const scriptPath = path.join(autoregDir, 'scripts', 'patch_status.py');

  if (!fs.existsSync(scriptPath)) {
    return { isPatched: false, error: 'patch_status.py not found' };
  }

  // Always use home path for venv (bundled autoreg doesn't have venv)
  const venvDir = fs.existsSync(path.join(homePath, '.venv')) ? homePath : autoregDir;
  const envManager = getEnvManager(venvDir);

  // For patch status check, we can use system Python if venv not ready
  // This allows checking status before full setup
  if (envManager.isVenvValid()) {
    const result = envManager.runScriptSync([scriptPath], { timeout: 10000 });
    if (result.status === 0 && result.stdout) {
      try {
        return JSON.parse(result.stdout.trim());
      } catch {
        return { isPatched: false, error: 'Failed to parse status' };
      }
    }
    return { isPatched: false, error: result.stderr || 'Unknown error' };
  }

  // Fallback to system Python for initial check (async to avoid blocking)
  const { spawn } = require('child_process');
  const pythonCmd = await getPythonCommand();

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const proc = spawn(pythonCmd, [scriptPath], {
      cwd: autoregDir,
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      }
    });

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (code: number) => {
      if (code === 0 && stdout) {
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve({ isPatched: false, error: 'Failed to parse status' });
        }
      } else {
        resolve({ isPatched: false, error: stderr || stdout || 'Unknown error' });
      }
    });

    proc.on('error', (err: Error) => {
      resolve({ isPatched: false, error: err.message });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill();
      resolve({ isPatched: false, error: 'Timeout' });
    }, 10000);
  });
}

/**
 * Reset Kiro Machine ID (telemetry IDs)
 * Calls Python cli.py machine reset
 */
export async function resetMachineId(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    provider.addLog('❌ Autoreg not found');
    return;
  }

  provider.addLog('🔄 Resetting Machine ID...');

  const envManager = getEnvManager(autoregDir);
  const args = ['cli.py', 'machine', 'reset'];
  const result = envManager.runScriptSync(args);

  if (result.stdout) {
    result.stdout.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      provider.addLog(line);
    });
  }

  if (result.stderr) {
    result.stderr.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      if (!line.includes('InsecureRequestWarning')) {
        provider.addLog(`⚠️ ${line}`);
      }
    });
  }

  if (result.status === 0) {
    provider.addLog('✅ Machine ID reset successfully! Restart Kiro for changes to take effect.');
  } else {
    provider.addLog(`❌ Machine ID reset failed (code ${result.status}). Check console for details.`);
  }
}

export async function importSsoToken(context: vscode.ExtensionContext, provider: KiroAccountsProvider, bearerToken: string) {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    provider.addLog('❌ Autoreg not found');
    return;
  }

  provider.addLog('🌐 Starting SSO import...');
  provider.setStatus('{"step":1,"totalSteps":3,"stepName":"SSO Import","detail":"Connecting to AWS..."}');

  const envManager = getEnvManager(autoregDir);

  // Ensure venv is set up
  if (!envManager.isVenvValid()) {
    const result = await envManager.setup((msg) => provider.addLog(msg));
    if (!result.success) {
      provider.addLog(`❌ ${result.error}`);
      provider.setStatus('');
      return;
    }
  }

  // Don't use -a flag to avoid overwriting current active token
  const args = ['cli.py', 'sso-import', bearerToken];

  envManager.runScript(args, {
    onStdout: (data) => {
      const line = data.trim();
      if (line) provider.addLog(line);
    },
    onStderr: (data) => {
      const line = data.trim();
      if (line && !line.includes('InsecureRequestWarning')) {
        provider.addLog(`⚠️ ${line}`);
      }
    },
    onClose: (code) => {
      if (code === 0) {
        provider.addLog('✅ SSO import successful! Account imported.');
        provider.setStatus('');
        provider.refresh();
      } else {
        provider.addLog(`❌ SSO import failed (code ${code}). Check console for details.`);
        provider.setStatus('');
      }
    },
    onError: (err) => {
      provider.addLog(`❌ SSO import error: ${err.message}`);
      provider.setStatus('');
    }
  });
}
