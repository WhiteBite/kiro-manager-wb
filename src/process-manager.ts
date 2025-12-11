/**
 * Process Manager
 * Handles spawning, stopping, and managing child processes
 */

import { ChildProcess, spawn, exec } from 'child_process';
import { EventEmitter } from 'events';

export interface ProcessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  shell?: boolean;
}

export type ProcessState = 'idle' | 'running' | 'paused' | 'stopping';

export class ProcessManager extends EventEmitter {
  private _process: ChildProcess | null = null;
  private _state: ProcessState = 'idle';
  private _pid: number | null = null;

  get state(): ProcessState {
    return this._state;
  }

  get isRunning(): boolean {
    return this._state === 'running' || this._state === 'paused';
  }

  get pid(): number | null {
    return this._pid;
  }

  /**
   * Start a new process
   */
  start(command: string, args: string[], options: ProcessOptions): ChildProcess {
    if (this._process) {
      this.stop();
    }

    const isWindows = process.platform === 'win32';
    
    this._process = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: options.shell ?? isWindows,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this._pid = this._process.pid || null;
    this._state = 'running';

    this._process.on('close', (code) => {
      this._state = 'idle';
      this._process = null;
      this._pid = null;
      this.emit('close', code);
    });

    this._process.on('error', (err) => {
      this._state = 'idle';
      this._process = null;
      this._pid = null;
      this.emit('error', err);
    });

    this._process.stdout?.on('data', (data: Buffer) => {
      this.emit('stdout', data.toString());
    });

    this._process.stderr?.on('data', (data: Buffer) => {
      this.emit('stderr', data.toString());
    });

    this.emit('start', this._pid);
    return this._process;
  }

  /**
   * Stop the running process
   */
  async stop(): Promise<boolean> {
    if (!this._process || this._state === 'idle') {
      return false;
    }

    this._state = 'stopping';
    this.emit('stopping');

    try {
      const isWindows = process.platform === 'win32';
      
      if (isWindows && this._pid) {
        // Windows: use taskkill to kill process tree
        await this._killWindowsProcess(this._pid);
      } else {
        // Unix: send SIGTERM first, then SIGKILL
        this._process.kill('SIGTERM');
        
        // Give it 2 seconds to terminate gracefully
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (this._process && !this._process.killed) {
          this._process.kill('SIGKILL');
        }
      }

      this._state = 'idle';
      this._process = null;
      this._pid = null;
      this.emit('stopped');
      return true;
    } catch (e) {
      this.emit('error', e);
      return false;
    }
  }

  /**
   * Kill Windows process and its children
   */
  private _killWindowsProcess(pid: number): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`taskkill /pid ${pid} /T /F`, (error) => {
        if (error) {
          // Process might already be dead, that's ok
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Pause is not really supported for external processes
   * This just updates the state for UI purposes
   */
  pause(): boolean {
    if (this._state !== 'running') {
      return false;
    }
    this._state = 'paused';
    this.emit('paused');
    return true;
  }

  /**
   * Resume from paused state
   */
  resume(): boolean {
    if (this._state !== 'paused') {
      return false;
    }
    this._state = 'running';
    this.emit('resumed');
    return true;
  }

  /**
   * Toggle pause/resume
   */
  togglePause(): boolean {
    if (this._state === 'running') {
      return this.pause();
    } else if (this._state === 'paused') {
      return this.resume();
    }
    return false;
  }

  /**
   * Write to process stdin
   */
  write(data: string): boolean {
    if (this._process?.stdin) {
      this._process.stdin.write(data);
      return true;
    }
    return false;
  }
}

// Singleton instance for autoreg process
export const autoregProcess = new ProcessManager();
