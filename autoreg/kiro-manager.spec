# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Kiro Manager WB
Build: pyinstaller kiro-manager.spec
"""

import sys
import os
from pathlib import Path

block_cipher = None

# Paths
ROOT = Path(SPECPATH)
APP_DIR = ROOT / 'app'
STATIC_DIR = APP_DIR / 'static'

# Data files - включаем все необходимые файлы
datas = []

# Добавляем static файлы если есть
if STATIC_DIR.exists():
    datas.append((str(STATIC_DIR), 'app/static'))

# Добавляем .env.example
env_example = ROOT / '.env.example'
if env_example.exists():
    datas.append((str(env_example), '.'))

# Добавляем requirements.txt для справки
requirements = ROOT / 'requirements.txt'
if requirements.exists():
    datas.append((str(requirements), '.'))

# Hidden imports для всех модулей
hiddenimports = [
    # Uvicorn/FastAPI
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.http.httptools_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.websockets_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    
    # FastAPI/Starlette
    'fastapi',
    'fastapi.responses',
    'fastapi.routing',
    'starlette',
    'starlette.responses',
    'starlette.routing',
    'starlette.middleware',
    'starlette.middleware.cors',
    'starlette.staticfiles',
    'starlette.websockets',
    
    # Pydantic
    'pydantic',
    'pydantic_core',
    'pydantic.fields',
    
    # WebSockets
    'websockets',
    'websockets.legacy',
    'websockets.legacy.server',
    
    # HTTP
    'httptools',
    'h11',
    'anyio',
    'anyio._backends',
    'anyio._backends._asyncio',
    
    # Email/IMAP - КРИТИЧНО для работы с почтой
    'email',
    'email.mime',
    'email.mime.text',
    'email.mime.multipart',
    'email.header',
    'email.utils',
    'imaplib',
    'smtplib',
    'ssl',
    
    # DrissionPage и браузер автоматизация
    'DrissionPage',
    'DrissionPage.common',
    'DrissionPage.configs',
    'DrissionPage.errors',
    
    # Requests и HTTP клиенты
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
    
    # SOCKS proxy
    'socks',
    'sockshandler',
    
    # Async файлы
    'aiofiles',
    'aiofiles.os',
    'aiofiles.threadpool',
    
    # WebView для OAuth
    'webview',
    'webview.platforms',
    'webview.platforms.winforms',
    
    # Наши модули
    'version',
    'cli',
    'run',
    
    # App модули
    'app',
    'app.main',
    'app.utils',
    'app.websocket',
    'app.api',
    'app.api.accounts',
    'app.api.quota',
    'app.api.autoreg',
    'app.api.patch',
    'app.api.system',
    
    # Services
    'services',
    'services.token_service',
    'services.quota_service',
    'services.kiro_service',
    'services.machine_id_service',
    'services.kiro_patcher_service',
    'services.sso_import_service',
    
    # Core
    'core',
    'core.paths',
    'core.config',
    'core.kiro_config',
    'core.exceptions',
    'core.email_generator',
    
    # Registration
    'registration',
    'registration.register',
    'registration.browser',
    'registration.mail_handler',
    'registration.oauth_google',
    'registration.oauth_github',
    
    # Spoofers
    'spoofers',
    'spoofers.canvas_spoofer',
    'spoofers.webgl_spoofer',
    'spoofers.audio_spoofer',
    'spoofers.font_spoofer',
    'spoofers.navigator_spoofer',
    'spoofers.timing_spoofer',
    
    # Debugger
    'debugger',
    'debugger.collectors',
    'debugger.analyzers',
    'debugger.exporters',
]

a = Analysis(
    ['run.py'],
    pathex=[str(ROOT)],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # GUI библиотеки (не нужны для CLI)
        'tkinter',
        'PyQt5',
        'PyQt6',
        'PySide2',
        'PySide6',
        'wx',
        
        # Научные библиотеки (не используем)
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'sklearn',
        'tensorflow',
        'torch',
        
        # Изображения (не нужны)
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
    name='kiro-manager',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,  # Сжатие UPX для уменьшения размера
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # CLI приложение
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Можно добавить иконку позже
    version_file=None,  # Можно добавить версию позже
)
