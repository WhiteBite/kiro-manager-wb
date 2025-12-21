#!/usr/bin/env python3
"""
Run Kiro LLM API Server

Usage:
    python -m autoreg.api.run_llm_server
    python autoreg/api/run_llm_server.py
    
Environment variables:
    KIRO_LLM_PORT - Server port (default: 8421)
    KIRO_LLM_HOST - Server host (default: 0.0.0.0)
    KIRO_LLM_API_KEY - Optional API key for authentication
"""

import os
import sys
from pathlib import Path

# Add parent directories to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent))

def main():
    import uvicorn
    from autoreg.api.llm_server import app
    
    port = int(os.environ.get("KIRO_LLM_PORT", 8421))
    host = os.environ.get("KIRO_LLM_HOST", "0.0.0.0")
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    Kiro LLM API Server                       ║
╠══════════════════════════════════════════════════════════════╣
║  OpenAI-compatible API using Kiro tokens                     ║
║                                                              ║
║  Endpoints:                                                  ║
║    GET  /v1/models           - List models                   ║
║    POST /v1/chat/completions - Chat (streaming supported)    ║
║    GET  /health              - Health check                  ║
║    GET  /pool/status         - Token pool status             ║
║                                                              ║
║  Usage with OpenAI client:                                   ║
║    client = OpenAI(                                          ║
║        base_url="http://localhost:{port}/v1",                 ║
║        api_key="any"                                         ║
║    )                                                         ║
╚══════════════════════════════════════════════════════════════╝
""".format(port=port))
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )

if __name__ == "__main__":
    main()
