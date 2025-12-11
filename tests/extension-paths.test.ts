/**
 * Tests to verify extension paths and configurations are correct
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');
const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');

describe('Extension Path Configuration', () => {
  
  describe('extension.ts references', () => {
    let extensionContent: string;
    
    beforeAll(() => {
      extensionContent = fs.readFileSync(path.join(SRC_DIR, 'extension.ts'), 'utf8');
    });

    it('should reference autoreg folder (not autoreg-bundled)', () => {
      expect(extensionContent).toContain("'autoreg'");
      expect(extensionContent).not.toContain('autoreg-bundled');
    });

    it('should reference register_auto.py', () => {
      expect(extensionContent).toContain('register_auto.py');
      // Verify the file actually exists
      expect(fs.existsSync(path.join(AUTOREG_DIR, 'registration', 'register_auto.py'))).toBe(true);
    });

    it('should reference requirements.txt', () => {
      expect(extensionContent).toContain('requirements.txt');
      expect(fs.existsSync(path.join(AUTOREG_DIR, 'requirements.txt'))).toBe(true);
    });

    it('should use -m registration.register_auto for module execution', () => {
      expect(extensionContent).toContain("'-m', 'registration.register_auto'");
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
        'viewQuota',
        'refreshToken',
        'confirmDelete',
        'startAutoReg',
        'importToken',
        'refresh',
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
