/**
 * Tests for Pool strategy with email:password parsing
 */

import * as path from 'path';
import { spawnSync } from 'child_process';

const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

describe('Pool Strategy with email:password', () => {

    describe('Email:password parsing', () => {
        it('should parse email:password format correctly', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from core.email_generator import EmailGenerator, EmailGeneratorConfig

pool = [
    'user1@gmx.com:password123',
    'user2@domain.com:pass@word',
    'user3@test.com',
]

config = EmailGeneratorConfig(
    strategy='pool',
    imap_user='main@gmx.com',
    email_pool=pool
)

gen = EmailGenerator(config)

# Test first email with password
r1 = gen.generate()
assert r1.registration_email == 'user1@gmx.com', f'Expected user1@gmx.com, got {r1.registration_email}'
assert r1.imap_password == 'password123', f'Expected password123, got {r1.imap_password}'

# Test second email with special char in password
r2 = gen.generate()
assert r2.registration_email == 'user2@domain.com', f'Expected user2@domain.com, got {r2.registration_email}'
assert r2.imap_password == 'pass@word', f'Expected pass@word, got {r2.imap_password}'

# Test third email without password
r3 = gen.generate()
assert r3.registration_email == 'user3@test.com', f'Expected user3@test.com, got {r3.registration_email}'
assert r3.imap_password is None, f'Expected None, got {r3.imap_password}'

print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            expect(result.stderr).toBe('');
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });

        it('should handle complex passwords with special characters', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from core.email_generator import EmailGenerator, EmailGeneratorConfig

pool = [
    'test@gmx.com:5@FEn62$km',
    'test2@gmx.com:dg%rQc""6nTJ',
]

config = EmailGeneratorConfig(
    strategy='pool',
    imap_user='main@gmx.com',
    email_pool=pool
)

gen = EmailGenerator(config)

r1 = gen.generate()
assert r1.imap_password == '5@FEn62$km', f'Got {r1.imap_password}'

r2 = gen.generate()
assert r2.imap_password == 'dg%rQc""6nTJ', f'Got {r2.imap_password}'

print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            expect(result.stderr).toBe('');
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });
    });

    describe('Strategy selection via environment', () => {
        it('should use pool strategy from EMAIL_STRATEGY env', () => {
            const script = `
import sys
import os
import json
sys.path.insert(0, '.')

os.environ['EMAIL_STRATEGY'] = 'pool'
os.environ['IMAP_USER'] = 'main@gmx.com'
os.environ['EMAIL_POOL'] = json.dumps(['test@gmx.com:pass123'])

from core.email_generator import EmailGenerator

gen = EmailGenerator.from_env()
assert gen.config.strategy == 'pool', f'Expected pool, got {gen.config.strategy}'

r = gen.generate()
assert r.registration_email == 'test@gmx.com'
assert r.imap_password == 'pass123'

print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: {
                    ...process.env,
                    PYTHONPATH: AUTOREG_DIR,
                    // Clear any existing env vars
                    EMAIL_STRATEGY: '',
                    EMAIL_POOL: '',
                },
            });

            expect(result.stderr).toBe('');
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });

        it('should use single strategy when explicitly set', () => {
            const script = `
import sys
import os
sys.path.insert(0, '.')

os.environ['EMAIL_STRATEGY'] = 'single'
os.environ['IMAP_USER'] = 'test@gmail.com'

from core.email_generator import EmailGenerator

gen = EmailGenerator.from_env()
assert gen.config.strategy == 'single', f'Expected single, got {gen.config.strategy}'

r = gen.generate()
assert r.registration_email == 'test@gmail.com'

print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: {
                    ...process.env,
                    PYTHONPATH: AUTOREG_DIR,
                },
            });

            expect(result.stderr).toBe('');
            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });
    });

    describe('Pool exhaustion', () => {
        it('should raise error when pool is exhausted', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from core.email_generator import EmailGenerator, EmailGeneratorConfig

pool = ['test@gmx.com:pass']

config = EmailGeneratorConfig(
    strategy='pool',
    imap_user='main@gmx.com',
    email_pool=pool
)

gen = EmailGenerator(config)

# First should work
r1 = gen.generate()
assert r1.registration_email == 'test@gmx.com'

# Second should fail
try:
    r2 = gen.generate()
    print('FAIL: Should have raised ValueError')
    sys.exit(1)
except ValueError as e:
    assert 'exhausted' in str(e).lower()
    print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });
    });

    describe('Name generation from email', () => {
        it('should generate name from email username', () => {
            const script = `
import sys
sys.path.insert(0, '.')
from core.email_generator import EmailGenerator, EmailGeneratorConfig

pool = ['gary_warren1810@gmx.com:pass']

config = EmailGeneratorConfig(
    strategy='pool',
    imap_user='main@gmx.com',
    email_pool=pool
)

gen = EmailGenerator(config)
r = gen.generate()

# Should extract "Gary Warren" from "gary_warren1810"
assert 'Gary' in r.display_name or 'gary' in r.display_name.lower(), f'Got {r.display_name}'

print('OK')
`;

            const result = spawnSync(pythonCmd, ['-c', script], {
                cwd: AUTOREG_DIR,
                encoding: 'utf8',
                timeout: 10000,
                env: { ...process.env, PYTHONPATH: AUTOREG_DIR },
            });

            expect(result.status).toBe(0);
            expect(result.stdout.trim()).toBe('OK');
        });
    });
});
