# Kiro Agent Extension Audit Report

> Beautified extension.js analysis (~1M lines, 50MB)
> Date: 2026-01-02

## Overview

This document contains findings from parallel analysis of the Kiro Agent extension code.
Each section corresponds to a different part of the codebase analyzed by separate agents.

---

## Part 1: Core Initialization & Entry Points (lines 1-162,250)

> **File:** `kiro-agent-part1.js` (~162k lines, bundled)
> **Content:** node-forge crypto, undici HTTP client, axios, OpenTelemetry SDK, gRPC, AWS SDK clients (SSO-OIDC, STS)

### 1.1 Module Overview

Part 1 contains foundational infrastructure modules:

| Module | Lines (approx) | Purpose |
|--------|----------------|---------|
| `node-forge` | 1-18000 | Cryptographic operations (RSA, AES, SHA, certificates) |
| `undici` | 18700-38500 | HTTP/1.1 and HTTP/2 client |
| `axios` | 47600-63200 | HTTP client with interceptors |
| `@opentelemetry/api` | 63200-65400 | OpenTelemetry API interfaces |
| `@opentelemetry/core` | 65400-71400 | OpenTelemetry core implementation |
| `@opentelemetry/resources` | 71400-72000 | Resource detection (machine ID, OS, host) |
| `protobufjs` | 72000-82000 | Protocol Buffers implementation |
| `@grpc-js` | 95000-120000 | gRPC client implementation |
| `@aws-sdk/client-sso-oidc` | 131000-145000 | AWS SSO OIDC client |
| `@aws-sdk/client-sts` | 145000-147000 | AWS STS client |
| `@aws-sdk/credential-providers` | 147000-162000 | AWS credential providers |

### 1.2 Detection Vectors

#### 1.2.1 Machine ID Collection (OpenTelemetry Resources)

| Platform | Line | Method | Severity |
|----------|------|--------|----------|
| **macOS** | ~71431 | `ioreg -rd1 -c "IOPlatformExpertDevice"` → extracts `IOPlatformUUID` | **Critical** |
| **Linux** | ~71461 | Reads `/etc/machine-id` or `/var/lib/dbus/machine-id` | **Critical** |
| **Windows** | ~71522 | Registry query `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid` | **Critical** |
| **BSD** | ~71491 | Reads `/etc/hostid` or `kenv -q smbios.system.uuid` | **Critical** |

**Code Example (macOS - line ~71431):**
```javascript
async function getMachineId3() {
    const result2 = await execAsync('ioreg -rd1 -c "IOPlatformExpertDevice"');
    const idLine = result2.stdout.split("\n").find((line) => line.includes("IOPlatformUUID"));
    const parts2 = idLine.split('" = "');
    if (parts2.length === 2) {
        return parts2[1].slice(0, -1);
    }
}
```

**EXISTING PATCH FOUND (line ~71595):**
```javascript
// KIRO_OTEL_PATCH_v6.2.0 - use custom machineId for telemetry
const getCustomMachineId = async () => {
    try {
        const fs = require('fs');
        const path = require('path');
        const customIdFile = path.join(process.env.USERPROFILE || process.env.HOME || '', '.kiro-manager-wb', 'machine-id.txt');
        if (fs.existsSync(customIdFile)) {
            const customId = fs.readFileSync(customIdFile, 'utf8').trim();
            if (customId && customId.length >= 32) return customId;
        }
    } catch (_) {}
    return (0, getMachineId_1.getMachineId)();
};
```

#### 1.2.2 Host Detection Attributes

| Attribute | Line | Value | Severity |
|-----------|------|-------|----------|
| `SEMRESATTRS_HOST_NAME` | ~71589 | `os.hostname()` | High |
| `SEMRESATTRS_HOST_ARCH` | ~71590 | `os.arch()` normalized | Medium |
| `SEMRESATTRS_HOST_ID` | ~71608 | Machine ID (async) | **Critical** |
| `SEMRESATTRS_OS_TYPE` | ~71628 | `os.platform()` normalized | Medium |
| `SEMRESATTRS_OS_VERSION` | ~71629 | `os.release()` | Medium |

#### 1.2.3 AWS X-Ray Trace Header

| Header | Line | Value | Severity |
|--------|------|-------|----------|
| `x-amzn-trace-id` | ~85996, ~122417 | AWS X-Ray trace ID propagation | High |

**Format:** `Root=1-{timestamp}-{random};Parent={spanId};Sampled={0|1}`

This header is used for distributed tracing and can correlate requests across services.

### 1.3 Telemetry Infrastructure

#### 1.3.1 OpenTelemetry Global Registration

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `registerGlobal()` | ~63316 | Registers global OpenTelemetry API | Medium |
| `GLOBAL_OPENTELEMETRY_API_KEY` | ~63361 | Symbol `opentelemetry.js.api.{major}` | Low |
| `getGlobal()` | ~63339 | Retrieves global instance | Low |

**Global Symbol Pattern:**
```javascript
GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
_global2[GLOBAL_OPENTELEMETRY_API_KEY] = { version: VERSION3 };
```

#### 1.3.2 OTLP Exporter Endpoints

| Env Variable | Line | Default | Purpose |
|--------------|------|---------|---------|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ~65350 | (none) | General OTLP endpoint |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | ~65351 | (none) | Traces endpoint |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | ~65352 | (none) | Metrics endpoint |
| `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | ~65353 | (none) | Logs endpoint |
| `OTEL_EXPORTER_ZIPKIN_ENDPOINT` | ~65362 | `http://localhost:9411/api/v2/spans` | Zipkin endpoint |

#### 1.3.3 OTLP User-Agent Headers

| Exporter | Line | User-Agent |
|----------|------|------------|
| Metrics (JSON) | ~85620 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |
| Traces (JSON) | ~85746 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |
| Logs (JSON) | ~94265 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |
| gRPC | ~116317 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |
| Logs (Protobuf) | ~116628 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |
| Metrics (Protobuf) | ~116765 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |
| Traces (Protobuf) | ~117189 | `OTel-OTLP-Exporter-JavaScript/${VERSION}` |

### 1.4 AWS SDK Authentication

#### 1.4.1 SSO OIDC Client

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `SSOOIDCClient` | ~143860 | AWS SSO OIDC client class | **Critical** |
| `CreateTokenCommand` | ~144394 | Token creation/refresh command | **Critical** |
| `getSsoOidcClient()` | ~144515 | Factory function for OIDC client | High |
| `getNewSsoOidcToken()` | ~144528 | Token refresh function | High |

**Token Refresh Flow:**
```javascript
const ssoOidcClient = await getSsoOidcClient(ssoRegion, init);
return ssoOidcClient.send(new CreateTokenCommand({
    clientId: ssoToken.clientId,
    clientSecret: ssoToken.clientSecret,
    grantType: "refresh_token",
    refreshToken: ssoToken.refreshToken
}));
```

#### 1.4.2 STS Client

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `STSClient` | ~145649 | AWS STS client class | High |
| `AssumeRoleCommand` | ~146367 | Role assumption command | High |
| `AssumeRoleWithWebIdentityCommand` | ~146386 | Web identity role assumption | High |
| `getDefaultRoleAssumer()` | ~146445 | Default role assumer factory | Medium |

#### 1.4.3 Credential Provider Chain

| Provider | Line | Description |
|----------|------|-------------|
| `fromSSO()` | ~147000+ | SSO credential provider |
| `fromIni()` | ~147000+ | INI file credential provider |
| `fromEnv()` | ~147000+ | Environment variable provider |
| `fromWebToken()` | ~147000+ | Web identity token provider |

### 1.5 Request Tracking Headers

#### 1.5.1 AWS SDK Headers

| Header | Line | Purpose | Severity |
|--------|------|---------|----------|
| `X-Amz-Algorithm` | ~129461 | SigV4 algorithm identifier | Low |
| `X-Amz-Credential` | ~129462 | Signing credential scope | Medium |
| `X-Amz-Date` | ~129463 | Request timestamp | Low |
| `X-Amz-SignedHeaders` | ~129464 | List of signed headers | Low |
| `X-Amz-Expires` | ~129465 | Presigned URL expiration | Low |
| `X-Amz-Signature` | ~129466 | Request signature | Low |
| `X-Amz-Security-Token` | ~129467 | Session token | Medium |
| `x-amz-content-sha256` | ~129473 | Content hash | Low |
| `x-amzn-trace-id` | ~129490 | X-Ray trace ID (always unsignable) | High |

#### 1.5.2 User-Agent Construction

| Component | Line | Format | Severity |
|-----------|------|--------|----------|
| `USER_AGENT` constant | ~133866 | `user-agent` | Medium |
| `X_AMZ_USER_AGENT` | ~133867 | `x-amz-user-agent` | High |
| SDK metadata | ~133870+ | `aws-sdk-js/{version}` | Medium |

**User-Agent Components:**
- SDK name and version
- Platform info (`os/{platform}`)
- Language info (`lang/js`)
- Feature flags
- App ID (if configured)

### 1.6 Rate Limiting & Retry

#### 1.6.1 RetryThrottler Class

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `RetryThrottler` | ~110193 | Token bucket rate limiter | Medium |
| `maxTokens` | ~110196 | Maximum retry tokens | Low |
| `tokenRatio` | ~110197 | Token replenishment ratio | Low |
| `canRetryCall()` | ~110207 | Check if retry allowed | Medium |
| `addCallSucceeded()` | ~110554 | Add tokens on success | Low |
| `addCallFailed()` | ~110495, ~110521 | Remove tokens on failure | Low |

**Throttle Pattern:**
```javascript
if (this.retryThrottler?.canRetryCall() ?? true) {
    callback(true);
    this.attempts += 1;
}
```

#### 1.6.2 Keepalive Throttling

| Function | Line | Description |
|----------|------|-------------|
| `throttleKeepalive()` | ~107476, ~110832, ~111172 | Adjusts keepalive interval |

### 1.7 gRPC Infrastructure

#### 1.7.1 Channel Management

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `RETRY_THROTTLER_MAP` | ~110907 | Global map of retry throttlers | Medium |
| `ResolvingLoadBalancer` | ~96520 | Load balancer with resolver | Medium |
| `updateAddressList()` | ~96337, ~96605 | Updates endpoint list | Low |

