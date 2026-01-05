"""
WebSocket Connection Manager for real-time updates
Handles bidirectional communication with standalone web app
"""

from typing import List, Dict, Any, Optional
from fastapi import WebSocket
import json
import asyncio
from pathlib import Path


class ConnectionManager:
    """Manages WebSocket connections for broadcasting logs and status"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._loop: asyncio.AbstractEventLoop = None
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def send_personal(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def send_json(self, data: Dict[str, Any], websocket: WebSocket):
        """Send JSON message to specific client"""
        await websocket.send_text(json.dumps(data))
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        if not self.active_connections:
            return
        
        text = json.dumps(message)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(text)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected
        for conn in disconnected:
            self.disconnect(conn)
    
    async def broadcast_log(self, log: str, level: str = "info"):
        """Broadcast a log message"""
        await self.broadcast({
            "type": "appendLog",
            "log": log,
            "level": level
        })
    
    async def broadcast_status(self, status: Dict[str, Any]):
        """Broadcast status update"""
        await self.broadcast({
            "type": "status",
            **status
        })
    
    async def broadcast_progress(self, step: int, total: int, name: str, detail: str = ""):
        """Broadcast progress update"""
        await self.broadcast({
            "type": "progress",
            "step": step,
            "totalSteps": total,
            "stepName": name,
            "detail": detail
        })
    
    def sync_broadcast(self, message: Dict[str, Any]):
        """Synchronous broadcast (for use in non-async code)"""
        if not self.active_connections:
            return
        
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.broadcast(message))
            else:
                loop.run_until_complete(self.broadcast(message))
        except RuntimeError:
            # No event loop, skip
            pass
    
    def sync_log(self, log: str, level: str = "info"):
        """Synchronous log broadcast"""
        self.sync_broadcast({
            "type": "appendLog",
            "log": log,
            "level": level
        })


# Global instance
manager = ConnectionManager()


def get_manager() -> ConnectionManager:
    """Get the global WebSocket manager"""
    return manager


# === Profile Storage for Standalone ===

PROFILES_FILE = Path(__file__).parent / "profiles.json"


def load_profiles() -> Dict[str, Any]:
    """Load profiles from JSON file"""
    if PROFILES_FILE.exists():
        try:
            return json.loads(PROFILES_FILE.read_text(encoding='utf-8'))
        except Exception:
            pass
    return {"profiles": [], "activeProfileId": None}


def save_profiles(data: Dict[str, Any]):
    """Save profiles to JSON file"""
    PROFILES_FILE.write_text(json.dumps(data, indent=2), encoding='utf-8')


def get_active_profile() -> Optional[Dict[str, Any]]:
    """Get the currently active profile"""
    data = load_profiles()
    active_id = data.get("activeProfileId")
    if not active_id:
        return None
    for p in data.get("profiles", []):
        if p.get("id") == active_id:
            return p
    return None


# === Command Handler ===

async def handle_command(command: str, data: Dict[str, Any], websocket: WebSocket):
    """Handle incoming WebSocket commands from frontend"""
    ws = get_manager()
    
    try:
        if command == "ping":
            await ws.send_json({"type": "pong"}, websocket)
        
        elif command == "refresh":
            # Load and send accounts
            from services.token_service import TokenService
            token_service = TokenService()
            tokens = token_service.list_tokens()
            current = token_service.get_current_token()
            current_refresh = current.raw_data.get('refreshToken') if current else None
            
            accounts = []
            for token in tokens:
                is_active = (current_refresh and 
                            token.raw_data.get('refreshToken') == current_refresh)
                accounts.append({
                    "filename": token.path.name,
                    "isActive": is_active,
                    "isExpired": token.is_expired,
                    "needsRefresh": token.needs_refresh,
                    "tokenData": {
                        "accountName": token.account_name,
                        "email": token.email,
                        "expiresAt": token.expires_at.isoformat() if token.expires_at else None
                    },
                    "usage": {
                        "currentUsage": -1,
                        "usageLimit": 500,
                        "percentageUsed": 0
                    }
                })
            
            await ws.send_json({
                "type": "accountsLoaded",
                "accounts": accounts
            }, websocket)
        
        elif command == "switchAccount":
            email = data.get("email")
            if email:
                from services.token_service import TokenService
                token_service = TokenService()
                token = token_service.get_token(email)
                if token:
                    token_service.activate_token(token)
                    await ws.broadcast_log(f"✓ Switched to {token.account_name}")
                    await ws.broadcast({"type": "toast", "message": f"Switched to {token.account_name}", "toastType": "success"})
        
        elif command == "deleteAccount":
            email = data.get("email")
            if email:
                from services.token_service import TokenService
                token_service = TokenService()
                token_service.delete_token(email)
                await ws.broadcast_log(f"🗑 Deleted {email}")
        
        elif command == "refreshToken":
            email = data.get("email")
            if email:
                from services.token_service import TokenService
                token_service = TokenService()
                token = token_service.get_token(email)
                if token:
                    token_service.refresh_and_save(token)
                    await ws.broadcast_log(f"🔄 Refreshed {token.account_name}")
        
        elif command == "startAutoReg":
            # Get active profile
            profile = get_active_profile()
            if not profile:
                await ws.broadcast({"type": "toast", "message": "No profile configured", "toastType": "error"})
                return
            
            # Start autoreg via API
            from app.api.autoreg import start_autoreg, AutoRegConfig
            from fastapi import BackgroundTasks
            
            imap = profile.get("imap", {})
            strategy = profile.get("strategy", {})
            
            config = AutoRegConfig(
                headless=False,
                spoofing=True,
                imapServer=imap.get("server"),
                imapUser=imap.get("user"),
                imapPassword=imap.get("password"),
                emailStrategy=strategy.get("type", "single")
            )
            
            # Run in background
            import asyncio
            from app.api.autoreg import run_autoreg
            asyncio.create_task(run_autoreg(config))
            
            await ws.broadcast({"type": "updateStatus", "status": json.dumps({"step": 0, "totalSteps": 8, "stepName": "Starting..."})})
        
        elif command == "stopAutoReg":
            from app.api.autoreg import stop_autoreg
            await stop_autoreg()
        
        elif command == "loadProfiles":
            data = load_profiles()
            await ws.send_json({
                "type": "profilesLoaded",
                "profiles": data.get("profiles", []),
                "activeProfileId": data.get("activeProfileId")
            }, websocket)
        
        elif command == "getActiveProfile":
            profile = get_active_profile()
            await ws.send_json({
                "type": "activeProfileLoaded",
                "profile": profile
            }, websocket)
        
        elif command == "setActiveProfile":
            profile_id = data.get("profileId")
            profiles_data = load_profiles()
            profiles_data["activeProfileId"] = profile_id
            save_profiles(profiles_data)
            
            # Find and send the profile
            profile = None
            for p in profiles_data.get("profiles", []):
                if p.get("id") == profile_id:
                    profile = p
                    break
            
            await ws.broadcast({
                "type": "profilesLoaded",
                "profiles": profiles_data.get("profiles", []),
                "activeProfileId": profile_id
            })
            await ws.broadcast({
                "type": "activeProfileLoaded",
                "profile": profile
            })
            await ws.broadcast({"type": "toast", "message": "Profile selected", "toastType": "success"})
        
        elif command == "createProfile":
            profile = data.get("profile", {})
            import uuid
            profile["id"] = str(uuid.uuid4())
            profile["stats"] = {"registered": 0, "failed": 0}
            
            profiles_data = load_profiles()
            profiles_data["profiles"].append(profile)
            
            # Auto-select if first profile
            if len(profiles_data["profiles"]) == 1:
                profiles_data["activeProfileId"] = profile["id"]
            
            save_profiles(profiles_data)
            
            await ws.broadcast({
                "type": "profilesLoaded",
                "profiles": profiles_data.get("profiles", []),
                "activeProfileId": profiles_data.get("activeProfileId")
            })
            await ws.broadcast({"type": "toast", "message": "Profile created", "toastType": "success"})
        
        elif command == "updateProfile":
            profile = data.get("profile", {})
            profile_id = profile.get("id")
            
            profiles_data = load_profiles()
            for i, p in enumerate(profiles_data.get("profiles", [])):
                if p.get("id") == profile_id:
                    # Preserve stats
                    profile["stats"] = p.get("stats", {"registered": 0, "failed": 0})
                    profiles_data["profiles"][i] = profile
                    break
            
            save_profiles(profiles_data)
            
            await ws.broadcast({
                "type": "profilesLoaded",
                "profiles": profiles_data.get("profiles", []),
                "activeProfileId": profiles_data.get("activeProfileId")
            })
            await ws.broadcast({"type": "toast", "message": "Profile updated", "toastType": "success"})
        
        elif command == "deleteProfile":
            profile_id = data.get("profileId")
            
            profiles_data = load_profiles()
            profiles_data["profiles"] = [p for p in profiles_data.get("profiles", []) if p.get("id") != profile_id]
            
            # Clear active if deleted
            if profiles_data.get("activeProfileId") == profile_id:
                profiles_data["activeProfileId"] = None
            
            save_profiles(profiles_data)
            
            await ws.broadcast({
                "type": "profilesLoaded",
                "profiles": profiles_data.get("profiles", []),
                "activeProfileId": profiles_data.get("activeProfileId")
            })
            await ws.broadcast({"type": "toast", "message": "Profile deleted", "toastType": "success"})
        
        elif command == "getPatchStatus":
            # Check if Kiro is patched
            try:
                from services.kiro_service import KiroService
                kiro = KiroService()
                is_patched = kiro.is_patched()
                machine_id = kiro.get_machine_id()
                await ws.send_json({
                    "type": "patchStatus",
                    "isPatched": is_patched,
                    "currentMachineId": machine_id
                }, websocket)
            except Exception as e:
                await ws.send_json({
                    "type": "patchStatus",
                    "isPatched": False,
                    "error": str(e)
                }, websocket)
        
        elif command == "getProfile":
            profile_id = data.get("profileId")
            profiles_data = load_profiles()
            profile = None
            for p in profiles_data.get("profiles", []):
                if p.get("id") == profile_id:
                    profile = p
                    break
            await ws.send_json({
                "type": "profileLoaded",
                "profile": profile
            }, websocket)
        
        else:
            await ws.broadcast_log(f"Unknown command: {command}", "warning")
    
    except Exception as e:
        await ws.broadcast_log(f"Error handling {command}: {str(e)}", "error")
        import traceback
        traceback.print_exc()
