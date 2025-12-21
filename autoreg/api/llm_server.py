#!/usr/bin/env python3
"""
Kiro LLM API Server

OpenAI-compatible API server that uses Kiro tokens to access Claude via CodeWhisperer.
Supports token pool rotation, automatic refresh, and ban detection.

Usage:
    python -m autoreg.api.llm_server
    # or
    uvicorn autoreg.api.llm_server:app --host 0.0.0.0 --port 8421

Endpoints:
    GET  /v1/models              - List available models
    POST /v1/chat/completions    - Chat completions (streaming supported)
    GET  /health                 - Health check
    GET  /pool/status            - Token pool status
"""

import asyncio
import json
import os
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Optional, Dict, Any, List

from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.token_pool import TokenPool
from api.codewhisperer_client import CodeWhispererClient

# ============================================================================
# Configuration
# ============================================================================

API_PORT = int(os.environ.get("KIRO_LLM_PORT", 8421))
API_HOST = os.environ.get("KIRO_LLM_HOST", "0.0.0.0")
API_KEY = os.environ.get("KIRO_LLM_API_KEY", "")  # Optional API key protection

# ============================================================================
# Pydantic Models (OpenAI-compatible)
# ============================================================================

class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str = "claude-sonnet-4-20250514"
    messages: List[Message]
    stream: bool = False
    max_tokens: Optional[int] = 4096
    temperature: Optional[float] = 0.7
    top_p: Optional[float] = None
    stop: Optional[List[str]] = None

class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: str

class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: Usage

# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="Kiro LLM API",
    description="OpenAI-compatible API using Kiro/CodeWhisperer tokens",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
token_pool: Optional[TokenPool] = None
cw_client: Optional[CodeWhispererClient] = None

# ============================================================================
# Startup/Shutdown
# ============================================================================

@app.on_event("startup")
async def startup():
    global token_pool, cw_client
    
    print("=" * 60)
    print("Kiro LLM API Server Starting...")
    print("=" * 60)
    
    # Initialize token pool
    token_pool = TokenPool()
    await token_pool.load_tokens()
    
    # Initialize CodeWhisperer client
    cw_client = CodeWhispererClient(token_pool)
    
    print(f"\nServer ready at http://{API_HOST}:{API_PORT}")
    print(f"OpenAI-compatible endpoint: http://{API_HOST}:{API_PORT}/v1/chat/completions")
    print("=" * 60)

@app.on_event("shutdown")
async def shutdown():
    print("\nShutting down Kiro LLM API Server...")

# ============================================================================
# Auth Middleware
# ============================================================================

async def verify_api_key(authorization: Optional[str] = Header(None)):
    """Verify API key if configured."""
    if not API_KEY:
        return True
    
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    # Support both "Bearer <key>" and just "<key>"
    key = authorization.replace("Bearer ", "").strip()
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True

# ============================================================================
# Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Kiro LLM API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "models": "/v1/models",
            "chat": "/v1/chat/completions",
            "health": "/health",
            "pool": "/pool/status"
        }
    }

@app.get("/v1/models")
async def list_models():
    """List available models (OpenAI-compatible)."""
    models = [
        {"id": "claude-opus-4.5", "credit": "2.2x", "desc": "Most capable model"},
        {"id": "claude-sonnet-4.5", "credit": "1.3x", "desc": "Latest Sonnet"},
        {"id": "claude-sonnet-4", "credit": "1.3x", "desc": "Hybrid reasoning"},
        {"id": "claude-haiku-4.5", "credit": "0.4x", "desc": "Fast & cheap"},
        {"id": "auto", "credit": "1x", "desc": "Auto-select model"},
    ]
    
    return {
        "object": "list",
        "data": [
            {
                "id": m["id"],
                "object": "model",
                "created": int(time.time()),
                "owned_by": "anthropic",
                "permission": [],
                "root": m["id"],
                "parent": None,
                "description": f"{m['desc']} ({m['credit']} credit)"
            }
            for m in models
        ]
    }

@app.post("/v1/chat/completions")
async def chat_completions(
    request: ChatCompletionRequest,
    authorization: Optional[str] = Header(None)
):
    """OpenAI-compatible chat completions endpoint."""
    await verify_api_key(authorization)
    
    if not cw_client:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    if not token_pool or token_pool.available_count == 0:
        raise HTTPException(status_code=503, detail="No available tokens in pool")
    
    request_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
    created = int(time.time())
    
    if request.stream:
        return StreamingResponse(
            generate_stream(request, request_id, created),
            media_type="text/event-stream"
        )
    else:
        return await generate_response(request, request_id, created)

async def generate_stream(
    request: ChatCompletionRequest,
    request_id: str,
    created: int
) -> AsyncGenerator[str, None]:
    """Generate streaming response."""
    try:
        async for chunk in cw_client.generate_stream(
            messages=request.messages,
            model=request.model,
            max_tokens=request.max_tokens or 4096,
            temperature=request.temperature or 0.7
        ):
            data = {
                "id": request_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": request.model,
                "choices": [{
                    "index": 0,
                    "delta": {"content": chunk},
                    "finish_reason": None
                }]
            }
            yield f"data: {json.dumps(data)}\n\n"
        
        # Final chunk
        data = {
            "id": request_id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": request.model,
            "choices": [{
                "index": 0,
                "delta": {},
                "finish_reason": "stop"
            }]
        }
        yield f"data: {json.dumps(data)}\n\n"
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        error_data = {
            "error": {
                "message": str(e),
                "type": "server_error",
                "code": "internal_error"
            }
        }
        yield f"data: {json.dumps(error_data)}\n\n"

async def generate_response(
    request: ChatCompletionRequest,
    request_id: str,
    created: int
) -> ChatCompletionResponse:
    """Generate non-streaming response."""
    content = await cw_client.generate(
        messages=request.messages,
        model=request.model,
        max_tokens=request.max_tokens or 4096,
        temperature=request.temperature or 0.7
    )
    
    # Estimate tokens (rough approximation)
    prompt_tokens = sum(len(m.content.split()) * 1.3 for m in request.messages)
    completion_tokens = len(content.split()) * 1.3
    
    return ChatCompletionResponse(
        id=request_id,
        created=created,
        model=request.model,
        choices=[ChatCompletionChoice(
            index=0,
            message=Message(role="assistant", content=content),
            finish_reason="stop"
        )],
        usage=Usage(
            prompt_tokens=int(prompt_tokens),
            completion_tokens=int(completion_tokens),
            total_tokens=int(prompt_tokens + completion_tokens)
        )
    )

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "pool": {
            "total": token_pool.total_count if token_pool else 0,
            "available": token_pool.available_count if token_pool else 0,
            "banned": token_pool.banned_count if token_pool else 0
        }
    }

@app.get("/pool/status")
async def pool_status():
    """Get detailed token pool status."""
    if not token_pool:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    return token_pool.get_status()

@app.post("/pool/refresh")
async def pool_refresh():
    """Refresh all tokens in pool."""
    if not token_pool:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    refreshed = await token_pool.refresh_all()
    return {"refreshed": refreshed, "total": token_pool.total_count}

@app.post("/pool/reload")
async def pool_reload():
    """Reload tokens from disk."""
    if not token_pool:
        raise HTTPException(status_code=503, detail="Service not initialized")
    
    count = await token_pool.load_tokens()
    return {"loaded": count}

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)
