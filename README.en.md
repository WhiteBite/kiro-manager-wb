# ⚡ Kiro Account Switcher

[![Build](https://github.com/YOUR_USERNAME/kiro-extension/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/kiro-extension/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/YOUR_USERNAME/kiro-extension?label=version)](https://github.com/YOUR_USERNAME/kiro-extension/releases)
[![License](https://img.shields.io/github/license/YOUR_USERNAME/kiro-extension)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/YOUR_USERNAME/kiro-extension/total)](https://github.com/YOUR_USERNAME/kiro-extension/releases)

[Русский](README.md) | English | [中文](README.zh.md)

Extension for those who are tired of dealing with Kiro limits.

> ⚠️ **DISCLAIMER**
>
> This is an educational project created for learning purposes — exploring VS Code Extension API, OAuth flows, and browser automation.
>
> The author takes no responsibility for the use of this code. Everything you do is at your own risk. If you get banned, blocked, disconnected, fired, or anything else happens — that's your problem. You've been warned.
>
> By using this code you confirm that you understand what you're doing and accept all consequences.

---

## What is this

Extension for Kiro IDE that allows you to:

- **Store multiple accounts** and switch between them in one click
- **See usage** for each account — requests spent, remaining, reset time
- **Auto-register new accounts** directly from the interface (requires email with IMAP)
- **Refresh tokens** — manually or automatically before expiration
- **Export account list** to JSON
- **Copy tokens and passwords** to clipboard

All this lives in a convenient sidebar panel with a proper UI, not in the console like savages.

---

## How it works

### Account switching

Kiro stores the auth token in its internal database (`state.vscdb`). The extension:

1. Reads tokens from `~/.kiro-batch-login/tokens/`
2. On switch — writes the selected token to Kiro's database
3. Kiro picks up the new token and works under a different account

No IDE restart needed. Switching takes a couple of seconds.

### Usage tracking

The extension reads usage data from the same Kiro database and shows:

- Current request usage
- Account limit
- Usage percentage
- Time until limit reset

Data is cached locally, so even after switching to another account — you can see stats for all of them.

### Auto-registration

The juiciest part. The extension can automatically:

1. Generate an email on the specified domain
2. Open a browser (Playwright)
3. Complete registration on AWS/Kiro
4. Get verification code from email via IMAP
5. Enter the code, complete registration
6. Save the token to the tokens folder

All without human intervention. Well, almost — sometimes there's a captcha.

---

## Installation

### From release (recommended)

1. Download `.vsix` from [Releases](../../releases)
2. Open Kiro
3. `Ctrl+Shift+P` → `Extensions: Install from VSIX`
4. Select the downloaded file
5. Restart Kiro

### From source

```bash
git clone <repo>
cd kiro-extension
npm install
npm run package
```

You'll get `kiro-account-switcher-X.X.X.vsix` — install as above.

---

## Configuration

All settings: `Ctrl+,` → search `kiroAccountSwitcher`

### Main

| Setting                      | Description                          | Default                      |
| ---------------------------- | ------------------------------------ | ---------------------------- |
| `tokensPath`                 | Path to tokens folder                | `~/.kiro-batch-login/tokens` |
| `autoSwitch.enabled`         | Auto-refresh token before expiration | `false`                      |
| `autoSwitch.intervalMinutes` | Minutes before expiration to refresh | `50`                         |

### IMAP (for auto-reg)

| Setting               | Description                      | Example             |
| --------------------- | -------------------------------- | ------------------- |
| `imap.server`         | IMAP server address              | `mail.example.com`  |
| `imap.user`           | Login (usually email)            | `admin@example.com` |
| `imap.password`       | Password                         | `***`               |
| `autoreg.emailDomain` | Domain for generating emails     | `example.com`       |
| `autoreg.headless`    | Hide browser during registration | `false`             |

### Debug

| Setting                    | Description                | Default |
| -------------------------- | -------------------------- | ------- |
| `debug.verbose`            | Verbose console logs       | `false` |
| `debug.screenshotsOnError` | Take screenshots on errors | `true`  |

---

## Token format

Tokens are stored in `~/.kiro-batch-login/tokens/` as JSON files:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJjdHkiOiJKV1QiLCJlbmMiOi...",
  "expiresAt": "2024-12-10T20:00:00.000Z",
  "accountName": "user@example.com",
  "email": "user@example.com",
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
}
```

Filename can be anything, extension `.json`. The extension reads all files from the folder.

You can add tokens manually — just drop a JSON file into the folder and click Refresh.

---

## Using auto-registration

### Requirements

- Python 3.10+
- Mail server with IMAP access
- Domain for emails (catch-all or individual mailboxes)

### First run

1. Configure IMAP in extension settings
2. Click **Auto-Reg** button in the panel
3. Wait — on first run, dependencies will be installed:
   - `playwright` (browser)
   - `imapclient` (email handling)
   - and others from `requirements.txt`
4. Browser will open, registration will proceed
5. On success — token will appear in the list

### What can go wrong

- **Captcha** — sometimes AWS shows captcha. Solve manually or restart.
- **Email not arriving** — check IMAP settings, look at logs.
- **Browser not opening** — check Playwright is installed: `playwright install chromium`
- **Python not found** — make sure `python` or `python3` is in PATH.

Logs are written to `~/.kiro-batch-login/autoreg.log` and extension console.

---

## Commands

Available via `Ctrl+Shift+P`:

| Command                         | What it does                |
| ------------------------------- | --------------------------- |
| `Kiro: Switch Account`          | Quick switch via QuickPick  |
| `Kiro: List Available Accounts` | Refresh account list        |
| `Kiro: Import Token from File`  | Import token from JSON file |
| `Kiro: Show Current Account`    | Show current account        |
| `Kiro: Sign Out`                | Sign out of current account |
| `Kiro: Open Account Dashboard`  | Open accounts panel         |

---

## Building

### Build requirements

- Node.js 18+
- npm

### Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Build .vsix package
npm run package
```

### CI/CD

GitHub Actions is configured in the repository:

- Automatic build on push/PR
- Release `.vsix` on tag `v*`

---

## Project structure

```
kiro-extension/
├── src/
│   ├── extension.ts      # Entry point, commands, provider
│   ├── accounts.ts       # Token and account handling
│   ├── utils.ts          # Utilities, Kiro DB access
│   ├── webview.ts        # HTML generation for panel
│   ├── types.ts          # TypeScript types
│   └── webview/          # UI components
├── autoreg-bundled/      # Python autoreg scripts
├── dist/                 # Compiled JS (gitignore)
├── package.json
├── tsconfig.json
└── .vscodeignore
```

---

## Known issues

- **Usage sometimes doesn't update** — click Refresh or wait. Kiro caches data.
- **Auto-reg hangs on captcha** — AWS sometimes requires captcha. Solve manually or restart.
- **Linux needs python3** — make sure symlink exists or configure PATH.
- **Token not applying** — try restarting Kiro. Rare, but happens.

---

## FAQ

**Q: Is this legal?**  
A: This is an educational project. Read the disclaimer above.

**Q: Will I get banned?**  
A: Possibly. Read the disclaimer above.

**Q: Why Python for auto-reg?**  
A: Because Playwright in Python is more convenient for this kind of automation, plus there was existing code.

**Q: Can I use it without auto-reg?**  
A: Yes. Just don't configure IMAP and don't click the button. Account switching works independently.

**Q: How to add an existing account?**  
A: Log into Kiro, find the token in `state.vscdb`, save as JSON to tokens folder. Or use Import.

---

## License

MIT. Do whatever you want, but remember the disclaimer.

---

## Contributing

Found a bug? Have an idea? Open an issue or PR. Code is ugly in places, but it works.
