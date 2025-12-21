# Quick patch management script

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("apply", "remove", "status")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

function Invoke-PatchCommand {
    param([string]$Command)
    
    $result = python -c $Command 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: $result" -ForegroundColor Red
        exit 1
    }
    return $result
}

switch ($Action) {
    "apply" {
        Write-Host "Applying Kiro patch v4.0..." -ForegroundColor Yellow
        $result = Invoke-PatchCommand "import sys; sys.path.insert(0, 'autoreg'); from services.kiro_patcher_service import KiroPatcherService; patcher = KiroPatcherService(); result = patcher.patch(skip_running_check=True); print(result.message)"
        Write-Host $result -ForegroundColor Green
        Write-Host "`nPlease restart Kiro for changes to take effect." -ForegroundColor Cyan
    }
    "remove" {
        Write-Host "Removing Kiro patch..." -ForegroundColor Yellow
        $result = Invoke-PatchCommand "import sys; sys.path.insert(0, 'autoreg'); from services.kiro_patcher_service import KiroPatcherService; patcher = KiroPatcherService(); result = patcher.unpatch(skip_running_check=True); print(result.message)"
        Write-Host $result -ForegroundColor Green
        Write-Host "`nPlease restart Kiro for changes to take effect." -ForegroundColor Cyan
    }
    "status" {
        Write-Host "Checking patch status..." -ForegroundColor Yellow
        $result = Invoke-PatchCommand "import sys; sys.path.insert(0, 'autoreg'); from services.kiro_patcher_service import KiroPatcherService; import json; patcher = KiroPatcherService(); status = patcher.check_status(); print(json.dumps({'is_patched': status.is_patched, 'patch_version': status.patch_version, 'kiro_version': status.kiro_version, 'current_machine_id': status.current_machine_id}, indent=2))"
        $status = $result | ConvertFrom-Json
        
        Write-Host "`nPatch Status:" -ForegroundColor Cyan
        Write-Host "  Patched: $($status.is_patched)" -ForegroundColor $(if ($status.is_patched) { "Green" } else { "Yellow" })
        Write-Host "  Patch Version: $($status.patch_version)"
        Write-Host "  Kiro Version: $($status.kiro_version)"
        if ($status.current_machine_id) {
            Write-Host "  Custom Machine ID: $($status.current_machine_id.Substring(0, 8))..." -ForegroundColor Green
        }
    }
}
