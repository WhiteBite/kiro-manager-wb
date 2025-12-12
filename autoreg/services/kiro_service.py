"""
Kiro Service - интеграция с Kiro IDE
"""

import json
import subprocess
import platform
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

import sys
from pathlib import Path as SysPath
sys.path.insert(0, str(SysPath(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config
from core.exceptions import KiroError, KiroNotInstalledError


@dataclass
class KiroStatus:
    """Статус Kiro IDE"""
    installed: bool = False
    running: bool = False
    data_dir: Optional[Path] = None
    version: Optional[str] = None
    current_account: Optional[str] = None
    token_valid: bool = False


class KiroService:
    """Сервис для работы с Kiro IDE"""
    
    def __init__(self):
        self.paths = get_paths()
        self.config = get_config()
        self.os_type = platform.system().lower()
    
    def get_status(self) -> KiroStatus:
        """Получить статус Kiro IDE"""
        status = KiroStatus(
            installed=self.paths.is_kiro_installed(),
            data_dir=self.paths.kiro_data_dir
        )
        
        if status.installed:
            status.running = self._is_running()
            status.version = self._get_version()
            
            # Текущий аккаунт
            if self.paths.kiro_token_file.exists():
                try:
                    data = json.loads(self.paths.kiro_token_file.read_text())
                    status.current_account = data.get('provider', 'Unknown')
                    
                    # Проверяем валидность токена
                    from datetime import datetime
                    expires_at = data.get('expiresAt')
                    if expires_at:
                        exp = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                        status.token_valid = exp > datetime.now(exp.tzinfo)
                except:
                    pass
        
        return status
    
    def start(self) -> bool:
        """Запустить Kiro IDE"""
        if not self.paths.is_kiro_installed():
            raise KiroNotInstalledError("Kiro is not installed")
        
        try:
            if self.os_type == 'windows':
                # Ищем Kiro.exe
                possible_paths = [
                    Path.home() / 'AppData' / 'Local' / 'Programs' / 'Kiro' / 'Kiro.exe',
                    Path('C:/Program Files/Kiro/Kiro.exe'),
                    Path('C:/Program Files (x86)/Kiro/Kiro.exe'),
                ]
                
                for kiro_path in possible_paths:
                    if kiro_path.exists():
                        subprocess.Popen([str(kiro_path)], shell=True)
                        return True
                
                # Пробуем через PATH
                subprocess.Popen(['kiro'], shell=True)
                return True
            else:
                subprocess.Popen(['kiro'])
                return True
        except Exception as e:
            raise KiroError(f"Failed to start Kiro: {e}")
    
    def stop(self) -> bool:
        """Остановить Kiro IDE"""
        try:
            if self.os_type == 'windows':
                subprocess.run(['taskkill', '/F', '/IM', 'Kiro.exe'], 
                             capture_output=True)
            else:
                subprocess.run(['pkill', '-f', 'Kiro'], capture_output=True)
            return True
        except Exception:
            return False
    
    def restart(self) -> bool:
        """Перезапустить Kiro IDE"""
        was_running = self._is_running()
        
        if was_running:
            self.stop()
            import time
            time.sleep(1)
        
        return self.start()
    
    def _is_running(self) -> bool:
        """Проверяет запущен ли Kiro"""
        try:
            if self.os_type == 'windows':
                result = subprocess.run(
                    ['tasklist', '/FI', 'IMAGENAME eq Kiro.exe'],
                    capture_output=True, text=True
                )
                return 'Kiro.exe' in result.stdout
            else:
                result = subprocess.run(
                    ['pgrep', '-f', 'Kiro'],
                    capture_output=True
                )
                return result.returncode == 0
        except:
            return False
    
    def _get_version(self) -> Optional[str]:
        """Получить версию Kiro"""
        # Пробуем прочитать из package.json
        if self.paths.kiro_data_dir:
            package_json = self.paths.kiro_data_dir.parent / 'package.json'
            if package_json.exists():
                try:
                    data = json.loads(package_json.read_text())
                    return data.get('version')
                except:
                    pass
        return None
    
    # =========================================================================
    # MCP Configuration
    # =========================================================================
    
    def get_mcp_config(self) -> Dict[str, Any]:
        """Получить MCP конфигурацию"""
        if not self.paths.kiro_mcp_config.exists():
            return {'mcpServers': {}}
        
        try:
            return json.loads(self.paths.kiro_mcp_config.read_text())
        except:
            return {'mcpServers': {}}
    
    def save_mcp_config(self, config: Dict[str, Any]):
        """Сохранить MCP конфигурацию"""
        self.paths.kiro_mcp_config.parent.mkdir(parents=True, exist_ok=True)
        self.paths.kiro_mcp_config.write_text(json.dumps(config, indent=2))
    
    def add_mcp_server(self, name: str, server_config: Dict[str, Any]):
        """Добавить MCP сервер"""
        config = self.get_mcp_config()
        config.setdefault('mcpServers', {})[name] = server_config
        self.save_mcp_config(config)
    
    def remove_mcp_server(self, name: str) -> bool:
        """Удалить MCP сервер"""
        config = self.get_mcp_config()
        if name in config.get('mcpServers', {}):
            del config['mcpServers'][name]
            self.save_mcp_config(config)
            return True
        return False
    
    def toggle_mcp_server(self, name: str, enabled: bool):
        """Включить/выключить MCP сервер"""
        config = self.get_mcp_config()
        if name in config.get('mcpServers', {}):
            config['mcpServers'][name]['disabled'] = not enabled
            self.save_mcp_config(config)
    
    # =========================================================================
    # Helpers
    # =========================================================================
    
    def print_status(self):
        """Вывести статус Kiro"""
        status = self.get_status()
        
        print(f"\n{'='*50}")
        print("[C]  Kiro IDE Status")
        print(f"{'='*50}")
        
        print(f"\n[P] Installed: {'[OK]' if status.installed else '[X]'}")
        
        if status.installed:
            print(f"[R] Running: {'[OK]' if status.running else '[X]'}")
            if status.version:
                print(f"[V] Version: {status.version}")
            print(f"📁 Data dir: {status.data_dir}")
            
            if status.current_account:
                token_status = '[OK] valid' if status.token_valid else '[X] expired'
                print(f"\n[K] Current account: {status.current_account}")
                print(f"   Token: {token_status}")
        
        print(f"\n{'='*50}")