#### 1.7.2 Diagnostics Channels

| Channel | Line | Purpose |
|---------|------|---------|
| `undici:client:beforeConnect` | ~19786 | Pre-connection diagnostics |
| `undici:client:connected` | ~19787 | Connection established |
| `undici:client:connectError` | ~19788 | Connection error |
| `undici:client:sendHeaders` | ~19789 | Headers sent |
| `undici:request:create` | ~19791 | Request created |
| `undici:request:headers` | ~19793 | Response headers received |
| `undici:request:error` | ~19795 | Request error |
| `undici:websocket:open` | ~19797 | WebSocket opened |
| `undici:websocket:close` | ~19798 | WebSocket closed |

### 1.8 Performance Considerations

#### 1.8.1 Timer Patterns

| Pattern | Line | Context | Severity |
|---------|------|---------|----------|
| `setTimeout` for retry | ~27945 | HTTP retry delay | Low |
| `setTimeout` for reconnect | ~29912 | Connection retry | Low |
| `setTimeout` for debounce | ~60978 | Axios throttle | Low |
| `setInterval` for metrics | ~71092 | OTLP metric export | Low |
| `setTimeout` for timeout | ~68542, ~69192 | Operation timeout | Low |

#### 1.8.2 Synchronous Operations

| Operation | Line | Context | Severity |
|-----------|------|---------|----------|
| BigInteger operations | ~5582-6600 | Crypto math (node-forge) | Low |
| Base64 encode/decode | ~992-1120 | Data encoding | Low |
| ASN.1 parsing | ~2999-3100 | Certificate parsing | Low |

### 1.9 Security Considerations

#### 1.9.1 Credential Handling

| Pattern | Line | Description | Severity |
|---------|------|-------------|----------|
| `requestCredentials` | ~21531 | Fetch credential modes | Medium |
| `credentials: "include"` | ~36776 | WebSocket with credentials | Medium |
| `withCredentials` | ~38175, ~61703 | EventSource/Axios credentials | Medium |

#### 1.9.2 Certificate Fingerprinting

| Function | Line | Description |
|----------|------|-------------|
| `pki.getPublicKeyFingerprint()` | ~10510 | RSA key fingerprint |
| `ssh.getPublicKeyFingerprint()` | ~18208 | SSH key fingerprint |
| `Format.fingerprint` | ~38635 | Certificate fingerprint format |

### 1.10 Patch Opportunities

| Priority | Target | Line | Action |
|----------|--------|------|--------|
| **P0** | `getMachineId()` functions | ~71431-71537 | Already patched - verify custom ID usage |
| **P0** | `HostDetectorSync._getAsyncAttributes()` | ~71595 | Existing patch - ensure propagation |
| **P1** | `X_AMZ_USER_AGENT` header | ~133867 | Randomize or remove machine-specific data |
| **P1** | `x-amzn-trace-id` header | ~85996 | Consider disabling X-Ray propagation |
| **P2** | OTLP exporter endpoints | ~65350-65362 | Redirect or disable telemetry export |
| **P2** | Diagnostics channels | ~19786-19801 | Disable undici diagnostics |
| **P3** | `RetryThrottler` | ~110193 | Adjust retry behavior to avoid detection |

### 1.11 Error Types (Detection Indicators)

| Error Class | Line | Indicates |
|-------------|------|-----------|
| `UndiciError` | ~18717 | Base HTTP error |
| `ConnectTimeoutError` | ~18724 | Connection timeout |
| `HeadersTimeoutError` | ~18732 | Headers timeout |
| `BodyTimeoutError` | ~18748 | Body timeout |
| `ResponseStatusCodeError` | ~18756 | HTTP status error |
| `RequestAbortedError` | ~18791 | Request aborted |
| `SocketError` | ~18839 | Socket-level error |
| `RequestRetryError` | ~18880 | Retry exhausted |
| `SecureProxyConnectionError` | ~18908 | Proxy TLS error |

### 1.12 Summary

**Part 1 contains critical infrastructure for machine identification and telemetry:**

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Machine ID Collection | 4 | 4 | 0 | 0 | 0 |
| Host Attributes | 5 | 1 | 1 | 3 | 0 |
| Telemetry Endpoints | 5 | 0 | 0 | 5 | 0 |
| AWS SDK Headers | 10 | 0 | 2 | 3 | 5 |
| Rate Limiting | 3 | 0 | 0 | 2 | 1 |
| Patch Points | 7 | 2 | 2 | 2 | 1 |

**Key Findings:**
1. **Machine ID collection** is platform-specific with 4 different methods (macOS, Linux, Windows, BSD)
2. **Existing patch** at line ~71595 already intercepts machine ID for custom spoofing
3. **OpenTelemetry** infrastructure sends host attributes including machine ID
4. **AWS SDK** adds multiple tracking headers (`x-amz-user-agent`, `x-amzn-trace-id`)
5. **Diagnostics channels** in undici can leak connection metadata
6. **RetryThrottler** pattern could be detected by unusual retry behavior

---

## Part 2: Main Business Logic (lines 162,250-324,500)

> **File:** `kiro-agent-part2.js` (~13.9MB, bundled)
> **Content:** MCP Manager, Auth Provider, Token Storage, Telemetry, Autocomplete, systeminformation

### 2.1 Module Overview

Part 2 contains critical business logic modules:

| Module | Lines (approx) | Purpose |
|--------|----------------|---------|
| `eventsource` | 2000-2500 | Server-Sent Events client |
| `@modelcontextprotocol/sdk` | 2500-5400 | MCP OAuth, transport |
| `mcp-manager` | 5400-5850 | MCP singleton manager |
| `kiro-shared/auth` | 6240-7000 | Auth provider, token storage |
| `kiro-shared-types` | 7500-7900 | Telemetry namespaces, types |
| `sqlite/cache` | 8400-9200 | SQLite database wrapper |
| `autocomplete` | 9000-12500 | Code completion engine |
| `systeminformation` | 16700-35000 | Hardware/OS fingerprinting |
| `autocomplete/parser` | 43800-46000 | AST parsing for completions |
| `CompletionProvider` | 46350-46700 | Inline completion provider |

### 2.2 Detection Vectors

#### 2.2.1 SignInBlockedError - Account Blocking Detection

| Location | Line | Description | Severity |
|----------|------|-------------|----------|
| `SignInBlockedError` check | ~6542 | Error mapper returns `{ blocked: 1 }` for blocked accounts | **Critical** |
| `SignInBlockedError` handler | ~6876 | Logs "Sign-in temporarily not allowed" | **Critical** |
| `AbandonedError` | ~6550, ~6881 | Tracks abandoned login attempts | High |
| `InvalidUserInputError` | ~6556 | Tracks bad user input during auth | Medium |

```javascript
// Line ~6542 - ERROR_MAPPER2
if (error2 instanceof SignInBlockedError) {
    return { blocked: 1 };
} else if (error2 instanceof AbandonedError) {
всё    return { abandon: 1 };
}
```

**Patch Opportunity:** Intercept `SignInBlockedError` to handle gracefully without triggering telemetry.

#### 2.2.2 Onboarding Step Recording

| Function | Line | Event | Severity |
|----------|------|-------|----------|
| `recordOnboardingStep()` | ~6862 | `"started-login"` | Medium |
| `recordOnboardingStep()` | ~6873 | `"finished-login"` | Medium |
| `recordOnboardingStep()` | ~6880 | `"canceled-login"` | Medium |
| `recordOnboardingStep()` | ~6883 | `"abandoned-login"` | Medium |
| `recordOnboardingStep()` | ~6886 | `"bad-user-input"` | Medium |
| `recordOnboardingStep()` | ~6889 | `"failed-login"` | Medium |

**Detection Risk:** All login attempts are tracked with specific failure reasons.

### 2.3 Telemetry Infrastructure

#### 2.3.1 TelemetryNamespace Definitions

| Namespace | Value | Line | Purpose |
|-----------|-------|------|---------|
| `Application` | `"kiro.application"` | ~7627 | General app telemetry |
| `Feature` | `"kiro.feature"` | ~7628 | Feature usage |
| `Continue` | `"kiro.continue"` | ~7629 | Autocomplete/Continue |
| `Agent` | `"kiro.agent"` | ~7630 | Agent operations |
| `Tool` | `"kiro.tool"` | ~7631 | Tool executions |
| `Parser` | `"kiro.parser"` | ~7632 | Code parsing |
| `Onboarding` | `"kiro.onboarding"` | ~7633 | Onboarding flow |
| `Webview` | `"kiro.webview"` | ~7634 | UI interactions |
| `Auth` | `"kiro.auth"` | ~7635 | Authentication |
| `Billing` | `"kiro.billing"` | ~7636 | Billing/subscription |
| `Profiles` | `"kiro.profiles"` | ~7637 | Profile management |
| `RemoteTools` | `"kiro.remote-tools"` | ~7638 | Remote tool calls |

#### 2.3.2 TelemetryAttributes

| Attribute | Value | Line | Purpose |
|-----------|-------|------|---------|
| `RequestId` | `"requestId"` | ~7646 | Request tracking |
| `ConversationId` | `"conversationId"` | ~7647 | Conversation tracking |
| `ExecutionId` | `"executionId"` | ~7648 | Execution tracking |
| `ModelId` | `"ModelIdentifier"` | ~7649 | Model identification |
| `XRayTraceId` | `"AWS-XRAY-TRACE-ID"` | ~7650 | AWS X-Ray tracing |

#### 2.3.3 MetricReporter Instances

| Component | Namespace | Line |
|-----------|-----------|------|
| MCP Manager | `TelemetryNamespace.Application` | ~5420 |
| Auth Provider | `TelemetryNamespace.Auth` | ~6540 |
| Autocomplete | `TelemetryNamespace.Continue` | ~46388 |

### 2.4 Token Storage & Authentication

#### 2.4.1 TokenStorage Class

