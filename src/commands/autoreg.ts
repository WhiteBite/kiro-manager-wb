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

// Get autoreg directory
export function getAutoregDir(context: vscode.ExtensionContext): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const workspacePath = path.join(workspaceFolder, 'kiro-extension', 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-autoreg');
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

export async function runAutoReg(context: vscode.ExtensionContext, provider: KiroAccountsProvider, count?: number) {
  const autoregDir = getAutoregDir(context);
  const finalPath = autoregDir ? path.join(autoregDir, 'registration', 'register.py') : '';

  if (!finalPath || !fs.existsSync(finalPath)) {
    vscode.window.showWarningMessage('Auto-reg script not found. Place autoreg folder in workspace or ~/.kiro-autoreg/');
    return;
  }

  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const headless = config.get<boolean>('autoreg.headless', false);
  const spoofing = config.get<boolean>('autoreg.spoofing', true);
  const deviceFlow = config.get<boolean>('autoreg.deviceFlow', false);

  // Get IMAP settings from active profile ONLY (no fallback to VS Code settings)
  const profileProvider = ImapProfileProvider.getInstance(context);
  await profileProvider.load(); // Ensure latest data is loaded
  const activeProfile = profileProvider.getActive();

  if (!activeProfile) {
    const result = await vscode.window.showWarningMessage(
      'No IMAP profile configured. Create a profile first.',
      'Open Settings', 'Cancel'
    );
    if (result === 'Open Settings') {
      vscode.commands.executeCommand('kiroAccountSwitcher.focus');
    }
    return;
  }

  const profileEnv = profileProvider.getActiveProfileEnv();
  provider.addLog(`Active profile: ${activeProfile.name} (${activeProfile.id})`);
  provider.addLog(`Strategy: ${activeProfile.strategy.type}`);
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
    return;
  }

  const pythonPath = envManager.getPythonPath();
  provider.addLog(`✓ Using venv Python: ${pythonPath}`);

  provider.setStatus('{"step":1,"totalSteps":8,"stepName":"Starting","detail":"Initializing..."}');

  // Args for register_auto module
  const scriptArgs = ['-m', 'registration.register_auto'];
  if (headless) scriptArgs.push('--headless');
  if (deviceFlow) scriptArgs.push('--device-flow');
  if (count && count > 1) {
    scriptArgs.push('--count', count.toString());
  }

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
    // Pass proxy settings from parent process (for mitmproxy support)
    ...(process.env.HTTP_PROXY && { HTTP_PROXY: process.env.HTTP_PROXY }),
    ...(process.env.HTTPS_PROXY && { HTTPS_PROXY: process.env.HTTPS_PROXY }),
    ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED && { NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED })
  };

  provider.addLog(`Starting autoreg...`);
  provider.addLog(`Working dir: ${autoregDir}`);
  provider.addLog(`Profile: ${activeProfile?.name || 'Legacy settings'}`);
  provider.addLog(`Strategy: ${emailStrategy}`);
  provider.addLog(`Headless: ${headless ? 'ON' : 'OFF'}, Spoofing: ${spoofing ? 'ON' : 'OFF'}, DeviceFlow: ${deviceFlow ? 'ON' : 'OFF'}`);

  // Use ProcessManager for better control
  autoregProcess.removeAllListeners();

  // Track actual registration result from stdout
  let registrationSuccess = false;
  let registrationFailed = false;

  autoregProcess.on('stdout', (data: string) => {
    const lines = data.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      provider.addLog(line);
      parseProgressLine(line, provider);

      // Track actual result from Python output
      if (line.includes('[OK] SUCCESS')) {
        registrationSuccess = true;
      } else if (line.includes('[X] FAILED') || line.includes('[X] ERROR')) {
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

  autoregProcess.on('close', (code: number) => {
    // Check actual result, not just exit code
    if (registrationSuccess && !registrationFailed) {
      provider.addLog('✓ Registration complete');
      vscode.window.showInformationMessage('Account registered successfully!');
    } else if (registrationFailed) {
      provider.addLog('✗ Registration failed');
      vscode.window.showErrorMessage('Registration failed. Check logs for details.');
    } else if (code !== 0 && code !== null) {
      provider.addLog(`✗ Process exited with code ${code}`);
      vscode.window.showErrorMessage(`Registration process failed (exit code ${code})`);
    }
    provider.setStatus('');
    provider.refresh();
    provider.addLog('🔄 Refreshed account list');
  });

  autoregProcess.on('stopped', () => {
    provider.addLog('⏹ Auto-reg stopped by user');
    provider.setStatus('');
    provider.refresh();
  });

  autoregProcess.on('error', (err: Error) => {
    provider.addLog(`✗ Error: ${err.message}`);
    provider.setStatus('');
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
 * Calls Python cli.py patch apply
 */
export async function patchKiro(context: vscode.ExtensionContext, provider: KiroAccountsProvider, force: boolean = false) {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    vscode.window.showErrorMessage('Autoreg not found');
    return;
  }

  provider.addLog('🔧 Patching Kiro...');

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
    provider.addLog('✅ Kiro patched successfully!');
    vscode.window.showInformationMessage('Kiro patched! Restart Kiro for changes to take effect.');
  } else {
    provider.addLog(`❌ Patch failed (code ${result.status})`);
    vscode.window.showErrorMessage('Patch failed. Check console for details.');
  }
}

/**
 * Remove Kiro patch (restore original)
 */
export async function unpatchKiro(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    vscode.window.showErrorMessage('Autoreg not found');
    return;
  }

  provider.addLog('🔧 Removing Kiro patch...');

  const envManager = getEnvManager(autoregDir);
  const args = ['cli.py', 'patch', 'remove', '--skip-check'];
  const result = envManager.runScriptSync(args);

  if (result.stdout) {
    result.stdout.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      provider.addLog(line);
    });
  }

  if (result.status === 0) {
    provider.addLog('✅ Kiro patch removed!');
    vscode.window.showInformationMessage('Kiro restored! Restart Kiro for changes to take effect.');
  } else {
    provider.addLog(`❌ Unpatch failed (code ${result.status})`);
    vscode.window.showErrorMessage('Unpatch failed. Check console for details.');
  }
}

