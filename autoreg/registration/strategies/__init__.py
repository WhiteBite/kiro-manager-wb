"""
Registration strategies

Available strategies:
- AutomatedStrategy: DrissionPage automation (legacy, higher ban risk)
- WebViewStrategy: Real browser with manual input (new, low ban risk)
- DeviceFlowStrategy: Device flow OAuth (for headless servers)
"""

from .automated_strategy import AutomatedRegistrationStrategy
from .webview_strategy import WebViewRegistrationStrategy

__all__ = [
    'AutomatedRegistrationStrategy',
    'WebViewRegistrationStrategy',
]
