# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for Kiro Account Manager
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

# Data files - use OS-appropriate separator
# Windows uses ';', Unix uses ':'
sep = ';' if sys.platform == 'win32' else ':'
datas = [
    (str(STATIC_DIR), 'app/static'),
]

# Hidden imports for FastAPI/Uvicorn
hiddenimports = [
    # Uvicorn
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
    
    # Email/IMAP
    'email',
    'imaplib',
    
    # Our modules
    'version',
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
    'services',
    'services.token_service',
    'services.quota_service',
    'services.kiro_service',
    'services.machine_id_service',
    'services.kiro_patcher_service',
    'services.sso_import_service',
    'core',
    'core.paths',
    'core.config',
    'core.kiro_config',
    'core.exceptions',
    'core.email_generator',
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
        'tkinter',
        'matplotlib',
        'numpy',
        'pandas',
        'PIL',
        'cv2',
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
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Show console for logs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,  # Add icon path here if needed
)
