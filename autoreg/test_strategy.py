#!/usr/bin/env python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from core.config import get_config
from core.email_generator import EmailGenerator
import os

print(f"ENV EMAIL_STRATEGY: {os.environ.get('EMAIL_STRATEGY', 'NOT SET')}")

gen = EmailGenerator.from_env()
print(f"Generator strategy: {gen.config.strategy}")

result = gen.generate()
print(f"Registration email: {result.registration_email}")
print(f"Display name: {result.display_name}")
