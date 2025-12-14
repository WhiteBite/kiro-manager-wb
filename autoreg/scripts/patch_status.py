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
print(json.dumps({
    'isPatched': status.is_patched,
    'kiroVersion': status.kiro_version,
    'patchVersion': status.patch_version,
    'currentMachineId': status.current_machine_id,
    'error': status.error
}), flush=True)
