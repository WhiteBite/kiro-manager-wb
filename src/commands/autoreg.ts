/**
 * Auto-registration commands
 * Handles automatic account registration and SSO import
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KiroAccountsProvider } from '../providers/AccountsProvider';
import { autoregProcess } from '../process-manager';

// Get autoreg directory
export function getAutoregDir(context: vscode.ExtensionContext): string {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const workspacePath = path.join(workspaceFolder, 'kiro-batch-login', 'autoreg');
  const homePath = path.join(os.homedir(), '.kiro-autoreg');
  const bundledPath = path.join(context.extensionPath, 'autoreg');

  if (fs.existsSync(path.join(workspacePath, 'registration', 'register_auto.py'))) {
    return workspacePath;
  }

  if (fs.existsSync(path.join(homePath, 'registration', 'register_auto.py'))) {
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
  const finalPath = autoregDir ? path.join(autoregDir, 'registration', 'register_auto.py') : '';

  if (!finalPath || !fs.existsSync(finalPath)) {
    vscode.window.showWarningMessage('Auto-reg script not found. Place autoreg folder in workspace or ~/.kiro-autoreg/');
    return;
  }

  const config = vscode.workspace.getConfiguration('kiroAccountSwitcher');
  const headless = config.get<boolean>('autoreg.headless', false);
  const verbose = config.get<boolean>('debug.verbose', false);
  const imapServer = config.get<string>('imap.server', '');
  const imapUser = config.get<string>('imap.user', '');
  const imapPassword = config.get<string>('imap.password', '');
  const emailDomain = config.get<string>('autoreg.emailDomain', 'example.com');

  if (!imapServer || !imapUser || !imapPassword) {
    const result = await vscode.window.showWarningMessage(
      'IMAP settings not configured. Configure now?',
      'Open Settings', 'Cancel'
    );
    if (result === 'Open Settings') {
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

  const args = ['-m', 'registration.register_auto'];
  args.push(headless ? '--headless' : '--no-headless');
  if (verbose) args.push('--verbose');
  args.push('--domain', emailDomain);

  const env = {
    ...process.env,
    IMAP_SERVER: imapServer,
    IMAP_USER: imapUser,
    IMAP_PASSWORD: imapPassword,
    EMAIL_DOMAIN: emailDomain
  };

  provider.addLog(`Starting autoreg...`);
  provider.addLog(`Working dir: ${autoregDir}`);
  provider.addLog(`Python: ${pythonCmd}`);
  provider.addLog(`Headless mode: ${headless ? 'ON' : 'OFF'}`);
  provider.addLog(`Command: ${pythonCmd} ${args.join(' ')}`);

  // Use ProcessManager for better control
  autoregProcess.removeAllListeners();

  autoregProcess.on('stdout', (data: string) => {
    const lines = data.split('\n').filter((l: string) => l.trim());
    for (const line of lines) {
      provider.addLog(line);
      parseProgressLine(line, provider);
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

  const args = ['cli.py', 'sso-import', bearerToken, '-a'];

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
