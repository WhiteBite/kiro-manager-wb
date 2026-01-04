"""
Профиль спуфинга - единый источник данных для всех модулей

Все модули используют этот профиль для консистентного спуфинга.
"""

import json
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .ip_timezone import detect_ip_geo, get_system_timezone, IPGeoData


@dataclass
class SpoofProfile:
    """Профиль для спуфинга - все параметры в одном месте"""
    
    # Browser - актуальная версия Chrome (декабрь 2024)
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    platform: str = "Win32"
    vendor: str = "Google Inc."
    
    # Screen
    screen_width: int = 1920
    screen_height: int = 1080
    avail_width: int = 1920
    avail_height: int = 1040  # height - taskbar
    color_depth: int = 24
    pixel_ratio: float = 1.0
    
    # Hardware
    hardware_concurrency: int = 8
    device_memory: int = 8
    max_touch_points: int = 0
    
    # WebGL
    webgl_vendor: str = "Google Inc. (NVIDIA)"
    webgl_renderer: str = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
    
    # Timezone
    timezone: str = "America/New_York"
    timezone_offset: int = 300  # минуты от UTC
    locale: str = "en-US"
    
    # Geolocation
    latitude: float = 40.7128
    longitude: float = -74.0060
    accuracy: float = 50.0
    
    # Canvas/Audio noise seed (для консистентного fingerprint)
    noise_seed: int = field(default_factory=lambda: random.randint(1, 1000000))
    
    # Fonts
    fonts: list = field(default_factory=lambda: [
        'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS',
        'Consolas', 'Courier New', 'Georgia', 'Impact', 'Lucida Console',
        'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana'
    ])
    
    def to_dict(self) -> dict:
        """Сериализует профиль в словарь для сохранения"""
        return {
            'user_agent': self.user_agent,
            'platform': self.platform,
            'vendor': self.vendor,
            'screen_width': self.screen_width,
            'screen_height': self.screen_height,
            'avail_width': self.avail_width,
            'avail_height': self.avail_height,
            'color_depth': self.color_depth,
            'pixel_ratio': self.pixel_ratio,
            'hardware_concurrency': self.hardware_concurrency,
            'device_memory': self.device_memory,
            'max_touch_points': self.max_touch_points,
            'webgl_vendor': self.webgl_vendor,
            'webgl_renderer': self.webgl_renderer,
            'timezone': self.timezone,
            'timezone_offset': self.timezone_offset,
            'locale': self.locale,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'accuracy': self.accuracy,
            'noise_seed': self.noise_seed,
            'fonts': self.fonts,
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'SpoofProfile':
        """Создаёт профиль из словаря"""
        return cls(
            user_agent=data.get('user_agent', cls.user_agent),
            platform=data.get('platform', cls.platform),
            vendor=data.get('vendor', cls.vendor),
            screen_width=data.get('screen_width', 1920),
            screen_height=data.get('screen_height', 1080),
            avail_width=data.get('avail_width', 1920),
            avail_height=data.get('avail_height', 1040),
            color_depth=data.get('color_depth', 24),
            pixel_ratio=data.get('pixel_ratio', 1.0),
            hardware_concurrency=data.get('hardware_concurrency', 8),
            device_memory=data.get('device_memory', 8),
            max_touch_points=data.get('max_touch_points', 0),
            webgl_vendor=data.get('webgl_vendor', ''),
            webgl_renderer=data.get('webgl_renderer', ''),
            timezone=data.get('timezone', 'America/New_York'),
            timezone_offset=data.get('timezone_offset', 300),
            locale=data.get('locale', 'en-US'),
            latitude=data.get('latitude', 40.7128),
            longitude=data.get('longitude', -74.0060),
            accuracy=data.get('accuracy', 50.0),
            noise_seed=data.get('noise_seed', random.randint(1, 1000000)),
            fonts=data.get('fonts', []),
        )


# Предустановленные профили для разных локаций
# ВАЖНО: timezone_offset - это минуты ЗАПАДНЕЕ UTC (положительное = запад)
# getTimezoneOffset() возвращает положительное для западных таймзон
PROFILES = {
    'new_york': SpoofProfile(
        timezone='America/New_York',
        timezone_offset=300,  # UTC-5 = +300 минут
        locale='en-US',
        latitude=40.7128,
        longitude=-74.0060,
    ),
    'los_angeles': SpoofProfile(
        timezone='America/Los_Angeles',
        timezone_offset=480,  # UTC-8 = +480 минут
        locale='en-US',
        latitude=34.0522,
        longitude=-118.2437,
    ),
    'chicago': SpoofProfile(
        timezone='America/Chicago',
        timezone_offset=360,  # UTC-6 = +360 минут
        locale='en-US',
        latitude=41.8781,
        longitude=-87.6298,
    ),
    'london': SpoofProfile(
        timezone='Europe/London',
        timezone_offset=0,  # UTC+0 = 0 минут
        locale='en-GB',
        latitude=51.5074,
        longitude=-0.1278,
    ),
    'berlin': SpoofProfile(
        timezone='Europe/Berlin',
        timezone_offset=-60,  # UTC+1 = -60 минут (зима)
        locale='de-DE',
        latitude=52.5200,
        longitude=13.4050,
    ),
    'tokyo': SpoofProfile(
        timezone='Asia/Tokyo',
        timezone_offset=-540,  # UTC+9 = -540 минут
        locale='ja-JP',
        latitude=35.6762,
        longitude=139.6503,
    ),
}


def generate_profile_from_ip() -> Optional[SpoofProfile]:
    """
    Генерирует профиль на основе IP геолокации.
    
    Timezone и координаты берутся из IP, остальное рандомизируется.
    Это важно чтобы timezone совпадал с IP!
    """
    geo = detect_ip_geo()
    if not geo:
        return None
    
    print(f"[PROFILE] Detected IP geo: {geo.city}, {geo.country} ({geo.timezone})")
    
    # Случайное разрешение экрана
    resolutions = [(1920, 1080), (1366, 768), (1536, 864), (1440, 900), (1280, 720)]
    screen_width, screen_height = random.choice(resolutions)
    taskbar_height = random.choice([40, 48, 30])
    
    # Случайный WebGL
    webgl_configs = [
        ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
    ]
    webgl_vendor, webgl_renderer = random.choice(webgl_configs)
    
    # Актуальные версии Chrome
    chrome_versions = ['131.0.0.0', '130.0.0.0', '129.0.0.0']
    chrome_version = random.choice(chrome_versions)
    user_agent = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version} Safari/537.36"
    
    return SpoofProfile(
        user_agent=user_agent,
        platform="Win32",
        vendor="Google Inc.",
        screen_width=screen_width,
        screen_height=screen_height,
        avail_width=screen_width,
        avail_height=screen_height - taskbar_height,
        color_depth=24,
        pixel_ratio=random.choice([1.0, 1.25, 1.5]),
        hardware_concurrency=random.choice([4, 6, 8, 12]),
        device_memory=random.choice([4, 8, 16]),
        max_touch_points=0,
        webgl_vendor=webgl_vendor,
        webgl_renderer=webgl_renderer,
        timezone=geo.timezone,
        timezone_offset=geo.timezone_offset,
        locale=geo.locale,
        latitude=geo.latitude + random.uniform(-0.05, 0.05),
        longitude=geo.longitude + random.uniform(-0.05, 0.05),
        accuracy=random.uniform(20, 100),
    )


