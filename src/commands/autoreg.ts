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

// Get autoreg directory
export function getAutoregDir(context: vscode.ExtensionContext): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const workspacePath = path.join(workspaceFolder, 'kiro-batch-login', 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-autoreg');
  const bundledPath = path.join(context.extensionPath, 'autoreg');

  if (fs.existsSync(path.join(workspacePath, 'registration', 'register.py'))) {
    return workspacePath;
  }

  if (fs.existsSync(path.join(homePath, 'registration', 'register.py'))) {
    return homePath;
  }

  if (fs.existsSync(bundledPath)) {
    console.log('Extracting bundled autoreg to:', homePath);
    copyRecursive(bundledPath, homePath);
    console.log('Extracted files to:', homePath);
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

export function getPythonCommand(): string {
  const { spawnSync } = require('child_process');
  const py3 = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  if (py3.status === 0) return 'python3';
  const py = spawnSync('python', ['--version'], { encoding: 'utf8' });
  if (py.status === 0) return 'python';
  return 'python';
}

function getPipCommand(): string {
  const { spawnSync } = require('child_process');
  const pip3 = spawnSync('pip3', ['--version'], { encoding: 'utf8' });
  if (pip3.status === 0) return 'pip3';
  return 'pip';
}

async function installDependencies(autoregDir: string, provider: KiroAccountsProvider): Promise<boolean> {
  const { spawnSync } = require('child_process');
  const isWindows = process.platform === 'win32';

  const requirementsPath = path.join(autoregDir, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    provider.addLog('Installing Python dependencies...');
    provider.setStatus('{"step":0,"totalSteps":8,"stepName":"Setup","detail":"Installing Python deps..."}');

    const pipCmd = getPipCommand();
    provider.addLog(`Using: ${pipCmd} install -r requirements.txt`);

    const pipResult = spawnSync(pipCmd, ['install', '-r', requirementsPath, '--user', '--quiet'], {
      cwd: autoregDir,
      encoding: 'utf8',
      timeout: 180000,
      shell: isWindows
    });

    if (pipResult.status === 0) {
      provider.addLog('✓ Python dependencies installed');
    } else {
      provider.addLog('Retrying without --user flag...');
      const pipRetry = spawnSync(pipCmd, ['install', '-r', requirementsPath, '--quiet'], {
        cwd: autoregDir,
        encoding: 'utf8',
        timeout: 180000,
        shell: isWindows
      });
      if (pipRetry.status !== 0) {
        provider.addLog(`✗ pip install failed: ${pipRetry.stderr || pipRetry.error?.message}`);
        return false;
      }
      provider.addLog('✓ Python dependencies installed (system-wide)');
    }
  }

  return true;
}

export async function runAutoReg(context: vscode.ExtensionContext, provider: KiroAccountsProvider) {
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

  // Get IMAP settings from active profile or fallback to old settings
  const profileProvider = ImapProfileProvider.getInstance(context);
  const activeProfile = profileProvider.getActive();
  const profileEnv = profileProvider.getActiveProfileEnv();

  // Fallback to old settings if no profile
  const imapServer = profileEnv.IMAP_SERVER || config.get<string>('imap.server', '');
  const imapUser = profileEnv.IMAP_USER || config.get<string>('imap.user', '');
  const imapPassword = profileEnv.IMAP_PASSWORD || config.get<string>('imap.password', '');
  const emailDomain = profileEnv.EMAIL_DOMAIN || config.get<string>('autoreg.emailDomain', 'example.com');
  const emailStrategy = profileEnv.EMAIL_STRATEGY || 'catch_all';
  const emailPool = profileEnv.EMAIL_POOL || '';
  const profileId = profileEnv.PROFILE_ID || '';

  if (!imapServer || !imapUser || !imapPassword) {
    const result = await vscode.window.showWarningMessage(
      'IMAP settings not configured. Configure a profile first.',
      'Open Settings', 'Cancel'
    );
    if (result === 'Open Settings') {
      // Open webview and show profiles panel
      vscode.commands.executeCommand('workbench.action.openSettings', 'kiroAccountSwitcher.imap');
    }
    return;
  }

  const pythonCmd = getPythonCommand();
  provider.addLog(`Platform: ${process.platform}`);
  provider.addLog(`Python command: ${pythonCmd}`);

  const { spawnSync, spawn } = require('child_process');
  const pyCheck = spawnSync(pythonCmd, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
  if (pyCheck.status !== 0) {
    provider.addLog(`✗ Python not found: ${pyCheck.stderr || pyCheck.error}`);
    provider.setStatus('✗ Python not found. Install Python 3.10+');
    return;
  }
  provider.addLog(`✓ ${pyCheck.stdout?.trim() || 'Python OK'}`);

  const depsInstalledFlag = path.join(autoregDir, '.deps_installed');
  if (!fs.existsSync(depsInstalledFlag)) {
    provider.addLog('First run - installing dependencies...');
    const installed = await installDependencies(autoregDir, provider);
    if (installed) {
      fs.writeFileSync(depsInstalledFlag, new Date().toISOString());
      provider.addLog('✓ Dependencies installed');
    } else {
      provider.addLog('✗ Failed to install dependencies');
      provider.setStatus('✗ Failed to install dependencies. Check console.');
      return;
    }
  }

  provider.setStatus('{"step":1,"totalSteps":8,"stepName":"Starting","detail":"Initializing..."}');

  // -u flag disables Python output buffering for real-time logs
  // Use register_auto for non-interactive mode with JSON progress output
  const args = ['-u', '-m', 'registration.register_auto'];
  if (headless) args.push('--headless');
  if (deviceFlow) args.push('--device-flow');

  const env = {
    ...process.env,
    PYTHONUNBUFFERED: '1',  // Also set env var for unbuffered output
    PYTHONIOENCODING: 'utf-8',  // Fix encoding for Windows (cp1251 doesn't support emoji)
    IMAP_SERVER: imapServer,
    IMAP_USER: imapUser,
    IMAP_PASSWORD: imapPassword,
    EMAIL_DOMAIN: emailDomain,
    EMAIL_STRATEGY: emailStrategy,
    EMAIL_POOL: emailPool,
    PROFILE_ID: profileId,
    SPOOFING_ENABLED: spoofing ? '1' : '0',
    DEVICE_FLOW: deviceFlow ? '1' : '0'
  };

  provider.addLog(`Starting autoreg...`);
  provider.addLog(`Working dir: ${autoregDir}`);
  provider.addLog(`Python: ${pythonCmd}`);
  provider.addLog(`Profile: ${activeProfile?.name || 'Legacy settings'}`);
  provider.addLog(`Strategy: ${emailStrategy}`);
  provider.addLog(`Headless mode: ${headless ? 'ON' : 'OFF'}`);
  provider.addLog(`Spoofing mode: ${spoofing ? 'ON' : 'OFF'}`);
  provider.addLog(`Device Flow: ${deviceFlow ? 'ON' : 'OFF'}`);
  provider.addLog(`Command: ${pythonCmd} ${args.join(' ')}`);

  // Use ProcessManager for better control
  autoregProcess.removeAllListeners();

  autoregProcess.on('stdout', (data: string) => {
    const lines = data.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      provider.addLog(line);
      parseProgressLine(line, provider);

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
    if (code === 0) {
      provider.addLog('✓ Registration complete');
      vscode.window.showInformationMessage('Account registered successfully!');
    } else if (code !== null) {
      provider.addLog(`✗ Process exited with code ${code}`);
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

  autoregProcess.start(pythonCmd, args, { cwd: autoregDir, env });
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

  const pythonCmd = getPythonCommand();
  const { spawnSync } = require('child_process');

  const args = ['cli.py', 'patch', 'apply', '--skip-check'];
  if (force) args.push('--force');

  const result = spawnSync(pythonCmd, args, {
    cwd: autoregDir,
    encoding: 'utf8',
    timeout: 30000,
    shell: process.platform === 'win32',
    env: { ...process.env, PYTHONPATH: autoregDir }
  });

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

  const pythonCmd = getPythonCommand();
  const { spawnSync } = require('child_process');

  const args = ['cli.py', 'patch', 'remove', '--skip-check'];

  const result = spawnSync(pythonCmd, args, {
    cwd: autoregDir,
    encoding: 'utf8',
    timeout: 30000,
    shell: process.platform === 'win32',
    env: { ...process.env, PYTHONPATH: autoregDir }
  });

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

  const pythonCmd = getPythonCommand();
  const { spawnSync } = require('child_process');

  const args = ['cli.py', 'patch', 'generate-id'];

  const result = spawnSync(pythonCmd, args, {
    cwd: autoregDir,
    encoding: 'utf8',
    timeout: 30000,
    shell: process.platform === 'win32',
    env: { ...process.env, PYTHONPATH: autoregDir }
  });

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

  const pythonCmd = getPythonCommand();
  const { spawnSync } = require('child_process');

  // Use dedicated script file to avoid inline Python issues on Windows
  const scriptPath = path.join(autoregDir, 'scripts', 'patch_status.py');

  if (!fs.existsSync(scriptPath)) {
    return { isPatched: false, error: 'patch_status.py not found' };
  }

  const result = spawnSync(pythonCmd, [scriptPath], {
    cwd: autoregDir,
    encoding: 'utf8',
    timeout: 10000
  });

  if (result.status === 0 && result.stdout) {
    try {
      return JSON.parse(result.stdout.trim());
    } catch {
      return { isPatched: false, error: 'Failed to parse status' };
    }
  }

  return { isPatched: false, error: result.stderr || 'Unknown error' };
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

  const pythonCmd = getPythonCommand();
  const { spawnSync } = require('child_process');

  const args = ['cli.py', 'machine', 'reset'];

  const result = spawnSync(pythonCmd, args, {
    cwd: autoregDir,
    encoding: 'utf8',
    timeout: 30000,
    shell: process.platform === 'win32',
    env: { ...process.env, PYTHONPATH: autoregDir }
  });

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
    if (result.error) {
      provider.addLog(`Error: ${result.error.message}`);
    }
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

  const pythonCmd = getPythonCommand();
  const { spawn } = require('child_process');

  // Don't use -a flag to avoid overwriting current active token
  const args = ['cli.py', 'sso-import', bearerToken];

  const proc = spawn(pythonCmd, args, {
    cwd: autoregDir,
    env: { ...process.env, PYTHONPATH: autoregDir }
  });

  proc.stdout.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    provider.addLog(line);
  });

  proc.stderr.on('data', (data: Buffer) => {
    const line = data.toString().trim();
    if (line && !line.includes('InsecureRequestWarning')) {
      provider.addLog(`⚠️ ${line}`);
    }
  });

  proc.on('close', (code: number) => {
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
  });

  proc.on('error', (err: Error) => {
    provider.addLog(`❌ Error: ${err.message}`);
    provider.setStatus('');
    vscode.window.showErrorMessage(`SSO import error: ${err.message}`);
  });
}
