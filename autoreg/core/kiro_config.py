"""
Kiro Config - динамическое чтение конфигурации из установленного Kiro IDE

Читает актуальную версию, пути и другие параметры напрямую из Kiro IDE,
чтобы не хардкодить значения которые могут измениться.
"""

import os
import json
import hashlib
import platform
from pathlib import Path
from typing import Optional, Dict, Any
from functools import lru_cache


# Fallback значения если Kiro не установлен
FALLBACK_VERSION = "0.7.45"
FALLBACK_MACHINE_ID = None


def get_kiro_install_path() -> Optional[Path]:
    """
    Находит путь установки Kiro IDE.
    
    Windows: %LOCALAPPDATA%/Programs/kiro
    macOS: /Applications/Kiro.app
    Linux: /usr/share/kiro или ~/.local/share/kiro
    """
    system = platform.system()
    
    if system == 'Windows':
        paths = [
            Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'kiro',
            Path(os.environ.get('PROGRAMFILES', '')) / 'Kiro',
        ]
    elif system == 'Darwin':
        paths = [
            Path('/Applications/Kiro.app/Contents/Resources/app'),
            Path.home() / 'Applications' / 'Kiro.app' / 'Contents' / 'Resources' / 'app',
        ]
    else:  # Linux
        paths = [
            Path('/usr/share/kiro'),
            Path('/opt/kiro'),
            Path.home() / '.local' / 'share' / 'kiro',
        ]
    
    for path in paths:
        if path.exists():
            return path
    
    return None


@lru_cache(maxsize=1)
def get_kiro_version() -> str:
    """
    Читает актуальную версию Kiro IDE из package.json.
    Кэшируется для производительности.
    """
    kiro_path = get_kiro_install_path()
    
    if not kiro_path:
        return FALLBACK_VERSION
    
    # Ищем package.json
    package_paths = [
        kiro_path / 'resources' / 'app' / 'package.json',  # Windows
        kiro_path / 'package.json',  # macOS/Linux
    ]
    
    for pkg_path in package_paths:
        if pkg_path.exists():
            try:
                data = json.loads(pkg_path.read_text(encoding='utf-8'))
                version = data.get('version')
                if version:
                    return version
            except (json.JSONDecodeError, IOError):
                pass
    
    return FALLBACK_VERSION


def get_custom_machine_id_path() -> Path:
    """Путь к файлу с кастомным Machine ID (создаётся патчером)"""
    return Path.home() / '.kiro-batch-login' / 'machine-id.txt'


def get_machine_id(use_custom: bool = True) -> str:
    """
    Получает Machine ID.
    
    Приоритет:
    1. Кастомный ID из ~/.kiro-batch-login/machine-id.txt (если use_custom=True)
    2. Системный ID (как node-machine-id):
       - Windows: SHA256 от MachineGuid из реестра
       - Linux: SHA256 от /etc/machine-id
       - macOS: SHA256 от IOPlatformUUID
    
    Args:
        use_custom: Использовать кастомный ID если есть (по умолчанию True)
    """
    # Сначала проверяем кастомный ID (от патчера)
    if use_custom:
        custom_path = get_custom_machine_id_path()
        if custom_path.exists():
            try:
                custom_id = custom_path.read_text().strip()
                # Валидация: должен быть 64-символьный hex
                if custom_id and len(custom_id) == 64 and all(c in '0123456789abcdef' for c in custom_id.lower()):
                    return custom_id.lower()
            except Exception:
                pass
    
    # Fallback на системный ID
    return _get_system_machine_id()


@lru_cache(maxsize=1)
def _get_system_machine_id() -> str:
    """
    Получает системный Machine ID (как node-machine-id).
    Кэшируется для производительности.
    """
    try:
        system = platform.system()
        
        if system == 'Windows':
            import winreg
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Cryptography",
                0, winreg.KEY_READ
            )
            value, _ = winreg.QueryValueEx(key, "MachineGuid")
            winreg.CloseKey(key)
            return hashlib.sha256(value.encode()).hexdigest()
        
        elif system == 'Linux':
            for path in ['/etc/machine-id', '/var/lib/dbus/machine-id']:
                if Path(path).exists():
                    machine_id = Path(path).read_text().strip()
                    return hashlib.sha256(machine_id.encode()).hexdigest()
        
        elif system == 'Darwin':
            # macOS - используем IOPlatformUUID
            import subprocess
            result = subprocess.run(
                ['ioreg', '-rd1', '-c', 'IOPlatformExpertDevice'],
                capture_output=True, text=True
            )
            for line in result.stdout.split('\n'):
                if 'IOPlatformUUID' in line:
                    uuid = line.split('"')[-2]
                    return hashlib.sha256(uuid.encode()).hexdigest()
    
    except Exception:
        pass
    
    # Fallback: hostname-based ID
    hostname = platform.node()
    return hashlib.sha256(hostname.encode()).hexdigest()


def get_kiro_user_agent() -> str:
    """
    Формирует User-Agent точно как Kiro IDE.
    Формат: KiroIDE-{version}-{machineId}
    """
    version = get_kiro_version()
    machine_id = get_machine_id()
    return f"KiroIDE-{version}-{machine_id}"


def get_kiro_scopes() -> list:
    """
    Возвращает scopes для Kiro/CodeWhisperer.
    Эти scopes стабильны и вряд ли изменятся.
    """
    return [
        "codewhisperer:completions",
        "codewhisperer:analysis",
        "codewhisperer:conversations",
        "codewhisperer:taskassist",
        "codewhisperer:transformations"
    ]


def get_client_id_hash(start_url: str = "https://view.awsapps.com/start") -> str:
    """
    Вычисляет clientIdHash как Kiro IDE.
    SHA1 от JSON.stringify({startUrl})
    """
    hash_input = json.dumps({"startUrl": start_url}, separators=(',', ':'))
    return hashlib.sha1(hash_input.encode('utf-8')).hexdigest()


@lru_cache(maxsize=1)
def get_kiro_storage_path() -> Optional[Path]:
    """
    Возвращает путь к Kiro storage (где хранятся настройки и токены).
    """
    system = platform.system()
    
    if system == 'Windows':
        base = Path(os.environ.get('APPDATA', '')) / 'Kiro'
    elif system == 'Darwin':
        base = Path.home() / 'Library' / 'Application Support' / 'Kiro'
    else:
        base = Path.home() / '.config' / 'Kiro'
    
    if base.exists():
        return base
    
    return None


def get_kiro_info() -> Dict[str, Any]:
    """
    Возвращает полную информацию о Kiro IDE.
    Полезно для отладки.
    """
    return {
        'install_path': str(get_kiro_install_path() or 'Not found'),
        'version': get_kiro_version(),
        'machine_id': get_machine_id(),
        'user_agent': get_kiro_user_agent(),
        'storage_path': str(get_kiro_storage_path() or 'Not found'),
        'scopes': get_kiro_scopes(),
    }


# Для удобства импорта
__all__ = [
    'get_kiro_version',
    'get_machine_id',
    'get_custom_machine_id_path',
    '_get_system_machine_id',
    'get_kiro_user_agent',
    'get_kiro_scopes',
    'get_client_id_hash',
    'get_kiro_install_path',
    'get_kiro_storage_path',
    'get_kiro_info',
]


if __name__ == '__main__':
    # Тест
    print("Kiro IDE Configuration:")
    print("-" * 40)
    info = get_kiro_info()
    for key, value in info.items():
        print(f"  {key}: {value}")
