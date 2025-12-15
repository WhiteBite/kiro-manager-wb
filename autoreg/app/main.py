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
from version import __version__, __app_name__

# WebSocket manager for real-time logs
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("\n" + "=" * 50)
    print(f"🚀 {__app_name__} v{__version__}")
    print("=" * 50)
    yield
    print("\n👋 Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=__app_name__,
    description="Manage Kiro accounts, quotas, and auto-registration",
    version=__version__,
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


@app.get("/")
async def root():
    """Serve main UI with no-cache headers"""
    from fastapi.responses import HTMLResponse
    index_file = get_static_dir() / "index.html"
    content = index_file.read_text(encoding='utf-8')
    return HTMLResponse(
        content=content,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time logs and status updates"""
    from app.websocket import handle_command
    import json
    
    await ws_manager.connect(websocket)
    try:
        while True:
            # Receive and handle commands from frontend
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                command = msg.get("command", "")
                await handle_command(command, msg, websocket)
            except json.JSONDecodeError:
                # Legacy ping support
                if data == "ping":
                    await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "version": __version__}


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
