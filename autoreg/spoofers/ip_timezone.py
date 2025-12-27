"""
Определение timezone по IP адресу

Использует бесплатные API для определения геолокации по IP.
Поддерживает локальный режим без внешних запросов для приватности.
"""

import requests
import time
import datetime
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
    'Europe/Kiev': -120,          # UTC+2
    'Europe/Warsaw': -60,         # UTC+1
    'Europe/Amsterdam': -60,      # UTC+1
    'Europe/Rome': -60,           # UTC+1
    'Europe/Madrid': -60,         # UTC+1
    'Europe/Stockholm': -60,      # UTC+1
    'Europe/Helsinki': -120,      # UTC+2
    'Europe/Athens': -120,        # UTC+2
    'Europe/Istanbul': -180,      # UTC+3
    
    # Азия
    'Asia/Tokyo': -540,           # UTC+9
    'Asia/Shanghai': -480,        # UTC+8
    'Asia/Singapore': -480,       # UTC+8
    'Asia/Dubai': -240,           # UTC+4
    'Asia/Kolkata': -330,         # UTC+5:30
    'Asia/Seoul': -540,           # UTC+9
    'Asia/Hong_Kong': -480,       # UTC+8
    'Asia/Bangkok': -420,         # UTC+7
    'Asia/Jakarta': -420,         # UTC+7
    'Asia/Manila': -480,          # UTC+8
    'Asia/Taipei': -480,          # UTC+8
    'Asia/Kuala_Lumpur': -480,    # UTC+8
    'Asia/Ho_Chi_Minh': -420,     # UTC+7
    'Asia/Karachi': -300,         # UTC+5
    'Asia/Tehran': -210,          # UTC+3:30
    'Asia/Jerusalem': -120,       # UTC+2
    
    # Другие
    'Australia/Sydney': -660,     # UTC+11
    'Australia/Melbourne': -660,  # UTC+11
    'Australia/Perth': -480,      # UTC+8
    'Pacific/Auckland': -780,     # UTC+13
    
    # Южная Америка
    'America/Sao_Paulo': 180,     # UTC-3
    'America/Buenos_Aires': 180,  # UTC-3
    'America/Santiago': 240,      # UTC-4
    'America/Lima': 300,          # UTC-5
    'America/Bogota': 300,        # UTC-5
    'America/Mexico_City': 360,   # UTC-6
    
    # Канада
    'America/Toronto': 300,       # UTC-5
    'America/Vancouver': 480,     # UTC-8
    'America/Edmonton': 420,      # UTC-7
    
    # Африка
    'Africa/Cairo': -120,         # UTC+2
    'Africa/Johannesburg': -120,  # UTC+2
    'Africa/Lagos': -60,          # UTC+1
    'Africa/Nairobi': -180,       # UTC+3
}


