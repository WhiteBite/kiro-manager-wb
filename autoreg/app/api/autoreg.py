"""
Auto-Registration API - Start/stop registration, SSO import
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
import asyncio
import subprocess
import sys
import os
from pathlib import Path

from app.websocket import get_manager

router = APIRouter()

# Track running process
_autoreg_process: Optional[subprocess.Popen] = None


class AutoRegConfig(BaseModel):
    headless: bool = False
    spoofing: bool = True
    imapServer: Optional[str] = None
    imapUser: Optional[str] = None
    imapPassword: Optional[str] = None
    emailDomain: Optional[str] = None
    emailStrategy: str = "single"


class SsoImportRequest(BaseModel):
    token: str
    region: str = "us-east-1"
    activate: bool = False


class AutoRegStatus(BaseModel):
    running: bool
    step: Optional[int] = None
    totalSteps: Optional[int] = None
    stepName: Optional[str] = None
    detail: Optional[str] = None


@router.get("/status", response_model=AutoRegStatus)
async def get_status():
    """Get auto-registration status"""
    global _autoreg_process
    
    running = _autoreg_process is not None and _autoreg_process.poll() is None
    
    return AutoRegStatus(running=running)


@router.post("/start")
async def start_autoreg(config: AutoRegConfig, background_tasks: BackgroundTasks):
    """Start auto-registration process"""
    global _autoreg_process
    
    # Check if already running
    if _autoreg_process is not None and _autoreg_process.poll() is None:
        raise HTTPException(status_code=400, detail="Auto-registration already running")
    
    # Validate IMAP settings
    if not config.imapServer or not config.imapUser or not config.imapPassword:
        raise HTTPException(status_code=400, detail="IMAP settings required")
    
    # Start in background
    background_tasks.add_task(run_autoreg, config)
    
    return {"success": True, "message": "Auto-registration started"}


async def run_autoreg(config: AutoRegConfig):
    """Run auto-registration in background"""
    global _autoreg_process
    ws = get_manager()
    
    try:
        await ws.broadcast_log("🚀 Starting auto-registration...", "info")
        
        # Build environment
        env = os.environ.copy()
        env.update({
            'PYTHONUNBUFFERED': '1',
            'PYTHONIOENCODING': 'utf-8',
            'IMAP_SERVER': config.imapServer or '',
            'IMAP_USER': config.imapUser or '',
            'IMAP_PASSWORD': config.imapPassword or '',
            'EMAIL_DOMAIN': config.emailDomain or '',
            'EMAIL_STRATEGY': config.emailStrategy,
            'SPOOFING_ENABLED': '1' if config.spoofing else '0'
        })
        
        # Build command
        autoreg_dir = Path(__file__).parent.parent.parent
        args = [sys.executable, '-u', '-m', 'registration.register_auto']
        if config.headless:
            args.append('--headless')
        
        await ws.broadcast_log(f"📁 Working dir: {autoreg_dir}", "info")
        await ws.broadcast_log(f"⚙️ Strategy: {config.emailStrategy}", "info")
        await ws.broadcast_log(f"🔧 Headless: {config.headless}", "info")
        
        # Start process
        _autoreg_process = subprocess.Popen(
            args,
            cwd=str(autoreg_dir),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Read output in real-time
        while True:
            line = _autoreg_process.stdout.readline()
            if not line and _autoreg_process.poll() is not None:
                break
            
            if line:
                line = line.strip()
                await ws.broadcast_log(line, get_log_level(line))
                
                # Parse progress
                if line.startswith('PROGRESS:'):
                    try:
                        import json
                        progress = json.loads(line[9:])
                        await ws.broadcast_progress(
                            progress.get('step', 0),
                            progress.get('totalSteps', 8),
                            progress.get('stepName', ''),
                            progress.get('detail', '')
                        )
                    except Exception:
                        pass
        
        # Check exit code
        exit_code = _autoreg_process.returncode
        if exit_code == 0:
            await ws.broadcast_log("✅ Registration complete!", "success")
        else:
            stderr = _autoreg_process.stderr.read()
            if stderr:
                await ws.broadcast_log(f"❌ Error: {stderr}", "error")
            await ws.broadcast_log(f"❌ Process exited with code {exit_code}", "error")
        
    except Exception as e:
        await ws.broadcast_log(f"❌ Error: {str(e)}", "error")
    finally:
        _autoreg_process = None
        await ws.broadcast_status({"running": False})


def get_log_level(line: str) -> str:
    """Determine log level from line content"""
    if '✓' in line or 'SUCCESS' in line or '✅' in line or '[OK]' in line:
        return "success"
    if '✗' in line or 'ERROR' in line or '❌' in line or '[X]' in line:
        return "error"
    if '⚠' in line or 'WARN' in line:
        return "warning"
    return "info"


@router.post("/stop")
async def stop_autoreg():
    """Stop auto-registration process"""
    global _autoreg_process
    
    if _autoreg_process is None or _autoreg_process.poll() is not None:
        return {"success": True, "message": "Not running"}
    
    _autoreg_process.terminate()
    try:
        _autoreg_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        _autoreg_process.kill()
    
    _autoreg_process = None
    
    ws = get_manager()
    await ws.broadcast_log("⏹ Auto-registration stopped", "warning")
    
    return {"success": True, "message": "Stopped"}


@router.post("/sso-import")
async def sso_import(request: SsoImportRequest):
    """Import account from SSO cookie"""
    ws = get_manager()
    
    try:
        await ws.broadcast_log("🌐 Starting SSO import...", "info")
        
        from services.sso_import_service import SsoImportService
        service = SsoImportService()
        
        if request.activate:
            result = service.import_and_activate(request.token, request.region)
        else:
            result = service.import_and_save(request.token, request.region)
        
        if result.success:
            await ws.broadcast_log(f"✅ Imported: {result.email}", "success")
            return {
                "success": True,
                "email": result.email,
                "clientId": result.client_id[:30] + "..." if result.client_id else None
            }
        else:
            await ws.broadcast_log(f"❌ Import failed: {result.error}", "error")
            raise HTTPException(status_code=400, detail=result.error)
    
    except HTTPException:
        raise
    except Exception as e:
        await ws.broadcast_log(f"❌ Error: {str(e)}", "error")
        raise HTTPException(status_code=500, detail=str(e))
