# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Kiro CLI (patch commands)
Build: pyinstaller kiro-cli.spec
Output: dist/kiro-cli.exe
"""

import sys
import os
from pathlib import Path

block_cipher = None

# Paths
ROOT = Path(SPECPATH)

# Data files - minimal for CLI
datas = []

# Добавляем .env.example
env_example = ROOT / '.env.example'
if env_example.exists():
    datas.append((str(env_example), '.'))

# Hidden imports - только необходимые для CLI и patch команд
hiddenimports = [
    # Наши модули - CLI
    'version',
    'cli',
    'cli_registration',
    
    # Core - базовые модули
    'core',
    'core.paths',
    'core.config',
    'core.kiro_config',
    'core.exceptions',
    'core.cbor_utils',
    
    # Services - все сервисы для CLI команд
    'services',
    'services.token_service',
    'services.quota_service',
    'services.kiro_service',
    'services.machine_id_service',
    'services.kiro_patcher_service',
    'services.sso_import_service',
    'services.webportal_client',
    
    # HTTP клиенты для quota/token refresh
    'requests',
    'requests.adapters',
    'requests.auth',
    'requests.cookies',
    'requests.exceptions',
    'httpx',
    'httpx._client',
    'httpx._config',
    'httpx._exceptions',
    
    # CBOR для Web Portal API
    'cbor2',
    
    # Email/IMAP для token service
    'email',
    'email.mime',
    'email.mime.text',
    'email.mime.multipart',
    'email.header',
    'email.utils',
    'imaplib',
    'ssl',
    
    # JSON для --json output
    'json',
    
    # Pydantic для config
    'pydantic',
    'pydantic_core',
    'pydantic.fields',
    
    # Dotenv для config
    'dotenv',
    
    # Pathlib и os для file operations
    'pathlib',
    'os',
    'shutil',
    'hashlib',
    'uuid',
    're',
    
    # Datetime для timestamps
    'datetime',
    
    # Dataclasses для models
    'dataclasses',
    
    # Typing для type hints
    'typing',
    
    # Регистрация аккаунтов
    'registration',
    'registration.register',
    'registration.register_auto',
    'registration.auth_strategy',
    'registration.strategy_factory',
    'registration.strategies.webview_strategy',
    'registration.strategies.automated_strategy',
    'registration.oauth_pkce',
    'registration.oauth_device',
    'registration.webview_oauth',
    'spoofers.client_hints',
    'spoofers.cdp_spoofer',
    'DrissionPage',
    'DrissionPage.common',
    'DrissionPage.configs',
    'DrissionPage.errors',
    
    # Argparse для CLI
    'argparse',
    # Subprocess для Kiro process management
    'subprocess',
    'psutil',
    # Windows registry для machine ID
    'winreg',
]

a = Analysis(
    ['cli.py'],  # Entry point - CLI, не run.py!
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Web/API - не нужны для CLI
        'fastapi',
        'uvicorn',
        'starlette',
        'websockets',
        'httptools',
        'h11',
        'anyio',
        'aiofiles',
        
        # GUI библиотеки
        'tkinter',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
        'wx',
        'webview',
        
        # Browser automation - не нужно для patch
        'DrissionPage',
        'selenium',
        'playwright',
        
        # Научные библиотеки
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'sklearn',
        'tensorflow',
        'torch',
        
        # Изображения
        'PIL',
        'Pillow',
        'cv2',
        'opencv',
        
        # Jupyter
        'jupyter',
        'notebook',
        'ipython',
        
        # Тестирование
        'pytest',
        'unittest',
        'nose',
        
        # Документация
        'sphinx',
        'docutils',
        
        # Registration модули - не нужны для patch
        'registration',
        'registration.register',
        'registration.browser',
        'registration.mail_handler',
        'registration.oauth_google',
        'registration.oauth_github',
        
        # Spoofers - не нужны для patch
        'spoofers',
        
        # Debugger - не нужен для patch
        'debugger',
        
        # App (web) - не нужен для CLI
        'app',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='kiro-cli',  # Имя executable
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Сжатие UPX для уменьшения размера
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # CLI приложение - нужна консоль
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
    version_file=None,
)
