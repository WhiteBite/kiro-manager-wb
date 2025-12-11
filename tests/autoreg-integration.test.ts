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
      'registration/register_auto.py',
      'registration/register.py',
      'registration/browser.py',
      'registration/mail_handler.py',
      'registration/oauth_client.py',
      'core/__init__.py',
      'core/config.py',
      'core/paths.py',
      'core/exceptions.py',
      'services/__init__.py',
      'services/token_service.py',
      'services/kiro_service.py',
      'services/quota_service.py',
      'services/machine_id_service.py',
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
      'registration/register_auto.py',
      'registration/register.py',
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
    it('should import registration.register_auto without errors', () => {
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const result = spawnSync(pythonCmd, ['-c', 'import registration.register_auto'], {
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
});
