"""
Kiro Patch API - Manage Machine ID patching
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.kiro_patcher_service import KiroPatcherService
from services.machine_id_service import MachineIdService
from app.websocket import get_manager

router = APIRouter()
patcher = KiroPatcherService()
machine_id_service = MachineIdService()


class PatchStatus(BaseModel):
    isPatched: bool
    kiroVersion: Optional[str] = None
    patchVersion: Optional[str] = None
    currentMachineId: Optional[str] = None
    backupExists: bool = False
    backupPath: Optional[str] = None
    error: Optional[str] = None


class TelemetryStatus(BaseModel):
    machineId: Optional[str] = None
    sqmId: Optional[str] = None
    devDeviceId: Optional[str] = None
    serviceMachineId: Optional[str] = None
    kiroInstalled: bool = False


@router.get("/status", response_model=PatchStatus)
async def get_patch_status():
    """Get Kiro patch status"""
    status = patcher.get_status()
    
    return PatchStatus(
        isPatched=status.is_patched,
        kiroVersion=status.kiro_version,
        patchVersion=status.patch_version,
        currentMachineId=status.current_machine_id,
        backupExists=status.backup_exists,
        backupPath=status.backup_path,
        error=status.error
    )


@router.post("/apply")
async def apply_patch(force: bool = False):
    """Apply Kiro patch"""
    ws = get_manager()
    
    await ws.broadcast_log("🔧 Applying Kiro patch...", "info")
    
    result = patcher.patch(force=force, skip_running_check=True)
    
    if result.success:
        await ws.broadcast_log(f"✅ {result.message}", "success")
        await ws.broadcast_log(f"📁 Backup: {result.backup_path}", "info")
        return {
            "success": True,
            "message": result.message,
            "backupPath": result.backup_path,
            "patchedFile": result.patched_file
        }
    else:
        await ws.broadcast_log(f"❌ {result.message}", "error")
        raise HTTPException(status_code=400, detail=result.message)


@router.post("/remove")
async def remove_patch():
    """Remove Kiro patch (restore original)"""
    ws = get_manager()
    
    await ws.broadcast_log("🔧 Removing Kiro patch...", "info")
    
    result = patcher.unpatch(skip_running_check=True)
    
    if result.success:
        await ws.broadcast_log(f"✅ {result.message}", "success")
        return {"success": True, "message": result.message}
    else:
        await ws.broadcast_log(f"❌ {result.message}", "error")
        raise HTTPException(status_code=400, detail=result.message)


@router.post("/generate-id")
async def generate_machine_id():
    """Generate new custom Machine ID"""
    ws = get_manager()
    
    new_id = patcher.generate_machine_id()
    
    await ws.broadcast_log(f"🎲 New Machine ID: {new_id[:32]}...", "success")
    
    # Check if patch is applied
    status = patcher.get_status()
    if not status.is_patched:
        await ws.broadcast_log("⚠️ Kiro is not patched. Apply patch for ID to take effect.", "warning")
    
    return {
        "success": True,
        "machineId": new_id,
        "isPatched": status.is_patched
    }


@router.get("/telemetry", response_model=TelemetryStatus)
async def get_telemetry_status():
    """Get Kiro telemetry IDs status"""
    info = machine_id_service.get_telemetry_info()
    
    return TelemetryStatus(
        machineId=info.machine_id,
        sqmId=info.sqm_id,
        devDeviceId=info.dev_device_id,
        serviceMachineId=info.service_machine_id,
        kiroInstalled=info.kiro_installed
    )


@router.post("/reset-telemetry")
async def reset_telemetry():
    """Reset Kiro telemetry IDs"""
    ws = get_manager()
    
    await ws.broadcast_log("🔄 Resetting Kiro telemetry IDs...", "info")
    
    try:
        new_ids = machine_id_service.reset_telemetry(check_running=False)
        
        await ws.broadcast_log(f"✅ machineId: {new_ids.machine_id[:32]}...", "success")
        await ws.broadcast_log(f"✅ sqmId: {new_ids.sqm_id}", "success")
        await ws.broadcast_log("⚠️ Restart Kiro for changes to take effect", "warning")
        
        return {
            "success": True,
            "machineId": new_ids.machine_id,
            "sqmId": new_ids.sqm_id,
            "devDeviceId": new_ids.dev_device_id
        }
    except Exception as e:
        await ws.broadcast_log(f"❌ Error: {str(e)}", "error")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check")
async def check_patch():
    """Check if patch needs update (e.g., after Kiro update)"""
    needs_update, reason = patcher.check_update_needed()
    
    return {
        "needsUpdate": needs_update,
        "reason": reason
    }
