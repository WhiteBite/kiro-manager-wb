"""Find ALL machineId usages in Kiro extension"""
import os
import re

ext_path = os.path.join(os.environ['LOCALAPPDATA'], 'Programs', 'Kiro', 'resources', 'app', 'extensions', 'kiro.kiro-agent', 'dist', 'extension.js')

with open(ext_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"File size: {len(content):,} bytes\n")

# Find all machineId related patterns
patterns = [
    (r'getMachineId\s*\(', 'getMachineId() calls'),
    (r'getMachineId2\s*\(', 'getMachineId2() calls'),
    (r'machineIdSync', 'machineIdSync (node-machine-id)'),
    (r'machineId\s*:', 'machineId: property'),
    (r'machineId\s*=', 'machineId = assignment'),
    (r'MACHINE_ID', 'MACHINE_ID constant'),
    (r'machine-id', 'machine-id string'),
    (r'node-machine-id', 'node-machine-id import'),
]

for pattern, name in patterns:
    matches = list(re.finditer(pattern, content, re.IGNORECASE))
    print(f"\n=== {name}: {len(matches)} matches ===")
    
    for m in matches[:10]:  # First 10
        idx = m.start()
        start = max(0, idx - 80)
        end = min(len(content), idx + 120)
        context = content[start:end].replace('\n', ' ')
        print(f"  [{idx}] ...{context}...")

# Check if our patches are present
print("\n\n" + "="*60)
print("=== PATCH STATUS ===")
print("="*60)

patch_markers = [
    'KIRO_BATCH_LOGIN_PATCH',
    'KIRO_AUTO_SWITCH_PATCH', 
    'KIRO_TOKEN_CACHE_PATCH',
    'kiro-manager-wb/machine-id.txt',
]

for marker in patch_markers:
    count = content.count(marker)
    status = "✓ PATCHED" if count > 0 else "✗ NOT PATCHED"
    print(f"  {marker}: {status} ({count} occurrences)")

# Find functions that use machineId
print("\n\n=== Functions using machineId ===")
# Look for function definitions containing machineId
func_pattern = r'(function\s+\w+|async\s+\w+|\w+\s*=\s*(?:async\s+)?function|\w+\s*\([^)]*\)\s*\{)[^}]{0,500}machineId'
func_matches = list(re.finditer(func_pattern, content))
print(f"Found {len(func_matches)} functions with machineId")

seen_funcs = set()
for m in func_matches[:20]:
    # Extract function name
    func_text = m.group(0)[:100]
    if func_text not in seen_funcs:
        seen_funcs.add(func_text)
        print(f"  - {func_text[:80]}...")
