"""
Определение timezone по IP адресу

Использует бесплатные API для определения геолокации по IP.
"""

import requests
from typing import Optional, Tuple, Dict
from dataclasses import dataclass


@dataclass
class IPGeoData:
    """Данные геолокации по IP"""
    ip: str
    timezone: str
    timezone_offset: int  # минуты от UTC (положительное = запад)
    country: str
    city: str
    latitude: float
    longitude: float
    locale: str


# Маппинг timezone -> offset (минуты западнее UTC)
TIMEZONE_OFFSETS = {
    # США
    'America/New_York': 300,      # UTC-5
    'America/Chicago': 360,       # UTC-6
    'America/Denver': 420,        # UTC-7
    'America/Los_Angeles': 480,   # UTC-8
    'America/Phoenix': 420,       # UTC-7 (no DST)
    'America/Anchorage': 540,     # UTC-9
    'Pacific/Honolulu': 600,      # UTC-10
    
    # Европа
    'Europe/London': 0,           # UTC+0
    'Europe/Paris': -60,          # UTC+1
    'Europe/Berlin': -60,         # UTC+1
    'Europe/Moscow': -180,        # UTC+3
    
    # Азия
    'Asia/Tokyo': -540,           # UTC+9
    'Asia/Shanghai': -480,        # UTC+8
    'Asia/Singapore': -480,       # UTC+8
    'Asia/Dubai': -240,           # UTC+4
    'Asia/Kolkata': -330,         # UTC+5:30
    
    # Другие
    'Australia/Sydney': -660,     # UTC+11
    'Pacific/Auckland': -780,     # UTC+13
}

# Маппинг country -> locale
COUNTRY_LOCALES = {
    'US': 'en-US',
    'GB': 'en-GB',
    'CA': 'en-CA',
    'AU': 'en-AU',
    'DE': 'de-DE',
    'FR': 'fr-FR',
    'ES': 'es-ES',
    'IT': 'it-IT',
    'JP': 'ja-JP',
    'CN': 'zh-CN',
    'KR': 'ko-KR',
    'RU': 'ru-RU',
    'BR': 'pt-BR',
    'IN': 'hi-IN',
}


def get_timezone_offset(timezone: str) -> int:
    """Получает offset для timezone"""
    return TIMEZONE_OFFSETS.get(timezone, 0)


def get_locale_for_country(country_code: str) -> str:
    """Получает locale для страны"""
    return COUNTRY_LOCALES.get(country_code, 'en-US')


def detect_ip_geo() -> Optional[IPGeoData]:
    """
    Определяет геолокацию по текущему IP.
    
    Пробует несколько бесплатных API.
    """
    
    # Попытка 1: ip-api.com (бесплатный, без ключа)
    try:
        resp = requests.get(
            'http://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon,timezone,query',
            timeout=5
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get('status') == 'success':
                tz = data.get('timezone', 'America/New_York')
                country = data.get('countryCode', 'US')
                return IPGeoData(
                    ip=data.get('query', ''),
                    timezone=tz,
                    timezone_offset=get_timezone_offset(tz),
                    country=country,
                    city=data.get('city', ''),
                    latitude=data.get('lat', 0),
                    longitude=data.get('lon', 0),
                    locale=get_locale_for_country(country)
                )
    except Exception as e:
        print(f"[IP-GEO] ip-api.com failed: {e}")
    
    # Попытка 2: ipapi.co (бесплатный лимит)
    try:
        resp = requests.get('https://ipapi.co/json/', timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            tz = data.get('timezone', 'America/New_York')
            country = data.get('country_code', 'US')
            return IPGeoData(
                ip=data.get('ip', ''),
                timezone=tz,
                timezone_offset=get_timezone_offset(tz),
                country=country,
                city=data.get('city', ''),
                latitude=data.get('latitude', 0),
                longitude=data.get('longitude', 0),
                locale=get_locale_for_country(country)
            )
    except Exception as e:
        print(f"[IP-GEO] ipapi.co failed: {e}")
    
    # Попытка 3: ipinfo.io (бесплатный лимит)
    try:
        resp = requests.get('https://ipinfo.io/json', timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            tz = data.get('timezone', 'America/New_York')
            country = data.get('country', 'US')
            loc = data.get('loc', '0,0').split(',')
            return IPGeoData(
                ip=data.get('ip', ''),
                timezone=tz,
                timezone_offset=get_timezone_offset(tz),
                country=country,
                city=data.get('city', ''),
                latitude=float(loc[0]) if len(loc) > 0 else 0,
                longitude=float(loc[1]) if len(loc) > 1 else 0,
                locale=get_locale_for_country(country)
            )
    except Exception as e:
        print(f"[IP-GEO] ipinfo.io failed: {e}")
    
    return None


def get_system_timezone() -> Tuple[str, int]:
    """
    Получает timezone из системы.
    
    Returns:
        (timezone_name, offset_minutes)
    """
    import time
    import datetime
    
    # Получаем offset в секундах
    if time.daylight:
        offset_seconds = -time.altzone
    else:
        offset_seconds = -time.timezone
    
    # Конвертируем в минуты (положительное = запад от UTC)
    offset_minutes = -offset_seconds // 60
    
    # Пытаемся получить имя timezone
    try:
        import zoneinfo
        tz = datetime.datetime.now().astimezone().tzinfo
        tz_name = str(tz)
    except:
        # Fallback - угадываем по offset
        tz_name = _guess_timezone_by_offset(offset_minutes)
    
    return tz_name, offset_minutes


def _guess_timezone_by_offset(offset: int) -> str:
    """Угадывает timezone по offset"""
    for tz, off in TIMEZONE_OFFSETS.items():
        if off == offset:
            return tz
    return 'America/New_York'


if __name__ == '__main__':
    print("Testing IP geolocation...")
    
    geo = detect_ip_geo()
    if geo:
        print(f"\n[IP GEO DATA]")
        print(f"  IP: {geo.ip}")
        print(f"  Country: {geo.country}")
        print(f"  City: {geo.city}")
        print(f"  Timezone: {geo.timezone}")
        print(f"  TZ Offset: {geo.timezone_offset} min")
        print(f"  Coords: {geo.latitude}, {geo.longitude}")
        print(f"  Locale: {geo.locale}")
    else:
        print("Failed to detect IP geo")
    
    print("\n[SYSTEM TIMEZONE]")
    tz, offset = get_system_timezone()
    print(f"  Timezone: {tz}")
    print(f"  Offset: {offset} min")
