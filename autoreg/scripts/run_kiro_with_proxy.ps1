# Kiro Traffic Logger - DEV TOOL для анализа трафика
# 
# Это инструмент для РАЗРАБОТЧИКОВ для анализа трафика Kiro.
# Для обычного использования применяйте патч через расширение!
#
# Использование:
#   .\run_kiro_with_proxy.ps1
#
# Требования:
#   - mitmproxy установлен (pip install mitmproxy)
#   - Сертификат mitmproxy установлен (.\install_mitmproxy_cert.ps1)
#
# Логи сохраняются в: ~/.kiro-extension/proxy_logs/

$ErrorActionPreference = "Stop"

$PROXY_PORT = 8080
$PROXY_SCRIPT = "$PSScriptRoot\..\services\kiro_proxy.py"
$KIRO_PATH = "$env:LOCALAPPDATA\Programs\Kiro\Kiro.exe"

# Проверяем что Kiro существует
if (-not (Test-Path $KIRO_PATH)) {
    Write-Host "[!] Kiro not found at: $KIRO_PATH" -ForegroundColor Red
    Write-Host "    Trying alternative paths..."
    
    $alternatives = @(
        "$env:LOCALAPPDATA\Programs\kiro\Kiro.exe",
        "$env:PROGRAMFILES\Kiro\Kiro.exe",
        "C:\Users\$env:USERNAME\AppData\Local\Programs\Kiro\Kiro.exe"
    )
    
    foreach ($alt in $alternatives) {
        if (Test-Path $alt) {
            $KIRO_PATH = $alt
            Write-Host "[OK] Found Kiro at: $KIRO_PATH" -ForegroundColor Green
            break
        }
    }
    
    if (-not (Test-Path $KIRO_PATH)) {
        Write-Host "[!] Kiro not found! Please install Kiro or update path." -ForegroundColor Red
        exit 1
    }
}

Write-Host "=== Kiro Proxy Launcher ===" -ForegroundColor Cyan
Write-Host ""

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  KIRO TRAFFIC LOGGER (DEV TOOL)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "This is a DEVELOPMENT tool for analyzing Kiro traffic." -ForegroundColor Cyan
Write-Host "For normal use, apply the patch via the extension!" -ForegroundColor Cyan
Write-Host ""

# Проверяем что mitmproxy установлен
try {
    $null = Get-Command mitmdump -ErrorAction Stop
    Write-Host "[OK] mitmproxy found" -ForegroundColor Green
} catch {
    Write-Host "[!] mitmproxy not found. Install with: pip install mitmproxy" -ForegroundColor Red
    exit 1
}

# Проверяем сертификат mitmproxy
$certPath = "$env:USERPROFILE\.mitmproxy\mitmproxy-ca-cert.cer"
if (-not (Test-Path $certPath)) {
    Write-Host "[!] mitmproxy certificate not found." -ForegroundColor Yellow
    Write-Host "    Run 'mitmdump' once to generate certificates, then install:" -ForegroundColor Yellow
    Write-Host "    certutil -addstore -user Root $certPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    Or run mitmproxy and visit http://mitm.it to download cert" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "[1] Starting mitmproxy on port $PROXY_PORT..." -ForegroundColor Cyan

# Запускаем mitmproxy в новом окне
$proxyProcess = Start-Process -FilePath "mitmdump" `
    -ArgumentList "-s", $PROXY_SCRIPT, "-p", $PROXY_PORT, "--set", "ssl_insecure=true" `
    -PassThru -WindowStyle Normal

Write-Host "    PID: $($proxyProcess.Id)" -ForegroundColor Gray
Start-Sleep -Seconds 2

# Проверяем что прокси запустился
try {
    $null = Test-NetConnection -ComputerName localhost -Port $PROXY_PORT -WarningAction SilentlyContinue
    Write-Host "[OK] Proxy is running" -ForegroundColor Green
} catch {
    Write-Host "[!] Proxy failed to start" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2] Starting Kiro with proxy..." -ForegroundColor Cyan

# Устанавливаем переменные окружения для прокси
$env:HTTP_PROXY = "http://127.0.0.1:$PROXY_PORT"
$env:HTTPS_PROXY = "http://127.0.0.1:$PROXY_PORT"
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"  # Отключаем проверку SSL для Node.js

Write-Host "    HTTP_PROXY=$env:HTTP_PROXY" -ForegroundColor Gray
Write-Host "    HTTPS_PROXY=$env:HTTPS_PROXY" -ForegroundColor Gray

# Запускаем Kiro с явным указанием прокси (Electron игнорирует env переменные!)
$kiroArgs = @(
    "--proxy-server=http://127.0.0.1:$PROXY_PORT",
    "--ignore-certificate-errors"
)

Write-Host "    Kiro args: $($kiroArgs -join ' ')" -ForegroundColor Gray

$kiroProcess = Start-Process -FilePath $KIRO_PATH -ArgumentList $kiroArgs -PassThru

Write-Host "    Kiro PID: $($kiroProcess.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "[OK] Kiro started with proxy!" -ForegroundColor Green
Write-Host ""
Write-Host "Traffic logs: ~/.kiro-extension/proxy_logs/" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop proxy when done..." -ForegroundColor Gray

# Ждём завершения Kiro
try {
    $kiroProcess.WaitForExit()
} finally {
    Write-Host ""
    Write-Host "[*] Stopping proxy..." -ForegroundColor Cyan
    Stop-Process -Id $proxyProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "[OK] Done" -ForegroundColor Green
}