# Маппинг timezone -> геоданные (country, city, lat, lon)
# Используется для локального режима без внешних API
TIMEZONE_GEO_DATA: Dict[str, Dict] = {
    # США
    'America/New_York': {'country': 'US', 'city': 'New York', 'lat': 40.7128, 'lon': -74.0060},
    'America/Chicago': {'country': 'US', 'city': 'Chicago', 'lat': 41.8781, 'lon': -87.6298},
    'America/Denver': {'country': 'US', 'city': 'Denver', 'lat': 39.7392, 'lon': -104.9903},
    'America/Los_Angeles': {'country': 'US', 'city': 'Los Angeles', 'lat': 34.0522, 'lon': -118.2437},
    'America/Phoenix': {'country': 'US', 'city': 'Phoenix', 'lat': 33.4484, 'lon': -112.0740},
    'America/Anchorage': {'country': 'US', 'city': 'Anchorage', 'lat': 61.2181, 'lon': -149.9003},
    'Pacific/Honolulu': {'country': 'US', 'city': 'Honolulu', 'lat': 21.3069, 'lon': -157.8583},
    
    # Европа
    'Europe/London': {'country': 'GB', 'city': 'London', 'lat': 51.5074, 'lon': -0.1278},
    'Europe/Paris': {'country': 'FR', 'city': 'Paris', 'lat': 48.8566, 'lon': 2.3522},
    'Europe/Berlin': {'country': 'DE', 'city': 'Berlin', 'lat': 52.5200, 'lon': 13.4050},
    'Europe/Moscow': {'country': 'RU', 'city': 'Moscow', 'lat': 55.7558, 'lon': 37.6173},
    'Europe/Kiev': {'country': 'UA', 'city': 'Kyiv', 'lat': 50.4501, 'lon': 30.5234},
    'Europe/Warsaw': {'country': 'PL', 'city': 'Warsaw', 'lat': 52.2297, 'lon': 21.0122},
    'Europe/Amsterdam': {'country': 'NL', 'city': 'Amsterdam', 'lat': 52.3676, 'lon': 4.9041},
    'Europe/Rome': {'country': 'IT', 'city': 'Rome', 'lat': 41.9028, 'lon': 12.4964},
    'Europe/Madrid': {'country': 'ES', 'city': 'Madrid', 'lat': 40.4168, 'lon': -3.7038},
    'Europe/Stockholm': {'country': 'SE', 'city': 'Stockholm', 'lat': 59.3293, 'lon': 18.0686},
    'Europe/Helsinki': {'country': 'FI', 'city': 'Helsinki', 'lat': 60.1699, 'lon': 24.9384},
    'Europe/Athens': {'country': 'GR', 'city': 'Athens', 'lat': 37.9838, 'lon': 23.7275},
    'Europe/Istanbul': {'country': 'TR', 'city': 'Istanbul', 'lat': 41.0082, 'lon': 28.9784},
    
    # Азия
    'Asia/Tokyo': {'country': 'JP', 'city': 'Tokyo', 'lat': 35.6762, 'lon': 139.6503},
    'Asia/Shanghai': {'country': 'CN', 'city': 'Shanghai', 'lat': 31.2304, 'lon': 121.4737},
    'Asia/Singapore': {'country': 'SG', 'city': 'Singapore', 'lat': 1.3521, 'lon': 103.8198},
    'Asia/Dubai': {'country': 'AE', 'city': 'Dubai', 'lat': 25.2048, 'lon': 55.2708},
    'Asia/Kolkata': {'country': 'IN', 'city': 'Mumbai', 'lat': 19.0760, 'lon': 72.8777},
    'Asia/Seoul': {'country': 'KR', 'city': 'Seoul', 'lat': 37.5665, 'lon': 126.9780},
    'Asia/Hong_Kong': {'country': 'HK', 'city': 'Hong Kong', 'lat': 22.3193, 'lon': 114.1694},
    'Asia/Bangkok': {'country': 'TH', 'city': 'Bangkok', 'lat': 13.7563, 'lon': 100.5018},
    'Asia/Jakarta': {'country': 'ID', 'city': 'Jakarta', 'lat': -6.2088, 'lon': 106.8456},
    'Asia/Manila': {'country': 'PH', 'city': 'Manila', 'lat': 14.5995, 'lon': 120.9842},
    'Asia/Taipei': {'country': 'TW', 'city': 'Taipei', 'lat': 25.0330, 'lon': 121.5654},
    'Asia/Kuala_Lumpur': {'country': 'MY', 'city': 'Kuala Lumpur', 'lat': 3.1390, 'lon': 101.6869},
    'Asia/Ho_Chi_Minh': {'country': 'VN', 'city': 'Ho Chi Minh City', 'lat': 10.8231, 'lon': 106.6297},
    'Asia/Karachi': {'country': 'PK', 'city': 'Karachi', 'lat': 24.8607, 'lon': 67.0011},
    'Asia/Tehran': {'country': 'IR', 'city': 'Tehran', 'lat': 35.6892, 'lon': 51.3890},
    'Asia/Jerusalem': {'country': 'IL', 'city': 'Jerusalem', 'lat': 31.7683, 'lon': 35.2137},
    
    # Австралия и Океания
    'Australia/Sydney': {'country': 'AU', 'city': 'Sydney', 'lat': -33.8688, 'lon': 151.2093},
    'Australia/Melbourne': {'country': 'AU', 'city': 'Melbourne', 'lat': -37.8136, 'lon': 144.9631},
    'Australia/Perth': {'country': 'AU', 'city': 'Perth', 'lat': -31.9505, 'lon': 115.8605},
    'Pacific/Auckland': {'country': 'NZ', 'city': 'Auckland', 'lat': -36.8485, 'lon': 174.7633},
    
    # Южная Америка
    'America/Sao_Paulo': {'country': 'BR', 'city': 'São Paulo', 'lat': -23.5505, 'lon': -46.6333},
    'America/Buenos_Aires': {'country': 'AR', 'city': 'Buenos Aires', 'lat': -34.6037, 'lon': -58.3816},
    'America/Santiago': {'country': 'CL', 'city': 'Santiago', 'lat': -33.4489, 'lon': -70.6693},
    'America/Lima': {'country': 'PE', 'city': 'Lima', 'lat': -12.0464, 'lon': -77.0428},
    'America/Bogota': {'country': 'CO', 'city': 'Bogotá', 'lat': 4.7110, 'lon': -74.0721},
    'America/Mexico_City': {'country': 'MX', 'city': 'Mexico City', 'lat': 19.4326, 'lon': -99.1332},
    
    # Канада
    'America/Toronto': {'country': 'CA', 'city': 'Toronto', 'lat': 43.6532, 'lon': -79.3832},
    'America/Vancouver': {'country': 'CA', 'city': 'Vancouver', 'lat': 49.2827, 'lon': -123.1207},
    'America/Edmonton': {'country': 'CA', 'city': 'Edmonton', 'lat': 53.5461, 'lon': -113.4938},
    
    # Африка
    'Africa/Cairo': {'country': 'EG', 'city': 'Cairo', 'lat': 30.0444, 'lon': 31.2357},
    'Africa/Johannesburg': {'country': 'ZA', 'city': 'Johannesburg', 'lat': -26.2041, 'lon': 28.0473},
    'Africa/Lagos': {'country': 'NG', 'city': 'Lagos', 'lat': 6.5244, 'lon': 3.3792},
    'Africa/Nairobi': {'country': 'KE', 'city': 'Nairobi', 'lat': -1.2921, 'lon': 36.8219},
}

