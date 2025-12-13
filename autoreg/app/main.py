"""
Kiro Account Manager - Main Application
FastAPI server with WebSocket support for real-time updates
"""

import os
import sys
import webbrowser
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.api import accounts, quota, autoreg, patch, system
from app.websocket import ConnectionManager

# WebSocket manager for real-time logs
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("\n" + "=" * 50)
    print("🚀 Kiro Account Manager v1.0.0")
    print("=" * 50)
    yield
    print("\n👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Kiro Account Manager",
    description="Manage Kiro accounts, quotas, and auto-registration",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(accounts.router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(quota.router, prefix="/api/quota", tags=["Quota"])
app.include_router(autoreg.router, prefix="/api/autoreg", tags=["Auto-Registration"])
app.include_router(patch.router, prefix="/api/patch", tags=["Kiro Patch"])
app.include_router(system.router, prefix="/api/system", tags=["System"])

from app.utils import get_static_dir

# Static files
static_dir = get_static_dir()
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/", response_class=FileResponse)
async def root():
    """Serve main UI"""
    index_file = get_static_dir() / "index.html"
    return FileResponse(index_file)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time logs and status updates"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await websocket.receive_text()
            # Echo back or handle commands
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "1.0.0"}


def open_browser(port: int):
    """Open browser after short delay"""
    import time
    time.sleep(1.5)
    webbrowser.open(f"http://127.0.0.1:{port}")


def run(host: str = "127.0.0.1", port: int = 8420, open_browser_flag: bool = True):
    """Run the application"""
    if open_browser_flag:
        import threading
        threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    
    print(f"\n📡 Server: http://{host}:{port}")
    print("Press Ctrl+C to stop\n")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="warning",
        access_log=False
    )


if __name__ == "__main__":
    run()
