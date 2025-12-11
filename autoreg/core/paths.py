"""
Централизованное управление путями
Все пути в одном месте для удобства
"""

import os
import platform
from pathlib import Path
from typing import Optional


class Paths:
    """Singleton для управления всеми путями в системе"""
    
    _instance: Optional['Paths'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_paths()
        return cls._instance
    
    def _init_paths(self):
        """Инициализация всех путей"""
        self.os_type = platform.system().lower()
        self.home = Path.home()
        
        # =====================================================================
        # Project paths
        # =====================================================================
        self.autoreg_dir = Path(__file__).parent.parent
        self.project_dir = self.autoreg_dir.parent
        
        # =====================================================================
        # User data paths (~/.kiro-batch-login/)
        # =====================================================================
        self.user_data_dir = self.home / '.kiro-batch-login'
        self.tokens_dir = self.user_data_dir / 'tokens'
        self.backups_dir = self.user_data_dir / 'backups'
        self.logs_dir = self.user_data_dir / 'logs'
        self.cache_dir = self.user_data_dir / 'cache'
        
        # Files
        self.accounts_file = self.user_data_dir / 'accounts.json'
        self.settings_file = self.user_data_dir / 'settings.json'
        self.log_file = self.logs_dir / 'autoreg.log'
        
        # =====================================================================
        # AWS SSO cache (~/.aws/sso/cache/)
        # =====================================================================
        self.aws_dir = self.home / '.aws'
        self.aws_sso_cache = self.aws_dir / 'sso' / 'cache'
        self.kiro_token_file = self.aws_sso_cache / 'kiro-auth-token.json'
        
        # =====================================================================
        # Kiro IDE paths
        # =====================================================================
        if self.os_type == 'windows':
            appdata = os.environ.get('APPDATA', '')
            self.kiro_data_dir = Path(appdata) / 'Kiro' if appdata else None
        elif self.os_type == 'darwin':  # macOS
            self.kiro_data_dir = self.home / 'Library' / 'Application Support' / 'Kiro'
        else:  # Linux
            self.kiro_data_dir = self.home / '.config' / 'Kiro'
        
        if self.kiro_data_dir:
            self.kiro_user_dir = self.kiro_data_dir / 'User'
            self.kiro_global_storage = self.kiro_user_dir / 'globalStorage'
            self.kiro_storage_json = self.kiro_global_storage / 'storage.json'
            self.kiro_state_db = self.kiro_global_storage / 'state.vscdb'
            self.kiro_agent_storage = self.kiro_global_storage / 'kiro.kiroagent'
        else:
            self.kiro_user_dir = None
            self.kiro_global_storage = None
            self.kiro_storage_json = None
            self.kiro_state_db = None
            self.kiro_agent_storage = None
        
        # =====================================================================
        # Kiro settings (~/.kiro/)
        # =====================================================================
        self.kiro_settings_dir = self.home / '.kiro' / 'settings'
        self.kiro_mcp_config = self.kiro_settings_dir / 'mcp.json'
        
        # Ensure directories exist
        self._ensure_dirs()
    
    def _ensure_dirs(self):
        """Создаёт необходимые директории"""
        dirs_to_create = [
            self.user_data_dir,
            self.tokens_dir,
            self.backups_dir,
            self.logs_dir,
            self.cache_dir,
            self.aws_sso_cache,
        ]
        
        for dir_path in dirs_to_create:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    # =========================================================================
    # Helper methods
    # =========================================================================
    
    def is_kiro_installed(self) -> bool:
        """Проверяет установлен ли Kiro"""
        return self.kiro_data_dir is not None and self.kiro_data_dir.exists()
    
    def get_token_file(self, name: str) -> Path:
        """Возвращает путь к файлу токена"""
        if not name.endswith('.json'):
            name = f"token-{name}.json"
        return self.tokens_dir / name
    
    def get_backup_file(self, prefix: str, ext: str = 'json') -> Path:
        """Генерирует путь для нового бэкапа с timestamp"""
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return self.backups_dir / f"{prefix}-{timestamp}.{ext}"
    
    def get_client_registration_file(self, client_id_hash: str) -> Path:
        """Возвращает путь к файлу регистрации клиента"""
        return self.aws_sso_cache / f"{client_id_hash}.json"
    
    def list_tokens(self) -> list[Path]:
        """Возвращает список всех файлов токенов"""
        return list(self.tokens_dir.glob('token-*.json'))
    
    def list_backups(self, prefix: str = None) -> list[Path]:
        """Возвращает список бэкапов"""
        pattern = f"{prefix}-*.json" if prefix else "*.json"
        return sorted(self.backups_dir.glob(pattern), reverse=True)


# Singleton instance
_paths: Optional[Paths] = None


def get_paths() -> Paths:
    """Получить singleton instance Paths"""
    global _paths
    if _paths is None:
        _paths = Paths()
    return _paths
