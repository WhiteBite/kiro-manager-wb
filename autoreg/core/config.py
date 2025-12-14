"""
Централизованная конфигурация
"""

import json
import os
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field, asdict
from dotenv import load_dotenv

# Load .env from autoreg directory (without override - VS Code extension env vars take priority)
_autoreg_dir = Path(__file__).parent.parent
_env_file = _autoreg_dir / '.env'
if _env_file.exists():
    load_dotenv(_env_file, override=False)
else:
    load_dotenv(override=False)  # Fallback to current directory


@dataclass
class BrowserConfig:
    """Настройки браузера"""
    headless: bool = False
    incognito: bool = True
    slow_mo: int = 0
    devtools: bool = False
    screenshots_on_error: bool = True


@dataclass
class RegistrationConfig:
    """Настройки регистрации"""
    email_domain: str = ''
    email_prefix: str = 'kiro_auto'
    default_name: str = 'Kiro User'
    auto_inject_to_kiro: bool = True


@dataclass
class TimeoutsConfig:
    """Таймауты (оптимизированы для скорости)"""
    page_load: int = 2  # Уменьшено с 3
    element_wait: int = 1  # Уменьшено с 2
    verification_code: int = 60  # Уменьшено с 90
    oauth_callback: int = 20  # Уменьшено с 30
    between_accounts: int = 1  # Уменьшено с 2
    imap_poll_interval: int = 1  # Уменьшено с 2
    api_request: int = 20  # Уменьшено с 30
    # Новые таймауты для умных ожиданий
    element_poll_interval: float = 0.1  # Интервал проверки элементов
    page_transition: int = 3  # Ожидание перехода между страницами


@dataclass
class ImapConfig:
    """Настройки IMAP"""
    host: str = 'imap.yandex.ru'
    port: int = 993
    use_ssl: bool = True
    email: str = ''
    password: str = ''


@dataclass
class QuotaConfig:
    """Настройки мониторинга квот"""
    auto_refresh_tokens: bool = True
    refresh_interval_minutes: int = 30
    warn_threshold_percent: int = 80
    critical_threshold_percent: int = 95


@dataclass
class MachineIdConfig:
    """Настройки Machine ID"""
    auto_reset_on_switch: bool = False
    backup_before_reset: bool = True


@dataclass
class DebugConfig:
    """Настройки отладки"""
    verbose: bool = False
    save_html_on_error: bool = False
    pause_on_error: bool = False
    log_api_responses: bool = False


@dataclass
class Config:
    """Главный конфиг"""
    browser: BrowserConfig = field(default_factory=BrowserConfig)
    registration: RegistrationConfig = field(default_factory=RegistrationConfig)
    timeouts: TimeoutsConfig = field(default_factory=TimeoutsConfig)
    imap: ImapConfig = field(default_factory=ImapConfig)
    quota: QuotaConfig = field(default_factory=QuotaConfig)
    machine_id: MachineIdConfig = field(default_factory=MachineIdConfig)
    debug: DebugConfig = field(default_factory=DebugConfig)
    
    def to_dict(self) -> dict:
        """Конвертирует в словарь"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Config':
        """Создаёт из словаря"""
        return cls(
            browser=BrowserConfig(**data.get('browser', {})),
            registration=RegistrationConfig(**data.get('registration', {})),
            timeouts=TimeoutsConfig(**data.get('timeouts', {})),
            imap=ImapConfig(**data.get('imap', {})),
            quota=QuotaConfig(**data.get('quota', {})),
            machine_id=MachineIdConfig(**data.get('machine_id', {})),
            debug=DebugConfig(**data.get('debug', {}))
        )
    
    def save(self, path: Path):
        """Сохраняет конфиг в файл"""
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False))
    
    @classmethod
    def load(cls, path: Path) -> 'Config':
        """Загружает конфиг из файла"""
        if not path.exists():
            return cls()
        
        try:
            data = json.loads(path.read_text())
            return cls.from_dict(data)
        except Exception:
            return cls()
    
    def get(self, path: str, default: Any = None) -> Any:
        """
        Получает значение по пути (dot notation)
        Пример: config.get('browser.headless')
        """
        keys = path.split('.')
        value = self.to_dict()
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    def set(self, path: str, value: Any):
        """
        Устанавливает значение по пути (dot notation)
        Пример: config.set('browser.headless', True)
        """
        keys = path.split('.')
        
        # Получаем нужный объект
        obj = self
        for key in keys[:-1]:
            obj = getattr(obj, key)
        
        setattr(obj, keys[-1], value)


# ============================================================================
# Singleton
# ============================================================================

_config: Optional[Config] = None
_config_path: Optional[Path] = None


def get_config() -> Config:
    """Получить singleton instance Config"""
    global _config, _config_path
    
    if _config is None:
        from .paths import get_paths
        paths = get_paths()
        _config_path = paths.settings_file
        _config = Config.load(_config_path)
        
        # Загружаем IMAP из env
        _config.imap.email = os.getenv('IMAP_USER', os.getenv('IMAP_EMAIL', ''))
        _config.imap.password = os.getenv('IMAP_PASSWORD', '')
        _config.imap.host = os.getenv('IMAP_SERVER', os.getenv('IMAP_HOST', 'imap.yandex.ru'))
    
    return _config


def save_config():
    """Сохранить текущий конфиг"""
    global _config, _config_path
    if _config and _config_path:
        _config.save(_config_path)


def reset_config():
    """Сбросить конфиг к дефолтным значениям"""
    global _config, _config_path
    _config = Config()
    if _config_path:
        _config.save(_config_path)
