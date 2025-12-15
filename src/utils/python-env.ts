/**
 * Python Virtual Environment Manager
 * Creates and manages isolated venv for autoreg dependencies
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync, spawn, ChildProcess } from 'child_process';

export interface PythonEnvResult {
    success: boolean;
    pythonPath: string;
    pipPath: string;
    venvPath: string;
    error?: string;
}

export class PythonEnvManager {
    private venvPath: string;
    private autoregDir: string;
    private isWindows: boolean;

    constructor(autoregDir: string) {
        this.autoregDir = autoregDir;
        this.venvPath = path.join(autoregDir, '.venv');
        this.isWindows = process.platform === 'win32';
    }

    /**
     * Get path to Python executable in venv
     */
    getPythonPath(): string {
        if (this.isWindows) {
            return path.join(this.venvPath, 'Scripts', 'python.exe');
        }
        return path.join(this.venvPath, 'bin', 'python');
    }

    /**
     * Get path to pip executable in venv
     */
    getPipPath(): string {
        if (this.isWindows) {
            return path.join(this.venvPath, 'Scripts', 'pip.exe');
        }
        return path.join(this.venvPath, 'bin', 'pip');
    }

    /**
     * Check if venv exists and is valid
     */
    isVenvValid(): boolean {
        const pythonPath = this.getPythonPath();
        if (!fs.existsSync(pythonPath)) {
            return false;
        }

        // Quick check that Python works
        const result = spawnSync(pythonPath, ['--version'], {
            encoding: 'utf8',
            timeout: 5000
        });

        return result.status === 0;
    }

    /**
     * Find system Python command
     */
    findSystemPython(): string | null {
        const candidates = this.isWindows
            ? ['python', 'python3', 'py -3']
            : ['python3', 'python'];

        for (const cmd of candidates) {
            const parts = cmd.split(' ');
            const result = spawnSync(parts[0], [...parts.slice(1), '--version'], {
                encoding: 'utf8',
                timeout: 5000,
                shell: this.isWindows
            });

            if (result.status === 0) {
                // Check Python version >= 3.8
                const version = result.stdout?.match(/Python (\d+)\.(\d+)/);
                if (version) {
                    const major = parseInt(version[1]);
                    const minor = parseInt(version[2]);
                    if (major >= 3 && minor >= 8) {
                        return cmd;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Create virtual environment
     */
    async createVenv(onLog?: (msg: string) => void): Promise<boolean> {
        const log = onLog || console.log;

        const systemPython = this.findSystemPython();
        if (!systemPython) {
            log('❌ Python 3.8+ not found. Please install Python.');
            return false;
        }

        log(`Found system Python: ${systemPython}`);
        log(`Creating virtual environment at: ${this.venvPath}`);

        // Remove old venv if exists but broken
        if (fs.existsSync(this.venvPath) && !this.isVenvValid()) {
            log('Removing broken venv...');
            fs.rmSync(this.venvPath, { recursive: true, force: true });
        }

        if (this.isVenvValid()) {
            log('✓ Virtual environment already exists');
            return true;
        }

        // Create venv
        const parts = systemPython.split(' ');
        const result = spawnSync(
            parts[0],
            [...parts.slice(1), '-m', 'venv', this.venvPath],
            {
                encoding: 'utf8',
                timeout: 60000,
                shell: this.isWindows,
                cwd: this.autoregDir
            }
        );

        if (result.status !== 0) {
            log(`❌ Failed to create venv: ${result.stderr || result.error?.message}`);
            return false;
        }

        log('✓ Virtual environment created');
        return true;
    }

    /**
     * Install dependencies from requirements.txt
     */
    async installDependencies(onLog?: (msg: string) => void): Promise<boolean> {
        const log = onLog || console.log;

        if (!this.isVenvValid()) {
            log('❌ Virtual environment not found');
            return false;
        }

        const requirementsPath = path.join(this.autoregDir, 'requirements.txt');
        if (!fs.existsSync(requirementsPath)) {
            log('⚠️ requirements.txt not found, skipping');
            return true;
        }

        const pipPath = this.getPipPath();
        log(`Installing dependencies from requirements.txt...`);

        return new Promise((resolve) => {
            const proc = spawn(pipPath, ['install', '-r', requirementsPath, '--quiet'], {
                cwd: this.autoregDir,
                env: { ...process.env, VIRTUAL_ENV: this.venvPath }
            });

            proc.stdout?.on('data', (data) => {
                const line = data.toString().trim();
                if (line) log(line);
            });

            proc.stderr?.on('data', (data) => {
                const line = data.toString().trim();
                if (line && !line.includes('already satisfied')) {
                    log(`⚠️ ${line}`);
                }
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    log('✓ Dependencies installed');
                    resolve(true);
                } else {
                    log(`❌ pip install failed with code ${code}`);
                    resolve(false);
                }
            });

            proc.on('error', (err) => {
                log(`❌ pip error: ${err.message}`);
                resolve(false);
            });
        });
    }

    /**
     * Setup complete environment (create venv + install deps)
     */
    async setup(onLog?: (msg: string) => void): Promise<PythonEnvResult> {
        const log = onLog || console.log;

        // Check if already set up
        const markerFile = path.join(this.venvPath, '.setup_complete');
        if (fs.existsSync(markerFile) && this.isVenvValid()) {
            return {
                success: true,
                pythonPath: this.getPythonPath(),
                pipPath: this.getPipPath(),
                venvPath: this.venvPath
            };
        }

        log('🔧 Setting up Python environment...');

        // Create venv
        const venvCreated = await this.createVenv(log);
        if (!venvCreated) {
            return {
                success: false,
                pythonPath: '',
                pipPath: '',
                venvPath: '',
                error: 'Failed to create virtual environment'
            };
        }

        // Install dependencies
        const depsInstalled = await this.installDependencies(log);
        if (!depsInstalled) {
            return {
                success: false,
                pythonPath: this.getPythonPath(),
                pipPath: this.getPipPath(),
                venvPath: this.venvPath,
                error: 'Failed to install dependencies'
            };
        }

        // Mark as complete
        fs.writeFileSync(markerFile, new Date().toISOString());

        log('✓ Python environment ready');

        return {
            success: true,
            pythonPath: this.getPythonPath(),
            pipPath: this.getPipPath(),
            venvPath: this.venvPath
        };
    }

    /**
     * Run Python script with venv
     */
    runScript(
        scriptArgs: string[],
        options?: {
            env?: Record<string, string>;
            onStdout?: (data: string) => void;
            onStderr?: (data: string) => void;
            onClose?: (code: number) => void;
            onError?: (err: Error) => void;
        }
    ): ChildProcess {
        const pythonPath = this.getPythonPath();

        const proc = spawn(pythonPath, ['-u', ...scriptArgs], {
            cwd: this.autoregDir,
            env: {
                ...process.env,
                ...options?.env,
                VIRTUAL_ENV: this.venvPath,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8'
            }
        });

        if (options?.onStdout) {
            proc.stdout?.on('data', (data) => options.onStdout!(data.toString()));
        }

        if (options?.onStderr) {
            proc.stderr?.on('data', (data) => options.onStderr!(data.toString()));
        }

        if (options?.onClose) {
            proc.on('close', options.onClose);
        }

        if (options?.onError) {
            proc.on('error', options.onError);
        }

        return proc;
    }

    /**
     * Run Python script synchronously
     */
    runScriptSync(
        scriptArgs: string[],
        options?: { env?: Record<string, string>; timeout?: number }
    ): { status: number | null; stdout: string; stderr: string } {
        const pythonPath = this.getPythonPath();

        const result = spawnSync(pythonPath, scriptArgs, {
            cwd: this.autoregDir,
            encoding: 'utf8',
            timeout: options?.timeout || 30000,
            env: {
                ...process.env,
                ...options?.env,
                VIRTUAL_ENV: this.venvPath,
                PYTHONUNBUFFERED: '1',
                PYTHONIOENCODING: 'utf-8'
            }
        });

        return {
            status: result.status,
            stdout: result.stdout || '',
            stderr: result.stderr || ''
        };
    }
}
