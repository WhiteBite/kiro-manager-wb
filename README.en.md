# ⚡ Kiro Manager WB

[![Build](https://github.com/WhiteBite/kiro-manager-wb/actions/workflows/build.yml/badge.svg)](https://github.com/WhiteBite/kiro-manager-wb/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/WhiteBite/kiro-manager-wb?label=version)](https://github.com/WhiteBite/kiro-manager-wb/releases)
[![License](https://img.shields.io/github/license/WhiteBite/kiro-manager-wb)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/WhiteBite/kiro-manager-wb/total)](https://github.com/WhiteBite/kiro-manager-wb/releases)
[![Telegram](https://img.shields.io/badge/Telegram-Channel-blue?logo=telegram)](https://t.me/whitebite_devsoft)

[Русский](README.md) | English | [中文](README.zh.md)

![Screenshot](images/screenshot.png)

Extension for those who are tired of dealing with Kiro limits.

> ⚠️ **DISCLAIMER**
>
> This is an educational project created for learning purposes — exploring VS Code Extension API, OAuth flows, and browser automation.
>
> The author takes no responsibility for the use of this code. Everything you do is at your own risk. If you get banned, blocked, disconnected, fired, or anything else happens — that's your problem. You've been warned.
>
> By using this code you confirm that you understand what you're doing and accept all consequences.

---

## 🎯 What is this

Full-featured account manager for Kiro IDE:

- **Multi-account** — store unlimited accounts, switch in one click
- **Usage monitoring** — see requests spent, remaining, reset time
- **Auto-registration** — automatic AWS Builder ID account registration
- **Machine ID patching** — bypass hardware fingerprint bans
- **LLM API server** — OpenAI-compatible API using Kiro tokens for Claude
- **10 languages** — EN, RU, DE, ES, FR, PT, ZH, JA, KO, HI

---

## 🚀 Quick Start

### Installation

1. Download `.vsix` from [Releases](../../releases)
2. Open Kiro → `Ctrl+Shift+P` → `Extensions: Install from VSIX`
3. Select downloaded file
4. Restart Kiro

### From source

```bash
git clone https://github.com/WhiteBite/kiro-manager-wb
cd kiro-manager-wb
npm install
npm run package
```

---

## 📦 Features

### Account Switching

Kiro stores token in `state.vscdb`. The extension:
1. Reads tokens from `~/.kiro-manager-wb/tokens/`
2. On switch — writes selected token to Kiro database
3. Kiro picks up new token without restart

### Usage Tracking

Shows for each account:
- Current usage / limit
- Usage percentage
- Time until reset
- Subscription type (Free/Pro)

### Machine ID Patching

AWS bans by `machineId` if it sees multiple accounts from one computer. Patch allows:
- Use unique `machineId` for each account
- Auto-rotate ID on account switch
- Bypass "unusual activity" bans

```bash
# Apply patch
python -m autoreg.cli patch apply

# Generate new machine ID
python -m autoreg.cli patch generate-id
```

---

## 🤖 Auto-Registration

Automatic AWS Builder ID account registration.

### Requirements

- Python 3.11+
- Chrome/Chromium browser
- Mail server with IMAP

### Email Strategies

| Strategy | Description | Example |
|----------|-------------|---------|
| `single` | One email = one account | `user@gmail.com` |
| `plus_alias` | Gmail/Outlook aliases | `user+kiro123@gmail.com` |
| `catch_all` | Catch-all domain | `random123@mydomain.com` |
| `pool` | Pool of ready emails | List from file/env |

### Configuration

Create `.env` in `autoreg/` folder:

```env
# IMAP settings
IMAP_SERVER=imap.gmail.com
IMAP_USER=your@gmail.com
IMAP_PASSWORD=app-password

# Email strategy
EMAIL_STRATEGY=plus_alias

# For catch_all
EMAIL_DOMAIN=mydomain.com

# For pool (JSON array)
EMAIL_POOL=["user1@mail.ru", "user2@mail.ru:password"]
```

### Running

```bash
cd autoreg

# Auto-registration (uses configured email strategy)
python -m registration.register_auto

# With specific email
python -m registration.register --email user@domain.com

# Batch registration (5 accounts)
python -m registration.register --count 5

# Headless mode (no GUI)
python -m registration.register --email user@domain.com --headless
```

### Anti-Fingerprint

Built-in spoofing system to bypass AWS detection:

- **Canvas** — canvas fingerprint randomization
- **WebGL** — vendor/renderer spoofing
- **Audio** — audio fingerprint modification
- **Navigator** — userAgent, platform, languages spoofing
- **Screen** — resolution randomization
- **Timezone** — IP synchronization
- **WebRTC** — local IP hiding
- **Fonts** — font list randomization
- **Behavior** — human-like typing delays

Spoofing profiles are saved per email — same fingerprint on re-registration.

---

## 🌐 LLM API Server

OpenAI-compatible API server using Kiro tokens for Claude.

### Running

```bash
cd autoreg
python -m llm.run_llm_server
# API at http://127.0.0.1:8421
```

### Usage

```bash
curl http://127.0.0.1:8421/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Available Models

| Model | Credit | Description |
|-------|--------|-------------|
| `claude-opus-4.5` | 2.2x | Most capable |
| `claude-sonnet-4.5` | 1.3x | Latest Sonnet |
| `claude-sonnet-4` | 1.3x | Hybrid reasoning |
| `claude-haiku-4.5` | 0.4x | Fast & cheap |
| `auto` | 1x | Auto-select |

### Endpoints

- `GET /v1/models` — list models
- `POST /v1/chat/completions` — chat (streaming supported)
- `GET /health` — health check
- `GET /pool/status` — token pool status
- `GET /pool/quotas` — all token quotas

---

## 🖥️ Standalone Web App

Web interface for management without VS Code.

```bash
cd autoreg
python run.py
# Opens http://127.0.0.1:8420
```

Features:
- View and switch accounts
- Real-time quota monitoring
- Run auto-reg via UI
- Manage Kiro patch
- WebSocket for live logs

---

## 🛠️ CLI Reference

```bash
cd autoreg

# ═══════════════════════════════════════════════════════════════
# STATUS
# ═══════════════════════════════════════════════════════════════
python cli.py status                      # Overall system status

# ═══════════════════════════════════════════════════════════════
# TOKENS
# ═══════════════════════════════════════════════════════════════
python cli.py tokens                      # List tokens (alias for list)
python cli.py tokens list                 # List all tokens
python cli.py tokens switch <name>        # Switch to account
python cli.py tokens switch <name> -r     # Switch with forced refresh
python cli.py tokens refresh              # Refresh best token
python cli.py tokens refresh <name>       # Refresh specific token
python cli.py tokens refresh <name> -a    # Refresh and activate

# ═══════════════════════════════════════════════════════════════
# QUOTAS
# ═══════════════════════════════════════════════════════════════
python cli.py quota                       # Current account quota
python cli.py quota --all                 # ALL accounts quotas
python cli.py quota --all --refresh       # All quotas with token refresh
python cli.py quota --json                # JSON format

# ═══════════════════════════════════════════════════════════════
# MACHINE ID
# ═══════════════════════════════════════════════════════════════
python cli.py machine                     # Machine ID status
python cli.py machine status              # Detailed status
python cli.py machine backup              # Backup Kiro telemetry
python cli.py machine backup -s           # + backup system GUID
python cli.py machine reset               # Reset all IDs
python cli.py machine reset -s            # + reset system GUID
python cli.py machine reset -f            # Skip Kiro running check
python cli.py machine restore             # Restore from backup

# ═══════════════════════════════════════════════════════════════
# KIRO PATCHING
# ═══════════════════════════════════════════════════════════════
python cli.py patch                       # Patch status
python cli.py patch status                # Detailed status
python cli.py patch status --json         # JSON format
python cli.py patch apply                 # Apply patch
python cli.py patch apply -f              # Force re-patch
python cli.py patch remove                # Remove patch (restore original)
python cli.py patch generate-id           # Generate new Machine ID
python cli.py patch generate-id <id>      # Set specific ID (64 hex)
python cli.py patch check                 # Check if patch needs update
python cli.py patch check --auto-fix      # Auto-update if needed
python cli.py patch restart               # Restart Kiro (preserves windows)
python cli.py patch apply-restart         # Patch + restart Kiro

# ═══════════════════════════════════════════════════════════════
# KIRO IDE
# ═══════════════════════════════════════════════════════════════
python cli.py kiro                        # Kiro status
python cli.py kiro status                 # Detailed status
python cli.py kiro start                  # Start Kiro
python cli.py kiro stop                   # Stop Kiro
python cli.py kiro restart                # Restart Kiro
python cli.py kiro info                   # Info: version, User-Agent, Machine ID
python cli.py kiro info --json            # JSON format

# ═══════════════════════════════════════════════════════════════
# SSO IMPORT (import from browser)
# ═══════════════════════════════════════════════════════════════
python cli.py sso-import                  # Interactive import
python cli.py sso-import <cookie>         # Import from x-amz-sso_authn cookie
python cli.py sso-import <cookie> -a      # Import and activate in Kiro
python cli.py sso-import <cookie> -r eu-west-1  # Different region

# ═══════════════════════════════════════════════════════════════
# LLM API SERVER
# ═══════════════════════════════════════════════════════════════
python -m llm.run_llm_server              # Start on :8421

# ═══════════════════════════════════════════════════════════════
# STANDALONE WEB APP
# ═══════════════════════════════════════════════════════════════
python run.py                             # Start on :8420

# ═══════════════════════════════════════════════════════════════
# DEBUG
# ═══════════════════════════════════════════════════════════════
python -m debugger.run                    # Debug registration session
```

### SSO Import — import existing account

If you already have a logged-in account in browser:

1. Open https://view.awsapps.com/start
2. DevTools (F12) → Application → Cookies
3. Copy `x-amz-sso_authn` value
4. Run:
```bash
python cli.py sso-import <copied_value> -a
```

Token will be imported and activated in Kiro.

---

## 🐛 Troubleshooting

### Auto-reg hangs on captcha
AWS sometimes shows captcha. Solve manually or restart.

### Browser doesn't open
```bash
# Check Chrome
python -c "from autoreg.registration.browser import find_chrome_path; print(find_chrome_path())"
```

### Python not found
Make sure `python` or `python3` is in PATH.

### Token not applying
Try restarting Kiro. Rare, but happens.

### Ban after registration
1. Generate new machine ID: `python cli.py patch generate-id`
2. Use different IP (VPN/proxy)
3. Wait 24 hours

---

## 📝 Build Commands

```bash
npm run build              # Build extension
npm run build:standalone   # Build standalone HTML
npm run build:all          # Build everything
npm run package            # Create .vsix

npm run release:patch      # Release patch version (6.1.0 -> 6.1.1)
npm run release:minor      # Release minor version (6.1.0 -> 6.2.0)
npm run release:major      # Release major version (6.1.0 -> 7.0.0)
```

---

## 📜 License

MIT. Do whatever you want, but remember the disclaimer.

---

## 🤝 Contributing

Found a bug? Have an idea? Open an issue or PR.

---

## 📢 Contact

Telegram: [@whitebite_devsoft](https://t.me/whitebite_devsoft)
