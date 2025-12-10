"""
Machine ID Service - управление Machine ID
"""

import json
import os
import sqlite3
import hashlib
import uuid
import subprocess
import platform
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any
from dataclasses import dataclass

import sys
from pathlib import Path as SysPath
sys.path.insert(0, str(SysPath(__file__).parent.parent))

from core.paths import get_paths
from core.config import get_config
from core.exceptions import MachineIdError, KiroNotInstalledError, KiroRunningError

# Windows-specific
if platform.system() == 'Windows':
    try:
        import winreg
    except ImportError:
        winreg = None


@dataclass
class TelemetryInfo:
    """Информация о Kiro telemetry IDs"""
    machine_id: Optional[str] = None
    sqm_id: Optional[str] = None
    dev_device_id: Optional[str] = None
    service_machine_id: Optional[str] = None
    kiro_installed: bool = False


@dataclass
class SystemMachineInfo:
    """Информация о системном Machine ID"""
    machine_guid: Optional[str] = None
    os_type: str = ""
    can_modify: bool = False
    requires_admin: bool = True
    backup_exists: bool = False
    backup_time: Optional[str] = None


class MachineIdService:
    """Сервис для управления Machine ID"""
    
    def __init__(self):
        self.paths = get_paths()
        self.config = get_config()
        self.os_type = platform.system().lower()
    
    # =========================================================================
    # Kiro Telemetry IDs
    # =========================================================================
    
    def get_telemetry_info(self) -> TelemetryInfo:
        """Получить все Kiro telemetry IDs"""
        info = TelemetryInfo(kiro_installed=self.paths.is_kiro_installed())
        
        if not info.kiro_installed:
            return info
        
        # Читаем из storage.json
        if self.paths.kiro_storage_json and self.paths.kiro_storage_json.exists():
            try:
                data = json.loads(self.paths.kiro_storage_json.read_text())
                info.machine_id = data.get('telemetry.machineId')
                info.sqm_id = data.get('telemetry.sqmId')
                info.dev_device_id = data.get('telemetry.devDeviceId')
            except Exception:
                pass
        
        # Читаем serviceMachineId из state.vscdb
        if self.paths.kiro_state_db and self.paths.kiro_state_db.exists():
            try:
                conn = sqlite3.connect(str(self.paths.kiro_state_db))
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT value FROM ItemTable WHERE key = 'storage.serviceMachineId'"
                )
                row = cursor.fetchone()
                if row:
                    info.service_machine_id = row[0]
                conn.close()
            except Exception:
                pass
        
        return info
    
    def backup_telemetry(self) -> Path:
        """Создать бэкап Kiro telemetry IDs"""
        info = self.get_telemetry_info()
        
        if not info.kiro_installed:
            raise KiroNotInstalledError("Kiro is not installed")
        
        backup_data = {
            'machineId': info.machine_id,
            'sqmId': info.sqm_id,
            'devDeviceId': info.dev_device_id,
            'serviceMachineId': info.service_machine_id,
            'backupTime': datetime.now().isoformat(),
            'osType': self.os_type
        }
        
        backup_file = self.paths.get_backup_file('kiro-telemetry')
        backup_file.write_text(json.dumps(backup_data, indent=2))
        
        return backup_file
    
    def reset_telemetry(self, check_running: bool = True) -> TelemetryInfo:
        """
        Сбросить все Kiro telemetry IDs
        
        Args:
            check_running: Проверять запущен ли Kiro
        
        Returns:
            TelemetryInfo с новыми ID
        
        Raises:
            KiroRunningError: если Kiro запущен
            KiroNotInstalledError: если Kiro не установлен
        """
        if not self.paths.is_kiro_installed():
            raise KiroNotInstalledError("Kiro is not installed")
        
        if check_running and self._is_kiro_running():
            raise KiroRunningError("Kiro is running. Please close it first.")
        
        # Бэкапим если настроено
        if self.config.machine_id.backup_before_reset:
            self.backup_telemetry()
        
        # Генерируем новые ID
        new_ids = TelemetryInfo(
            machine_id=self._generate_machine_id(),
            sqm_id=self._generate_sqm_id(),
            dev_device_id=self._generate_dev_device_id(),
            service_machine_id=self._generate_machine_id(),
            kiro_installed=True
        )
        
        # Обновляем storage.json
        if self.paths.kiro_storage_json.exists():
            data = json.loads(self.paths.kiro_storage_json.read_text())
            data['telemetry.machineId'] = new_ids.machine_id
            data['telemetry.sqmId'] = new_ids.sqm_id
            data['telemetry.devDeviceId'] = new_ids.dev_device_id
            self.paths.kiro_storage_json.write_text(json.dumps(data, indent=2))
        
        # Обновляем state.vscdb
        if self.paths.kiro_state_db.exists():
            try:
                conn = sqlite3.connect(str(self.paths.kiro_state_db))
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE ItemTable SET value = ? WHERE key = 'storage.serviceMachineId'",
                    (new_ids.service_machine_id,)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass
        
        return new_ids
    
    def restore_telemetry(self, backup_file: Path = None) -> bool:
        """Восстановить telemetry из бэкапа"""
        if backup_file is None:
            backups = self.paths.list_backups('kiro-telemetry')
            if not backups:
                raise MachineIdError("No backup found")
            backup_file = backups[0]
        
        if not backup_file.exists():
            raise MachineIdError(f"Backup file not found: {backup_file}")
        
        data = json.loads(backup_file.read_text())
        
        # Восстанавливаем storage.json
        if self.paths.kiro_storage_json.exists():
            storage = json.loads(self.paths.kiro_storage_json.read_text())
            if data.get('machineId'):
                storage['telemetry.machineId'] = data['machineId']
            if data.get('sqmId'):
                storage['telemetry.sqmId'] = data['sqmId']
            if data.get('devDeviceId'):
                storage['telemetry.devDeviceId'] = data['devDeviceId']
            self.paths.kiro_storage_json.write_text(json.dumps(storage, indent=2))
        
        # Восстанавливаем state.vscdb
        if self.paths.kiro_state_db.exists() and data.get('serviceMachineId'):
            try:
                conn = sqlite3.connect(str(self.paths.kiro_state_db))
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE ItemTable SET value = ? WHERE key = 'storage.serviceMachineId'",
                    (data['serviceMachineId'],)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass
        
        return True
    
    # =========================================================================
    # System Machine GUID (Windows)
    # =========================================================================
    
    def get_system_machine_info(self) -> SystemMachineInfo:
        """Получить информацию о системном Machine ID"""
        info = SystemMachineInfo(os_type=self.os_type)
        
        if self.os_type == 'windows' and winreg:
            try:
                key = winreg.OpenKey(
                    winreg.HKEY_LOCAL_MACHINE,
                    r"SOFTWARE\Microsoft\Cryptography",
                    0, winreg.KEY_READ
                )
                value, _ = winreg.QueryValueEx(key, "MachineGuid")
                winreg.CloseKey(key)
                info.machine_guid = value
                info.can_modify = True
                info.requires_admin = True
            except Exception:
                pass
        
        # Проверяем бэкап
        backup_file = self.paths.backups_dir / 'machine-guid-backup.json'
        if backup_file.exists():
            info.backup_exists = True
            try:
                data = json.loads(backup_file.read_text())
                info.backup_time = data.get('backupTime')
            except:
                pass
        
        return info
    
    def backup_system_machine_guid(self) -> Optional[Path]:
        """Бэкап системного MachineGuid"""
        if self.os_type != 'windows':
            return None
        
        info = self.get_system_machine_info()
        if not info.machine_guid:
            return None
        
        backup_data = {
            'machineGuid': info.machine_guid,
            'backupTime': datetime.now().isoformat(),
            'computerName': os.environ.get('COMPUTERNAME', 'Unknown'),
            'osType': self.os_type
        }
        
        backup_file = self.paths.backups_dir / 'machine-guid-backup.json'
        backup_file.write_text(json.dumps(backup_data, indent=2))
        
        return backup_file
    
    def reset_system_machine_guid(self) -> Optional[str]:
        """
        Сбросить системный MachineGuid (требует админ прав)
        
        Returns:
            Новый GUID или None при ошибке
        """
        if self.os_type != 'windows' or not winreg:
            raise MachineIdError("This feature is only available on Windows")
        
        # Бэкапим
        self.backup_system_machine_guid()
        
        new_guid = str(uuid.uuid4()).upper()
        
        try:
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Cryptography",
                0, winreg.KEY_SET_VALUE
            )
            winreg.SetValueEx(key, "MachineGuid", 0, winreg.REG_SZ, new_guid)
            winreg.CloseKey(key)
            return new_guid
        except PermissionError:
            raise MachineIdError("Administrator privileges required")
        except Exception as e:
            raise MachineIdError(f"Failed to reset MachineGuid: {e}")
    
    def restore_system_machine_guid(self) -> bool:
        """Восстановить системный MachineGuid из бэкапа"""
        if self.os_type != 'windows' or not winreg:
            raise MachineIdError("This feature is only available on Windows")
        
        backup_file = self.paths.backups_dir / 'machine-guid-backup.json'
        if not backup_file.exists():
            raise MachineIdError("No backup found")
        
        data = json.loads(backup_file.read_text())
        machine_guid = data.get('machineGuid')
        
        if not machine_guid:
            raise MachineIdError("Invalid backup file")
        
        try:
            key = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"SOFTWARE\Microsoft\Cryptography",
                0, winreg.KEY_SET_VALUE
            )
            winreg.SetValueEx(key, "MachineGuid", 0, winreg.REG_SZ, machine_guid)
            winreg.CloseKey(key)
            return True
        except PermissionError:
            raise MachineIdError("Administrator privileges required")
        except Exception as e:
            raise MachineIdError(f"Failed to restore MachineGuid: {e}")
    
    # =========================================================================
    # Full Reset
    # =========================================================================
    
    def full_reset(self, reset_system: bool = False, check_running: bool = True) -> Dict[str, Any]:
        """
        Полный сброс всех ID
        
        Args:
            reset_system: Также сбросить системный MachineGuid
            check_running: Проверять запущен ли Kiro
        
        Returns:
            dict с результатами
        """
        results = {
            'kiro_reset': False,
            'system_reset': False,
            'new_telemetry': None,
            'new_system_guid': None,
            'errors': []
        }
        
        # Сбрасываем Kiro telemetry
        try:
            new_telemetry = self.reset_telemetry(check_running=check_running)
            results['kiro_reset'] = True
            results['new_telemetry'] = new_telemetry
        except Exception as e:
            results['errors'].append(f"Kiro telemetry: {e}")
        
        # Сбрасываем системный MachineGuid
        if reset_system and self.os_type == 'windows':
            try:
                new_guid = self.reset_system_machine_guid()
                results['system_reset'] = True
                results['new_system_guid'] = new_guid
            except Exception as e:
                results['errors'].append(f"System MachineGuid: {e}")
        
        return results
    
    # =========================================================================
    # Helpers
    # =========================================================================
    
    def _generate_machine_id(self) -> str:
        """Генерирует machineId (64-символьный hex)"""
        random_bytes = os.urandom(32)
        timestamp = datetime.now().timestamp()
        
        hasher = hashlib.sha256()
        hasher.update(random_bytes)
        hasher.update(str(timestamp).encode())
        
        return hasher.hexdigest()
    
    def _generate_sqm_id(self) -> str:
        """Генерирует sqmId (GUID в фигурных скобках)"""
        return '{' + str(uuid.uuid4()).upper() + '}'
    
    def _generate_dev_device_id(self) -> str:
        """Генерирует devDeviceId (UUID)"""
        return str(uuid.uuid4())
    
    def _is_kiro_running(self) -> bool:
        """Проверяет запущен ли Kiro"""
        try:
            if self.os_type == 'windows':
                result = subprocess.run(
                    ['tasklist', '/FI', 'IMAGENAME eq Kiro.exe'],
                    capture_output=True, text=True
                )
                return 'Kiro.exe' in result.stdout
            else:
                result = subprocess.run(
                    ['pgrep', '-f', 'Kiro'],
                    capture_output=True
                )
                return result.returncode == 0
        except:
            return False
