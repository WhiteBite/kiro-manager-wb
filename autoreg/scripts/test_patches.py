"""
Test patches incrementally to find which one breaks the extension
"""

import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from services.kiro_patcher_service import KiroPatcherService


class IncrementalPatcher(KiroPatcherService):
    """Patcher that can apply patches incrementally"""
    
    def apply_patch_1_only(self, content: str) -> str:
        """Apply only PATCH 1: getMachineId() injection (v4.0 approach)"""
        patched = content
        
        # === PATCH 1: getMachineId() - добавить проверку файла в начало ===
        pattern = r'function getMachineId\(\) \{\s+try \{\s+return \(0, import_node_machine_id\.machineIdSync\)\(\);'
        
        if re.search(pattern, patched):
            patch_code = f'''function getMachineId() {{
  {self.PATCH_MARKER}{self.PATCH_VERSION}_PATCH1_ONLY
  try {{
    const fs = require('fs');
    const path = require('path');
    const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-extension', 'machine-id.txt');
    if (fs.existsSync(customIdFile)) {{
      const customId = fs.readFileSync(customIdFile, 'utf8').trim();
      if (customId && customId.length >= 32) {{
        return customId;
      }}
    }}
  }} catch (_) {{}}
  // END_PATCH_v{self.PATCH_VERSION}
  try {{
    return (0, import_node_machine_id.machineIdSync)();'''
            
            patched = re.sub(pattern, patch_code, patched)
            return patched
        
        return content
    
    def apply_patch_1_and_2(self, content: str) -> str:
        """Apply PATCH 1 + PATCH 2: getMachineId() + userAttributes()"""
        patched = self.apply_patch_1_only(content)
        
        # Replace marker
        patched = patched.replace('_PATCH1_ONLY', '_PATCH1_AND_2')
        
        # === PATCH 2: userAttributes() - вызывать getMachineId() динамически ===
        ua_pattern = r'(function userAttributes\(\)\s*\{\s*return\s*\{[^}]*machineId:\s*)MACHINE_ID(\s*\})'
        ua_match = re.search(ua_pattern, patched)
        if ua_match:
            patched = re.sub(ua_pattern, r'\1getMachineId()\2', patched)
        
        return patched
    
    def patch_incremental(self, patch_level: int = 1, skip_running_check: bool = False):
        """
        Apply patches incrementally
        patch_level: 1 = only PATCH 1, 2 = PATCH 1+2, 3 = all patches
        """
        if not skip_running_check and self._is_kiro_running():
            return {'success': False, 'message': 'Kiro is running. Please close it first.'}
        
        js_path = self.extension_js_path
        if not js_path:
            return {'success': False, 'message': 'extension.js not found'}
        
        # Read original
        content = js_path.read_text(encoding='utf-8')
        
        # Create backup
        backup_path = self._create_backup(js_path, content)
        
        # Apply patches based on level
        if patch_level == 1:
            patched = self.apply_patch_1_only(content)
            msg = "Applied PATCH 1 only (getMachineId replacement)"
        elif patch_level == 2:
            patched = self.apply_patch_1_and_2(content)
            msg = "Applied PATCH 1 + PATCH 2 (getMachineId + userAttributes)"
        elif patch_level == 3:
            patched = self._apply_patch(content)
            msg = "Applied all patches (PATCH 1 + 2 + 3)"
        else:
            return {'success': False, 'message': f'Invalid patch level: {patch_level}'}
        
        if patched == content:
            return {'success': False, 'message': 'No patches were applied'}
        
        # Write patched file
        js_path.write_text(patched, encoding='utf-8')
        
        return {
            'success': True,
            'message': msg,
            'backup_path': str(backup_path),
            'patched_file': str(js_path)
        }


if __name__ == '__main__':
    import json
    
    patcher = IncrementalPatcher()
    
    # Get patch level from command line
    patch_level = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    
    result = patcher.patch_incremental(patch_level, skip_running_check=True)
    print(json.dumps(result, indent=2))
