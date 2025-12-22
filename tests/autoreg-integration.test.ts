/**
 * Integration tests to verify Python autoreg scripts exist and are callable
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

describe('Autoreg Python Integration', () => {

  describe('Required files exist', () => {
    const requiredFiles = [
      'cli.py',
      'requirements.txt',
      '__init__.py',
      'registration/__init__.py',
      'registration/register.py',
      'registration/register_auto.py',  // Auto-registration entry point
      'registration/browser.py',
      'registration/mail_handler.py',
      'registration/oauth_pkce.py',
      'core/__init__.py',
      'core/config.py',
      'core/paths.py',
      'core/exceptions.py',
      'services/__init__.py',
      'services/token_service.py',
      'services/kiro_service.py',
      'services/quota_service.py',
      'services/machine_id_service.py',
      'scripts/patch_status.py',  // Used by extension for patch status check
    ];

    requiredFiles.forEach(file => {
      it(`should have ${file}`, () => {
        const filePath = path.join(AUTOREG_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Python module execution', () => {
    it('should run registration.register_auto module from autoreg directory', () => {
      // This is how the extension runs it
      const result = spawnSync(pythonCmd, ['-m', 'registration.register_auto', '--help'], {
        cwd: AUTOREG_DIR,
        encoding: 'utf8',
        timeout: 15000,
        env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
      });

      // Should either show help or fail gracefully (not ModuleNotFoundError)
      if (result.status !== 0) {
        expect(result.stderr).not.toContain('ModuleNotFoundError');
        expect(result.stderr).not.toContain("No module named 'registration'");
      }
    });

    it('should fail with clear error when run from wrong directory', () => {
      // Running from parent directory without proper PYTHONPATH should fail
      const parentDir = path.join(AUTOREG_DIR, '..');
      const result = spawnSync(pythonCmd, ['-m', 'registration.register'], {
        cwd: parentDir,
        encoding: 'utf8',
        timeout: 10000,
        // No PYTHONPATH - simulates user running from wrong dir
      });

      // Should fail - this is expected behavior
      expect(result.status).not.toBe(0);
    });

    it('should work with PYTHONPATH set to autoreg directory', () => {
      // This is the recommended way to run from any directory
      const parentDir = path.join(AUTOREG_DIR, '..');
      const result = spawnSync(pythonCmd, ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from registration import register
print('OK')
`], {
        cwd: parentDir,
        encoding: 'utf8',
        timeout: 15000,
      });

      // May fail due to missing deps, but should not have import errors
      if (result.status !== 0) {
        expect(result.stderr).not.toContain("No module named 'registration'");
      } else {
        expect(result.stdout).toContain('OK');
      }
    });
  });

  describe('Python syntax check', () => {
    const pythonFiles = [
      'cli.py',
      'registration/register.py',
      'registration/register_auto.py',
      'registration/oauth_pkce.py',
      'core/config.py',
      'services/token_service.py',
    ];

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    pythonFiles.forEach(file => {
      it(`${file} should have valid Python syntax`, () => {
        const filePath = path.join(AUTOREG_DIR, file);
        const result = spawnSync(pythonCmd, ['-m', 'py_compile', filePath], {
          encoding: 'utf8',
          timeout: 10000,
        });
        expect(result.status).toBe(0);
      });
    });
  });

  describe('CLI help command', () => {
    it('should show help without errors', () => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const result = spawnSync(pythonCmd, ['cli.py', '--help'], {
        cwd: AUTOREG_DIR,
        encoding: 'utf8',
        timeout: 10000,
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('usage');
    });
  });

  describe('Module imports', () => {
    it('should import registration.register without errors', () => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const result = spawnSync(pythonCmd, ['-c', 'import registration.register'], {
        cwd: AUTOREG_DIR,
        encoding: 'utf8',
        timeout: 10000,
        env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
      });

      // May fail due to missing deps, but should not have syntax errors
      if (result.status !== 0) {
        expect(result.stderr).not.toContain('SyntaxError');
      }
    });
  });

  describe('Patch status JSON output', () => {
    it('should return valid JSON with --json flag', () => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const result = spawnSync(pythonCmd, ['cli.py', 'patch', 'status', '--json'], {
        cwd: AUTOREG_DIR,
        encoding: 'utf8',
        timeout: 10000,
        shell: process.platform === 'win32'
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');

      // Should be valid JSON
      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed).toHaveProperty('isPatched');
      expect(parsed).toHaveProperty('kiroVersion');
      expect(parsed).toHaveProperty('patchVersion');
      expect(parsed).toHaveProperty('currentMachineId');
      expect(parsed).toHaveProperty('error');
      expect(typeof parsed.isPatched).toBe('boolean');
    });

    it('should work without shell option (regression test for Windows -c bug)', () => {
      // This test ensures that multiline Python scripts work without shell: true
      // Previously, shell: true on Windows caused "Argument expected for -c" error
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const script = `import json; print(json.dumps({"test": True}))`;

      const result = spawnSync(pythonCmd, ['-c', script], {
        cwd: AUTOREG_DIR,
        encoding: 'utf8',
        timeout: 10000
        // Note: NO shell option - this is the fix
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');

      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed.test).toBe(true);
    });

    it('should have patch_status.py script that returns valid JSON', () => {
      // This is the main test - extension uses this script directly
      const scriptPath = path.join(AUTOREG_DIR, 'scripts', 'patch_status.py');
      expect(fs.existsSync(scriptPath)).toBe(true);

      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const result = spawnSync(pythonCmd, [scriptPath], {
        cwd: AUTOREG_DIR,
        encoding: 'utf8',
        timeout: 10000
      });

      expect(result.status).toBe(0);

      // Should be valid JSON with required fields
      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed).toHaveProperty('isPatched');
      expect(parsed).toHaveProperty('kiroVersion');
      expect(parsed).toHaveProperty('patchVersion');
      expect(parsed).toHaveProperty('currentMachineId');
      expect(parsed).toHaveProperty('error');
      expect(typeof parsed.isPatched).toBe('boolean');
    });

    it('should have patch_status.py in home directory if autoreg is deployed', () => {
      // Check ~/.kiro-manager-wb for patch_status.py
      const homeAutoregDir = path.join(require('os').homedir(), '.kiro-manager-wb');

      const scriptPath = path.join(homeAutoregDir, 'scripts', 'patch_status.py');
      if (!fs.existsSync(scriptPath)) {
        console.log('Skipping: patch_status.py not found in ~/.kiro-manager-wb');
        return;
      }

      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const result = spawnSync(pythonCmd, [scriptPath], {
        cwd: homeAutoregDir,
        encoding: 'utf8',
        timeout: 10000
      });

      expect(result.status).toBe(0);
      const parsed = JSON.parse(result.stdout.trim());
      expect(parsed).toHaveProperty('isPatched');
    });
  });
});
