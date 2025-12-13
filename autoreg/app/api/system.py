"""
System API - Kiro status, paths, configuration
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import platform
import os

from services.kiro_service import KiroService
from core.kiro_config import get_kiro_info, get_kiro_version, get_machine_id
from core.paths import get_paths
from core.config import get_config

router = APIRouter()
kiro_service = KiroService()


class KiroStatus(BaseModel):
    installed: bool
    running: bool
    version: Optional[str] = None
    installPath: Optional[str] = None
    currentAccount: Optional[str] = None
    tokenValid: bool = False


class SystemInfo(BaseModel):
    platform: str
    osVersion: str
    kiroVersion: str
    machineId: str
    userAgent: str
    storagePath: Optional[str] = None
    tokensPath: str
    backupsPath: str


class PathsInfo(BaseModel):
    tokensDir: str
    backupsDir: str
    kiroStorage: Optional[str] = None
    kiroStateDb: Optional[str] = None
    customMachineIdFile: str


@router.get("/kiro/status", response_model=KiroStatus)
async def get_kiro_status():
    """Get Kiro IDE status"""
    status = kiro_service.get_status()
    
    return KiroStatus(
        installed=status.installed,
        running=status.running,
        version=status.version,
        installPath=str(status.install_path) if status.install_path else None,
        currentAccount=status.current_account,
        tokenValid=status.token_valid
    )


@router.post("/kiro/start")
async def start_kiro():
    """Start Kiro IDE"""
    try:
        kiro_service.start()
        return {"success": True, "message": "Kiro started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kiro/stop")
async def stop_kiro():
    """Stop Kiro IDE"""
    if kiro_service.stop():
        return {"success": True, "message": "Kiro stopped"}
    else:
        raise HTTPException(status_code=500, detail="Failed to stop Kiro")


@router.post("/kiro/restart")
async def restart_kiro():
    """Restart Kiro IDE"""
    try:
        kiro_service.restart()
        return {"success": True, "message": "Kiro restarted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/info", response_model=SystemInfo)
async def get_system_info():
    """Get system and Kiro configuration info"""
    paths = get_paths()
    kiro_info = get_kiro_info()
    
    return SystemInfo(
        platform=platform.system(),
        osVersion=platform.version(),
        kiroVersion=kiro_info['version'],
        machineId=kiro_info['machine_id'],
        userAgent=kiro_info['user_agent'],
        storagePath=kiro_info['storage_path'],
        tokensPath=str(paths.tokens_dir),
        backupsPath=str(paths.backups_dir)
    )


@router.get("/paths", response_model=PathsInfo)
async def get_paths_info():
    """Get all relevant paths"""
    paths = get_paths()
    from core.kiro_config import get_custom_machine_id_path
    
    return PathsInfo(
        tokensDir=str(paths.tokens_dir),
        backupsDir=str(paths.backups_dir),
        kiroStorage=str(paths.kiro_storage_json) if paths.kiro_storage_json else None,
        kiroStateDb=str(paths.kiro_state_db) if paths.kiro_state_db else None,
        customMachineIdFile=str(get_custom_machine_id_path())
    )


@router.get("/health")
async def health_check():
    """Health check with detailed status"""
    paths = get_paths()
    kiro_status = kiro_service.get_status()
    
    return {
        "status": "ok",
        "kiro": {
            "installed": kiro_status.installed,
            "running": kiro_status.running,
            "version": kiro_status.version
        },
        "paths": {
            "tokensExist": paths.tokens_dir.exists(),
            "backupsExist": paths.backups_dir.exists()
        }
    }


class ImapSettings(BaseModel):
    server: str
    user: str
    password: str
    domain: str
    hasDefaults: bool


@router.get("/imap-defaults", response_model=ImapSettings)
async def get_imap_defaults():
    """
    Get default IMAP settings from .env file.
    Used when user hasn't configured their own catch-all.
    """
    config = get_config()
    
    # Get from environment (loaded from .env)
    server = os.environ.get('IMAP_SERVER', config.imap.host)
    user = os.environ.get('IMAP_USER', config.imap.email)
    password = os.environ.get('IMAP_PASSWORD', config.imap.password)
    domain = os.environ.get('EMAIL_DOMAIN', config.registration.email_domain)
    
    has_defaults = bool(server and user and password and domain)
    
    return ImapSettings(
        server=server or '',
        user=user or '',
        password=password or '',
        domain=domain or '',
        hasDefaults=has_defaults
    )


class ImapSettingsUpdate(BaseModel):
    server: str
    user: str
    password: str
    domain: str


@router.post("/imap-settings")
async def save_imap_settings(settings: ImapSettingsUpdate):
    """
    Save IMAP settings to .env file.
    This allows web UI to persist settings.
    """
    from pathlib import Path
    
    # Get .env path
    autoreg_dir = Path(__file__).parent.parent.parent
    env_file = autoreg_dir / '.env'
    
    # Read existing .env or create new
    env_content = {}
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_content[key.strip()] = value.strip()
    
    # Update with new settings
    env_content['IMAP_SERVER'] = settings.server
    env_content['IMAP_USER'] = settings.user
    env_content['IMAP_PASSWORD'] = settings.password
    env_content['EMAIL_DOMAIN'] = settings.domain
    
    # Write back
    with open(env_file, 'w') as f:
        for key, value in env_content.items():
            f.write(f'{key}={value}\n')
    
    # Update environment variables for current session
    os.environ['IMAP_SERVER'] = settings.server
    os.environ['IMAP_USER'] = settings.user
    os.environ['IMAP_PASSWORD'] = settings.password
    os.environ['EMAIL_DOMAIN'] = settings.domain
    
    return {"success": True, "message": "Settings saved"}
