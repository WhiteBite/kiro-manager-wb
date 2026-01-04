/**
 * Executable Runner
 * Runs bundled executables:
 * - kiro-cli.exe - CLI commands (patch, tokens, quota, etc.)
 * - kiro-manager.exe - Web app (standalone UI)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

export interface ExecutableResult {
  success: boolean;
  output: string;
  error?: string;
  code: number;
}

/**
 * Executable types
 */
export type ExecutableType = 'cli' | 'manager';

/**
 * Get executable filename by type
 */
function getExecutableFilename(type: ExecutableType): string {
  return type === 'cli' ? 'kiro-cli.exe' : 'kiro-manager.exe';
}

/**
 * Get path to bundled executable
 * @param context VS Code extension context
 * @param type Executable type: 'cli' for CLI commands, 'manager' for web app
 */
export function getExecutablePath(context: vscode.ExtensionContext, type: ExecutableType = 'cli'): string | null {
  const filename = getExecutableFilename(type);
  
  // Check bundled executable in extension
  const bundledPath = path.join(context.extensionPath, 'dist', 'bin', filename);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  // Check in home directory
  const homePath = path.join(os.homedir(), '.kiro-manager-wb', 'bin', filename);
  if (fs.existsSync(homePath)) {
    return homePath;
  }

  // Fallback: check for legacy kiro-manager.exe if looking for cli
  if (type === 'cli') {
    const legacyBundled = path.join(context.extensionPath, 'dist', 'bin', 'kiro-manager.exe');
    if (fs.existsSync(legacyBundled)) {
      return legacyBundled;
    }
    const legacyHome = path.join(os.homedir(), '.kiro-manager-wb', 'bin', 'kiro-manager.exe');
    if (fs.existsSync(legacyHome)) {
      return legacyHome;
    }
  }

  return null;
}

/**
 * Copy executable to user's home directory if needed
 * @param context VS Code extension context
 * @param type Executable type: 'cli' for CLI commands, 'manager' for web app
 */
export function ensureExecutable(context: vscode.ExtensionContext, type: ExecutableType = 'cli'): string | null {
  const filename = getExecutableFilename(type);
  const bundledPath = path.join(context.extensionPath, 'dist', 'bin', filename);
  const homeBinDir = path.join(os.homedir(), '.kiro-manager-wb', 'bin');
  const homePath = path.join(homeBinDir, filename);

  // If bundled exists, copy to home
  if (fs.existsSync(bundledPath)) {
    try {
      if (!fs.existsSync(homeBinDir)) {
        fs.mkdirSync(homeBinDir, { recursive: true });
      }
      
      // Check if needs update (compare size or always copy)
      const bundledStats = fs.statSync(bundledPath);
      let needsCopy = true;
      
      if (fs.existsSync(homePath)) {
        const homeStats = fs.statSync(homePath);
        needsCopy = bundledStats.size !== homeStats.size;
      }
      
      if (needsCopy) {
        fs.copyFileSync(bundledPath, homePath);
        console.log(`[ExecutableRunner] Copied ${filename} to ${homePath}`);
      }
      
      return homePath;
    } catch (err) {
      console.error(`[ExecutableRunner] Failed to copy executable:`, err);
      return bundledPath; // Use bundled directly
    }
  }

  // Check if already in home
  if (fs.existsSync(homePath)) {
    return homePath;
  }

  // Fallback for CLI: try legacy kiro-manager.exe
  if (type === 'cli') {
    const legacyResult = ensureExecutable(context, 'manager');
    if (legacyResult) {
      console.log(`[ExecutableRunner] Using legacy kiro-manager.exe for CLI commands`);
      return legacyResult;
    }
  }

  return null;
}

/**
 * Run executable with arguments
 * @param context VS Code extension context
 * @param args Command line arguments
 * @param env Environment variables
 * @param onOutput Callback for output lines
 * @param type Executable type: 'cli' for CLI commands (default), 'manager' for web app
 */
export async function runExecutable(
  context: vscode.ExtensionContext,
  args: string[],
  env?: Record<string, string>,
  onOutput?: (line: string) => void,
  type: ExecutableType = 'cli'
): Promise<ExecutableResult> {
  const exePath = ensureExecutable(context, type);
  
  if (!exePath) {
    const filename = getExecutableFilename(type);
    return {
      success: false,
      output: '',
      error: `Executable ${filename} not found. Please reinstall the extension.`,
      code: -1
    };
  }

  return new Promise((resolve) => {
    const proc = spawn(exePath, args, {
      env: { ...process.env, ...env },
      shell: false
    });

    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      output += text;
      if (onOutput) {
        text.split('\n').filter(l => l.trim()).forEach(line => onOutput(line));
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      if (onOutput) {
        text.split('\n').filter(l => l.trim()).forEach(line => onOutput(`⚠️ ${line}`));
      }
    });

    proc.on('close', (code: number) => {
      resolve({
        success: code === 0,
        output,
        error: errorOutput || undefined,
        code
      });
    });

    proc.on('error', (err: Error) => {
      resolve({
        success: false,
        output,
        error: err.message,
        code: -1
      });
    });
  });
}

/**
 * Run registration via executable
 */
export async function runRegistration(
  context: vscode.ExtensionContext,
  options: {
    imapServer: string;
    imapUser: string;
    imapPassword: string;
    imapPort?: number;
    emailStrategy?: string;
    emailDomain?: string;
    headless?: boolean;
    spoofing?: boolean;
    proxy?: string;
  },
  onOutput?: (line: string) => void
): Promise<ExecutableResult> {
  const env: Record<string, string> = {
    IMAP_SERVER: options.imapServer,
    IMAP_USER: options.imapUser,
    IMAP_PASSWORD: options.imapPassword,
    IMAP_PORT: String(options.imapPort || 993),
    EMAIL_STRATEGY: options.emailStrategy || 'single',
  };

  if (options.emailDomain) {
    env.EMAIL_DOMAIN = options.emailDomain;
  }
  if (options.headless) {
    env.HEADLESS = 'true';
  }
  if (options.spoofing !== false) {
    env.SPOOFING = 'true';
  }
  if (options.proxy) {
    env.PROXY = options.proxy;
  }

  // Run registration command (using cli executable as fallback)
  return runExecutable(context, ['register'], env, onOutput, 'cli');
}

/**
 * Check if executable is available
 * @param context VS Code extension context
 * @param type Executable type: 'cli' for CLI commands (default), 'manager' for web app
 */
export function isExecutableAvailable(context: vscode.ExtensionContext, type: ExecutableType = 'cli'): boolean {
  return getExecutablePath(context, type) !== null;
}

/**
 * Get path to CLI executable (convenience function)
 */
export function getCliExecutablePath(context: vscode.ExtensionContext): string | null {
  return getExecutablePath(context, 'cli');
}

/**
 * Get path to Manager executable (convenience function)
 */
export function getManagerExecutablePath(context: vscode.ExtensionContext): string | null {
  return getExecutablePath(context, 'manager');
}