| Method | Line | Description | Severity |
|--------|------|-------------|----------|
| `constructor()` | ~6280 | Creates file watcher on token file | Medium |
| `readTokenFromLocalCache()` | ~6304 | Returns cached token | Low |
| `writeTokenToLocalCache()` | ~6321 | Caches token in memory | Low |
| `writeTokenToDisk()` | ~6324 | Writes token to `~/.aws/sso/cache/kiro-auth-token.json` | **Critical** |
| `readTokenFromDisk()` | ~6336 | Reads token from disk | High |
| `readToken()` | ~6373 | **PATCHED** - Always clears cache for account switching | High |
| `writeToken()` | ~6389 | Writes and fires change event | High |
| `clearToken()` | ~6397 | Deletes token file | High |

**Token File Location:** `~/.aws/sso/cache/kiro-auth-token.json`

```javascript
// Line ~6280 - Token storage path
this.cacheDirectory = path4.join(os5.homedir(), ".aws", "sso", "cache");
KIRO_AUTH_TOKEN_FILE_NAME = "kiro-auth-token.json";
```

**Existing Patch Found (line ~6376):**
```javascript
// KIRO_TOKEN_CACHE_PATCH_v6.2.0 - always read fresh token for account switching
this.clearCache();
```

#### 2.4.2 Auth Provider Methods

| Method | Line | Description | Severity |
|--------|------|-------------|----------|
| `authenticateWithOptions()` | ~6861 | Main auth entry point | **Critical** |
| `refreshToken()` | ~6830 | Token refresh logic | **Critical** |
| `logout()` | ~6780 | Clears token and profile | High |
| `deleteAccount()` | ~6808 | Account deletion | High |
| `handleAuthError()` | ~6905 | Error handling with UI prompts | Medium |

#### 2.4.3 Auth Providers

| Provider | Type | Line |
|----------|------|------|
| `IDCAuthProvider` | Enterprise/BuilderId/Internal | ~6590 |
| `SocialAuthProvider` | Google/Github | ~6591 |

```javascript
// Line ~6588-6591
this.providers = {
    IdC: new IDCAuthProvider(),
    social: new SocialAuthProvider()
};
```

### 2.5 Privacy Headers & API Configuration

#### 2.5.1 CodeWhisperer Opt-Out Header

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `addPrivacyHeadersMiddleware()` | ~6055 | Adds `x-amzn-codewhisperer-optout: true` when telemetry disabled | High |

```javascript
// Line ~6055-6065
function addPrivacyHeadersMiddleware(client2, clientName = "CodeWhisperer") {
    const contentCollectionEnabled = vscode8.workspace.getConfiguration("telemetry")
        .get("dataSharing.contentCollectionForServiceImprovement", false);
    if (!contentCollectionEnabled) {
        // Adds header: "x-amzn-codewhisperer-optout": "true"
    }
}
```

#### 2.5.2 Agent Mode Header

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `addAgentModeHeadersMiddleware()` | ~6073 | Adds `x-amzn-kiro-agent-mode` header | Medium |

```javascript
// Line ~6079
"x-amzn-kiro-agent-mode": agentMode
```

#### 2.5.3 Supported Regions

| Constant | Line | Value |
|----------|------|-------|
| `SUPPORTED_CODEWHISPERER_REGIONS` | ~7663 | `["us-east-1", "eu-central-1"]` |

### 2.6 System Information Collection (systeminformation)

#### 2.6.1 getStaticData() - Full Hardware Fingerprint

| Data Type | Line | Description | Severity |
|-----------|------|-------------|----------|
| `system.system()` | ~34558 | System manufacturer, model, serial | **Critical** |
| `system.bios()` | ~34559 | BIOS vendor, version, serial | **Critical** |
| `system.baseboard()` | ~34560 | Motherboard info | High |
| `system.chassis()` | ~34561 | Chassis type, serial | High |
| `osInfo.osInfo()` | ~34562 | OS platform, distro, release | High |
| `osInfo.uuid()` | ~34563 | **System UUID** | **Critical** |
| `osInfo.versions()` | ~34564 | Software versions | Medium |
| `cpu.cpu()` | ~34565 | CPU model, cores, speed | High |
| `cpu.cpuFlags()` | ~34566 | CPU feature flags | Medium |
| `graphics.graphics()` | ~34567 | GPU info, VRAM | High |
| `network.networkInterfaces()` | ~34568 | **MAC addresses**, IPs | **Critical** |
| `memory.memLayout()` | ~34569 | RAM modules, serials | High |
| `filesystem.diskLayout()` | ~34570 | Disk serials, models | High |
| `audio.audio()` | ~34571 | Audio devices | Low |
| `bluetooth.bluetoothDevices()` | ~34572 | Bluetooth devices | Medium |
| `usb.usb()` | ~34573 | USB devices | Medium |
| `printer.printer()` | ~34574 | Printers | Low |

**Detection Risk:** This library can collect extensive hardware fingerprints including:
- System UUID
- MAC addresses
- Disk serial numbers
- CPU serial (on some systems)
- BIOS serial

#### 2.6.2 Platform Detection

| Variable | Line | Description |
|----------|------|-------------|
| `_platform` | ~16814 | `process.platform` |
| `_linux` | ~16815 | Linux/Android detection |
| `_darwin` | ~16816 | macOS detection |
| `_windows` | ~16817 | Windows detection |
| `_freebsd` | ~16818 | FreeBSD detection |

### 2.7 MCP Manager Singleton

#### 2.7.1 MCPManagerSingleton Class

| Method | Line | Description | Severity |
|--------|------|-------------|----------|
| `getInstance()` | ~5428 | Singleton accessor | Low |
| `connectToServer()` | ~5528 | Connects to MCP server with tracing | Medium |
| `setConfiguredTools()` | ~5574 | Stores configured tools | Low |
| `setContextReferences()` | ~5578 | Stores context references | Low |
| `removeConnection()` | ~5644 | Removes MCP connection | Low |
| `reset()` | ~5806 | Resets singleton state | Low |

#### 2.7.2 MCP Tool Count Warning

| Constant | Line | Value | Description |
|----------|------|-------|-------------|
| `MCP_TOOL_COUNT_WARN_THESHOLD` | ~5413 | 50 | Warns if >50 tools configured |
| `MCP_CONNECTION_TIMEOUT` | ~5412 | 300000 (5 min) | Connection timeout |

### 2.8 Autocomplete System

#### 2.8.1 AutocompleteLruCache

| Property | Line | Description | Severity |
|----------|------|-------------|----------|
| `capacity` | ~9091 | 1000 entries max | Low |
| `mutex` | ~9091 | Async mutex for thread safety | Low |
| SQLite path | ~7284 | `autocompleteCache.sqlite` | Low |

#### 2.8.2 CompletionProvider Metrics

| Metric | Line | Description |
|--------|------|-------------|
| `completionCanceled` | ~46432 | Tracks canceled completions |
| `completionAccepted` | ~46447 | Tracks accepted completions |
| `completionAcceptanceTime` | ~46449 | Time to accept |
| `completionAcceptedLength` | ~46450 | Length of accepted completion |
| `completionRejectionTimeout` | ~46462 | Rejection timeout tracking |

### 2.9 Mutex & Concurrency

#### 2.9.1 async-mutex Library

| Class | Line | Description |
|-------|------|-------------|
| `Semaphore` | ~8239 | Counting semaphore |
| `Mutex` | ~8419 | Binary mutex |
| `E_TIMEOUT` | ~8242 | Timeout error |
| `E_ALREADY_LOCKED` | ~8243 | Already locked error |
| `E_CANCELED` | ~8244 | Canceled error |

### 2.10 Performance Issues

#### 2.10.1 Infinite Loops

| Pattern | Line | Context | Severity |
|---------|------|---------|----------|
| `while (true)` | ~2033 | Event parsing loop | Low |
| `while (true)` | ~3766 | MCP transport loop | Low |
| `while (true)` | ~9495, ~9498 | Autocomplete processing | Low |
| `for (;;)` | ~13837-16599 | Compression algorithms (zlib) | Low |

**Note:** These are controlled loops with break conditions, not actual infinite loops.

#### 2.10.2 Timer Usage

| Pattern | Line | Description | Severity |
|---------|------|-------------|----------|
| `setInterval` for refresh | ~6644 | Token refresh loop (60s interval) | Low |
| `setTimeout` for reconnect | ~2527 | EventSource reconnection | Low |
| `setTimeout` for debounce | ~46518 | Autocomplete debouncing | Low |

#### 2.10.3 Event Emitter Usage

| Component | Line | Events |
|-----------|------|--------|
| TokenStorage | ~6284 | `_onDidChange` |
| AuthProvider | ~6585 | `_onDidChangeLoginStatus` |
| AuthProvider | ~6586 | `_onDidPerformUserInitiatedLogout` |

### 2.11 Security Concerns

#### 2.11.1 Token File Permissions

| Issue | Line | Description | Severity |
|-------|------|-------------|----------|
| Token written to disk | ~6324 | No explicit file permissions set | Medium |
| Token in AWS SSO cache | ~6280 | Shared location with AWS CLI | Medium |

#### 2.11.2 OAuth Token Handling

| Schema | Line | Fields |
|--------|------|--------|
| `OAuthTokensSchema` | ~2674 | `access_token`, `id_token`, `token_type`, `expires_in`, `refresh_token` |
| `OAuthClientMetadataSchema` | ~2692 | `client_secret`, `client_secret_expires_at` |

### 2.12 Patch Opportunities

| Priority | Target | Line | Action |
|----------|--------|------|--------|
| **P0** | `systeminformation` calls | ~34558 | Intercept/mock hardware data |
| **P0** | `osInfo.uuid()` | ~34563 | Return spoofed UUID |
| **P1** | `SignInBlockedError` handler | ~6542 | Graceful handling without telemetry |
| **P1** | `recordOnboardingStep()` | ~6862-6889 | Disable or mock |
| **P2** | `addPrivacyHeadersMiddleware()` | ~6055 | Always add opt-out header |
| **P2** | Token file location | ~6280 | Use custom location |
| **P3** | `MCP_TOOL_COUNT_WARN_THESHOLD` | ~5413 | Increase limit |

### 2.13 SQLite Database Paths

