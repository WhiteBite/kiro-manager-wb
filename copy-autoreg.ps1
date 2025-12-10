# Copy autoreg Python files and Node.js files to extension for bundling
# Updated for new modular structure
$sourceDir = "..\autoreg"
$destDir = ".\autoreg"
$nodeSrcDir = "..\src"
$nodeDestDir = ".\autoreg\src"

# Create dest dirs
if (Test-Path $destDir) {
    Remove-Item -Recurse -Force $destDir
}
New-Item -ItemType Directory -Path $destDir | Out-Null
New-Item -ItemType Directory -Path "$destDir\core" | Out-Null
New-Item -ItemType Directory -Path "$destDir\registration" | Out-Null
New-Item -ItemType Directory -Path "$destDir\services" | Out-Null
New-Item -ItemType Directory -Path $nodeDestDir | Out-Null
New-Item -ItemType Directory -Path "$nodeDestDir\providers" | Out-Null

# Root Python files
$rootPyFiles = @(
    "__init__.py",
    "cli.py",
    "requirements.txt",
    ".env.example"
)

foreach ($file in $rootPyFiles) {
    $src = Join-Path $sourceDir $file
    if (Test-Path $src) {
        Copy-Item $src $destDir
        Write-Host "Copied: $file"
    } else {
        Write-Host "Missing: $file" -ForegroundColor Yellow
    }
}

# Core module
$coreFiles = Get-ChildItem -Path "$sourceDir\core" -Filter "*.py" -ErrorAction SilentlyContinue
if ($coreFiles) {
    foreach ($file in $coreFiles) {
        Copy-Item $file.FullName "$destDir\core\"
        Write-Host "Copied: core/$($file.Name)"
    }
}

# Registration module
$regFiles = Get-ChildItem -Path "$sourceDir\registration" -Filter "*.py" -ErrorAction SilentlyContinue
if ($regFiles) {
    foreach ($file in $regFiles) {
        Copy-Item $file.FullName "$destDir\registration\"
        Write-Host "Copied: registration/$($file.Name)"
    }
}

# Services module
$svcFiles = Get-ChildItem -Path "$sourceDir\services" -Filter "*.py" -ErrorAction SilentlyContinue
if ($svcFiles) {
    foreach ($file in $svcFiles) {
        Copy-Item $file.FullName "$destDir\services\"
        Write-Host "Copied: services/$($file.Name)"
    }
}

# Node.js files
$nodeFiles = @(
    "index.js",
    "auth-flow.js",
    "aws-sso-client.js",
    "kiro-auth-client.js",
    "oauth-server.js",
    "token-manager.js"
)

foreach ($file in $nodeFiles) {
    $src = Join-Path $nodeSrcDir $file
    if (Test-Path $src) {
        Copy-Item $src $nodeDestDir
        Write-Host "Copied: src/$file"
    } else {
        Write-Host "Missing: src/$file" -ForegroundColor Yellow
    }
}

# Copy providers folder
$providersDir = Join-Path $nodeSrcDir "providers"
if (Test-Path $providersDir) {
    Copy-Item "$providersDir\*" "$nodeDestDir\providers" -Recurse
    Write-Host "Copied: src/providers/*"
}

# Copy package.json for node dependencies
$pkgJson = "..\package.json"
if (Test-Path $pkgJson) {
    Copy-Item $pkgJson $destDir
    Write-Host "Copied: package.json"
}

Write-Host "`nAutoreg files copied to $destDir" -ForegroundColor Green
