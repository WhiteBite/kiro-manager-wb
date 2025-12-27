#!/usr/bin/env python3
"""Get patch status as JSON - called from TypeScript extension"""
import json
import sys
import os

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.kiro_patcher_service import KiroPatcherService

s = KiroPatcherService()
status = s.get_status()

# Check if update needed
needs_update, update_reason = s.check_update_needed()

print(json.dumps({
    'isPatched': status.is_patched,
    'kiroVersion': status.kiro_version,
    'patchVersion': status.patch_version,
    'latestPatchVersion': s.PATCH_VERSION,
    'currentMachineId': status.current_machine_id,
    'needsUpdate': needs_update,
    'updateReason': update_reason,
    'error': status.error
}), flush=True)
