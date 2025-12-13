"""
Kiro Patcher Service - патчинг getMachineId() в Kiro IDE
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
    machine_id_file: Optional[str] = None
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
    """Сервис для патчинга Kiro IDE"""
    
    PATCH_VERSION = "1.0.0"
    PATCH_MARKER = "// KIRO_BATCH_LOGIN_PATCH_v"
    
    # Путь к файлу с кастомным machine ID
    CUSTOM_ID_FILE = ".kiro-batch-login/machine-id.txt"
    
    def __init__(self):
        self.paths = get_paths()
        self._kiro_path: Optional[Path] = None
        self._machine_id_js: Optional[Path] = None
    
    @property
    def kiro_install_path(self) -> Optional[Path]:
        """Путь установки Kiro"""
        if self._kiro_path:
            return self._kiro_path
        
        # Windows default path
        local_app_data = os.environ.get('LOCALAPPDATA', '')
        if local_app_data:
            path = Path(local_app_data) / 'Programs' / 'Kiro'
            if path.exists():
                self._kiro_path = path
                return path
        
        return None
    
    @property
    def machine_id_js_path(self) -> Optional[Path]:
        """Путь к файлу machine-id-*.js"""
        if self._machine_id_js:
            return self._machine_id_js
        
        kiro_path = self.kiro_install_path
        if not kiro_path:
            return None
        
        # Ищем файл machine-id-*.js
        shared_dist = kiro_path / 'resources' / 'app' / 'extensions' / 'kiro.kiro-agent' / 'packages' / 'kiro-shared' / 'dist'
        
        if not shared_dist.exists():
            return None
        
        # Ищем файл по паттерну machine-id-*.js
        for f in shared_dist.glob('machine-id-*.js'):
            self._machine_id_js = f
            return f
        
        return None
    
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
        
        # Проверяем файл machine-id
        js_path = self.machine_id_js_path
        if not js_path:
            status.error = "machine-id-*.js not found"
            return status
        
        status.machine_id_file = str(js_path)
        
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
        
        js_path = self.machine_id_js_path
        if not js_path:
            return PatchResult(success=False, message="machine-id-*.js not found")
        
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
            return PatchResult(success=False, message="Failed to apply patch - pattern not found")
        
        # Записываем
        js_path.write_text(patched_content, encoding='utf-8')
        
        # Создаём файл с machine ID если не существует
        if not self.custom_id_path.exists():
            self.generate_machine_id()
        
        return PatchResult(
            success=True,
            message="Kiro patched successfully!",
            backup_path=str(backup_path),
            patched_file=str(js_path)
        )
    
    def unpatch(self, skip_running_check: bool = False) -> PatchResult:
        """Восстановить оригинальный файл из бэкапа"""
        if not skip_running_check and self._is_kiro_running():
            return PatchResult(success=False, message="Kiro is running. Please close it first.")
        
        js_path = self.machine_id_js_path
        if not js_path:
            return PatchResult(success=False, message="machine-id-*.js not found")
        
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
        """Применяет патч к содержимому файла"""
        # Ищем функцию getMachineId
        # Паттерн: function getMachineId(){...return machineIdSync()...}
        
        # Патч-код который читает из файла
        patch_code = f'''
{self.PATCH_MARKER}{self.PATCH_VERSION}
function getMachineId() {{
  try {{
    const fs = require('fs');
    const path = require('path');
    const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-batch-login', 'machine-id.txt');
    if (fs.existsSync(customIdFile)) {{
      const customId = fs.readFileSync(customIdFile, 'utf8').trim();
      if (customId && /^[a-f0-9]{{64}}$/i.test(customId)) {{
        return customId;
      }}
    }}
  }} catch (e) {{}}
  return _originalGetMachineId();
}}
// END_PATCH
'''
        
        # Паттерн 1: function getMachineId(){...}
        pattern1 = r'(function\s+getMachineId\s*\(\s*\)\s*\{[^}]*\})'
        
        # Паттерн 2: const getMachineId = () => {...}
        pattern2 = r'((?:const|let|var)\s+getMachineId\s*=\s*\(\s*\)\s*=>\s*\{[^}]*\})'
        
        # Паттерн 3: getMachineId: function(){...}
        pattern3 = r'(getMachineId\s*:\s*function\s*\(\s*\)\s*\{[^}]*\})'
        
        for pattern in [pattern1, pattern2, pattern3]:
            match = re.search(pattern, content, re.DOTALL)
            if match:
                original_func = match.group(1)
                # Переименовываем оригинальную функцию
                renamed = original_func.replace('getMachineId', '_originalGetMachineId', 1)
                # Вставляем патч после оригинальной функции
                replacement = renamed + '\n' + patch_code
                return content.replace(original_func, replacement, 1)
        
        return content
    
    def _create_backup(self, js_path: Path, content: str) -> Path:
        """Создаёт бэкап файла"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        kiro_version = self._get_kiro_version() or 'unknown'
        backup_name = f"machine-id_{kiro_version}_{timestamp}.js.bak"
        backup_path = self.backup_dir / backup_name
        
        backup_path.write_text(content, encoding='utf-8')
        
        # Сохраняем метаданные
        meta = {
            'original_path': str(js_path),
            'kiro_version': kiro_version,
            'backup_time': datetime.now().isoformat(),
            'file_hash': hashlib.md5(content.encode()).hexdigest()
        }
        meta_path = backup_path.with_suffix('.json')
        meta_path.write_text(json.dumps(meta, indent=2))
        
        return backup_path
    
    def _get_latest_backup(self) -> Optional[Path]:
        """Получить последний бэкап"""
        if not self.backup_dir.exists():
            return None
        
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
