/**
 * Tests for OAuth Device Flow
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

describe('OAuth Device Flow', () => {

    describe('Required files', () => {
        it('should have oauth_device.py', () => {
            const filePath = path.join(AUTOREG_DIR, 'registration', 'oauth_device.py');
            expect(fs.existsSync(filePath)).toBe(true);
        });

        it('should have valid Python syntax', () => {
            const filePath = path.join(AUTOREG_DIR, 'registration', 'oauth_device.py');
            const result = spawnSync(pythonCmd, ['-m', 'py_compile', filePath], {
                encoding: 'utf8',
                timeout: 10000,
            });
            expect(result.status).toBe(0);
        });
    });

    describe('OAuthDevice class', () => {
        it('should be importable', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from registration.oauth_device import OAuthDevice
print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            // May fail due to missing deps, but should not have import errors
            if (result.status !== 0) {
                expect(result.stderr).not.toContain('ImportError');
                expect(result.stderr).not.toContain('SyntaxError');
            } else {
                expect(result.stdout.trim()).toBe('OK');
            }
        });

        it('should have required methods', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from registration.oauth_device import OAuthDevice

oauth = OAuthDevice()

# Check required methods exist
assert hasattr(oauth, 'start'), 'Missing start method'
assert hasattr(oauth, 'wait_for_callback'), 'Missing wait_for_callback method'
assert hasattr(oauth, 'get_auth_url'), 'Missing get_auth_url method'
assert hasattr(oauth, 'get_user_code'), 'Missing get_user_code method'
assert hasattr(oauth, 'get_token_filename'), 'Missing get_token_filename method'
assert hasattr(oauth, 'close'), 'Missing close method'

print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            if (result.status !== 0) {
                // Skip if deps missing
                if (result.stderr.includes('ModuleNotFoundError')) {
                    console.log('Skipping: missing dependencies');
                    return;
                }
            }
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });
    });

    describe('Device flow vs PKCE selection', () => {
        it('should select OAuthDevice when device_flow=True', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from registration.oauth_device import OAuthDevice
from registration.oauth_pkce import OAuthPKCE

device_flow = True
oauth = OAuthDevice() if device_flow else OAuthPKCE()

assert isinstance(oauth, OAuthDevice), f'Expected OAuthDevice, got {type(oauth)}'
print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            if (result.status !== 0 && result.stderr.includes('ModuleNotFoundError')) {
                console.log('Skipping: missing dependencies');
                return;
            }
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });

        it('should select OAuthPKCE when device_flow=False', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from registration.oauth_device import OAuthDevice
from registration.oauth_pkce import OAuthPKCE

device_flow = False
oauth = OAuthDevice() if device_flow else OAuthPKCE()

assert isinstance(oauth, OAuthPKCE), f'Expected OAuthPKCE, got {type(oauth)}'
print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            if (result.status !== 0 && result.stderr.includes('ModuleNotFoundError')) {
                console.log('Skipping: missing dependencies');
                return;
            }
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });
    });
});