| Database | Line | Path |
|----------|------|------|
| Dev data | ~7231 | `devdata.sqlite` |
| Index | ~7276 | `index.sqlite` |
| Autocomplete cache | ~7284 | `autocompleteCache.sqlite` |
| Docs | ~7288 | `docs.sqlite` |

### 2.14 Summary

**Part 2 contains critical authentication and telemetry infrastructure:**

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Detection Vectors | 8 | 2 | 2 | 4 | 0 |
| Telemetry Points | 12+ | 0 | 0 | 12 | 0 |
| Token Operations | 7 | 2 | 3 | 2 | 0 |
| System Info | 17 | 4 | 5 | 4 | 4 |
| Patch Points | 7 | 2 | 2 | 2 | 1 |

**Key Findings:**
1. **SignInBlockedError** is the primary account blocking detection mechanism
2. **systeminformation** library can collect extensive hardware fingerprints
3. **Token storage** uses AWS SSO cache directory (`~/.aws/sso/cache/`)
4. **12 telemetry namespaces** cover all aspects of the application
5. **Onboarding steps** track all login attempt outcomes
6. **Privacy header** (`x-amzn-codewhisperer-optout`) can be forced on

---

## Part 3: UI Components & Webview (lines 324,500-486,750)

> **File:** `kiro-agent-part3.js` (~7.7MB, minified/bundled)
> **Content:** `packages/continuedev/core` - JSDOM, WebSocket, LRU Cache, RxJS, HTML/CSS parsing

### 3.1 Module Overview

Part 3 contains the **continuedev/core** package bundled dependencies:

| Module | Lines (approx) | Purpose |
|--------|----------------|---------|
| `@mozilla/readability` | 1-500 | Article content extraction |
| `psl` (Public Suffix List) | 1089-1180 | Domain parsing, TLD validation |
| `tough-cookie` | 1183-2870 | Cookie management |
| `jsdom` | 3818-133500 | Full DOM implementation |
| `lru-cache` | 6589-8000 | LRU caching with TTL |
| `ws` (WebSocket) | 123300-127000 | WebSocket client/server |
| `@octokit/rest` | 135000-137000 | GitHub API client |
| `cheerio` | 140000-145000 | HTML parsing/manipulation |
| `rxjs` | 155000-162000 | Reactive extensions |
| `node-fetch` | 157000-158000 | HTTP fetch implementation |

### 3.2 Detection Vectors

#### 3.2.1 No Direct Detection Code Found

Part 3 is primarily **third-party library code** with no Kiro-specific detection mechanisms. However, these libraries enable detection in other parts:

| Library | Risk | Usage |
|---------|------|-------|
| `tough-cookie` | Medium | Cookie tracking across sessions |
| `jsdom` | Low | DOM fingerprinting possible |
| `ws` WebSocket | Medium | Connection metadata tracking |
| `node-fetch` | Medium | Request headers can leak info |

#### 3.2.2 Public Suffix List (PSL)

| Location | Line | Description | Severity |
|----------|------|-------------|----------|
| Domain list | ~1090 | Massive TLD/domain list including `amazonaws.com`, `github.io` | Info |
| `getPublicSuffix()` | ~1183 | Extracts public suffix from domains | Low |

**Note:** PSL is used for cookie domain validation, not detection.

### 3.3 Telemetry/Tracking Infrastructure

#### 3.3.1 WebSocket Client Tracking

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `clientTracking` option | ~126689 | WebSocket server tracks connected clients | Medium |
| `this.clients` Set | ~126737 | Stores all connected WebSocket clients | Medium |

```javascript
// Line ~126735
if (options2.clientTracking) {
    this.clients = /* @__PURE__ */ new Set();
}
```

**Patch Opportunity:** Disable `clientTracking` option when creating WebSocket servers.

#### 3.3.2 Storage Quota Tracking

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `storageQuota` | ~113190-113240 | Tracks localStorage/sessionStorage usage | Low |
| `QuotaExceededError` | ~113237 | Thrown when storage limit exceeded | Info |
| Default quota | ~133442 | `5e6` (5MB) default storage quota | Info |

#### 3.3.3 GitHub API Rate Limiting

| Endpoint | Line | Description |
|----------|------|-------------|
| `rateLimit.get` | ~136431 | `GET /rate_limit` - checks API rate limits |
| `checkToken` | ~135440 | `POST /applications/{client_id}/token` |
| `resetToken` | ~135495 | `PATCH /applications/{client_id}/token` |

### 3.4 Performance Issues

#### 3.4.1 LRU Cache Configuration

| Issue | Line | Description | Severity |
|-------|------|-------------|----------|
| TTL autopurge timers | ~6977 | Creates `setTimeout` for each TTL entry | Medium |
| No max size default | ~6950 | Cache can grow unbounded if not configured | High |
| Background fetch | ~7618-7740 | Async fetch can accumulate pending promises | Medium |

```javascript
// Line ~6977 - Timer per entry
if (ttl !== 0 && this.ttlAutopurge) {
    const t13 = setTimeout(() => {
        if (this.#isStale(index3)) {
            this.#delete(this.#keyList[index3], "expire");
        }
    }, ttl);
}
```

**Recommendation:** Ensure LRU cache instances have proper `max` and `maxSize` limits.

#### 3.4.2 Timer Accumulation Risks

| Pattern | Line | Risk | Severity |
|---------|------|------|----------|
| `setTimeout` in loops | ~6977, ~7008 | Timer leak if not cleared | Medium |
| `setInterval` for animation | ~132716 | Animation frame interval | Low |
| History traversal queue | ~131675 | Timeout IDs stored in Set | Low |

#### 3.4.3 Event Listener Patterns

| Pattern | Line | Description | Severity |
|---------|------|-------------|----------|
| `addEventListener` impl | ~28935 | JSDOM EventTarget implementation | Info |
| Signal abort listeners | ~7627 | AbortController signal listeners | Low |
| Socket event handlers | ~125754-125767 | WebSocket socket events | Low |

**Note:** JSDOM properly implements `removeEventListener` at ~28962.

#### 3.4.4 DOM Rendering (JSDOM)

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `render()` | ~140322 | Cheerio HTML rendering | Low |
| `_render()` | ~144766 | Internal render method | Low |
| `innerHTML` getter | ~51249 | Fragment serialization | Low |
| `outerHTML` getter | ~52391 | Element serialization | Low |

**Note:** These are server-side DOM operations, not browser rendering.

### 3.5 Memory Leak Risks

#### 3.5.1 Cookie Store

| Class | Line | Risk |
|-------|------|------|
| `MemoryCookieStore` | ~1403 | In-memory cookie storage, no automatic cleanup |
| `getAllCookies()` | ~1533 | Can return large arrays |

#### 3.5.2 Same Object Caches

| Pattern | Line | Description |
|---------|------|-------------|
| `sameObjectCaches` Symbol | ~3847 | Caches objects on wrappers |
| `getSameObject()` | ~3874 | Creates cache if not exists |

```javascript
// Line ~3874
function getSameObject(wrapper, prop2, creator) {
    if (!wrapper[sameObjectCaches]) {
        wrapper[sameObjectCaches] = /* @__PURE__ */ Object.create(null);
    }
    // ... caches created object
}
```

#### 3.5.3 Active Timer Lists

| Location | Line | Description |
|----------|------|-------------|
| `listOfActiveTimers` | ~132588 | Map storing all active timers |
| `stopAllTimers()` | ~132729 | Cleanup function exists |

### 3.6 WebSocket Implementation Details

#### 3.6.1 Connection States

| State | Value | Line |
|-------|-------|------|
| `CONNECTING` | 0 | ~125967 |
| `OPEN` | 1 | ~125975 |
| `CLOSING` | 2 | ~125983 |
| `CLOSED` | 3 | (implied) |

#### 3.6.2 Error Messages (Detection Signatures)

| Error | Line | Context |
|-------|------|---------|
| `"WebSocket was closed before the connection was established"` | ~125811, ~125957 | Connection abort |
| `"WebSocket is not open: readyState 0 (CONNECTING)"` | ~125853, ~125880, ~125926 | Send before open |
| `"Unsupported WebSocket frame: payload length > 2^53 - 1"` | ~124365 | Frame size limit |
| `"Invalid WebSocket frame: ${message}"` | ~124618 | Protocol error |

### 3.7 Patch Opportunities

| Priority | Target | Line | Action |
|----------|--------|------|--------|
| **P2** | `clientTracking` | ~126689 | Set to `false` to disable client tracking |
| **P2** | `storageQuota` | ~133442 | Increase default quota if needed |
| **P3** | LRU Cache `max` | ~6877 | Ensure proper limits set |
| **P3** | Timer cleanup | ~132729 | Ensure `stopAllTimers()` called on dispose |

### 3.8 Security Considerations

#### 3.8.1 Crypto Implementation

| Function | Line | Description |
|----------|------|-------------|
| `getRandomValues()` | ~116826 | WebCrypto random values |
| `randomUUID()` | ~116844 | UUID generation |
| `QuotaExceededError` for >65536 bytes | ~116836 | Random value limit |

#### 3.8.2 XMLHttpRequest Implementation

| Feature | Line | Description |
|---------|------|-------------|
| `XMLHttpRequestEventTargetImpl` | ~119731 | XHR event target |
| Timeout handling | ~121979-122011 | Request timeout management |
| `clearTimeout` on end | ~122492 | Proper cleanup |

### 3.9 Summary

**Part 3 is primarily third-party library code** with minimal Kiro-specific logic:

- **No direct detection vectors** - libraries are standard implementations
- **WebSocket client tracking** is the main tracking-capable feature
- **LRU Cache** could cause memory issues if misconfigured
- **Timer management** is generally proper with cleanup functions
- **JSDOM** provides full DOM implementation for server-side rendering

**Key Takeaway:** Part 3 provides infrastructure that OTHER parts use for tracking. The actual detection/telemetry logic is in Parts 1, 2, 4, 5, and 6.

### 3.10 Libraries Identified