/**
 * Generate new custom Machine ID
 */
export async function generateMachineId(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    vscode.window.showErrorMessage('Autoreg not found');
    return;
  }

  provider.addLog('🔄 Generating new Machine ID...');

  const envManager = getEnvManager(autoregDir);
  const args = ['cli.py', 'patch', 'generate-id'];
  const result = envManager.runScriptSync(args);

  if (result.stdout) {
    result.stdout.split('\n').filter((l: string) => l.trim()).forEach((line: string) => {
      provider.addLog(line);
    });
  }

  if (result.status === 0) {
    provider.addLog('✅ New Machine ID generated!');
    vscode.window.showInformationMessage('New Machine ID generated! Restart Kiro for changes to take effect.');
  } else {
    provider.addLog(`❌ Generation failed (code ${result.status})`);
    vscode.window.showErrorMessage('Generation failed. Check console for details.');
  }
}

export interface PatchStatusResult {
  isPatched: boolean;
  kiroVersion?: string;
  patchVersion?: string;
  currentMachineId?: string;
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
  // Use bundled autoreg from extension, not workspace - ensures kiro_patcher_service exists
  const bundledPath = path.join(context.extensionPath, 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-autoreg');

  // Prefer bundled, fallback to home
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

  const envManager = getEnvManager(autoregDir);

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
      shell: true
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
        resolve({ isPatched: false, error: stderr || 'Unknown error' });
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
    vscode.window.showErrorMessage('Autoreg not found');
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
    provider.addLog('✅ Machine ID reset successfully!');
    vscode.window.showInformationMessage('Machine ID reset! Restart Kiro for changes to take effect.');
  } else {
    provider.addLog(`❌ Machine ID reset failed (code ${result.status})`);
    vscode.window.showErrorMessage('Machine ID reset failed. Check console for details.');
  }
}

export async function importSsoToken(context: vscode.ExtensionContext, provider: KiroAccountsProvider, bearerToken: string) {
  const autoregDir = getAutoregDir(context);
  if (!autoregDir) {
    vscode.window.showErrorMessage('Autoreg not found');
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
        provider.addLog('✅ SSO import successful!');
        provider.setStatus('');
        vscode.window.showInformationMessage('Account imported successfully!');
        provider.refresh();
      } else {
        provider.addLog(`❌ SSO import failed (code ${code})`);
        provider.setStatus('');
        vscode.window.showErrorMessage('SSO import failed. Check console for details.');
      }
    },
    onError: (err) => {
      provider.addLog(`❌ Error: ${err.message}`);
      provider.setStatus('');
      vscode.window.showErrorMessage(`SSO import error: ${err.message}`);
    }
  });
}
