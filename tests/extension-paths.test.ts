/**
 * Tests to verify extension paths and configurations are correct
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');

describe('Extension Path Configuration', () => {

  describe('autoreg module references', () => {
    let autoregContent: string;

    beforeAll(() => {
      // After refactoring, autoreg code is in src/commands/autoreg.ts
      autoregContent = fs.readFileSync(path.join(SRC_DIR, 'commands', 'autoreg.ts'), 'utf8');
    });

    it('should reference autoreg folder (not autoreg-bundled)', () => {
      expect(autoregContent).toContain("'autoreg'");
      expect(autoregContent).not.toContain('autoreg-bundled');
    });

    it('should reference register.py', () => {
      expect(autoregContent).toContain('register.py');
      // Verify the file actually exists
      expect(fs.existsSync(path.join(AUTOREG_DIR, 'registration', 'register.py'))).toBe(true);
    });

    it('should have Python project config (pyproject.toml or requirements.txt)', () => {
      // After refactoring, we use pyproject.toml for modern Python project management
      // requirements.txt is kept for backward compatibility
      const hasPyproject = fs.existsSync(path.join(AUTOREG_DIR, 'pyproject.toml'));
      const hasRequirements = fs.existsSync(path.join(AUTOREG_DIR, 'requirements.txt'));
      expect(hasPyproject || hasRequirements).toBe(true);
    });

    it('should use -m registration.register_auto for module execution', () => {
      expect(autoregContent).toContain("'-m', 'registration.register_auto'");
    });
  });

  describe('i18n translations', () => {
    const locales = ['en', 'ru', 'zh', 'de', 'es', 'fr', 'hi', 'ja', 'ko', 'pt'];
    const i18nDir = path.join(SRC_DIR, 'webview', 'i18n', 'locales');

    // Get required keys from types.ts
    let requiredKeys: string[] = [];

    beforeAll(() => {
      const typesContent = fs.readFileSync(
        path.join(SRC_DIR, 'webview', 'i18n', 'types.ts'),
        'utf8'
      );
      // Extract keys from interface
      const matches = typesContent.match(/^\s+(\w+):/gm);
      if (matches) {
        requiredKeys = matches.map(m => m.trim().replace(':', ''));
      }
    });

    locales.forEach(locale => {
      it(`${locale}.ts should have all required translation keys`, () => {
        const localePath = path.join(i18nDir, `${locale}.ts`);
        expect(fs.existsSync(localePath)).toBe(true);

        const content = fs.readFileSync(localePath, 'utf8');

        requiredKeys.forEach(key => {
          expect(content).toContain(`${key}:`);
        });
      });
    });
  });

  describe('webview scripts', () => {
    let scriptsContent: string;

    beforeAll(() => {
      scriptsContent = fs.readFileSync(
        path.join(SRC_DIR, 'webview', 'scripts.ts'),
        'utf8'
      );
    });

    it('should define all required functions', () => {
      const requiredFunctions = [
        'switchAccount',
        'copyToken',
        'confirmDelete',
        'startAutoReg',
        'refresh',
        'openSettings',
        'closeSettings',
        'showToast',
      ];

      requiredFunctions.forEach(fn => {
        expect(scriptsContent).toContain(`function ${fn}(`);
      });
    });
  });

  describe('package.json', () => {
    let packageJson: any;

    beforeAll(() => {
      packageJson = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
      );
    });

    it('should have valid version format', () => {
      expect(packageJson.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have required scripts', () => {
      expect(packageJson.scripts.build).toBeDefined();
    });
  });
});