| Library | Version (if found) | Purpose |
|---------|-------------------|---------|
| `@mozilla/readability` | - | Content extraction |
| `psl` | - | Public suffix list |
| `tough-cookie` | 4.1.4 | Cookie handling |
| `jsdom` | - | DOM implementation |
| `lru-cache` | - | Caching |
| `ws` | - | WebSocket |
| `@octokit/rest` | - | GitHub API |
| `cheerio` | - | HTML parsing |
| `rxjs` | - | Reactive streams |
| `node-fetch` | - | HTTP client |
| `saxes` | - | XML parsing |
| `parse5` | - | HTML5 parsing |
| `css-select` | - | CSS selectors |
| `dom-serializer` | - | DOM serialization |

---

## Part 4: API & Network Layer (lines 486,750-649,000)

> **Note:** Part 4 file contains ~162k lines of bundled code including RxJS, Puppeteer, AWS SDK clients, and CodeWhisperer runtime.

### 4.1 API Endpoints Discovered

#### 4.1.1 AWS OIDC Token Endpoint
| Property | Value |
|----------|-------|
| **Location** | Line ~114370 |
| **Endpoint** | `https://oidc.{Region}.amazonaws.com/token` |
| **Method** | POST |
| **Auth** | None (public endpoint) |
| **Severity** | Critical |

**Request Parameters:**
```javascript
{
    clientId: [],
    clientSecret: [],
    grantType: "refresh_token",  // Line ~114906
    refreshToken: [],
    code: [],
    redirectUri: [],
    codeVerifier: [],
    scope: []
}
```

**Detection Vector:** Token refresh requests are logged with sensitive data filtered via `CreateTokenRequestFilterSensitiveLog2` (line ~114713).

---

#### 4.1.2 CodeWhisperer API Endpoint
| Property | Value |
|----------|-------|
| **Location** | Line ~147042 |
| **Endpoint** | `https://codewhisperer.{region}.amazonaws.com` |
| **Auth** | SigV4 |
| **Severity** | Critical |

**Auth Scheme:**
```javascript
{
    "authSchemes": [{
        "name": "sigv4",
        "signingRegion": "{region}"
    }]
}
```

---

#### 4.1.3 CodeWhisperer Streaming Service
| Property | Value |
|----------|-------|
| **Location** | Line ~159783 |
| **Endpoint** | `amazoncodewhispererstreamingservice.{region}.amazonaws.com` |
| **FIPS Variant** | `amazoncodewhispererstreamingservice-fips.{region}.amazonaws.com` |
| **Signing Service** | `amazoncodewhispererstreamingservice` |
| **Severity** | Critical |

**Supported Regions:**
- us-east-1, us-east-2, us-west-1, us-west-2
- eu-central-1, eu-west-1, eu-west-2, eu-west-3
- ap-northeast-1, ap-northeast-2, ap-south-1, ap-southeast-1, ap-southeast-2
- ca-central-1, sa-east-1
- il-central-1, me-central-1, me-south-1, mx-central-1, af-south-1

---

#### 4.1.4 AWS SSO Portal
| Property | Value |
|----------|-------|
| **Location** | Line ~113146 |
| **Endpoint** | `https://portal.sso.{Region}.amazonaws.com` |
| **Service** | SWBPortalService |
| **Severity** | High |

**Commands:**
- `GetRoleCredentials` (line ~113964)
- `ListAccountRoles`
- `ListAccounts`
- `Logout`

**Bearer Token Header:** `x-amz-sso_bearer_token` (line ~113963)

---

#### 4.1.5 AWS STS Endpoint
| Property | Value |
|----------|-------|
| **Location** | Line ~115878 |
| **Endpoint** | `https://sts.amazonaws.com` (global) |
| **Regional** | `https://sts.{Region}.amazonaws.com` |
| **Severity** | Medium |

---

#### 4.1.6 Bedrock Runtime
| Property | Value |
|----------|-------|
| **Location** | Line ~127404 |
| **Endpoint** | `https://bedrock-runtime.${region}.amazonaws.com` |
| **Severity** | High |

---

#### 4.1.7 Cognito Identity (FIPS)
| Property | Value |
|----------|-------|
| **Location** | Line ~124868 |
| **Endpoints** | Regional FIPS endpoints |
| **Severity** | Medium |

```
https://cognito-identity-fips.us-east-1.amazonaws.com
https://cognito-identity-fips.us-east-2.amazonaws.com
https://cognito-identity-fips.us-west-1.amazonaws.com
https://cognito-identity-fips.us-west-2.amazonaws.com
```

---

### 4.2 Authentication Flows

#### 4.2.1 OIDC Token Refresh Flow
| Property | Value |
|----------|-------|
| **Location** | Lines ~114676-115160 |
| **Service** | AWSSSOOIDCService |
| **Command** | CreateToken |
| **Severity** | Critical |

**Error Types (Detection Indicators):**
| Error | Line | Description |
|-------|------|-------------|
| `AccessDeniedException` | ~114676 | Account blocked/banned |
| `AuthorizationPendingException` | ~114697 | Device auth pending |
| `ExpiredTokenException` | ~114676 | Token expired |
| `InvalidClientException` | ~114676 | Invalid client credentials |
| `InvalidGrantException` | ~114676 | Invalid refresh token |
| `InvalidRequestException` | ~114676 | Malformed request |
| `SlowDownException` | ~114676 | Rate limited |
| `UnauthorizedClientException` | ~114676 | Client not authorized |
| `UnsupportedGrantTypeException` | ~114865 | Wrong grant type |

**Token Validation (line ~115308):**
```javascript
validateTokenExpiry(token)  // Checks token.expiration < Date.now()
validateTokenKey("clientId", ssoToken.clientId, true)
validateTokenKey("clientSecret", ssoToken.clientSecret, true)
validateTokenKey("refreshToken", ssoToken.refreshToken, true)
```

---

#### 4.2.2 SSO Bearer Token Auth
| Property | Value |
|----------|-------|
| **Location** | Line ~113963 |
| **Header** | `x-amz-sso_bearer_token` |
| **Severity** | High |

Used for `GetRoleCredentials` command to exchange SSO token for temporary AWS credentials.

---

### 4.3 Detection Vectors

#### 4.3.1 User-Agent Fingerprinting
| Property | Value |
|----------|-------|
| **Location** | Lines ~108890, ~123940, ~144976, ~157537 |
| **Headers** | `user-agent`, `x-amz-user-agent` |
| **Severity** | High |

**SDK User Agent Components:**
- SDK name and version
- Platform info
- Feature flags
- App ID (configurable via `AWS_SDK_UA_APP_ID` env var)

**Deprecated Config:** `sdk-ua-app-id` (line ~112456)

---

#### 4.3.2 Request Tracking Headers
| Property | Value |
|----------|-------|
| **Location** | Line ~146239 |
| **Headers** | `amz-sdk-invocation-id`, `amz-sdk-request` |
| **Severity** | High |

These headers track individual request invocations and can be used for:
- Request correlation
- Retry tracking
- Abuse detection

---

#### 4.3.3 Event Stream Headers
| Property | Value |
|----------|-------|
| **Location** | Line ~105694 |
| **Content-Type** | `application/vnd.amazon.eventstream` |
| **SHA256** | `STREAMING-AWS4-HMAC-SHA256-EVENTS` |
| **Severity** | Medium |

Used for streaming responses from CodeWhisperer.

---

### 4.4 Rate Limiting & Retry Strategy

#### 4.4.1 Standard Retry Configuration
| Property | Value |
|----------|-------|
| **Location** | Lines ~146230-146350 |
| **Severity** | High |

**Constants:**
```javascript
DEFAULT_RETRY_DELAY_BASE = 100        // ms
MAXIMUM_RETRY_DELAY = 20000           // 20 seconds
THROTTLING_RETRY_DELAY_BASE = 500     // ms for throttled requests
INITIAL_RETRY_TOKENS = 500
RETRY_COST = 5
TIMEOUT_RETRY_COST = 10
```

**Backoff Formula:**
```javascript
Math.floor(Math.min(MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase))
```

**Retry Conditions:**
- `THROTTLING` errors → Uses 500ms base delay
- `TRANSIENT` errors → Uses 100ms base delay
- Capacity-based limiting (token bucket)

---

#### 4.4.2 Adaptive Retry Strategy
| Property | Value |
|----------|-------|
| **Location** | Line ~146340 |
| **Mode** | `adaptive` |
| **Severity** | High |

Uses `DefaultRateLimiter` with client-side rate limiting based on server responses.

---

### 4.5 Error Handling (Bedrock Runtime)

#### 4.5.1 Service Exceptions
| Exception | Line | Severity |
|-----------|------|----------|
| `ThrottlingException` | ~120835 | **Critical** |
| `ValidationException` | ~120853 | Medium |
| `ServiceQuotaExceededException` | ~120914 | **Critical** |
| `ServiceUnavailableException` | ~120608 | Medium |
| `ModelStreamErrorException` | ~121391 | Medium |
| `ModelTimeoutException` | ~121422 | Low |

**Stream Error Handling (line ~121391):**
```javascript
if (value2.validationException !== void 0) return visitor.validationException(...)
if (value2.throttlingException !== void 0) return visitor.throttlingException(...)
if (value2.serviceUnavailableException !== void 0) return visitor.serviceUnavailableException(...)
```

---

### 4.6 Network Patterns

#### 4.6.1 Request Signing (SigV4)
| Property | Value |
|----------|-------|
| **Location** | Lines ~109454-109744 |
| **Signer** | `AwsSdkSigV4Signer3` |
| **Severity** | Critical |

**Clock Skew Detection:**
```javascript
isClockSkewed3 = (clockTime, systemClockOffset) => 
    Math.abs(getSkewCorrectedDate3(systemClockOffset).getTime() - clockTime) >= 300000  // 5 minutes
```

---

#### 4.6.2 Endpoint Resolution Caching
| Property | Value |
|----------|-------|
| **Location** | Line ~147070 |
| **Cache Size** | 50 endpoints |
| **Params** | `endpoint`, `region` |
| **Severity** | Low |

---

### 4.7 Potential Patch Points

#### 4.7.1 User-Agent Modification
| Priority | Location | Description |
|----------|----------|-------------|
| **High** | ~108890 | `X_AMZ_USER_AGENT` constant |
| **High** | ~146239 | `INVOCATION_ID_HEADER`, `REQUEST_HEADER` |

**Patch Strategy:** Override or randomize these headers to avoid fingerprinting.

