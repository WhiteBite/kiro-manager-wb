"""Dry run test of the patcher - don't actually patch, just verify"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.kiro_patcher_service import KiroPatcherService

patcher = KiroPatcherService()

# Get current status
status = patcher.get_status()
print("=== Current Status ===")
print(f"Kiro version: {status.kiro_version}")
print(f"Is patched: {status.is_patched}")
print(f"Patch version: {status.patch_version}")
print(f"Extension path: {status.extension_js_path}")
print(f"Current machine ID: {status.current_machine_id[:16] if status.current_machine_id else 'None'}...")

# Check patch info file
patch_info = patcher.get_patch_info()
if patch_info:
    print(f"\n=== Patch Info File ===")
    print(f"Patch version: {patch_info.get('patch_version')}")
    print(f"Kiro version: {patch_info.get('kiro_version')}")
    print(f"Patched at: {patch_info.get('patched_at')}")
    print(f"Patches: {patch_info.get('patches_applied')}")
else:
    print("\n=== Patch Info File: NOT FOUND ===")

# Read extension.js and test patch
print("\n=== Testing Patch Application (dry run) ===")
ext_path = patcher.extension_js_path
if ext_path:
    content = ext_path.read_text(encoding='utf-8')
    
    # Apply patch to copy
    patched = patcher._apply_patch(content)
    
    if patched != content:
        print("✓ Patch would be applied successfully!")
        
        # Check what patches were applied
        patches = [
            ('KIRO_BATCH_LOGIN_PATCH', 'getMachineId patch'),
            ('KIRO_AUTO_SWITCH_PATCH', 'Auto-switch on ban'),
            ('KIRO_TOKEN_CACHE_PATCH', 'Token cache fix'),
            ('KIRO_UNIQUEID_PATCH', 'getUniqueId patch'),
            ('KIRO_OTEL_PATCH', 'OpenTelemetry host.id patch'),
            ('kiro-manager-wb', 'Custom machineId file path'),
        ]
        
        for marker, name in patches:
            count = patched.count(marker)
            if count > 0:
                print(f"  ✓ {name} ({count}x)")
            else:
                print(f"  ✗ {name} - NOT APPLIED")
        
        # Show diff size
        print(f"\nOriginal size: {len(content):,} bytes")
        print(f"Patched size: {len(patched):,} bytes")
        print(f"Diff: +{len(patched) - len(content):,} bytes")
    else:
        print("✗ Patch would NOT be applied (no changes)")
else:
    print("✗ Extension path not found")