def generate_random_profile() -> SpoofProfile:
    """
    Генерирует профиль спуфинга.
    
    Приоритет:
    1. По IP геолокации (timezone совпадает с IP)
    2. Fallback на случайный US профиль
    """
    # Сначала пробуем по IP
    profile = generate_profile_from_ip()
    if profile:
        return profile
    
    print("[PROFILE] IP geo failed, using random US profile")
    
    # Fallback на случайный US профиль
    us_profiles = ['new_york', 'los_angeles', 'chicago']
    base = PROFILES[random.choice(us_profiles)]
    
    # Случайное разрешение экрана
    resolutions = [(1920, 1080), (1366, 768), (1536, 864), (1440, 900), (1280, 720)]
    screen_width, screen_height = random.choice(resolutions)
    taskbar_height = random.choice([40, 48, 30])
    
    # Случайный WebGL
    webgl_configs = [
        ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
    ]
    webgl_vendor, webgl_renderer = random.choice(webgl_configs)
    
    # Актуальные версии Chrome
    chrome_versions = ['131.0.0.0', '130.0.0.0', '129.0.0.0']
    chrome_version = random.choice(chrome_versions)
    user_agent = f"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{chrome_version} Safari/537.36"
    
    return SpoofProfile(
        user_agent=user_agent,
        platform=base.platform,
        vendor=base.vendor,
        screen_width=screen_width,
        screen_height=screen_height,
        avail_width=screen_width,
        avail_height=screen_height - taskbar_height,
        color_depth=24,
        pixel_ratio=random.choice([1.0, 1.25, 1.5]),
        hardware_concurrency=random.choice([4, 6, 8, 12]),
        device_memory=random.choice([4, 8, 16]),
        max_touch_points=0,
        webgl_vendor=webgl_vendor,
        webgl_renderer=webgl_renderer,
        timezone=base.timezone,
        timezone_offset=base.timezone_offset,
        locale=base.locale,
        latitude=base.latitude + random.uniform(-0.05, 0.05),
        longitude=base.longitude + random.uniform(-0.05, 0.05),
        accuracy=random.uniform(20, 100),
    )


# === Сохранение/загрузка профиля ===


def get_profile_path(email: str) -> Path:
    """Возвращает путь к файлу профиля для email"""
    from core.paths import get_paths
    profiles_dir = get_paths().tokens_dir / 'profiles'
    profiles_dir.mkdir(parents=True, exist_ok=True)
    # Используем email как имя файла (заменяем @ и .)
    safe_name = email.replace('@', '_at_').replace('.', '_')
    return profiles_dir / f'{safe_name}.json'


def save_profile(email: str, profile: SpoofProfile) -> bool:
    """
    Сохраняет профиль спуфинга для аккаунта.
    
    Вызывается после успешной регистрации.
    """
    try:
        path = get_profile_path(email)
        data = profile.to_dict()
        data['email'] = email
        data['saved_at'] = __import__('datetime').datetime.now().isoformat()
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"[PROFILE] Saved fingerprint for {email}")
        return True
    except Exception as e:
        print(f"[PROFILE] Failed to save: {e}")
        return False


def load_profile(email: str) -> Optional[SpoofProfile]:
    """
    Загружает сохранённый профиль для аккаунта.
    
    Используется при работе с токеном для консистентности fingerprint.
    """
    try:
        path = get_profile_path(email)
        if not path.exists():
            return None
        
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        profile = SpoofProfile.from_dict(data)
        print(f"[PROFILE] Loaded fingerprint for {email}")
        return profile
    except Exception as e:
        print(f"[PROFILE] Failed to load: {e}")
        return None


def get_or_create_profile(email: str = None) -> SpoofProfile:
    """
    Получает профиль для email или создаёт новый.
    
    Если email указан и профиль существует - загружает его.
    Иначе генерирует новый.
    """
    if email:
        profile = load_profile(email)
        if profile:
            return profile
    
    return generate_random_profile()
