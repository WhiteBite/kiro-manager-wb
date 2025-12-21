@echo off
echo Starting Kiro with proxy...
echo.
echo Make sure mitmproxy is running:
echo   mitmdump -s scripts/kiro-proxy-debug.py -p 8080
echo.

set HTTP_PROXY=http://127.0.0.1:8080
set HTTPS_PROXY=http://127.0.0.1:8080
set NODE_TLS_REJECT_UNAUTHORIZED=0

"%LOCALAPPDATA%\Programs\Kiro\Kiro.exe" --proxy-server=http://127.0.0.1:8080 --ignore-certificate-errors %*
