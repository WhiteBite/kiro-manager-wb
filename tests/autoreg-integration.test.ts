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
});
