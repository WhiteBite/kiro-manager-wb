"""
Process utilities - общие функции для работы с процессами
"""

import subprocess
import platform
import time
from typing import Optional


def is_process_running(process_name: str) -> bool:
    """
    Проверяет запущен ли процесс по имени.
    
    Args:
        process_name: Имя процесса (например 'chrome', 'python')
    
    Returns:
        True если процесс запущен
    """
    try:
        os_type = platform.system().lower()
        
        if os_type == 'windows':
            # На Windows добавляем .exe если нет
            if not process_name.lower().endswith('.exe'):
                process_name = f"{process_name}.exe"
            result = subprocess.run(
                ['tasklist', '/FI', f'IMAGENAME eq {process_name}'],
                capture_output=True, text=True
            )
            return process_name.lower() in result.stdout.lower()
        else:
            result = subprocess.run(
                ['pgrep', '-f', process_name],
                capture_output=True
            )
            return result.returncode == 0
    except Exception:
        return False


def wait_for_process_exit(process_name: str, timeout: int = 30) -> bool:
    """
    Ожидает завершения процесса.
    
    Args:
        process_name: Имя процесса
        timeout: Максимальное время ожидания в секундах
    
    Returns:
        True если процесс завершился, False если таймаут
    """
    for _ in range(timeout):
        if not is_process_running(process_name):
            return True
        time.sleep(1)
    
    return False


def kill_process(process_name: str, force: bool = False) -> bool:
    """
    Завершает процесс по имени.
    
    Args:
        process_name: Имя процесса
        force: Принудительное завершение (SIGKILL/-9)
    
    Returns:
        True если процесс завершён
    """
    os_type = platform.system().lower()
    
    try:
        if os_type == 'windows':
            if not process_name.lower().endswith('.exe'):
                process_name = f"{process_name}.exe"
            flags = ['/F'] if force else []
            subprocess.run(['taskkill', *flags, '/IM', process_name], capture_output=True)
        else:
            signal = '-9' if force else '-15'
            subprocess.run(['pkill', signal, '-f', process_name], capture_output=True)
        
        return wait_for_process_exit(process_name, timeout=5)
    except Exception:
        return False


def is_kiro_running() -> bool:
    """
    Проверяет запущен ли Kiro IDE.
    
    Returns:
        True если Kiro запущен, False иначе
    """
    return is_process_running('Kiro')


def kill_kiro(force: bool = False, timeout: int = 10) -> bool:
    """
    Завершает процесс Kiro IDE.
    
    Args:
        force: Принудительное завершение
        timeout: Таймаут ожидания завершения (секунды)
    
    Returns:
        True если процесс завершён успешно
    """
    os_type = platform.system().lower()
    
    try:
        if os_type == 'windows':
            flags = ['/F'] if force else []
            subprocess.run(['taskkill', *flags, '/IM', 'Kiro.exe'], capture_output=True)
        else:
            signal = '-9' if force else '-15'
            subprocess.run(['pkill', signal, '-f', 'Kiro'], capture_output=True)
        
        return wait_for_process_exit('Kiro', timeout=timeout)
    except Exception:
        return False
