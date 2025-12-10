# Build script for Kiro Account Switcher extension

Write-Host "Building Kiro Account Switcher Extension..." -ForegroundColor Cyan

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Build TypeScript
Write-Host "Building TypeScript..." -ForegroundColor Yellow
npm run build

# Package extension (requires vsce)
Write-Host "Packaging extension..." -ForegroundColor Yellow

# Check if vsce is installed
$vsceInstalled = Get-Command vsce -ErrorAction SilentlyContinue
if (-not $vsceInstalled) {
    Write-Host "Installing vsce..." -ForegroundColor Yellow
    npm install -g @vscode/vsce
}

# Create VSIX package
vsce package --no-dependencies

Write-Host ""
Write-Host "Build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To install in Kiro:" -ForegroundColor Cyan
Write-Host "1. Open Kiro IDE"
Write-Host "2. Press Ctrl+Shift+P"
Write-Host "3. Type 'Extensions: Install from VSIX...'"
Write-Host "4. Select the .vsix file from this directory"
Write-Host ""
