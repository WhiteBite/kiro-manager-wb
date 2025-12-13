"""
WebSocket Connection Manager for real-time updates
"""

from typing import List, Dict, Any
from fastapi import WebSocket
import json
import asyncio


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
            "type": "log",
            "message": log,
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
            "type": "log",
            "message": log,
            "level": level
        })


# Global instance
manager = ConnectionManager()


def get_manager() -> ConnectionManager:
    """Get the global WebSocket manager"""
    return manager
