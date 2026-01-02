"""
Kiro Patcher Service - патчинг getMachineId() в Kiro IDE

Патчит extension.js чтобы использовать уникальный machineId для каждого аккаунта.
Это предотвращает баны AWS за использование множества аккаунтов с одного компьютера.

AWS отслеживает machineId в телеметрии и банит если видит много аккаунтов с одного ID.
"""

import os
import re
import json
import shutil
import hashlib
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.paths import get_paths
from core.exceptions import KiroNotInstalledError, KiroRunningError


@dataclass
class PatchStatus:
    """Статус патча Kiro"""
    is_patched: bool = False
    workbench_patched: bool = False
    kiro_version: Optional[str] = None
    patch_version: Optional[str] = None
    extension_js_path: Optional[str] = None
    workbench_js_path: Optional[str] = None
    current_machine_id: Optional[str] = None
    backup_exists: bool = False
    backup_path: Optional[str] = None
    error: Optional[str] = None


@dataclass
class PatchResult:
    """Результат патчинга"""
    success: bool = False
    message: str = ""
    backup_path: Optional[str] = None
    patched_file: Optional[str] = None


class KiroPatcherService:
    """
    Сервис для патчинга Kiro IDE
    
    Патчит функцию getMachineId() в extension.js чтобы:
    1. Читать machineId из файла ~/.kiro-manager-wb/machine-id.txt
    2. Если файл не существует - использовать оригинальный machineId
    
    Это позволяет менять machineId при переключении аккаунтов,
    что предотвращает баны AWS за "unusual activity".
    """
    
    PATCH_VERSION = "6.5.0"  # Версия 6.5 - System prompt machineId patch for LLM conversations
    PATCH_MARKER = "// KIRO_BATCH_LOGIN_PATCH_v"
    WORKBENCH_PATCH_MARKER = "// KIRO_WORKBENCH_PATCH_v"
    SQLITE_BUSY_PATCH_MARKER = "// KIRO_SQLITE_BUSY_PATCH_v"
    USER_AGENT_PATCH_MARKER = "// KIRO_USER_AGENT_PATCH_v"
    SYSINFO_PATCH_MARKER = "// KIRO_SYSINFO_PATCH_v"
    SYSTEM_PROMPT_PATCH_MARKER = "// KIRO_SYSTEM_PROMPT_PATCH_v"
    TEMPLATE_MACHINEID_PATCH_MARKER = "/* KIRO_TEMPLATE_MACHINEID_PATCH_v"
    
    # Путь к файлу с кастомным machine ID
    CUSTOM_ID_FILE = ".kiro-manager-wb/machine-id.txt"
    
    def __init__(self):
        self.paths = get_paths()
        self._kiro_path: Optional[Path] = None
        self._machine_id_js: Optional[Path] = None
    
    @property
    def workbench_js_path(self) -> Optional[Path]:
        """Путь к workbench.desktop.main.js"""
        kiro_path = self.kiro_install_path
        if not kiro_path:
            return None
        
        wb_js = kiro_path / 'resources' / 'app' / 'out' / 'vs' / 'workbench' / 'workbench.desktop.main.js'
        
        if wb_js.exists():
            return wb_js
        
        return None
    
    @property
    def kiro_install_path(self) -> Optional[Path]:
        """Путь установки Kiro (cross-platform)"""
        if self._kiro_path:
            return self._kiro_path
        
        # Use cross-platform path detection from kiro_config
        from core.kiro_config import get_kiro_install_path
        path = get_kiro_install_path()
        if path:
            self._kiro_path = path
            return path
        
        return None
    
    @property
    def extension_js_path(self) -> Optional[Path]:
        """Путь к extension.js - главному файлу Kiro"""
        kiro_path = self.kiro_install_path
        if not kiro_path:
            return None
        
        ext_js = kiro_path / 'resources' / 'app' / 'extensions' / 'kiro.kiro-agent' / 'dist' / 'extension.js'
        
        if ext_js.exists():
            return ext_js
        
        return None
    
    @property
    def machine_id_js_path(self) -> Optional[Path]:
        """Алиас для совместимости"""
        return self.extension_js_path
    
    @property
    def custom_id_path(self) -> Path:
        """Путь к файлу с кастомным machine ID"""
        return Path.home() / self.CUSTOM_ID_FILE
    
    @property
    def backup_dir(self) -> Path:
        """Директория для бэкапов"""
        return self.paths.backups_dir / 'kiro-patches'
    
    def get_status(self) -> PatchStatus:
        """Получить статус патча"""
        status = PatchStatus()
        
        # Проверяем установку Kiro
        if not self.kiro_install_path:
            status.error = "Kiro not installed"
            return status
        
        # Получаем версию Kiro
        status.kiro_version = self._get_kiro_version()
        
        # Проверяем extension.js
        js_path = self.extension_js_path
        if not js_path:
            status.error = "extension.js not found"
            return status
        
        status.extension_js_path = str(js_path)
        
        # Проверяем патч extension.js
        content = js_path.read_text(encoding='utf-8')
        if self.PATCH_MARKER in content:
            status.is_patched = True
            # Извлекаем версию патча
            match = re.search(rf'{re.escape(self.PATCH_MARKER)}(\d+\.\d+\.\d+)', content)
            if match:
                status.patch_version = match.group(1)
        
        # Проверяем workbench.desktop.main.js
        wb_path = self.workbench_js_path
        if wb_path:
            status.workbench_js_path = str(wb_path)
            wb_content = wb_path.read_text(encoding='utf-8')
            if self.WORKBENCH_PATCH_MARKER in wb_content:
                status.workbench_patched = True
        
        # Проверяем кастомный machine ID
        if self.custom_id_path.exists():
            status.current_machine_id = self.custom_id_path.read_text().strip()
        
        # Проверяем бэкап
        backup_path = self._get_latest_backup()
        if backup_path:
            status.backup_exists = True
            status.backup_path = str(backup_path)
        
        return status
    
    def patch(self, force: bool = False, skip_running_check: bool = False) -> PatchResult:
        """
        Патчит Kiro для использования кастомного machine ID
        
        Args:
            force: Перезаписать существующий патч
            skip_running_check: Пропустить проверку запущен ли Kiro (опасно!)
        
        Returns:
            PatchResult
        """
        # Проверки
        if not self.kiro_install_path:
            return PatchResult(success=False, message="Kiro not installed")
        
        if not skip_running_check and self._is_kiro_running():
            return PatchResult(success=False, message="Kiro is running. Please close it first.")
        
        js_path = self.extension_js_path
        if not js_path:
            return PatchResult(success=False, message="extension.js not found")
        
        # Читаем оригинал
        content = js_path.read_text(encoding='utf-8')
        
        # Проверяем существующий патч
        if self.PATCH_MARKER in content:
            if not force:
                return PatchResult(success=False, message="Already patched. Use --force to re-patch.")
            # Восстанавливаем из бэкапа перед повторным патчем
            backup = self._get_latest_backup()
            if backup:
                content = backup.read_text(encoding='utf-8')
        
        # Создаём бэкап
        backup_path = self._create_backup(js_path, content)
        
        # Патчим
        patched_content = self._apply_patch(content)
        
        if patched_content == content:
            return PatchResult(success=False, message="Failed to apply patch - getMachineId() pattern not found")
        
        # Записываем
        js_path.write_text(patched_content, encoding='utf-8')
        
        # === PATCH workbench.desktop.main.js ===
        workbench_result = self._patch_workbench(force)
        
        # Создаём файл с machine ID если не существует
        if not self.custom_id_path.exists():
            self.generate_machine_id()
        
        # Сохраняем метку патча
        self._save_patch_marker()
        
        msg = f"Kiro patched successfully! MachineId will be read from {self.custom_id_path}"
        if workbench_result:
            msg += " | Workbench patched (child window fix)"
        
        return PatchResult(
            success=True,
            message=msg,
            backup_path=str(backup_path),
            patched_file=str(js_path)
        )
    
    def _patch_workbench(self, force: bool = False) -> bool:
        """
        Патчит workbench.desktop.main.js для исправления child window createElement
        
        Returns:
            True если патч применён успешно
        """
        wb_path = self.workbench_js_path
        if not wb_path:
            return False
        
        content = wb_path.read_text(encoding='utf-8')
        
        # Проверяем уже запатчен ли
        if self.WORKBENCH_PATCH_MARKER in content:
            if not force:
                return True  # Уже запатчен
            # Восстанавливаем из бэкапа
            backup = self._get_workbench_backup()
            if backup:
                content = backup.read_text(encoding='utf-8')
        
        # Создаём бэкап
        self._create_workbench_backup(wb_path, content)
        
        # Патчим - убираем блокировку createElement в child window
        # Оригинал: e.document.createElement=function(){throw new Error('Not allowed to create elements in child window...
        # Патч: просто не переопределяем createElement
        
        pattern = r"e\.document\.createElement=function\(\)\{throw new Error\('Not allowed to create elements in child window[^}]+\}"
        
        if re.search(pattern, content):
            # Заменяем на пустую функцию которая вызывает оригинальный createElement
            replacement = f"/* {self.WORKBENCH_PATCH_MARKER}{self.PATCH_VERSION} - child window fix */ void 0"
            patched = re.sub(pattern, replacement, content, count=1)
            
            if patched != content:
                wb_path.write_text(patched, encoding='utf-8')
                return True
        
        return False
    
    def _create_workbench_backup(self, wb_path: Path, content: str) -> Path:
        """Создаёт бэкап workbench.desktop.main.js"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        kiro_version = self._get_kiro_version() or 'unknown'
        backup_name = f"workbench_{kiro_version}_{timestamp}.js.bak"
        backup_path = self.backup_dir / backup_name
        
        backup_path.write_text(content, encoding='utf-8')
        return backup_path
    
    def _get_workbench_backup(self) -> Optional[Path]:
        """Получить последний бэкап workbench"""
        if not self.backup_dir.exists():
            return None
        
        backups = sorted(self.backup_dir.glob('workbench_*.js.bak'), reverse=True)
        return backups[0] if backups else None
    
    def unpatch(self, skip_running_check: bool = False) -> PatchResult:
        """Восстановить оригинальный файл из бэкапа"""
        if not skip_running_check and self._is_kiro_running():
            return PatchResult(success=False, message="Kiro is running. Please close it first.")
        
        js_path = self.extension_js_path
        if not js_path:
            return PatchResult(success=False, message="extension.js not found")
        
        backup = self._get_latest_backup()
        if not backup:
            return PatchResult(success=False, message="No backup found")
        
        # Восстанавливаем extension.js
        shutil.copy2(backup, js_path)
        
        # Восстанавливаем workbench.desktop.main.js
        wb_backup = self._get_workbench_backup()
        wb_path = self.workbench_js_path
        if wb_backup and wb_path:
            shutil.copy2(wb_backup, wb_path)
        
        return PatchResult(
            success=True,
            message="Kiro restored from backup",
            backup_path=str(backup),
            patched_file=str(js_path)
        )
    
    def generate_machine_id(self) -> str:
        """Генерирует новый machine ID и сохраняет в файл"""
        # Генерируем ID как node-machine-id (SHA-256 hex)
        random_bytes = os.urandom(32)
        timestamp = datetime.now().timestamp()
        
        hasher = hashlib.sha256()
        hasher.update(random_bytes)
        hasher.update(str(timestamp).encode())
        hasher.update(str(uuid.uuid4()).encode())
        
        machine_id = hasher.hexdigest()
        
        # Создаём директорию если нужно
        self.custom_id_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Сохраняем
        self.custom_id_path.write_text(machine_id)
        
        return machine_id
    
    @property
    def patch_marker_path(self) -> Path:
        """Путь к файлу с меткой патча"""
        return self.custom_id_path.parent / 'patch-info.json'
    
    def _save_patch_marker(self) -> None:
        """Сохраняет информацию о патче в файл"""
        kiro_version = self._get_kiro_version() or 'unknown'
        
        patch_info = {
            'patch_version': self.PATCH_VERSION,
            'kiro_version': kiro_version,
            'patched_at': datetime.now().isoformat(),
            'patches_applied': [
                'getMachineId',
                'getMachineId2', 
                'userAttributes',
                'TemporarilySuspendedError',
                'AccountNotSupportedError',
                'readToken_cache_fix',
                'getUniqueId',
                'OpenTelemetry_host_id',
                'getSystemPromptMessages_machineId',
                'template_format_machineId',
                'workbench_createElement',
                'systeminformation_fingerprint',
                'sqlite_busy_timeout_30s',
                'sqlite_busy_error_handling',
                'devdata_sqlite_busy_timeout',
                'customUserAgent_machineId'
            ],
            'machine_id_file': str(self.custom_id_path),
            'extension_path': str(self.extension_js_path) if self.extension_js_path else None
        }
        
        self.patch_marker_path.parent.mkdir(parents=True, exist_ok=True)
        self.patch_marker_path.write_text(json.dumps(patch_info, indent=2))
    
    def get_patch_info(self) -> Optional[Dict[str, Any]]:
        """Получить информацию о текущем патче"""
        if self.patch_marker_path.exists():
            try:
                return json.loads(self.patch_marker_path.read_text())
            except:
                pass
        return None
    
    def set_machine_id(self, machine_id: str) -> bool:
        """Установить конкретный machine ID"""
        # Валидация - должен быть 64-символьный hex
        if not re.match(r'^[a-f0-9]{64}$', machine_id.lower()):
            return False
        
        self.custom_id_path.parent.mkdir(parents=True, exist_ok=True)
        self.custom_id_path.write_text(machine_id.lower())
        return True
    
    def get_machine_id(self) -> Optional[str]:
        """Получить текущий кастомный machine ID"""
        if self.custom_id_path.exists():
            return self.custom_id_path.read_text().strip()
        return None
    
    def _apply_patch(self, content: str) -> str:
        """
        Применяет патч к extension.js (версия 6.0 - graceful ban handling)
        
        Kiro использует machineId в нескольких местах:
        1. getMachineId() - телеметрия
        2. getMachineId2() - User-Agent заголовок (KiroIDE-0.7.45-{machineId})
        3. userAttributes() - атрибуты телеметрии
        
        Также патчим обработку ошибок:
        4. TemporarilySuspendedError - return вместо throw (graceful ban)
        5. AccountNotSupportedError - return вместо throw
        """
        
        patched = content
        patches_applied = 0
        
        # Код патча для чтения из файла
        patch_code_template = '''{{
  // KIRO_BATCH_LOGIN_PATCH_v{version}
  try {{
    const fs = require('fs');
    const path = require('path');
    const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
    if (fs.existsSync(customIdFile)) {{
      const customId = fs.readFileSync(customIdFile, 'utf8').trim();
      if (customId && customId.length >= 32) {{
        return customId;
      }}
    }}
  }} catch (_) {{}}
  // END_PATCH'''
        
        patch_code = patch_code_template.format(version=self.PATCH_VERSION)
        
        # === PATCH 1: getMachineId() - основная функция ===
        pattern1 = r'function getMachineId\(\) \{\s+try \{\s+return \(0, import_node_machine_id\.machineIdSync\)\(\);'
        if re.search(pattern1, patched) and 'KIRO_BATCH_LOGIN_PATCH' not in patched[:patched.find('getMachineId()') + 500 if 'getMachineId()' in patched else 0]:
            replacement = f'function getMachineId() {patch_code}\n  try {{\n    return (0, import_node_machine_id.machineIdSync)();'
            patched = re.sub(pattern1, replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 2: getMachineId2() - используется для User-Agent! ===
        # Оригинал: function getMachineId2() { try { return (0, import_node_machine_id3.machineIdSync)();
        pattern2 = r'function getMachineId2\(\) \{\s+try \{\s+return \(0, import_node_machine_id3\.machineIdSync\)\(\);'
        if re.search(pattern2, patched):
            replacement = f'function getMachineId2() {patch_code}\n  try {{\n    return (0, import_node_machine_id3.machineIdSync)();'
            patched = re.sub(pattern2, replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 3: userAttributes() - вызывать getMachineId() динамически ===
        ua_pattern = r'(function userAttributes\(\)\s*\{\s*return\s*\{[^}]*machineId:\s*)MACHINE_ID(\s*\})'
        if re.search(ua_pattern, patched):
            patched = re.sub(ua_pattern, r'\1getMachineId()\2', patched)
            patches_applied += 1
        
        # === PATCH 4: Auto-switch on ban ===
        # При бане вызываем команду переключения на следующий аккаунт
        # Оригинал: throw new TemporarilySuspendedError();
        # Патч: вызываем vscode команду и возвращаем ошибку gracefully
        ban_pattern = r'throw new TemporarilySuspendedError\(\);'
        ban_replacement = '''(() => {
      // KIRO_AUTO_SWITCH_PATCH
      try {
        const vscode = require('vscode');
        vscode.commands.executeCommand('kiroAccountSwitcher.switchToNextAvailable');
      } catch (_) {}
      return new TemporarilySuspendedError();
    })();'''
        if re.search(ban_pattern, patched) and 'KIRO_AUTO_SWITCH_PATCH' not in patched:
            patched = re.sub(ban_pattern, ban_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 5: Graceful AccountNotSupportedError handling ===
        account_pattern = r'throw new AccountNotSupportedError\(\)'
        if re.search(account_pattern, patched):
            patched = re.sub(account_pattern, 'return new AccountNotSupportedError()', patched)
            patches_applied += 1
        
        # === PATCH 6: Fix token cache for account switching ===
        # Problem: readToken() returns cached token even after file changed
        # Solution: Always clear cache before reading to ensure fresh token
        # Original: readToken() { const localToken = this.readTokenFromLocalCache();
        # Patched: readToken() { this.clearCache(); const localToken = this.readTokenFromLocalCache();
        readtoken_pattern = r'readToken\(\) \{\s+const localToken = this\.readTokenFromLocalCache\(\);'
        readtoken_replacement = f'''readToken() {{
        // KIRO_TOKEN_CACHE_PATCH_v{self.PATCH_VERSION} - always read fresh token for account switching
        this.clearCache();
        const localToken = this.readTokenFromLocalCache();'''
        if re.search(readtoken_pattern, patched) and 'KIRO_TOKEN_CACHE_PATCH' not in patched:
            patched = re.sub(readtoken_pattern, readtoken_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 7: getUniqueId() - continuedev package also uses machineId ===
        # Original: function getUniqueId() { const id = vscode20.env.machineId; if (id === "someValue.machineId") { return (0, import_node_machine_id8.machineIdSync)(); }
        # Patched: Add custom machineId reading before fallback
        uniqueid_pattern = r'function getUniqueId\(\) \{\s+const id = vscode20\.env\.machineId;'
        uniqueid_replacement = f'''function getUniqueId() {{
  // KIRO_UNIQUEID_PATCH_v{self.PATCH_VERSION}
  try {{
    const fs = require('fs');
    const path = require('path');
    const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
    if (fs.existsSync(customIdFile)) {{
      const customId = fs.readFileSync(customIdFile, 'utf8').trim();
      if (customId && customId.length >= 32) return customId;
    }}
  }} catch (_) {{}}
  const id = vscode20.env.machineId;'''
        if re.search(uniqueid_pattern, patched) and 'KIRO_UNIQUEID_PATCH' not in patched:
            patched = re.sub(uniqueid_pattern, uniqueid_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 8: OpenTelemetry _getAsyncAttributes - telemetry host.id ===
        # OpenTelemetry sends real machineId in host.id attribute via separate getMachineId
        # Original: _getAsyncAttributes() { return (0, getMachineId_1.getMachineId)().then((machineId2) => {
        # Patched: Read from our custom file first
        otel_pattern = r'_getAsyncAttributes\(\) \{\s+return \(0, getMachineId_1\.getMachineId\)\(\)\.then\(\(machineId2\) => \{'
        otel_replacement = f'''_getAsyncAttributes() {{
        // KIRO_OTEL_PATCH_v{self.PATCH_VERSION} - use custom machineId for telemetry
        const getCustomMachineId = async () => {{
          try {{
            const fs = require('fs');
            const path = require('path');
            const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
            if (fs.existsSync(customIdFile)) {{
              const customId = fs.readFileSync(customIdFile, 'utf8').trim();
              if (customId && customId.length >= 32) return customId;
            }}
          }} catch (_) {{}}
          return (0, getMachineId_1.getMachineId)();
        }};
        return getCustomMachineId().then((machineId2) => {{'''
        if re.search(otel_pattern, patched) and 'KIRO_OTEL_PATCH' not in patched:
            patched = re.sub(otel_pattern, otel_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 9: getSystemPromptMessages - Machine ID in LLM system prompts ===
        # CRITICAL: This is the PRIMARY detection vector - every AI conversation contains the real machine ID
        # Location: getSystemPromptMessages() function around line ~148667 in beautified extension
        # Original: getSystemPromptMessages(imageUrls, systemPrompt) {
        #           const machineId2 = getMachineId2();
        #           const promptText = `${systemPrompt}\n<current_context>Machine ID: ${machineId2}</current_context>`;
        # 
        # The getMachineId2() is already patched (PATCH 2), but we add a direct patch here as safety
        # This ensures the system prompt always uses our custom ID even if getMachineId2 changes
        #
        # Pattern: Look for the specific getSystemPromptMessages function that builds prompts with machineId
        # We patch by replacing the machineId2 variable assignment with our custom ID reader
        
        sysprompt_pattern = r'(getSystemPromptMessages\([^)]*\)\s*\{\s*)(const machineId2 = getMachineId2\(\);)'
        if re.search(sysprompt_pattern, patched) and self.SYSTEM_PROMPT_PATCH_MARKER not in patched:
            sysprompt_replacement = f'''\\1{self.SYSTEM_PROMPT_PATCH_MARKER}{self.PATCH_VERSION} - spoof machineId in LLM system prompts
        const machineId2 = (() => {{
          try {{
            const fs = require('fs');
            const path = require('path');
            const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
            if (fs.existsSync(customIdFile)) {{
              const customId = fs.readFileSync(customIdFile, 'utf8').trim();
              if (customId && customId.length >= 32) return customId;
            }}
          }} catch (_) {{}}
          return getMachineId2();
        }})();'''
            patched = re.sub(sysprompt_pattern, sysprompt_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 10: Template-based machineId in prompts ===
        # Some prompts use template format: .format({ machineId: getMachineId2() })
        # Locations: ~97724, ~139717, ~143948 in beautified extension
        # These call getMachineId2() which is already patched (PATCH 2)
        # But we add explicit patches for robustness
        #
        # Pattern: machineId: getMachineId2() in format calls
        # We wrap the getMachineId2() call with our custom ID reader
        
        template_machineId_pattern = r'(\.format\(\{[^}]*machineId:\s*)(getMachineId2\(\))(\s*[,}])'
        if re.search(template_machineId_pattern, patched) and self.TEMPLATE_MACHINEID_PATCH_MARKER not in patched:
            # Count occurrences to patch all of them
            matches = re.findall(template_machineId_pattern, patched)
            if matches:
                template_replacement = f'''\\1{self.TEMPLATE_MACHINEID_PATCH_MARKER}{self.PATCH_VERSION} */ (() => {{
                  try {{
                    const fs = require('fs');
                    const path = require('path');
                    const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
                    if (fs.existsSync(customIdFile)) {{
                      const customId = fs.readFileSync(customIdFile, 'utf8').trim();
                      if (customId && customId.length >= 32) return customId;
                    }}
                  }} catch (_) {{}}
                  return getMachineId2();
                }})()\\3'''
                patched = re.sub(template_machineId_pattern, template_replacement, patched)
                patches_applied += 1
        
        # === PATCH 11: SQLITE_BUSY fix - increase busy_timeout for multi-window stability ===
        # Problem: Multiple VS Code windows share the same SQLite database file.
        # Default busy_timeout=3000ms is too short, causing SQLITE_BUSY errors and crashes.
        # Solution: Increase busy_timeout to 30000ms (30 seconds) for better multi-window support.
        # Original: await _SqliteDb.db.exec("PRAGMA busy_timeout = 3000;");
        # Patched: await _SqliteDb.db.exec("PRAGMA busy_timeout = 30000;");
        sqlite_busy_timeout_pattern = r'await _SqliteDb\.db\.exec\("PRAGMA busy_timeout = 3000;"\);'
        sqlite_busy_timeout_replacement = f'/* {self.SQLITE_BUSY_PATCH_MARKER}{self.PATCH_VERSION} - increased timeout for multi-window */ await _SqliteDb.db.exec("PRAGMA busy_timeout = 30000;");'
        if re.search(sqlite_busy_timeout_pattern, patched) and self.SQLITE_BUSY_PATCH_MARKER not in patched:
            patched = re.sub(sqlite_busy_timeout_pattern, sqlite_busy_timeout_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 12: Add SQLITE_BUSY to errorsRegexesToClearIndexesOn ===
        # Problem: SQLITE_BUSY is intentionally excluded from error handling (see comment in code).
        # This causes crashes when multiple windows access the same database.
        # Solution: Add SQLITE_BUSY to the list of handled errors so it triggers graceful recovery.
        # Original: errorsRegexesToClearIndexesOn = [/Invalid argument error.../, /SQLITE_CONSTRAINT/, ...]
        # Patched: Add /SQLITE_BUSY/ to the array
        sqlite_errors_pattern = r'errorsRegexesToClearIndexesOn\s*=\s*\[\s*/Invalid argument error'
        sqlite_errors_replacement = f'''errorsRegexesToClearIndexesOn = [
                /* {self.SQLITE_BUSY_PATCH_MARKER}{self.PATCH_VERSION} - handle SQLITE_BUSY for multi-window stability */
                /SQLITE_BUSY/,
                /Invalid argument error'''
        if re.search(sqlite_errors_pattern, patched) and 'SQLITE_BUSY' not in patched[:patched.find('errorsRegexesToClearIndexesOn') + 500 if 'errorsRegexesToClearIndexesOn' in patched else 0]:
            patched = re.sub(sqlite_errors_pattern, sqlite_errors_replacement, patched, count=1)
            patches_applied += 1
        
        # === PATCH 13: Also patch DevDataSqliteDb busy_timeout ===
        # DevDataSqliteDb is another SQLite database that also needs increased timeout
        devdata_busy_timeout_pattern = r'await _DevDataSqliteDb\.db\.exec\("PRAGMA busy_timeout = 3000;"\);'
        devdata_busy_timeout_replacement = f'/* {self.SQLITE_BUSY_PATCH_MARKER}{self.PATCH_VERSION} */ await _DevDataSqliteDb.db.exec("PRAGMA busy_timeout = 30000;");'
        if re.search(devdata_busy_timeout_pattern, patched) and '_DevDataSqliteDb' in patched:
            patched = re.sub(devdata_busy_timeout_pattern, devdata_busy_timeout_replacement, patched)
            patches_applied += 1
        
        # === PATCH 14: customUserAgent in API clients - replace machineId in User-Agent header ===
        # Every API request to CodeWhisperer contains User-Agent with real machine ID
        # Format: customUserAgent: `KiroIDE ${kiroVersion9} ${machineId2}`
        # Found in: getCodeWhispererRuntimeClient, getCodeWhispererStreamingClient, getCodeWhispererClientConfig
        # The machineId2 variable is assigned from getMachineId2() before being used in customUserAgent
        # Patched: Replace machineId2 assignment to read custom ID from file first
        
        # Pattern matches: const machineId2 = getMachineId2();
        # We replace it with an IIFE that reads custom machineId first
        useragent_pattern = r'const machineId2 = getMachineId2\(\);'
        useragent_replacement = f'''const machineId2 = (() => {{
    {self.USER_AGENT_PATCH_MARKER}{self.PATCH_VERSION}
    try {{
        const fs = require('fs');
        const path = require('path');
        const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
        if (fs.existsSync(customIdFile)) {{
            const customId = fs.readFileSync(customIdFile, 'utf8').trim();
            if (customId && customId.length >= 32) return customId;
        }}
    }} catch (_) {{}}
    return getMachineId2();
}})();'''
        if re.search(useragent_pattern, patched) and self.USER_AGENT_PATCH_MARKER not in patched:
            patched = re.sub(useragent_pattern, useragent_replacement, patched)
            patches_applied += 1
        
        # === PATCH 13: systeminformation fingerprinting ===
        # systeminformation library collects extensive hardware data:
        # - System UUID, BIOS serial, motherboard serial
        # - MAC addresses, disk serial numbers
        # - CPU info, GPU info, etc.
        # 
        # We intercept getStaticData() to return spoofed values derived from custom machineId
        # This ensures consistent fingerprint per account while hiding real hardware
        #
        # Target: function getStaticData(callback) { return new Promise((resolve6) => {
        sysinfo_pattern = r'function getStaticData\(callback\) \{\s+return new Promise\(\(resolve6\) => \{\s+process\.nextTick\(\(\) => \{'
        sysinfo_replacement = f'''function getStaticData(callback) {{
            {self.SYSINFO_PATCH_MARKER}{self.PATCH_VERSION} - spoof hardware fingerprint
            return new Promise((resolve6) => {{
                process.nextTick(() => {{
                    // Generate spoofed hardware IDs from custom machineId
                    const getSpoofedHardwareIds = () => {{
                        try {{
                            const fs = require('fs');
                            const path = require('path');
                            const crypto = require('crypto');
                            const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
                            
                            let seed = 'default-seed-for-hardware-spoof';
                            if (fs.existsSync(customIdFile)) {{
                                seed = fs.readFileSync(customIdFile, 'utf8').trim();
                            }}
                            
                            // Generate deterministic values from seed
                            const hash = (input, salt) => crypto.createHash('sha256').update(seed + salt + input).digest('hex');
                            const uuid = (salt) => {{
                                const h = hash('uuid', salt);
                                return `${{h.slice(0,8)}}-${{h.slice(8,12)}}-4${{h.slice(13,16)}}-${{(parseInt(h[16],16)&0x3|0x8).toString(16)}}${{h.slice(17,20)}}-${{h.slice(20,32)}}`;
                            }};
                            const serial = (salt, len=12) => hash('serial', salt).slice(0, len).toUpperCase();
                            const mac = (salt) => {{
                                const h = hash('mac', salt);
                                // Use locally administered MAC (second hex digit is 2, 6, A, or E)
                                return `${{h.slice(0,2).replace(/./,(c,i)=>i===1?'2':c)}}:${{h.slice(2,4)}}:${{h.slice(4,6)}}:${{h.slice(6,8)}}:${{h.slice(8,10)}}:${{h.slice(10,12)}}`.toLowerCase();
                            }};
                            
                            return {{
                                systemUuid: uuid('system'),
                                biosSerial: serial('bios', 16),
                                baseboardSerial: serial('baseboard', 12),
                                chassisSerial: serial('chassis', 10),
                                diskSerial: serial('disk', 20),
                                osUuid: uuid('os'),
                                hardwareUuid: uuid('hardware'),
                                mac1: mac('eth0'),
                                mac2: mac('eth1')
                            }};
                        }} catch (e) {{
                            return null;
                        }}
                    }};
                    
                    const spoofedIds = getSpoofedHardwareIds();'''
        
        if re.search(sysinfo_pattern, patched) and self.SYSINFO_PATCH_MARKER not in patched:
            patched = re.sub(sysinfo_pattern, sysinfo_replacement, patched, count=1)
            patches_applied += 1
            
            # Now we need to patch the data assignment part to use spoofed values
            # Find where data2.system = res[0] and inject spoofing
            sysinfo_data_pattern = r'(\.then\(\(res\) => \{)\s+(data2\.system = res\[0\];)'
            sysinfo_data_replacement = r'''\1
                        // Apply spoofed values to system info
                        \2
                        if (spoofedIds && data2.system) {
                            data2.system.serial = spoofedIds.biosSerial;
                            data2.system.uuid = spoofedIds.systemUuid;
                        }'''
            patched = re.sub(sysinfo_data_pattern, sysinfo_data_replacement, patched, count=1)
            
            # Patch BIOS serial
            sysinfo_bios_pattern = r'data2\.bios = res\[1\];'
            sysinfo_bios_replacement = '''data2.bios = res[1];
                        if (spoofedIds && data2.bios) {
                            data2.bios.serial = spoofedIds.biosSerial;
                        }'''
            patched = re.sub(sysinfo_bios_pattern, sysinfo_bios_replacement, patched, count=1)
            
            # Patch baseboard serial
            sysinfo_baseboard_pattern = r'data2\.baseboard = res\[2\];'
            sysinfo_baseboard_replacement = '''data2.baseboard = res[2];
                        if (spoofedIds && data2.baseboard) {
                            data2.baseboard.serial = spoofedIds.baseboardSerial;
                        }'''
            patched = re.sub(sysinfo_baseboard_pattern, sysinfo_baseboard_replacement, patched, count=1)
            
            # Patch chassis serial
            sysinfo_chassis_pattern = r'data2\.chassis = res\[3\];'
            sysinfo_chassis_replacement = '''data2.chassis = res[3];
                        if (spoofedIds && data2.chassis) {
                            data2.chassis.serial = spoofedIds.chassisSerial;
                        }'''
            patched = re.sub(sysinfo_chassis_pattern, sysinfo_chassis_replacement, patched, count=1)
            
            # Patch UUID (os and hardware)
            sysinfo_uuid_pattern = r'data2\.uuid = res\[5\];'
            sysinfo_uuid_replacement = '''data2.uuid = res[5];
                        if (spoofedIds && data2.uuid) {
                            data2.uuid.os = spoofedIds.osUuid;
                            data2.uuid.hardware = spoofedIds.hardwareUuid;
                            data2.uuid.macs = [spoofedIds.mac1, spoofedIds.mac2];
                        }'''
            patched = re.sub(sysinfo_uuid_pattern, sysinfo_uuid_replacement, patched, count=1)
            
            # Patch network interfaces (MAC addresses)
            sysinfo_net_pattern = r'data2\.net = res\[10\];'
            sysinfo_net_replacement = '''data2.net = res[10];
                        if (spoofedIds && data2.net && Array.isArray(data2.net)) {
                            const crypto = require('crypto');
                            data2.net.forEach((iface, idx) => {
                                if (iface && iface.mac && iface.mac !== '00:00:00:00:00:00') {
                                    const h = crypto.createHash('sha256').update(spoofedIds.systemUuid + 'mac' + idx).digest('hex');
                                    iface.mac = `${h.slice(0,2).replace(/./,(c,i)=>i===1?'2':c)}:${h.slice(2,4)}:${h.slice(4,6)}:${h.slice(6,8)}:${h.slice(8,10)}:${h.slice(10,12)}`.toLowerCase();
                                }
                            });
                        }'''
            patched = re.sub(sysinfo_net_pattern, sysinfo_net_replacement, patched, count=1)
            
            # Patch disk layout (serial numbers)
            sysinfo_disk_pattern = r'data2\.diskLayout = res\[12\];'
            sysinfo_disk_replacement = '''data2.diskLayout = res[12];
                        if (spoofedIds && data2.diskLayout && Array.isArray(data2.diskLayout)) {
                            const crypto = require('crypto');
                            data2.diskLayout.forEach((disk, idx) => {
                                if (disk && disk.serialNum) {
                                    const h = crypto.createHash('sha256').update(spoofedIds.systemUuid + 'disk' + idx).digest('hex');
                                    disk.serialNum = h.slice(0, 20).toUpperCase();
                                }
                            });
                        }'''
            patched = re.sub(sysinfo_disk_pattern, sysinfo_disk_replacement, patched, count=1)
        
        if patches_applied == 0:
            return content  # Ничего не запатчили
        
        return patched
    
    def _create_backup(self, js_path: Path, content: str) -> Path:
        """Создаёт бэкап файла"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        kiro_version = self._get_kiro_version() or 'unknown'
        backup_name = f"extension_{kiro_version}_{timestamp}.js.bak"
        backup_path = self.backup_dir / backup_name
        
        backup_path.write_text(content, encoding='utf-8')
        
        # Сохраняем метаданные
        meta = {
            'original_path': str(js_path),
            'kiro_version': kiro_version,
            'backup_time': datetime.now().isoformat(),
            'file_hash': hashlib.md5(content.encode()).hexdigest(),
            'file_size': len(content)
        }
        meta_path = backup_path.with_suffix('.json')
        meta_path.write_text(json.dumps(meta, indent=2))
        
        return backup_path
    
    def _get_latest_backup(self) -> Optional[Path]:
        """Получить последний бэкап"""
        if not self.backup_dir.exists():
            return None
        
        # Ищем бэкапы extension.js (новый формат) или machine-id (старый)
        backups = sorted(self.backup_dir.glob('extension_*.js.bak'), reverse=True)
        if not backups:
            backups = sorted(self.backup_dir.glob('machine-id_*.js.bak'), reverse=True)
        return backups[0] if backups else None
    
    def _get_kiro_version(self) -> Optional[str]:
        """Получить версию Kiro"""
        if not self.kiro_install_path:
            return None
        
        package_json = self.kiro_install_path / 'resources' / 'app' / 'package.json'
        if package_json.exists():
            try:
                data = json.loads(package_json.read_text())
                return data.get('version')
            except:
                pass
        return None
    
    def _is_kiro_running(self) -> bool:
        """Проверяет запущен ли Kiro"""
        import subprocess
        try:
            if os.name == 'nt':
                result = subprocess.run(
                    ['tasklist', '/FI', 'IMAGENAME eq Kiro.exe'],
                    capture_output=True, text=True
                )
                return 'Kiro.exe' in result.stdout
            else:
                result = subprocess.run(['pgrep', '-f', 'Kiro'], capture_output=True)
                return result.returncode == 0
        except:
            return False
    
    def check_update_needed(self) -> Tuple[bool, Optional[str]]:
        """
        Проверяет нужно ли обновить патч после обновления Kiro
        
        Returns:
            (needs_update, reason)
        """
        status = self.get_status()
        
        if not status.is_patched:
            return False, None
        
        # Проверяем версию патча
        if status.patch_version != self.PATCH_VERSION:
            return True, f"Patch version mismatch: {status.patch_version} -> {self.PATCH_VERSION}"
        
        # Проверяем что файл не изменился (Kiro обновился)
        js_path = self.machine_id_js_path
        if js_path:
            content = js_path.read_text(encoding='utf-8')
            if self.PATCH_MARKER not in content:
                return True, "Kiro was updated, patch was overwritten"
        
        return False, None
    
    def get_open_windows(self) -> list:
        """
        Получить список открытых окон Kiro с их рабочими директориями.
        Kiro сохраняет состояние окон в storage.json
        """
        import subprocess
        windows = []
        
        try:
            # Получаем командные строки всех процессов Kiro
            if os.name == 'nt':
                result = subprocess.run(
                    ['wmic', 'process', 'where', 'name="Kiro.exe"', 'get', 'commandline'],
                    capture_output=True, text=True
                )
                for line in result.stdout.strip().split('\n'):
                    line = line.strip()
                    if line and 'Kiro.exe' in line:
                        # Извлекаем путь к папке из командной строки
                        # Kiro запускается как: Kiro.exe "path/to/folder"
                        parts = line.split('"')
                        for i, part in enumerate(parts):
                            if i > 0 and part and os.path.isdir(part):
                                windows.append(part)
                                break
        except Exception as e:
            print(f"[!] Failed to get open windows: {e}")
        
        return windows
    
    def close_kiro(self, timeout: int = 10) -> bool:
        """
        Закрыть все процессы Kiro.
        
        Args:
            timeout: Время ожидания graceful shutdown в секундах
            
        Returns:
            True если все процессы закрыты
        """
        import subprocess
        import time
        
        if not self._is_kiro_running():
            return True
        
        try:
            if os.name == 'nt':
                # Сначала пробуем graceful shutdown через taskkill без /F
                subprocess.run(['taskkill', '/IM', 'Kiro.exe'], capture_output=True)
                
                # Ждём завершения
                for _ in range(timeout):
                    time.sleep(1)
                    if not self._is_kiro_running():
                        return True
                
                # Если не закрылся - force kill
                subprocess.run(['taskkill', '/F', '/IM', 'Kiro.exe'], capture_output=True)
                time.sleep(1)
                
                return not self._is_kiro_running()
            else:
                subprocess.run(['pkill', '-f', 'Kiro'], capture_output=True)
                time.sleep(2)
                if self._is_kiro_running():
                    subprocess.run(['pkill', '-9', '-f', 'Kiro'], capture_output=True)
                return not self._is_kiro_running()
        except Exception as e:
            print(f"[!] Failed to close Kiro: {e}")
            return False
    
    def start_kiro(self, folders: list = None) -> bool:
        """
        Запустить Kiro.
        
        Args:
            folders: Список папок для открытия. Если None - открывает без папки.
            
        Returns:
            True если Kiro запущен
        """
        import subprocess
        
        kiro_exe = self.kiro_install_path / 'Kiro.exe' if self.kiro_install_path else None
        
        if not kiro_exe or not kiro_exe.exists():
            print("[!] Kiro executable not found")
            return False
        
        try:
            if folders:
                # Открываем каждую папку в отдельном окне
                for folder in folders:
                    subprocess.Popen([str(kiro_exe), folder], 
                                   creationflags=subprocess.DETACHED_PROCESS if os.name == 'nt' else 0)
            else:
                # Просто запускаем Kiro
                subprocess.Popen([str(kiro_exe)],
                               creationflags=subprocess.DETACHED_PROCESS if os.name == 'nt' else 0)
            return True
        except Exception as e:
            print(f"[!] Failed to start Kiro: {e}")
            return False
    
    def restart_kiro(self, preserve_windows: bool = True) -> Tuple[bool, str]:
        """
        Перезапустить Kiro с сохранением открытых окон.
        
        Args:
            preserve_windows: Сохранить и восстановить открытые окна
            
        Returns:
            (success, message)
        """
        import time
        
        # Запоминаем открытые окна
        windows = []
        if preserve_windows:
            windows = self.get_open_windows()
            if windows:
                print(f"[*] Found {len(windows)} open window(s)")
        
        # Закрываем Kiro
        print("[*] Closing Kiro...")
        if not self.close_kiro():
            return False, "Failed to close Kiro"
        
        print("[OK] Kiro closed")
        time.sleep(1)
        
        # Запускаем Kiro
        print("[*] Starting Kiro...")
        if windows:
            if not self.start_kiro(windows):
                return False, "Failed to start Kiro with windows"
            return True, f"Kiro restarted with {len(windows)} window(s)"
        else:
            if not self.start_kiro():
                return False, "Failed to start Kiro"
            return True, "Kiro restarted"
    
    def patch_and_restart(self, force: bool = False) -> Tuple[bool, str]:
        """
        Применить патч и перезапустить Kiro.
        Удобная функция для полного цикла патчинга.
        
        Returns:
            (success, message)
        """
        import time
        
        # Запоминаем окна
        windows = self.get_open_windows()
        
        # Закрываем Kiro
        print("[*] Closing Kiro for patching...")
        if not self.close_kiro():
            return False, "Failed to close Kiro"
        
        time.sleep(1)
        
        # Патчим
        print("[*] Applying patch...")
        result = self.patch(force=force, skip_running_check=True)
        
        if not result.success:
            # Пробуем запустить Kiro обратно даже если патч не удался
            self.start_kiro(windows if windows else None)
            return False, f"Patch failed: {result.message}"
        
        print(f"[OK] {result.message}")
        time.sleep(1)
        
        # Запускаем Kiro
        print("[*] Starting Kiro...")
        if windows:
            self.start_kiro(windows)
            return True, f"Patched and restarted with {len(windows)} window(s)"
        else:
            self.start_kiro()
            return True, "Patched and restarted"
