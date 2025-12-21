# Установка сертификата mitmproxy для перехвата HTTPS трафика
#
# Запуск: .\install_mitmproxy_cert.ps1
#
# Этот скрипт:
# 1. Генерирует сертификат mitmproxy (если нет)
# 2. Устанавливает его в хранилище доверенных корневых сертификатов

$ErrorActionPreference = "Stop"

Write-Host "=== mitmproxy Certificate Installer ===" -ForegroundColor Cyan
Write-Host ""

# Путь к сертификату
$certDir = "$env:USERPROFILE\.mitmproxy"
$certPath = "$certDir\mitmproxy-ca-cert.cer"

# Проверяем что mitmproxy установлен
try {
    $null = Get-Command mitmdump -ErrorAction Stop
    Write-Host "[OK] mitmproxy found" -ForegroundColor Green
} catch {
    Write-Host "[!] mitmproxy not found. Install with:" -ForegroundColor Red
    Write-Host "    pip install mitmproxy" -ForegroundColor Yellow
    exit 1
}

# Генерируем сертификат если его нет
if (-not (Test-Path $certPath)) {
    Write-Host "[*] Generating mitmproxy certificate..." -ForegroundColor Cyan
    
    # Запускаем mitmdump на секунду чтобы сгенерировать сертификат
    $proc = Start-Process -FilePath "mitmdump" -ArgumentList "-p", "18080" -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    
    if (Test-Path $certPath) {
        Write-Host "[OK] Certificate generated" -ForegroundColor Green
    } else {
        Write-Host "[!] Failed to generate certificate" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK] Certificate already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Certificate path: $certPath" -ForegroundColor Gray
Write-Host ""

# Проверяем установлен ли уже сертификат
$existingCert = Get-ChildItem -Path Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*mitmproxy*" }

if ($existingCert) {
    Write-Host "[OK] Certificate already installed in trusted store" -ForegroundColor Green
    Write-Host "    Subject: $($existingCert.Subject)" -ForegroundColor Gray
    Write-Host "    Thumbprint: $($existingCert.Thumbprint)" -ForegroundColor Gray
} else {
    Write-Host "[*] Installing certificate to trusted root store..." -ForegroundColor Cyan
    Write-Host "    (You may see a security prompt - click Yes)" -ForegroundColor Yellow
    Write-Host ""
    
    try {
        # Импортируем сертификат
        $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
        $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
        $store.Open("ReadWrite")
        $store.Add($cert)
        $store.Close()
        
        Write-Host "[OK] Certificate installed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "[!] Failed to install certificate: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Try manual installation:" -ForegroundColor Yellow
        Write-Host "    certutil -addstore -user Root `"$certPath`"" -ForegroundColor White
        exit 1
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Now you can run Kiro with proxy:" -ForegroundColor Green
Write-Host "    .\run_kiro_with_proxy.ps1" -ForegroundColor White
