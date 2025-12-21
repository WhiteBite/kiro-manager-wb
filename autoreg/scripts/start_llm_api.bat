@echo off
REM Start Kiro LLM API Server
REM OpenAI-compatible API using Kiro tokens

cd /d "%~dp0\.."

echo.
echo ========================================
echo   Kiro LLM API Server
echo ========================================
echo.

REM Check if httpx is installed
python -c "import httpx" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install httpx aiofiles
)

REM Start server
python -m api.run_llm_server

pause
