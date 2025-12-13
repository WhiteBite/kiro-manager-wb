"""
Профиль спуфинга - единый источник данных для всех модулей

Все модули используют этот профиль для консистентного спуфинга.
"""

import random
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SpoofProfile:
    """Профиль для спуфинга - все параметры в одном месте"""
    
    # Browser
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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


# Предустановленные профили для разных локаций
PROFILES = {
    'new_york': SpoofProfile(
        timezone='America/New_York',
        timezone_offset=300,
        locale='en-US',
        latitude=40.7128,
        longitude=-74.0060,
    ),
    'los_angeles': SpoofProfile(
        timezone='America/Los_Angeles',
        timezone_offset=480,
        locale='en-US',
        latitude=34.0522,
        longitude=-118.2437,
    ),
    'london': SpoofProfile(
        timezone='Europe/London',
        timezone_offset=0,
        locale='en-GB',
        latitude=51.5074,
        longitude=-0.1278,
    ),
    'berlin': SpoofProfile(
        timezone='Europe/Berlin',
        timezone_offset=-60,
        locale='de-DE',
        latitude=52.5200,
        longitude=13.4050,
    ),
    'tokyo': SpoofProfile(
        timezone='Asia/Tokyo',
        timezone_offset=-540,
        locale='ja-JP',
        latitude=35.6762,
        longitude=139.6503,
    ),
}


def generate_random_profile() -> SpoofProfile:
    """Генерирует случайный консистентный профиль"""
    # Используем только английские профили чтобы AWS показывал английский UI
    english_profiles = ['new_york', 'los_angeles', 'london']
    base = PROFILES[random.choice(english_profiles)]
    
    # Случайное разрешение экрана
    resolutions = [(1920, 1080), (1366, 768), (1536, 864), (1440, 900), (1280, 720)]
    screen_width, screen_height = random.choice(resolutions)
    
    # availHeight меньше height (taskbar)
    taskbar_height = random.choice([40, 48, 30])
    
    # Случайный WebGL
    webgl_configs = [
        ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (NVIDIA)", "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (AMD)", "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)"),
        ("Google Inc. (Intel)", "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)"),
    ]
    webgl_vendor, webgl_renderer = random.choice(webgl_configs)
    
    return SpoofProfile(
        user_agent=base.user_agent,
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
        latitude=base.latitude + random.uniform(-0.01, 0.01),
        longitude=base.longitude + random.uniform(-0.01, 0.01),
        accuracy=random.uniform(20, 100),
    )
