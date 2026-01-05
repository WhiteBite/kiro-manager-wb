"""
Page Object Model classes for UI testing.
"""

from .base_page import BasePage
from .main_page import MainPage
from .settings_page import SettingsPage
from .profiles_page import ProfilesPage
from .console_page import ConsolePage

__all__ = [
    'BasePage',
    'MainPage', 
    'SettingsPage',
    'ProfilesPage',
    'ConsolePage',
]