# Маппинг country -> locale
COUNTRY_LOCALES = {
    'US': 'en-US',
    'GB': 'en-GB',
    'CA': 'en-CA',
    'AU': 'en-AU',
    'NZ': 'en-NZ',
    'DE': 'de-DE',
    'FR': 'fr-FR',
    'ES': 'es-ES',
    'IT': 'it-IT',
    'NL': 'nl-NL',
    'SE': 'sv-SE',
    'FI': 'fi-FI',
    'PL': 'pl-PL',
    'GR': 'el-GR',
    'TR': 'tr-TR',
    'UA': 'uk-UA',
    'JP': 'ja-JP',
    'CN': 'zh-CN',
    'TW': 'zh-TW',
    'HK': 'zh-HK',
    'KR': 'ko-KR',
    'RU': 'ru-RU',
    'BR': 'pt-BR',
    'IN': 'hi-IN',
    'SG': 'en-SG',
    'MY': 'ms-MY',
    'TH': 'th-TH',
    'VN': 'vi-VN',
    'ID': 'id-ID',
    'PH': 'en-PH',
    'PK': 'ur-PK',
    'IR': 'fa-IR',
    'IL': 'he-IL',
    'AE': 'ar-AE',
    'EG': 'ar-EG',
    'ZA': 'en-ZA',
    'NG': 'en-NG',
    'KE': 'en-KE',
    'AR': 'es-AR',
    'CL': 'es-CL',
    'CO': 'es-CO',
    'PE': 'es-PE',
    'MX': 'es-MX',
}


def get_timezone_offset(timezone: str) -> int:
    """Получает offset для timezone"""
    return TIMEZONE_OFFSETS.get(timezone, 0)


def get_locale_for_country(country_code: str) -> str:
    """Получает locale для страны"""
    return COUNTRY_LOCALES.get(country_code, 'en-US')


def get_local_geo_data() -> IPGeoData:
    """
    Получает геоданные на основе системного timezone.
    
    Не делает внешних запросов - полностью локальная функция.
    Используется для приватности (не раскрывает реальный IP).
    
    Returns:
        IPGeoData с примерными данными на основе системного timezone
    """
    tz_name, offset_minutes = get_system_timezone()
    
    # Ищем геоданные для timezone
    geo_data = TIMEZONE_GEO_DATA.get(tz_name)
    
    if not geo_data:
        # Если timezone не найден, пробуем найти по offset
        for tz, data in TIMEZONE_GEO_DATA.items():
            if TIMEZONE_OFFSETS.get(tz) == offset_minutes:
                geo_data = data
                tz_name = tz
                break
    
    # Fallback на New York если ничего не найдено
    if not geo_data:
        geo_data = TIMEZONE_GEO_DATA['America/New_York']
        tz_name = 'America/New_York'
        offset_minutes = TIMEZONE_OFFSETS['America/New_York']
    
    country = geo_data['country']
    
    return IPGeoData(
        ip='127.0.0.1',  # Локальный IP - не раскрываем реальный
        timezone=tz_name,
        timezone_offset=offset_minutes,
        country=country,
        city=geo_data['city'],
        latitude=geo_data['lat'],
        longitude=geo_data['lon'],
        locale=get_locale_for_country(country)
    )


