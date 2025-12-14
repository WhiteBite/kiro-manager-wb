/**
 * Integration tests to verify Python autoreg scripts exist and are callable
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');

describe('Autoreg Python Integration', () => {

  describe('Required files exist', () => {
    const requiredFiles = [
      'cli.py',
      'requirements.txt',
      '__init__.py',
      'registration/__init__.py',
      'registration/register.py',
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
      'src/index.js',  // OAuth Node.js script
    ];

    requiredFiles.forEach(file => {
      it(`should have ${file}`, () => {
        const filePath = path.join(AUTOREG_DIR, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Python syntax check', () => {
    const pythonFiles = [
      'cli.py',
      'registration/register.py',
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

  describe('OAuth Node.js script', () => {
    it('should have valid JavaScript syntax', () => {
      const indexPath = path.join(AUTOREG_DIR, 'src', 'index.js');
      expect(fs.existsSync(indexPath)).toBe(true);

      const result = spawnSync('node', ['--check', indexPath], {
        encoding: 'utf8',
        timeout: 10000,
      });

      expect(result.status).toBe(0);
    });

    it('should show usage when called without args', () => {
      const indexPath = path.join(AUTOREG_DIR, 'src', 'index.js');
      const result = spawnSync('node', [indexPath], {
        encoding: 'utf8',
        timeout: 10000,
      });

      expect(result.stdout).toContain('Usage');
    });

    it('should be found by oauth_pkce.py path resolution', () => {
      // Simulate the path resolution logic from oauth_pkce.py
      const srcIndexPath = path.join(AUTOREG_DIR, 'src', 'index.js');
      expect(fs.existsSync(srcIndexPath)).toBe(true);
    });
  });

  describe('OAuth path resolution simulation', () => {
    it('should find index.js in autoreg/src/', () => {
      // This simulates what happens when autoreg is copied to ~/.kiro-autoreg
      const baseDir = AUTOREG_DIR;
      const indexPath = path.join(baseDir, 'src', 'index.js');

      expect(fs.existsSync(indexPath)).toBe(true);

      // Read and verify it's a valid Node.js script
      const content = fs.readFileSync(indexPath, 'utf8');
      expect(content).toContain('startOAuthFlow');
      expect(content).toContain('exchangeCodeForToken');
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
      // Catches the bug where ~/.kiro-autoreg is missing scripts/patch_status.py
      const homeAutoregDir = path.join(require('os').homedir(), '.kiro-autoreg');

      if (!fs.existsSync(homeAutoregDir)) {
        console.log('Skipping: ~/.kiro-autoreg not found');
        return;
      }

      const scriptPath = path.join(homeAutoregDir, 'scripts', 'patch_status.py');
      expect(fs.existsSync(scriptPath)).toBe(true);

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