---

#### 4.7.2 Retry Behavior Modification
| Priority | Location | Description |
|----------|----------|-------------|
| **Medium** | ~146232 | `DEFAULT_RETRY_DELAY_BASE` |
| **Medium** | ~146234 | `THROTTLING_RETRY_DELAY_BASE` |
| **High** | ~146235 | `INITIAL_RETRY_TOKENS` |

**Patch Strategy:** Increase delays and reduce retry aggressiveness to avoid detection.

---

#### 4.7.3 Token Validation Bypass
| Priority | Location | Description |
|----------|----------|-------------|
| **Critical** | ~115308 | `validateTokenExpiry` function |
| **Critical** | ~115313 | `validateTokenKey` function |

**Patch Strategy:** Modify validation to be more lenient or skip certain checks.

---

#### 4.7.4 Error Response Handling
| Priority | Location | Description |
|----------|----------|-------------|
| **High** | ~114941 | `de_AccessDeniedExceptionRes2` |
| **High** | ~114944 | `de_AuthorizationPendingExceptionRes2` |
| **Critical** | ~114969 | `de_UnsupportedGrantTypeExceptionRes2` |

**Patch Strategy:** Intercept error responses to handle bans/blocks gracefully.

---

### 4.8 Summary

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| API Endpoints | 7 | 3 | 2 | 2 | 0 |
| Auth Flows | 2 | 1 | 1 | 0 | 0 |
| Detection Vectors | 3 | 0 | 2 | 1 | 0 |
| Rate Limiting | 2 | 0 | 2 | 0 | 0 |
| Error Handling | 6 | 2 | 0 | 3 | 1 |
| Patch Points | 4 | 2 | 2 | 2 | 0 |

**Key Findings:**
1. **CodeWhisperer Streaming Service** uses dedicated hostname pattern `amazoncodewhispererstreamingservice.{region}.amazonaws.com`
2. **Token refresh** goes through OIDC endpoint with multiple error types indicating account status
3. **Request tracking** via `amz-sdk-invocation-id` and `amz-sdk-request` headers
4. **Adaptive retry** with rate limiting can be detected by unusual retry patterns
5. **SigV4 signing** with clock skew detection (5-minute tolerance)

---

## Part 5: Database & Storage (lines 649,000-811,250)

> **File:** `kiro-agent-part5.js` (~7MB)
> **Content:** SQLite database operations, session management, codebase indexing, MCP singleton, file system operations

### 5.1 SQLite Database Operations

#### 5.1.1 SqliteDb Singleton Pattern

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `SqliteDb.get()` | ~33460 | Static singleton getter for SQLite database | **Critical** |
| `SqliteDb.reset()` | ~33462 | Resets singleton instance | High |
| `sqliteDb.close()` | ~33461 | Closes database connection | High |

**Multi-Window Crash Risk:** The `SqliteDb` singleton is shared across the extension. When multiple VS Code windows are open, they may compete for the same database file, causing `SQLITE_BUSY` errors.

#### 5.1.2 SQLITE Error Handling

| Error Type | Line | Handled? | Severity |
|------------|------|----------|----------|
| `SQLITE_BUSY` | ~33447 | **Excluded from index clearing** - NOT handled properly | **Critical** |
| `SQLITE_CONSTRAINT` | ~33450 | Triggers index clear | Medium |
| `SQLITE_ERROR` | ~33451 | Triggers index clear | Medium |
| `SQLITE_CORRUPT` | ~33452 | Triggers index clear | High |
| `SQLITE_IOERR` | ~33453 | Triggers index clear | High |
| `SQLITE_FULL` | ~33454 | Triggers index clear | Medium |

**Critical Finding:** The comment at line ~33446-33447 explicitly states:
```javascript
// Note that we exclude certain Sqlite errors that we do not want to clear the indexes on,
// e.g. a `SQLITE_BUSY` error.
```

This means `SQLITE_BUSY` errors are **intentionally not handled**, which can cause crashes when multiple windows access the same database.

#### 5.1.3 Database File Paths

| Function | Line | Description |
|----------|------|-------------|
| `getIndexSqlitePath()` | ~33457 | Returns path to SQLite index file |
| `getLanceDbPath()` | ~33458 | Returns path to LanceDB vector database folder |

**Potential Fix:** Add `busy_timeout` PRAGMA or implement file locking.

### 5.2 DevDataSqliteDb - Statistics Database

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `DevDataSqliteDb.getTokensPerDay()` | ~38019 | Retrieves daily token usage stats | Medium |
| `DevDataSqliteDb.getTokensPerModel()` | ~38023 | Retrieves per-model token usage | Medium |
| `init_devdataSqlite()` | ~37696 | Initializes dev data SQLite module | Medium |

**Usage:** These functions are called via IPC messages `stats/getTokensPerDay` and `stats/getTokensPerModel`.

### 5.3 Session File Operations (Race Condition Risk)

#### 5.3.1 Session Storage Pattern

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `getSessionFilePath()` | ~33770, ~33790, ~33808 | Gets path to individual session file | Medium |
| `getSessionsListPath()` | ~33755, ~33775, ~33810 | Gets path to sessions list JSON | Medium |

#### 5.3.2 Non-Atomic File Operations

| Operation | Line | Issue | Severity |
|-----------|------|-------|----------|
| `fs24.readFileSync(sessionsListFile)` | ~33776 | Sync read without lock | **High** |
| `fs24.writeFileSync(sessionsListFilePath, ...)` | ~33786, ~33818, ~33844 | Sync write without lock | **High** |
| `fs24.unlinkSync(sessionFile)` | ~33774 | Delete without checking concurrent access | Medium |

**Race Condition Pattern:**
```javascript
// Line ~33807-33844 - save() function
const filePath = getSessionFilePath(session.sessionId, session.workspaceDirectory);
fs24.writeFileSync(filePath, JSON.stringify(session, void 0, 2));
const sessionsListFilePath = getSessionsListPath(session.workspaceDirectory);
try {
    const rawSessionsList = fs24.readFileSync(sessionsListFilePath, "utf-8");
    // ... modify list ...
    fs24.writeFileSync(sessionsListFilePath, JSON.stringify(sessionsList, void 0, 2));
}
```

**Issue:** Read-modify-write pattern without locking. Two windows saving sessions simultaneously can corrupt the sessions list.

### 5.4 Singleton Patterns (Multi-Window Conflicts)

#### 5.4.1 MCPManagerSingleton

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `MCPManagerSingleton.getInstance()` | ~32206, ~48741 | Gets MCP manager singleton | **High** |
| `MCPManagerSingleton.reset()` | ~32214 | Resets singleton instance | High |
| `setSecretStorage()` | ~48741 | Sets VS Code secret storage on singleton | Medium |

**Usage Context:**
```javascript
// Line ~32206
const mcpManager = MCPManagerSingleton.getInstance();
const mcpConfig = loadMcpConfig();
await mcpManager.reloadMcpConfig(mcpConfig, onConnectionChange, workspaceDirs[0]);
```

**Multi-Window Issue:** Each VS Code window creates its own extension host process, but they may share configuration files. The singleton pattern assumes single-instance operation.

#### 5.4.2 AsyncLocalStorageProviderSingleton

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `AsyncLocalStorageProviderSingleton.getInstance()` | ~51432 | Gets async local storage provider | Medium |
| `globalThis[TRACING_ALS_KEY]` | ~51457, ~51460-51461 | Global symbol for storage | Medium |

**Pattern:**
```javascript
// Line ~51455-51464
AsyncLocalStorageProvider = class {
    getInstance() {
        return globalThis[TRACING_ALS_KEY] ?? mockAsyncLocalStorage;
    }
    initializeGlobalInstance(instance) {
        if (globalThis[TRACING_ALS_KEY] === void 0) {
            globalThis[TRACING_ALS_KEY] = instance;
        }
    }
};
```

### 5.5 File System Operations

#### 5.5.1 Synchronous File Operations (Blocking)

| Operation | Line | File Type | Severity |
|-----------|------|-----------|----------|
| `fs22.readFileSync(filepath, "utf8")` | ~31958 | Config JSON | Medium |
| `fs24.readFileSync(filepath, "utf8")` | ~33759 | Sessions list | Medium |
| `fs24.readFileSync(sessionFile, "utf8")` | ~33794 | Session file | Medium |
| `fs24.writeFileSync(filePath, ...)` | ~33809 | Session file | Medium |
| `fs24.writeFileSync(sessionsListFilePath, ...)` | ~33786, ~33818, ~33844 | Sessions list | Medium |
| `fs24.unlinkSync(sessionFile)` | ~33774 | Session file | Low |
| `fs59.readFileSync(...)` | ~2627, ~37579 | Various | Low |
| `fs59.writeFileSync(...)` | ~2753-2754 | Temp files | Low |

#### 5.5.2 Async File Operations

| Operation | Line | Description | Severity |
|-----------|------|-------------|----------|
| `fs23.unlink(sqliteFilepath)` | ~33467 | Delete SQLite file | Medium |
| `fs23.rm(lanceDbFolder, {recursive: true, force: true})` | ~33472 | Delete LanceDB folder | Medium |
| `vscode16.workspace.fs.readFile(entry.uri)` | ~38555 | VS Code file API | Low |

### 5.6 Codebase Indexing System

#### 5.6.1 CodebaseIndexer Class

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `CodebaseIndexer` class | ~33434 | Main indexer orchestrator | Medium |
| `filesPerBatch = 500` | ~33445 | Batch size for indexing | Low |
| `errorsRegexesToClearIndexesOn` | ~33448-33455 | Error patterns that trigger index clear | Medium |
| `clearIndexes()` | ~33456 | Clears all indexes | High |
| `getIndexesToBuild()` | ~33480 | Returns list of index builders | Low |
| `refreshFile(file)` | ~33495 | Refreshes single file index | Low |
| `refresh(workspaceDirs, abortSignal)` | ~33529 | Full index refresh generator | Medium |

#### 5.6.2 Index Types

