/**
 * Tests for Kiro LLM API module
 * 
 * Tests the Python LLM API server components:
 * - Token pool management
 * - CodeWhisperer client
 * - OpenAI-compatible API server
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, spawnSync } from 'child_process';

const AUTOREG_DIR = path.join(__dirname, '..', 'autoreg');
const LLM_DIR = path.join(AUTOREG_DIR, 'llm');

describe('Kiro LLM API Module', () => {

    describe('Required files exist', () => {
        const requiredFiles = [
            '__init__.py',
            'llm_server.py',
            'codewhisperer_client.py',
            'token_pool.py',
            'run_llm_server.py',
            'quick_chat.py',
            'test_api.py',
        ];

        requiredFiles.forEach(file => {
            it(`should have ${file}`, () => {
                expect(fs.existsSync(path.join(LLM_DIR, file))).toBe(true);
            });
        });
    });

    describe('Python syntax check', () => {
        const pythonFiles = [
            'llm_server.py',
            'codewhisperer_client.py',
            'token_pool.py',
            'run_llm_server.py',
        ];

        pythonFiles.forEach(file => {
            it(`${file} should have valid Python syntax`, () => {
                const filePath = path.join(LLM_DIR, file);
                const result = spawnSync('python', ['-m', 'py_compile', filePath], {
                    encoding: 'utf8',
                    timeout: 10000
                });
                expect(result.status).toBe(0);
            });
        });
    });

    describe('Module imports', () => {
        it('should import llm_server without errors', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm import llm_server
print('OK')
`], {
                encoding: 'utf8',
                timeout: 15000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });

        it('should import token_pool without errors', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.token_pool import TokenPool
print('OK')
`], {
                encoding: 'utf8',
                timeout: 15000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });

        it('should import codewhisperer_client without errors', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.codewhisperer_client import CodeWhispererClient, MODEL_MAPPING
print('OK')
`], {
                encoding: 'utf8',
                timeout: 15000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });
    });

    describe('Model mapping', () => {
        it('should have correct model mappings', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.codewhisperer_client import MODEL_MAPPING
import json

# Check required models exist
required = ['claude-opus-4.5', 'claude-sonnet-4', 'claude-haiku-4.5', 'auto']
for model in required:
    if model not in MODEL_MAPPING:
        print(f'MISSING: {model}')
        sys.exit(1)

print(json.dumps(list(MODEL_MAPPING.keys())))
`], {
                encoding: 'utf8',
                timeout: 10000,
                cwd: AUTOREG_DIR
            });

            expect(result.status).toBe(0);
            const models = JSON.parse(result.stdout.trim());
            expect(models).toContain('claude-opus-4.5');
            expect(models).toContain('claude-sonnet-4');
            expect(models).toContain('claude-haiku-4.5');
            expect(models).toContain('auto');
        });
    });

    describe('TokenPool class', () => {
        it('should have required methods', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.token_pool import TokenPool

pool = TokenPool()
methods = ['load_tokens', 'get_token', 'mark_success', 'mark_error', 
           'mark_quota_exceeded', 'refresh_all', 'get_status']

for method in methods:
    if not hasattr(pool, method):
        print(f'MISSING: {method}')
        sys.exit(1)

print('OK')
`], {
                encoding: 'utf8',
                timeout: 10000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });

        it('should have required properties', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.token_pool import TokenPool

pool = TokenPool()
props = ['total_count', 'available_count', 'banned_count', 'expired_count']

for prop in props:
    if not hasattr(pool, prop):
        print(f'MISSING: {prop}')
        sys.exit(1)

print('OK')
`], {
                encoding: 'utf8',
                timeout: 10000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });
    });

    describe('PoolToken dataclass', () => {
        it('should have correct fields and properties', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.token_pool import PoolToken
from datetime import datetime, timezone

# Create test token
token = PoolToken(
    filename='test.json',
    account_name='Test Account',
    email='test@example.com',
    access_token='test_access',
    refresh_token='test_refresh',
    expires_at=datetime.now(timezone.utc),
    region='us-east-1'
)

# Check properties
assert hasattr(token, 'is_expired')
assert hasattr(token, 'is_available')
assert hasattr(token, 'quota_percent')
assert hasattr(token, 'to_dict')

# Check to_dict output
d = token.to_dict()
assert 'account' in d
assert 'region' in d
assert 'is_banned' in d
assert 'quota_percent' in d

print('OK')
`], {
                encoding: 'utf8',
                timeout: 10000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });
    });

    describe('CodeWhispererClient class', () => {
        it('should have required methods', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.codewhisperer_client import CodeWhispererClient
from llm.token_pool import TokenPool

pool = TokenPool()
client = CodeWhispererClient(pool)

methods = ['generate', 'generate_stream', '_build_request', '_parse_response']

for method in methods:
    if not hasattr(client, method):
        print(f'MISSING: {method}')
        sys.exit(1)

print('OK')
`], {
                encoding: 'utf8',
                timeout: 10000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });
    });

    describe('LLM Server endpoints', () => {
        it('should define all required endpoints', () => {
            const serverContent = fs.readFileSync(path.join(LLM_DIR, 'llm_server.py'), 'utf8');

            // Check endpoint decorators
            expect(serverContent).toContain('@app.get("/")');
            expect(serverContent).toContain('@app.get("/v1/models")');
            expect(serverContent).toContain('@app.post("/v1/chat/completions")');
            expect(serverContent).toContain('@app.get("/health")');
            expect(serverContent).toContain('@app.get("/pool/status")');
            expect(serverContent).toContain('@app.post("/pool/refresh")');
            expect(serverContent).toContain('@app.post("/pool/reload")');
            expect(serverContent).toContain('@app.get("/pool/quotas")');
        });

        it('should have OpenAI-compatible request/response models', () => {
            const serverContent = fs.readFileSync(path.join(LLM_DIR, 'llm_server.py'), 'utf8');

            // Check Pydantic models
            expect(serverContent).toContain('class Message(BaseModel)');
            expect(serverContent).toContain('class ChatCompletionRequest(BaseModel)');
            expect(serverContent).toContain('class ChatCompletionResponse(BaseModel)');
            expect(serverContent).toContain('class Usage(BaseModel)');
        });

        it('should integrate with QuotaService', () => {
            const serverContent = fs.readFileSync(path.join(LLM_DIR, 'llm_server.py'), 'utf8');

            expect(serverContent).toContain('from services.quota_service import QuotaService');
            expect(serverContent).toContain('quota_service');
        });

        it('should support streaming responses', () => {
            const serverContent = fs.readFileSync(path.join(LLM_DIR, 'llm_server.py'), 'utf8');

            expect(serverContent).toContain('StreamingResponse');
            expect(serverContent).toContain('async def generate_stream');
            expect(serverContent).toContain('text/event-stream');
        });
    });

    describe('Request building', () => {
        it('should build correct CodeWhisperer request format', () => {
            const result = spawnSync('python', ['-c', `
import sys
sys.path.insert(0, '${AUTOREG_DIR.replace(/\\/g, '\\\\')}')
from llm.codewhisperer_client import CodeWhispererClient
from llm.token_pool import TokenPool
import json

pool = TokenPool()
client = CodeWhispererClient(pool)

# Test message building
messages = [
    {'role': 'system', 'content': 'You are helpful.'},
    {'role': 'user', 'content': 'Hello!'}
]

request = client._build_request(messages, 'claude-sonnet-4')

# Verify structure
assert 'conversationState' in request
state = request['conversationState']
assert 'conversationId' in state
assert 'currentMessage' in state
assert 'chatTriggerType' in state

# Verify current message
current = state['currentMessage']
assert 'userInputMessage' in current
user_msg = current['userInputMessage']
assert 'content' in user_msg
assert 'modelId' in user_msg
assert 'origin' in user_msg

print('OK')
`], {
                encoding: 'utf8',
                timeout: 10000,
                cwd: AUTOREG_DIR
            });

            expect(result.stdout).toContain('OK');
        });
    });

    describe('Environment configuration', () => {
        it('should use correct default port (8421)', () => {
            const serverContent = fs.readFileSync(path.join(LLM_DIR, 'llm_server.py'), 'utf8');
            expect(serverContent).toContain('8421');
        });

        it('should support environment variable configuration', () => {
            const serverContent = fs.readFileSync(path.join(LLM_DIR, 'llm_server.py'), 'utf8');
            expect(serverContent).toContain('KIRO_LLM_PORT');
            expect(serverContent).toContain('KIRO_LLM_HOST');
            expect(serverContent).toContain('KIRO_LLM_API_KEY');
        });
    });

    describe('Start script', () => {
        it('should have start script in autoreg/scripts/', () => {
            expect(fs.existsSync(path.join(AUTOREG_DIR, 'scripts', 'start_llm_api.bat'))).toBe(true);
        });
    });

});
