"""
Utility functions for the standalone app
"""

import sys
from pathlib import Path


def get_base_path() -> Path:
    """
    Get base path for resources.
    Works for both development and PyInstaller bundled executable.
    """
    if getattr(sys, 'frozen', False):
        # Running as bundled exe - _MEIPASS contains extracted files
        return Path(sys._MEIPASS)
    else:
        # Running in development - relative to this file
        return Path(__file__).parent


def get_static_dir() -> Path:
    """Get static files directory"""
    if getattr(sys, 'frozen', False):
        # Bundled: static files are in app/static (as specified in spec)
        return Path(sys._MEIPASS) / "app" / "static"
    else:
        # Development: relative to this file (app/utils.py -> app/static)
        return Path(__file__).parent / "static"


def is_bundled() -> bool:
    """Check if running as bundled executable"""
    return getattr(sys, 'frozen', False)