| Index | Line | Description |
|-------|------|-------------|
| `CodeSnippetsCodebaseIndex` | ~33485 | Code snippets index |
| `ChunkCodebaseIndex` | ~33486 | Chunked code index |
| `LanceDbIndex` | ~33487 | Vector embeddings index |
| `FullTextSearchCodebaseIndex` | ~33488 | Full-text search index |
| `RepoMapIndexBuilder` | ~33491 | Repository map index (optional) |

#### 5.6.3 PauseToken Pattern

| Component | Line | Description |
|-----------|------|-------------|
| `PauseToken` class | ~33423 | Controls indexing pause state |
| `_paused` property | ~33425 | Internal pause flag |
| `paused` getter/setter | ~33427-33431 | Public pause control |

### 5.7 Cache Patterns

#### 5.7.1 InMemoryCache

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `InMemoryCache` class | ~84865 | LLM response cache | Medium |
| `GLOBAL_MAP` | ~84864 | Global cache map | Medium |
| `BaseCache` | ~84865 | Base cache class | Low |

**Pattern:**
```javascript
// Line ~84865-84874
InMemoryCache = class _InMemoryCache extends BaseCache {
    constructor(map7) {
        super();
        this.cache = map7 ?? /* @__PURE__ */ new Map();
    }
}
```

### 5.8 VS Code Storage APIs

#### 5.8.1 globalState Usage

| Key | Line | Description | Severity |
|-----|------|-------------|----------|
| `kiro.coach.shown.{coachType}` | ~39594-39602 | Coaching state tracking | Low |
| `kiroAgent.showDiffInfoMessage` | ~42196-42199 | Diff info message shown | Low |
| `HISTORY_KEY` | ~43658-43671 | Quick edit history | Low |
| `showConfigUpdateToast` | ~48295-48299 | Config update toast shown | Low |
| `hasBeenInstalled` | ~48743-48744 | Installation tracking | Low |

#### 5.8.2 globalState Pattern

```javascript
// Line ~39595-39602
let currentValue = extensionContext.globalState.get(coachingKey);
if (currentValue === void 0) {
    currentValue = false;
    await extensionContext.globalState.update(coachingKey, currentValue);
}
```

### 5.9 VsCodeExtension Class

| Component | Line | Description | Severity |
|-----------|------|-------------|----------|
| `VsCodeExtension` class | ~48181 | Main extension class | High |
| `configHandler` | ~48183 | Configuration handler | Medium |
| `extensionContext` | ~48184 | VS Code extension context | Medium |
| `ide` | ~48185 | IDE interface | Medium |
| `tabAutocompleteModel` | ~48186 | Autocomplete model | Low |
| `continueVirtualDocumentScheme` | ~46448, ~48339 | Virtual document scheme | Low |

### 5.10 Lock Patterns

#### 5.10.1 Suggestions Lock

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `setSuggestionsLocked(filepath, locked)` | ~46457 | Lock/unlock suggestions for file | Low |
| `editorSuggestionsLocked.set(filepath, locked)` | ~46458 | Map storing lock state | Low |

#### 5.10.2 Stream Reader Lock

| Pattern | Line | Description | Severity |
|---------|------|-------------|----------|
| `this.locked` check | ~61380, ~61393 | Reader lock state | Low |
| `this.reader.releaseLock()` | ~61382, ~61395 | Release reader lock | Low |

### 5.11 Critical Issues Summary

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **SQLITE_BUSY not handled** | ~33447 | **Critical** | Multi-window crashes |
| **Session file race conditions** | ~33807-33844 | **High** | Data corruption |
| **MCPManagerSingleton conflicts** | ~32206 | **High** | State inconsistency |
| **Sync file I/O blocking** | Multiple | **Medium** | UI freezes |
| **No database locking** | ~33460 | **High** | Concurrent access issues |

### 5.12 Recommended Patches

| Priority | Target | Line | Action |
|----------|--------|------|--------|
| **P0** | SQLite BUSY handling | ~33447 | Add `PRAGMA busy_timeout=5000` or retry logic |
| **P0** | Session file locking | ~33807 | Implement file locking or atomic writes |
| **P1** | MCPManagerSingleton | ~32206 | Add per-window instance management |
| **P1** | SqliteDb singleton | ~33460 | Add connection pooling or per-window DB |
| **P2** | Sync file operations | Multiple | Convert to async with proper error handling |
| **P2** | Index clear on BUSY | ~33447 | Add SQLITE_BUSY to handled errors |

### 5.13 Database File Locations

Based on the code analysis, the following database files are used:

| Database | Path Function | Purpose |
|----------|---------------|---------|
| Index SQLite | `getIndexSqlitePath()` | Code indexing metadata |
| LanceDB | `getLanceDbPath()` | Vector embeddings storage |
| DevData SQLite | `init_devdataSqlite()` | Token usage statistics |
| Sessions | `getSessionFilePath()` | Chat session data |
| Sessions List | `getSessionsListPath()` | Session index JSON |

### 5.14 Summary

**Part 5 contains critical database and storage infrastructure:**

- **SQLite singleton** with no multi-window support - primary crash source
- **SQLITE_BUSY explicitly excluded** from error handling
- **Session files** use non-atomic read-modify-write pattern
- **Multiple singletons** (MCPManager, SqliteDb, AsyncLocalStorage) assume single-instance
- **Synchronous file I/O** can block the extension host
- **No file locking** for concurrent access protection

**Root Cause of Multi-Window Crashes:** The `SqliteDb.get()` singleton at line ~33460 returns a shared database connection. When multiple VS Code windows are open, they each have their own extension host process but share the same database file. Without `busy_timeout` or proper locking, concurrent writes cause `SQLITE_BUSY` errors which are **intentionally not handled** (line ~33447), leading to crashes.

---

## Part 6: Utilities & Helpers (lines 811,250-973,497)

### 6.1 Machine ID Usage & Fingerprinting

| Function/Location | Line | Description | Severity | Patch Potential |
|-------------------|------|-------------|----------|-----------------|
| `getMachineId2()` | ~124825 | Machine ID retrieved and sent in `customUserAgent` header to CodeWhisperer API | **Critical** | Replace with spoofed ID |
| `getSystemPromptMessages()` | ~148667-148670 | Machine ID **injected directly into LLM system prompts** as `<current_context>Machine ID: ${machineId2}</current_context>` | **Critical** | Patch to use spoofed ID |
| `customUserAgent` construction | ~124832 | Format: `KiroIDE ${kiroVersion} ${machineId}` sent with every API request | **High** | Intercept and modify |

**Key Finding:** Machine ID is embedded in EVERY conversation with the AI model, making it a primary tracking vector.

### 6.2 Hashing & Crypto Functions

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `StorageManager.hash()` | ~121766 | SHA256 hash truncated to 32 chars: `createHash("sha256").update(data).digest("hex").substring(0, 32)` | Low |
| `Sha12` (SHA1 impl) | ~97079-97167 | Node SHA1 implementation from `sha.js` | Low |
| `shasum()` / `subtleSHA1()` | ~102297-102312 | Git SHA1 for object hashing, uses WebCrypto when available | Low |
| `crypto.randomUUID()` | ~83867-83868 | Standard UUID generation via Node crypto | Low |
| `randomBytes(16)` | ~135175 | Nonce generation for webview CSP | Low |

### 6.3 Telemetry & Tracking Infrastructure

#### 6.3.1 MetricReporter Instances (40+ found)

| Namespace | Component | Line |
|-----------|-----------|------|
| `TelemetryNamespace.Application` | storage | ~121732 |
| `TelemetryNamespace.Application` | issues | ~124397 |
| `TelemetryNamespace.Application` | readFile | ~140351 |
| `TelemetryNamespace.Application` | writeFile | ~140715 |
| `TelemetryNamespace.Application` | steering | ~141271 |
| `TelemetryNamespace.Billing` | enable-overages | ~124841 |
| `TelemetryNamespace.Billing` | get-portal-session-url | ~124891 |
| `TelemetryNamespace.Billing` | get-usage-limits | ~125001 |
| `TelemetryNamespace.Billing` | get-subscription-plans | ~125221 |
| `TelemetryNamespace.Billing` | get-checkout-session-url | ~125297 |
| `TelemetryNamespace.Agent` | get-available-models | ~125341 |
| `TelemetryNamespace.Profiles` | list-available-profiles | ~125538 |
| `TelemetryNamespace.Tool` | execute-bash | ~142395 |
| `TelemetryNamespace.Tool` | Tool.FsFileWrite.Detailed | ~143539 |
| `TelemetryNamespace.Tool` | Tool.FsAppend.Detailed | ~143779 |
| `TelemetryNamespace.Tool` | Tool.StrReplace.Detailed | ~144534 |

#### 6.3.2 Telemetry.Trace Decorators (35+ tool methods traced)

All tool executions are traced with `@Telemetry.Trace()`:

| Tool | Line | Trace Name |
|------|------|------------|
| ToolExecuteBash | ~142657 | `Tool.ExecuteBatch` |
| ToolListDirectory | ~142763 | `Tool.ListDirectory` |
| ToolReadFile | ~143249 | `Tool.ReadFile` |
| ToolReadMultipleFiles | ~143461 | `Tool.ReadMultipleFiles` |
| ToolFsWrite | ~143762 | `Tool.FsFileWrite` |
| ToolFsAppend | ~143980 | `Tool.FsAppend` |
| ToolFileSearch | ~144145 | `Tool.FileSearch` |
| ToolGrepSearch | ~144398 | `Tool.GrepSearch2` |
| DeleteFileTool | ~144520 | `Tool.DeleteFile` |
| ToolStrReplace | ~144786 | `Tool.StringReplace` |
| ToolMCPWrapper | ~144999 | `Tool.MCP` |
| GetUserInputTool | ~145205 | `Tool.GetUserInput` |
| UpdateTaskStatusTool | ~145318 | `Tool.TaskStatus` |
| UpdatePBTStatusTool | ~145430 | `Tool.PBTStatus` |
| ToolCreateHook | ~145452 | `Tool.CreateHook` |
| ToolGetDiagnostics | ~145592 | `Tool.GetDiagnostics` |
| ToolPrework | ~145689 | `Tool.Prework` |
| ToolReadCode | ~146287 | `Tool.ReadCode` |
| ToolControlProcess | ~146976 | `Tool.ControlProcess` |
| ToolListProcesses | ~147065 | `Tool.ListProcesses` |
| ToolGetProcessOutput | ~147184 | `Tool.GetProcessOutput` |
| ToolEditCode | ~148547 | `Tool.EditCode` |
| ToolInvokeSubAgent | ~149507 | `Tool.InvokeSubAgent` |
| ToolReportProgress | ~149549 | `Tool.ReportProgress` |
| ToolSubagentResponse | ~149593 | `Tool.SubagentResponse` |
| ToolKiroPowers | ~150411 | `Tool.KiroPowers` |
| TaskService (multiple) | ~157299-157334 | Various task operations |

