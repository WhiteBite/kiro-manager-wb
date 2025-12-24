"""
Proxy Checker

Проверяет работоспособность прокси перед использованием.
"""

import requests
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class ProxyCheckResult:
    """Результат проверки прокси"""
    is_working: bool
    response_time: Optional[float] = None  # в секундах
    ip_address: Optional[str] = None
    error: Optional[str] = None


class ProxyChecker:
    """Проверка работоспособности прокси"""
    
    # URL для проверки (быстрый и надёжный)
    CHECK_URLS = [
        'https://api.ipify.org?format=json',  # Возвращает IP
        'https://httpbin.org/ip',  # Альтернатива
        'https://icanhazip.com',  # Ещё одна альтернатива
    ]
    
    def __init__(self, timeout: int = 10):
        """
        Args:
            timeout: Таймаут проверки в секундах
        """
        self.timeout = timeout
    
    def check_proxy(self, proxy: str) -> ProxyCheckResult:
        """
        Проверить работоспособность прокси
        
        Args:
            proxy: Прокси в формате:
                   - "host:port"
                   - "user:pass@host:port"
                   - "http://host:port"
                   - "http://user:pass@host:port"
        
        Returns:
            ProxyCheckResult с результатом проверки
        """
        # Нормализуем формат прокси
        proxy_url = self._normalize_proxy(proxy)
        
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        # Пробуем несколько URL
        for check_url in self.CHECK_URLS:
            try:
                start_time = time.time()
                
                response = requests.get(
                    check_url,
                    proxies=proxies,
                    timeout=self.timeout,
                    headers={'User-Agent': 'Mozilla/5.0'}
                )
                
                response_time = time.time() - start_time
                
                if response.status_code == 200:
                    # Пытаемся извлечь IP
                    ip_address = None
                    try:
                        if 'json' in response.headers.get('Content-Type', ''):
                            data = response.json()
                            ip_address = data.get('ip') or data.get('origin')
                        else:
                            ip_address = response.text.strip()
                    except:
                        pass
                    
                    logger.info(f"[Proxy] ✓ Working: {proxy} (IP: {ip_address}, {response_time:.2f}s)")
                    
                    return ProxyCheckResult(
                        is_working=True,
                        response_time=response_time,
                        ip_address=ip_address
                    )
                
            except requests.exceptions.ProxyError as e:
                error = f"Proxy error: {str(e)}"
                logger.warning(f"[Proxy] ✗ {proxy}: {error}")
                return ProxyCheckResult(is_working=False, error=error)
                
            except requests.exceptions.Timeout:
                error = f"Timeout after {self.timeout}s"
                logger.warning(f"[Proxy] ✗ {proxy}: {error}")
                return ProxyCheckResult(is_working=False, error=error)
                
            except requests.exceptions.ConnectionError as e:
                error = f"Connection error: {str(e)}"
                logger.warning(f"[Proxy] ✗ {proxy}: {error}")
                return ProxyCheckResult(is_working=False, error=error)
                
            except Exception as e:
                # Пробуем следующий URL
                logger.debug(f"[Proxy] Check failed with {check_url}: {e}")
                continue
        
        # Все URL не сработали
        error = "All check URLs failed"
        logger.error(f"[Proxy] ✗ {proxy}: {error}")
        return ProxyCheckResult(is_working=False, error=error)
    
    def _normalize_proxy(self, proxy: str) -> str:
        """
        Нормализовать формат прокси к http://...
        
        Args:
            proxy: Прокси в любом формате
            
        Returns:
            Прокси в формате http://...
        """
        proxy = proxy.strip()
        
        # Уже в правильном формате
        if proxy.startswith('http://') or proxy.startswith('https://'):
            return proxy
        
        # Добавляем протокол
        return f'http://{proxy}'
    
    def check_proxy_list(self, proxies: list[str], 
                        max_workers: int = 5) -> Dict[str, ProxyCheckResult]:
        """
        Проверить список прокси параллельно
        
        Args:
            proxies: Список прокси
            max_workers: Максимальное количество параллельных проверок
            
        Returns:
            Dict {proxy: ProxyCheckResult}
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        results = {}
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_proxy = {
                executor.submit(self.check_proxy, proxy): proxy 
                for proxy in proxies
            }
            
            for future in as_completed(future_to_proxy):
                proxy = future_to_proxy[future]
                try:
                    result = future.result()
                    results[proxy] = result
                except Exception as e:
                    logger.error(f"[Proxy] Error checking {proxy}: {e}")
                    results[proxy] = ProxyCheckResult(
                        is_working=False,
                        error=str(e)
                    )
        
        return results
    
    def get_working_proxies(self, proxies: list[str], 
                           max_workers: int = 5) -> list[str]:
        """
        Получить только рабочие прокси из списка
        
        Args:
            proxies: Список прокси для проверки
            max_workers: Максимальное количество параллельных проверок
            
        Returns:
            Список рабочих прокси
        """
        results = self.check_proxy_list(proxies, max_workers)
        
        working = [
            proxy for proxy, result in results.items()
            if result.is_working
        ]
        
        logger.info(f"[Proxy] Working: {len(working)}/{len(proxies)}")
        
        return working


def check_proxy_cli(proxy: str, timeout: int = 10) -> bool:
    """
    CLI функция для быстрой проверки прокси
    
    Args:
        proxy: Прокси для проверки
        timeout: Таймаут в секундах
        
    Returns:
        True если прокси работает
    """
    checker = ProxyChecker(timeout=timeout)
    result = checker.check_proxy(proxy)
    
    if result.is_working:
        print(f"✓ Proxy is working")
        if result.ip_address:
            print(f"  IP: {result.ip_address}")
        if result.response_time:
            print(f"  Response time: {result.response_time:.2f}s")
        return True
    else:
        print(f"✗ Proxy is NOT working")
        if result.error:
            print(f"  Error: {result.error}")
        return False


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python -m autoreg.core.proxy_checker <proxy>")
        print("Example: python -m autoreg.core.proxy_checker user:pass@proxy.com:8080")
        sys.exit(1)
    
    proxy = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    success = check_proxy_cli(proxy, timeout)
    sys.exit(0 if success else 1)
