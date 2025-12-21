# ⚡ Kiro Manager WB

[![Build](https://github.com/WhiteBite/kiro-manager-wb/actions/workflows/build.yml/badge.svg)](https://github.com/WhiteBite/kiro-manager-wb/actions/workflows/build.yml)
[![Version](https://img.shields.io/github/v/release/WhiteBite/kiro-manager-wb?label=version)](https://github.com/WhiteBite/kiro-manager-wb/releases)
[![License](https://img.shields.io/github/license/WhiteBite/kiro-manager-wb)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/WhiteBite/kiro-manager-wb/total)](https://github.com/WhiteBite/kiro-manager-wb/releases)
[![Telegram](https://img.shields.io/badge/Telegram-Channel-blue?logo=telegram)](https://t.me/whitebite_devsoft)

[Русский](README.md) | [English](README.en.md) | 中文

![Screenshot](images/screenshot.png)

专为那些厌倦了 Kiro 限制的人准备的扩展。

> ⚠️ **免责声明**
>
> 这是一个教育项目，旨在学习 VS Code 扩展 API、OAuth 流程和浏览器自动化。
>
> 作者对使用此代码不承担任何责任。您所做的一切都是自担风险。如果您被封禁、被阻止、被断开连接、被解雇或发生其他任何事情——那是您的问题。我已经警告过您了。
>
> 使用此代码即表示您确认了解自己在做什么并接受所有后果。

---

## 🎯 这是什么

Kiro IDE 的全功能账户管理器：

- **多账户** — 存储无限账户，一键切换
- **使用量监控** — 查看已用请求数、剩余数量、重置时间
- **自动注册** — 自动注册 AWS Builder ID 账户
- **Machine ID 补丁** — 绕过硬件指纹封禁
- **LLM API 服务器** — 使用 Kiro 令牌的 OpenAI 兼容 API
- **10 种语言** — EN, RU, DE, ES, FR, PT, ZH, JA, KO, HI

---

## 🚀 快速开始

### 安装

1. 从 [Releases](../../releases) 下载 `.vsix`
2. 打开 Kiro → `Ctrl+Shift+P` → `Extensions: Install from VSIX`
3. 选择下载的文件
4. 重启 Kiro

### 从源码安装

```bash
git clone https://github.com/WhiteBite/kiro-manager-wb
cd kiro-manager-wb
npm install
npm run package
```

---

## 📦 功能

### 账户切换

Kiro 将令牌存储在 `state.vscdb` 中。扩展：
1. 从 `~/.kiro-manager-wb/tokens/` 读取令牌
2. 切换时将选定的令牌写入 Kiro 数据库
3. Kiro 无需重启即可获取新令牌

### 使用量跟踪

显示每个账户的：
- 当前使用量 / 限制
- 使用百分比
- 重置时间
- 订阅类型（Free/Pro）

### Machine ID 补丁

如果 AWS 发现多个账户来自同一台计算机，会按 `machineId` 封禁。补丁允许：
- 为每个账户使用唯一的 `machineId`
- 切换账户时自动轮换 ID
- 绕过"异常活动"封禁

```bash
# 应用补丁
python -m autoreg.cli patch apply

# 生成新的 machine ID
python -m autoreg.cli patch generate-id
```

---

## 🤖 自动注册

自动注册 AWS Builder ID 账户。

### 要求

- Python 3.11+
- Chrome/Chromium 浏览器
- 支持 IMAP 的邮件服务器

### Email 策略

| 策略 | 描述 | 示例 |
|------|------|------|
| `single` | 一个邮箱 = 一个账户 | `user@gmail.com` |
| `plus_alias` | Gmail/Outlook 别名 | `user+kiro123@gmail.com` |
| `catch_all` | Catch-all 域名 | `random123@mydomain.com` |
| `pool` | 预备邮箱池 | 从文件/env 获取列表 |

### 配置

在 `autoreg/` 文件夹中创建 `.env`：

```env
# IMAP 设置
IMAP_SERVER=imap.gmail.com
IMAP_USER=your@gmail.com
IMAP_PASSWORD=app-password

# Email 策略
EMAIL_STRATEGY=plus_alias

# 用于 catch_all
EMAIL_DOMAIN=mydomain.com

# 用于 pool（JSON 数组）
EMAIL_POOL=["user1@mail.ru", "user2@mail.ru:password"]
```

### 运行

```bash
cd autoreg

# 自动注册（使用配置的 email 策略）
python -m registration.register_auto

# 使用特定 email
python -m registration.register --email user@domain.com

# 批量注册（5 个账户）
python -m registration.register --count 5

# 无头模式（无 GUI）
python -m registration.register --email user@domain.com --headless
```

### 反指纹

内置的伪装系统以绕过 AWS 检测：

- **Canvas** — canvas 指纹随机化
- **WebGL** — vendor/renderer 伪装
- **Audio** — 音频指纹修改
- **Navigator** — userAgent、platform、languages 伪装
- **Screen** — 分辨率随机化
- **Timezone** — IP 同步
- **WebRTC** — 隐藏本地 IP
- **Fonts** — 字体列表随机化
- **Behavior** — 人类般的输入延迟

伪装配置文件按 email 保存——重新注册时使用相同的指纹。

---

## 🌐 LLM API 服务器

使用 Kiro 令牌访问 Claude 的 OpenAI 兼容 API 服务器。

### 运行

```bash
cd autoreg
python -m llm.run_llm_server
# API 在 http://127.0.0.1:8421
```

### 使用

```bash
curl http://127.0.0.1:8421/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### 可用模型

| 模型 | Credit | 描述 |
|------|--------|------|
| `claude-opus-4.5` | 2.2x | 最强大 |
| `claude-sonnet-4.5` | 1.3x | 最新 Sonnet |
| `claude-sonnet-4` | 1.3x | 混合推理 |
| `claude-haiku-4.5` | 0.4x | 快速便宜 |
| `auto` | 1x | 自动选择 |

### 端点

- `GET /v1/models` — 模型列表
- `POST /v1/chat/completions` — 聊天（支持流式）
- `GET /health` — 健康检查
- `GET /pool/status` — 令牌池状态
- `GET /pool/quotas` — 所有令牌配额

---

## 🖥️ 独立 Web 应用

无需 VS Code 的 Web 管理界面。

```bash
cd autoreg
python run.py
# 打开 http://127.0.0.1:8420
```

功能：
- 查看和切换账户
- 实时配额监控
- 通过 UI 运行自动注册
- 管理 Kiro 补丁
- WebSocket 实时日志

---

## 🛠️ CLI 参考

```bash
cd autoreg

# ═══════════════════════════════════════════════════════════════
# 状态
# ═══════════════════════════════════════════════════════════════
python cli.py status                      # 系统总体状态

# ═══════════════════════════════════════════════════════════════
# 令牌
# ═══════════════════════════════════════════════════════════════
python cli.py tokens                      # 列出令牌（list 的别名）
python cli.py tokens list                 # 列出所有令牌
python cli.py tokens switch <name>        # 切换到账户
python cli.py tokens switch <name> -r     # 强制刷新后切换
python cli.py tokens refresh              # 刷新最佳令牌
python cli.py tokens refresh <name>       # 刷新特定令牌
python cli.py tokens refresh <name> -a    # 刷新并激活

# ═══════════════════════════════════════════════════════════════
# 配额
# ═══════════════════════════════════════════════════════════════
python cli.py quota                       # 当前账户配额
python cli.py quota --all                 # 所有账户配额
python cli.py quota --all --refresh       # 刷新令牌后获取所有配额
python cli.py quota --json                # JSON 格式

# ═══════════════════════════════════════════════════════════════
# MACHINE ID
# ═══════════════════════════════════════════════════════════════
python cli.py machine                     # Machine ID 状态
python cli.py machine status              # 详细状态
python cli.py machine backup              # 备份 Kiro 遥测
python cli.py machine backup -s           # + 备份系统 GUID
python cli.py machine reset               # 重置所有 ID
python cli.py machine reset -s            # + 重置系统 GUID
python cli.py machine reset -f            # 跳过 Kiro 运行检查
python cli.py machine restore             # 从备份恢复

# ═══════════════════════════════════════════════════════════════
# KIRO 补丁
# ═══════════════════════════════════════════════════════════════
python cli.py patch                       # 补丁状态
python cli.py patch status                # 详细状态
python cli.py patch status --json         # JSON 格式
python cli.py patch apply                 # 应用补丁
python cli.py patch apply -f              # 强制重新补丁
python cli.py patch remove                # 移除补丁（恢复原始）
python cli.py patch generate-id           # 生成新 Machine ID
python cli.py patch generate-id <id>      # 设置特定 ID（64 位十六进制）
python cli.py patch check                 # 检查补丁是否需要更新
python cli.py patch check --auto-fix      # 需要时自动更新
python cli.py patch restart               # 重启 Kiro（保留窗口）
python cli.py patch apply-restart         # 补丁 + 重启 Kiro

# ═══════════════════════════════════════════════════════════════
# KIRO IDE
# ═══════════════════════════════════════════════════════════════
python cli.py kiro                        # Kiro 状态
python cli.py kiro status                 # 详细状态
python cli.py kiro start                  # 启动 Kiro
python cli.py kiro stop                   # 停止 Kiro
python cli.py kiro restart                # 重启 Kiro
python cli.py kiro info                   # 信息：版本、User-Agent、Machine ID
python cli.py kiro info --json            # JSON 格式

# ═══════════════════════════════════════════════════════════════
# SSO 导入（从浏览器导入）
# ═══════════════════════════════════════════════════════════════
python cli.py sso-import                  # 交互式导入
python cli.py sso-import <cookie>         # 从 x-amz-sso_authn cookie 导入
python cli.py sso-import <cookie> -a      # 导入并在 Kiro 中激活
python cli.py sso-import <cookie> -r eu-west-1  # 不同区域

# ═══════════════════════════════════════════════════════════════
# LLM API 服务器
# ═══════════════════════════════════════════════════════════════
python -m llm.run_llm_server              # 在 :8421 启动

# ═══════════════════════════════════════════════════════════════
# 独立 WEB 应用
# ═══════════════════════════════════════════════════════════════
python run.py                             # 在 :8420 启动

# ═══════════════════════════════════════════════════════════════
# 调试
# ═══════════════════════════════════════════════════════════════
python -m debugger.run                    # 调试注册会话
```

### SSO 导入 — 导入现有账户

如果您已经在浏览器中登录了账户：

1. 打开 https://view.awsapps.com/start
2. DevTools (F12) → Application → Cookies
3. 复制 `x-amz-sso_authn` 的值
4. 运行：
```bash
python cli.py sso-import <复制的值> -a
```

令牌将被导入并在 Kiro 中激活。

---

## 🐛 故障排除

### 自动注册卡在验证码
AWS 有时会显示验证码。手动解决或重启。

### 浏览器不打开
```bash
# 检查 Chrome
python -c "from autoreg.registration.browser import find_chrome_path; print(find_chrome_path())"
```

### 找不到 Python
确保 `python` 或 `python3` 在 PATH 中。

### 令牌未应用
尝试重启 Kiro。罕见，但会发生。

### 注册后被封禁
1. 生成新的 machine ID：`python cli.py patch generate-id`
2. 使用不同的 IP（VPN/代理）
3. 等待 24 小时

---

## 📝 构建命令

```bash
npm run build              # 构建扩展
npm run build:standalone   # 构建独立 HTML
npm run build:all          # 构建所有
npm run package            # 创建 .vsix

npm run release:patch      # 发布补丁版本 (6.1.0 -> 6.1.1)
npm run release:minor      # 发布次要版本 (6.1.0 -> 6.2.0)
npm run release:major      # 发布主要版本 (6.1.0 -> 7.0.0)
```

---

## 📜 许可证

MIT。随便用，但记住免责声明。

---

## 🤝 贡献

发现 bug？有想法？开 issue 或 PR。

---

## 📢 联系方式

Telegram: [@whitebite_devsoft](https://t.me/whitebite_devsoft)