#### 6.3.3 Feature Usage Tracking

| Feature | Line | Event Name |
|---------|------|------------|
| Spec generation | ~122784 | `spec-generation` |
| Spec action | ~127376 | `spec-action` |
| Execute spec task | ~151507 | `execute-spec-task` |
| Refresh design file | ~151631 | `refresh-design-file` |
| Refresh plan file | ~151693 | `refresh-plan-file` |
| Refresh requirements | ~151947 | `refresh-requirements-file` |
| Chat to fix PBT | ~153330 | `chat-to-fix-pbt` |

#### 6.3.4 Journey Tracking

| Function | Line | Description |
|----------|------|-------------|
| `startOnboarding()` | ~124234 | Starts onboarding journey with timeout tracking |
| `completeOnboarding()` | ~124229 | Marks onboarding journey complete |

### 6.4 Platform & System Info Collection

| Location | Line | Data Collected |
|----------|------|----------------|
| Issue report | ~124280 | `process.platform` |
| Issue report query | ~124419 | OS, Kiro version, conversation IDs |
| User-Agent | ~95638 | `Mozilla/5.0 (${process.platform})...` |
| WebFetch client | ~126051 | `KiroIDE/${getKiroVersion()}` |

### 6.5 Telemetry Admin Settings

| Function | Line | Description | Severity |
|----------|------|-------------|----------|
| `getCanEnableTelemetry()` | ~125721-125733 | Checks enterprise admin telemetry settings | Medium |
| `UNIMPORTED_SETTINGS` | ~123662 | Excludes telemetry settings from import: `telemetry.enableCrashReporter`, `telemetry.enableTelemetry`, `telemetry.telemetryLevel` | Info |

### 6.6 Span Attributes (Data sent with telemetry)

Telemetry spans include these attributes:
- `scope`, `stepId`, `hasInput` (onboarding)
- `step.id`, `step.scope`, `step.status` (step tracking)
- `validRequest`, `apiAvailable`, `messageKey`, `messageType` (webview)
- `eventType`, `actionType`, `actionState` (agent events)
- `numberOfAttempts` (activation)
- `ConversationId`, `ModelId` (chat context)

### 6.7 Encoding Functions

| Function | Line | Purpose |
|----------|------|---------|
| `atob()` / `btoa()` | ~95353-95365 | Base64 encode/decode in JSDOM window |
| `whatwgEncoding.decode()` | Multiple | HTML/text decoding |
| `decodeVarInt()` | ~104464 | Git packfile parsing |
| `TextDecoder` | ~106317 | UTF-8 decoding with autocrlf |

### 6.8 Critical Patch Points

| Priority | Target | Line | Action |
|----------|--------|------|--------|
| **P0** | `getMachineId2()` call in `getSystemPromptMessages()` | ~148667 | Replace with custom ID |
| **P0** | `customUserAgent` in `getCodeWhispererRuntimeClient()` | ~124832 | Spoof machine ID portion |
| **P1** | `MetricReporter` instances | Multiple | Disable or redirect |
| **P1** | `Telemetry.Trace` decorator | Multiple | No-op decorator |
| **P2** | `Feature.reportUsage()` calls | Multiple | Disable tracking |
| **P2** | `withSpan()` wrapper | Multiple | No-op wrapper |

### 6.9 Summary

**Part 6 contains the core telemetry infrastructure:**
- 40+ MetricReporter instances tracking various operations
- 35+ tool methods decorated with Telemetry.Trace
- Machine ID injected into every LLM conversation
- Platform info collected for issue reports
- Journey tracking for onboarding
- Enterprise telemetry admin settings check

**Most Critical Finding:** The `getSystemPromptMessages()` function at line ~148667 injects the machine ID directly into the AI conversation context, making it visible to the model and potentially logged server-side.

---

## Summary & Recommendations

### Critical Issues (P0)

| Issue | Location | Impact | Fix Complexity |
|-------|----------|--------|----------------|
| **Machine ID in LLM prompts** | Part 6, ~148667 | Every AI conversation contains machine ID in `<current_context>` | Medium - patch `getSystemPromptMessages()` |
| **Machine ID in User-Agent** | Part 6, ~124832 | Every API request contains `KiroIDE ${version} ${machineId}` | Medium - patch `customUserAgent` |
| **SQLITE_BUSY not handled** | Part 5, ~33447 | Multi-window crashes, data corruption | High - requires singleton refactor |
| **systeminformation fingerprinting** | Part 2, ~34558-34574 | Collects UUID, MAC, disk serials, BIOS serial | Medium - mock/intercept calls |

### Detection Vectors (Priority Order)

| Vector | Parts | Severity | Patchable? |
|--------|-------|----------|------------|
| Machine ID in system prompts | 6 | **Critical** | ✅ Yes |
| Machine ID in User-Agent header | 6 | **Critical** | ✅ Yes |
| OpenTelemetry host attributes | 1 | **Critical** | ✅ Already patched (v6.2.0) |
| systeminformation hardware data | 2 | **Critical** | ✅ Yes |
| `x-amzn-trace-id` X-Ray header | 1, 4 | High | ✅ Yes |
| `amz-sdk-invocation-id` header | 4 | High | ✅ Yes |
| `SignInBlockedError` telemetry | 2 | High | ✅ Yes |
| Onboarding step recording | 2 | Medium | ✅ Yes |
| 40+ MetricReporter instances | 6 | Medium | ⚠️ Complex |
| 35+ Telemetry.Trace decorators | 6 | Medium | ⚠️ Complex |

### Performance Optimizations

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| Synchronous file I/O | Part 5, multiple | UI freezes | Convert to async |
| Session file race conditions | Part 5, ~33807 | Data corruption | Implement file locking |
| LRU Cache unbounded growth | Part 3, ~6950 | Memory leak | Set max/maxSize limits |
| Timer accumulation | Part 3, ~6977 | Memory leak | Ensure cleanup on dispose |
| SQLite singleton contention | Part 5, ~33460 | Multi-window crashes | Add busy_timeout or per-window DB |

### Existing Patches Found

| Patch | Version | Location | Status |
|-------|---------|----------|--------|
| `KIRO_OTEL_PATCH` | v6.2.0 | Part 1, ~71595 | ✅ Active - spoofs machine ID for telemetry |
| `KIRO_TOKEN_CACHE_PATCH` | v6.2.0 | Part 2, ~6376 | ✅ Active - clears cache for account switching |

### Recommended New Patches

| Priority | Patch Name | Target | Action |
|----------|------------|--------|--------|
| **P0** | `KIRO_SYSTEM_PROMPT_PATCH` | ~148667 | Replace `machineId2` with custom ID in `getSystemPromptMessages()` |
| **P0** | `KIRO_USER_AGENT_PATCH` | ~124832 | Spoof machine ID in `customUserAgent` construction |
| **P1** | `KIRO_SYSINFO_PATCH` | ~34558-34574 | Mock `systeminformation` calls to return spoofed data |
| **P1** | `KIRO_SQLITE_BUSY_PATCH` | ~33447 | Add `SQLITE_BUSY` to handled errors, add `busy_timeout` PRAGMA |
| **P2** | `KIRO_XRAY_PATCH` | ~85996, ~122417 | Disable or randomize X-Ray trace ID propagation |
| **P2** | `KIRO_INVOCATION_ID_PATCH` | ~146239 | Randomize `amz-sdk-invocation-id` header |
| **P3** | `KIRO_TELEMETRY_DISABLE_PATCH` | Multiple | No-op MetricReporter and Telemetry.Trace |

### API Endpoints Summary

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `https://oidc.{region}.amazonaws.com/token` | Token refresh | None |
| `https://codewhisperer.{region}.amazonaws.com` | CodeWhisperer API | SigV4 |
| `amazoncodewhispererstreamingservice.{region}.amazonaws.com` | Streaming completions | SigV4 |
| `https://portal.sso.{region}.amazonaws.com` | SSO Portal | Bearer |
| `https://sts.amazonaws.com` | STS credentials | SigV4 |
| `https://bedrock-runtime.{region}.amazonaws.com` | Bedrock models | SigV4 |

### Token Storage Locations

| File | Path | Purpose |
|------|------|---------|
| Auth token | `~/.aws/sso/cache/kiro-auth-token.json` | Main auth token |
| Custom machine ID | `~/.kiro-manager-wb/machine-id.txt` | Spoofed machine ID |
| Index SQLite | `{workspaceStorage}/index.sqlite` | Code indexing |
| DevData SQLite | `{workspaceStorage}/devdata.sqlite` | Usage statistics |
| Sessions | `{workspaceStorage}/sessions/` | Chat sessions |

### Telemetry Namespaces

All telemetry is organized into these namespaces:
- `kiro.application` - General app events
- `kiro.feature` - Feature usage
- `kiro.continue` - Autocomplete
- `kiro.agent` - Agent operations
- `kiro.tool` - Tool executions (35+ traced)
- `kiro.parser` - Code parsing
- `kiro.onboarding` - Onboarding flow
- `kiro.webview` - UI interactions
- `kiro.auth` - Authentication
- `kiro.billing` - Subscription/billing
- `kiro.profiles` - Profile management
- `kiro.remote-tools` - Remote tool calls

### Next Steps

1. **Implement P0 patches** - Machine ID in system prompts and User-Agent are the most critical detection vectors
2. **Test multi-window stability** - SQLITE_BUSY fix needed for reliable operation
3. **Consider systeminformation mock** - Hardware fingerprinting is extensive
4. **Monitor for new detection vectors** - Kiro updates may add new tracking
