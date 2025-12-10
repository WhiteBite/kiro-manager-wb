# ⚡ Kiro Account Switcher

[![Build](https://github.com/YOUR_USERNAME/kiro-extension/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/kiro-extension/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/YOUR_USERNAME/kiro-extension?label=version)](https://github.com/YOUR_USERNAME/kiro-extension/releases)
[![License](https://img.shields.io/github/license/YOUR_USERNAME/kiro-extension)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/YOUR_USERNAME/kiro-extension/total)](https://github.com/YOUR_USERNAME/kiro-extension/releases)

[Русский](README.md) | [English](README.en.md) | 中文

专为那些厌倦了 Kiro 限制的人准备的扩展。

> ⚠️ **免责声明**
>
> 这是一个教育项目，旨在学习 VS Code 扩展 API、OAuth 流程和浏览器自动化。
>
> 作者对使用此代码不承担任何责任。您所做的一切都是自担风险。如果您被封禁、被阻止、被断开连接、被解雇或发生其他任何事情——那是您的问题。我已经警告过您了。
>
> 使用此代码即表示您确认了解自己在做什么并接受所有后果。

---

## 这是什么

Kiro IDE 扩展，允许您：

- **存储多个账户**并一键切换
- **查看使用情况** — 已用请求数、剩余数量、重置时间
- **自动注册新账户**（需要支持 IMAP 的邮箱）
- **刷新令牌** — 手动或在过期前自动刷新
- **导出账户列表**为 JSON
- **复制令牌和密码**到剪贴板

所有这些都在一个方便的侧边栏面板中，有正常的 UI，而不是像野蛮人一样在控制台中操作。

---

## 工作原理

### 账户切换

Kiro 将授权令牌存储在其内部数据库（`state.vscdb`）中。扩展：

1. 从 `~/.kiro-batch-login/tokens/` 读取令牌
2. 切换时 — 将选定的令牌写入 Kiro 数据库
3. Kiro 获取新令牌并在另一个账户下工作

无需重启 IDE。切换只需几秒钟。

### 使用量跟踪

扩展从同一个 Kiro 数据库读取使用数据并显示：

- 当前请求使用量
- 账户限制
- 使用百分比
- 限制重置时间

数据在本地缓存，因此即使切换到另一个账户 — 您也可以看到所有账户的统计信息。

### 自动注册

最精彩的部分。扩展可以自动：

1. 在指定域名上生成邮箱
2. 打开浏览器（Playwright）
3. 在 AWS/Kiro 上完成注册
4. 通过 IMAP 从邮箱获取验证码
5. 输入验证码，完成注册
6. 将令牌保存到令牌文件夹

全程无需人工干预。嗯，几乎是 — 有时会有验证码。

---

## 安装

### 从发布版安装（推荐）

1. 从 [Releases](../../releases) 下载 `.vsix`
2. 打开 Kiro
3. `Ctrl+Shift+P` → `Extensions: Install from VSIX`
4. 选择下载的文件
5. 重启 Kiro

### 从源码安装

```bash
git clone <repo>
cd kiro-extension
npm install
npm run package
```

您将得到 `kiro-account-switcher-X.X.X.vsix` — 按上述方式安装。

---

## 配置

所有设置：`Ctrl+,` → 搜索 `kiroAccountSwitcher`

### 主要设置

| 设置                         | 描述               | 默认值                       |
| ---------------------------- | ------------------ | ---------------------------- |
| `tokensPath`                 | 令牌文件夹路径     | `~/.kiro-batch-login/tokens` |
| `autoSwitch.enabled`         | 过期前自动刷新令牌 | `false`                      |
| `autoSwitch.intervalMinutes` | 过期前多少分钟刷新 | `50`                         |

### IMAP（用于自动注册）

| 设置                  | 描述                 | 示例                |
| --------------------- | -------------------- | ------------------- |
| `imap.server`         | IMAP 服务器地址      | `mail.example.com`  |
| `imap.user`           | 登录名（通常是邮箱） | `admin@example.com` |
| `imap.password`       | 密码                 | `***`               |
| `autoreg.emailDomain` | 生成邮箱的域名       | `example.com`       |
| `autoreg.headless`    | 注册时隐藏浏览器     | `false`             |

### 调试

| 设置                       | 描述           | 默认值  |
| -------------------------- | -------------- | ------- |
| `debug.verbose`            | 详细控制台日志 | `false` |
| `debug.screenshotsOnError` | 出错时截图     | `true`  |

---

## 令牌格式

令牌以 JSON 文件形式存储在 `~/.kiro-batch-login/tokens/`：

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

文件名可以是任意的，扩展名 `.json`。扩展会读取文件夹中的所有文件。

您可以手动添加令牌 — 只需将 JSON 文件放入文件夹并点击刷新。

---

## 使用自动注册

### 要求

- Python 3.10+
- 支持 IMAP 访问的邮件服务器
- 用于邮箱的域名（catch-all 或单独的邮箱）

### 首次运行

1. 在扩展设置中配置 IMAP
2. 点击面板中的 **Auto-Reg** 按钮
3. 等待 — 首次运行时会安装依赖：
   - `playwright`（浏览器）
   - `imapclient`（邮件处理）
   - 以及 `requirements.txt` 中的其他依赖
4. 浏览器将打开，开始注册
5. 成功后 — 令牌将出现在列表中

### 可能出现的问题

- **验证码** — 有时 AWS 会显示验证码。手动解决或重启。
- **邮件未到达** — 检查 IMAP 设置，查看日志。
- **浏览器未打开** — 检查 Playwright 是否已安装：`playwright install chromium`
- **找不到 Python** — 确保 `python` 或 `python3` 在 PATH 中。

日志写入 `~/.kiro-batch-login/autoreg.log` 和扩展控制台。

---

## 命令

通过 `Ctrl+Shift+P` 可用：

| 命令                            | 功能                    |
| ------------------------------- | ----------------------- |
| `Kiro: Switch Account`          | 通过 QuickPick 快速切换 |
| `Kiro: List Available Accounts` | 刷新账户列表            |
| `Kiro: Import Token from File`  | 从 JSON 文件导入令牌    |
| `Kiro: Show Current Account`    | 显示当前账户            |
| `Kiro: Sign Out`                | 退出当前账户            |
| `Kiro: Open Account Dashboard`  | 打开账户面板            |

---

## 构建

### 构建要求

- Node.js 18+
- npm

### 命令

```bash
# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 构建 .vsix 包
npm run package
```

### CI/CD

仓库中配置了 GitHub Actions：

- push/PR 时自动构建
- 创建 `v*` 标签时发布 `.vsix`

---

## 项目结构

```
kiro-extension/
├── src/
│   ├── extension.ts      # 入口点、命令、提供者
│   ├── accounts.ts       # 令牌和账户处理
│   ├── utils.ts          # 工具函数、Kiro 数据库访问
│   ├── webview.ts        # 面板 HTML 生成
│   ├── types.ts          # TypeScript 类型
│   └── webview/          # UI 组件
├── autoreg-bundled/      # Python 自动注册脚本
├── dist/                 # 编译后的 JS（gitignore）
├── package.json
├── tsconfig.json
└── .vscodeignore
```

---

## 已知问题

- **使用量有时不更新** — 点击刷新或等待。Kiro 会缓存数据。
- **自动注册卡在验证码** — AWS 有时需要验证码。手动解决或重启。
- **Linux 需要 python3** — 确保符号链接存在或配置 PATH。
- **令牌未应用** — 尝试重启 Kiro。罕见，但会发生。

---

## 常见问题

**问：这合法吗？**  
答：这是一个教育项目。请阅读上面的免责声明。

**问：我会被封禁吗？**  
答：可能会。请阅读上面的免责声明。

**问：为什么自动注册用 Python？**  
答：因为 Python 的 Playwright 更适合这种自动化，而且已经有现成的代码。

**问：可以不用自动注册吗？**  
答：可以。只需不配置 IMAP，不点击按钮。账户切换独立工作。

**问：如何添加现有账户？**  
答：登录 Kiro，在 `state.vscdb` 中找到令牌，保存为 JSON 到令牌文件夹。或使用导入功能。

---

## 许可证

MIT。随便用，但记住免责声明。

---

## 贡献

发现 bug？有想法？开 issue 或 PR。代码有些地方很丑，但能用。
