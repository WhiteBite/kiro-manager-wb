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
    kiro_version: Optional[str] = None
    patch_version: Optional[str] = None
    extension_js_path: Optional[str] = None
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
    
    PATCH_VERSION = "5.0.0"  # Версия 5 - патчим ВСЕ getMachineId функции
    PATCH_MARKER = "// KIRO_BATCH_LOGIN_PATCH_v"
    
    # Путь к файлу с кастомным machine ID
    CUSTOM_ID_FILE = ".kiro-manager-wb/machine-id.txt"
    
    def __init__(self):
        self.paths = get_paths()
        self._kiro_path: Optional[Path] = None
        self._machine_id_js: Optional[Path] = None
    
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
        
        # Проверяем патч
        content = js_path.read_text(encoding='utf-8')
        if self.PATCH_MARKER in content:
            status.is_patched = True
            # Извлекаем версию патча
            match = re.search(rf'{re.escape(self.PATCH_MARKER)}(\d+\.\d+\.\d+)', content)
            if match:
                status.patch_version = match.group(1)
        
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
        
        # Создаём файл с machine ID если не существует
        if not self.custom_id_path.exists():
            self.generate_machine_id()
        
        return PatchResult(
            success=True,
            message=f"Kiro patched successfully! MachineId will be read from {self.custom_id_path}",
            backup_path=str(backup_path),
            patched_file=str(js_path)
        )
    
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
        
        # Восстанавливаем
        shutil.copy2(backup, js_path)
        
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
        Применяет патч к extension.js (версия 5.0 - патчим ВСЕ getMachineId функции)
        
        Kiro использует machineId в нескольких местах:
        1. getMachineId() - телеметрия
        2. getMachineId2() - User-Agent заголовок (KiroIDE-0.7.45-{machineId})
        3. userAttributes() - атрибуты телеметрии
        
        Все нужно патчить!
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
