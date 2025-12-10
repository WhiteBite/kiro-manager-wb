"""
OAuth клиент - обёртка для Node.js части
"""

import subprocess
import os
import re
from pathlib import Path
from typing import Optional

import sys
from pathlib import Path as SysPath
sys.path.insert(0, str(SysPath(__file__).parent.parent))

from core.paths import get_paths

_paths = get_paths()
PROJECT_DIR = _paths.project_dir
BASE_DIR = _paths.autoreg_dir


class OAuthClient:
    """Обёртка для запуска Node.js OAuth сервера"""
    
    def __init__(self, project_dir: Path = None):
        # Try to find the correct directory with src/index.js
        # Debug: print paths being checked
        print(f"[OAuth] BASE_DIR: {BASE_DIR}")
        print(f"[OAuth] PROJECT_DIR: {PROJECT_DIR}")
        print(f"[OAuth] Checking: {BASE_DIR / 'src' / 'index.js'} exists: {(BASE_DIR / 'src' / 'index.js').exists()}")
        
        if project_dir and (project_dir / 'src' / 'index.js').exists():
            self.project_dir = project_dir
        elif (BASE_DIR / 'src' / 'index.js').exists():
            # Node files bundled with autoreg (e.g., ~/.kiro-autoreg/src/index.js)
            self.project_dir = BASE_DIR
        elif (PROJECT_DIR / 'src' / 'index.js').exists():
            # Original project structure
            self.project_dir = PROJECT_DIR
        else:
            # Fallback to BASE_DIR anyway
            self.project_dir = BASE_DIR
            print(f"[OAuth] WARNING: index.js not found, using BASE_DIR: {BASE_DIR}")
        
        self.process = None
        self.auth_url = None
        self.output_lines = []
    
    def _ensure_node_modules(self):
        """Проверяет и устанавливает node_modules если нужно"""
        node_modules = self.project_dir / 'node_modules'
        package_json = self.project_dir / 'package.json'
        
        if not node_modules.exists() and package_json.exists():
            print(f"[OAuth] Installing Node.js dependencies...")
            try:
                result = subprocess.run(
                    ['npm', 'install', '--silent'],
                    cwd=self.project_dir,
                    capture_output=True,
                    text=True,
                    timeout=180
                )
                if result.returncode == 0:
                    print(f"[OAuth] ✓ Node.js dependencies installed")
                else:
                    print(f"[OAuth] ⚠️ npm install warning: {result.stderr}")
            except Exception as e:
                print(f"[OAuth] ⚠️ Failed to install deps: {e}")
    
    def start(self, provider: str = 'BuilderId', account_name: str = 'auto') -> Optional[str]:
        """
        Запускает OAuth сервер и возвращает URL авторизации
        
        Args:
            provider: Тип провайдера (BuilderId, Enterprise, Google, Github)
            account_name: Имя аккаунта для идентификации
        
        Returns:
            URL авторизации или None
        """
        index_path = self.project_dir / 'src' / 'index.js'
        if not index_path.exists():
            raise Exception(f"OAuth script not found: {index_path}")
        
        # Ensure node_modules are installed
        self._ensure_node_modules()
        
        cmd = ['node', str(index_path), 'login', '--provider', provider, '--account', account_name]
        
        env = os.environ.copy()
        env['NO_BROWSER'] = 'true'
        
        self.process = subprocess.Popen(
            cmd,
            cwd=self.project_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            env=env
        )
        
        url_pattern = re.compile(r'https://oidc\..*?authorize\?.*?code_challenge_method=S256')
        
        for line in iter(self.process.stdout.readline, ''):
            self.output_lines.append(line)
            print(f"[NODE] {line.rstrip()}")
            
            match = url_pattern.search(line)
            if match:
                self.auth_url = match.group(0)
                return self.auth_url
            
            if 'Error' in line or 'failed' in line.lower():
                raise Exception(f"OAuth error: {line.strip()}")
        
        return None
    
    def wait_for_callback(self, timeout: int = 300) -> bool:
        """
        Ждёт завершения OAuth callback и сохранения токена
        
        Returns:
            True если успешно, False если ошибка или таймаут
        """
        if not self.process:
            return False
        
        auth_successful = False
        token_saved = False
        
        try:
            for line in iter(self.process.stdout.readline, ''):
                self.output_lines.append(line)
                print(f"[NODE] {line.rstrip()}")
                
                # Check for authentication success
                if 'Authentication successful' in line:
                    auth_successful = True
                    # Don't return yet - wait for token to be saved!
                    continue
                
                # Check for token saved - THIS is when we're done
                if 'Token saved to:' in line:
                    token_saved = True
                    return True
                
                # Check for errors
                if 'failed' in line.lower() or 'error' in line.lower():
                    if not auth_successful:  # Only fail if auth hasn't succeeded
                        return False
            
            # If we got here, process ended
            self.process.wait(timeout=timeout)
            # Return true if auth was successful (even if token save message was missed)
            return auth_successful
            
        except subprocess.TimeoutExpired:
            self.process.kill()
            return False
    
    def get_token_filename(self) -> Optional[str]:
        """Извлекает имя файла токена из вывода"""
        print(f"[OAuth] Searching for token filename in {len(self.output_lines)} lines...")
        
        for line in reversed(self.output_lines):
            if 'Token saved to:' in line:
                # Extract full path or just filename
                # Format: "Token saved to: /path/to/token-xxx.json"
                print(f"[OAuth] Found 'Token saved to:' line: {line.strip()}")
                match = re.search(r'Token saved to:\s*(.+\.json)', line)
                if match:
                    filepath = match.group(1).strip()
                    filename = Path(filepath).name
                    print(f"[OAuth] Extracted token filename: {filename}")
                    return filename
            elif 'token-' in line and '.json' in line:
                match = re.search(r'(token-[^\s]+\.json)', line)
                if match:
                    print(f"[OAuth] Found token pattern in line: {match.group(1)}")
                    return match.group(1)
        
        print(f"[OAuth] WARNING: Token filename not found in output!")
        print(f"[OAuth] Last 5 lines: {self.output_lines[-5:] if len(self.output_lines) >= 5 else self.output_lines}")
        return None
    
    def close(self):
        """Завершает процесс"""
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=5)
            except Exception:
                self.process.kill()