def detect_ip_geo(use_external_api: bool = True) -> Optional[IPGeoData]:
    """
    Определяет геолокацию по текущему IP.
    
    Args:
        use_external_api: Если True, использует внешние API (ip-api.com и др.)
                         Если False, возвращает данные на основе системного timezone
                         (не раскрывает реальный IP - для приватности)
    
    Returns:
        IPGeoData или None если не удалось определить
    
    Note:
        При use_external_api=False IP будет '127.0.0.1', а геоданные
        будут примерными на основе системного timezone.
        
        При use_external_api=True, если все API недоступны,
        автоматически используется fallback на локальные данные.
    """
    
    # Если не используем внешние API - возвращаем локальные данные
    if not use_external_api:
        print("[IP-GEO] Using local timezone data (no external API)")
        return get_local_geo_data()
    
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
    
    # Fallback на локальные данные если все API недоступны
    print("[IP-GEO] All external APIs failed, using local timezone fallback")
    return get_local_geo_data()


def get_system_timezone() -> Tuple[str, int]:
    """
    Получает timezone из системы.
    
    Returns:
        (timezone_name, offset_minutes)
    """
    # Получаем offset в секундах
    if time.daylight:
        offset_seconds = -time.altzone
    else:
        offset_seconds = -time.timezone
    
    # Конвертируем в минуты (положительное = запад от UTC)
    offset_minutes = -offset_seconds // 60
    
    # Пытаемся получить имя timezone
    tz_name = None
    
    # Метод 1: через datetime.astimezone()
    try:
        local_tz = datetime.datetime.now().astimezone().tzinfo
        if local_tz:
            tz_str = str(local_tz)
            # Проверяем что это валидное имя timezone (не просто offset)
            if '/' in tz_str and tz_str in TIMEZONE_GEO_DATA:
                tz_name = tz_str
    except Exception:
        pass
    
    # Метод 2: через переменную окружения TZ
    if not tz_name:
        import os
        env_tz = os.environ.get('TZ')
        if env_tz and env_tz in TIMEZONE_GEO_DATA:
            tz_name = env_tz
    
    # Метод 3: через zoneinfo (Python 3.9+)
    if not tz_name:
        try:
            import zoneinfo
            # Пробуем получить системный timezone
            local_tz = datetime.datetime.now(datetime.timezone.utc).astimezone().tzinfo
            if hasattr(local_tz, 'key'):
                tz_name = local_tz.key
        except Exception:
            pass
    
    # Fallback - угадываем по offset
    if not tz_name:
        tz_name = _guess_timezone_by_offset(offset_minutes)
    
    return tz_name, offset_minutes


def _guess_timezone_by_offset(offset: int) -> str:
    """Угадывает timezone по offset"""
    for tz, off in TIMEZONE_OFFSETS.items():
        if off == offset:
            return tz
    return 'America/New_York'


if __name__ == '__main__':
    print("=" * 50)
    print("Testing IP geolocation")
    print("=" * 50)
    
    # Тест 1: Локальные данные (без внешних API)
    print("\n[TEST 1] Local timezone data (use_external_api=False)")
    print("-" * 50)
    geo_local = detect_ip_geo(use_external_api=False)
    if geo_local:
        print(f"  IP: {geo_local.ip}")
        print(f"  Country: {geo_local.country}")
        print(f"  City: {geo_local.city}")
        print(f"  Timezone: {geo_local.timezone}")
        print(f"  TZ Offset: {geo_local.timezone_offset} min")
        print(f"  Coords: {geo_local.latitude}, {geo_local.longitude}")
        print(f"  Locale: {geo_local.locale}")
    
    # Тест 2: Внешние API (по умолчанию)
    print("\n[TEST 2] External API data (use_external_api=True)")
    print("-" * 50)
    geo_external = detect_ip_geo(use_external_api=True)
    if geo_external:
        print(f"  IP: {geo_external.ip}")
        print(f"  Country: {geo_external.country}")
        print(f"  City: {geo_external.city}")
        print(f"  Timezone: {geo_external.timezone}")
        print(f"  TZ Offset: {geo_external.timezone_offset} min")
        print(f"  Coords: {geo_external.latitude}, {geo_external.longitude}")
        print(f"  Locale: {geo_external.locale}")
    
    # Тест 3: Системный timezone
    print("\n[TEST 3] System timezone detection")
    print("-" * 50)
    tz, offset = get_system_timezone()
    print(f"  Timezone: {tz}")
    print(f"  Offset: {offset} min")
    
    print("\n" + "=" * 50)
    print("Tests completed!")
    print("=" * 50)
