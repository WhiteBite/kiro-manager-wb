"""
Централизованные константы для autoreg модуля.

Все магические значения должны быть определены здесь.
"""

# === AWS/Kiro ===
DEFAULT_REGION = 'us-east-1'
KIRO_TOKEN_FILENAME = 'kiro-auth-token.json'

# === Machine ID ===
MACHINE_ID_FILENAME = 'machine-id.txt'
MACHINE_ID_LENGTH = 64  # SHA256 hex length

# === Servers ===
DEFAULT_STANDALONE_PORT = 8420
DEFAULT_LLM_API_PORT = 8421
DEFAULT_HOST = '127.0.0.1'

# === Timeouts (seconds) ===
DEFAULT_API_TIMEOUT = 30
DEFAULT_IMAP_TIMEOUT = 10
DEFAULT_BROWSER_TIMEOUT = 60
DEFAULT_OAUTH_CALLBACK_TIMEOUT = 300

# === Retry Settings ===
MAX_RETRIES = 3
RETRY_DELAY_SEC = 1.0

# === Cache ===
CACHE_TTL_SECONDS = 300  # 5 minutes

# === File Paths (relative to user data dir) ===
TOKENS_DIR = 'tokens'
BACKUPS_DIR = 'backups'
LOGS_DIR = 'logs'
PROFILES_FILE = 'imap-profiles.json'
SETTINGS_FILE = 'settings.json'
USAGE_STATS_FILE = 'usage-stats.json'
ACCOUNT_USAGE_FILE = 'account-usage.json'

# === Kiro Process ===
KIRO_PROCESS_NAME_WINDOWS = 'Kiro.exe'
KIRO_PROCESS_NAME_UNIX = 'Kiro'

# === Usage Thresholds (percent) ===
USAGE_WARNING_THRESHOLD = 80
USAGE_CRITICAL_THRESHOLD = 95
USAGE_EXHAUSTED_THRESHOLD = 100
