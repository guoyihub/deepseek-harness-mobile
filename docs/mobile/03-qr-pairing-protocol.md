# 03 — 二维码配对协议

[← 索引](./README.md) | [Trae 参考 →](./02-trae-reference.md)

本文定义 MetaCode Mobile 与桌面 Host 之间的 **无账号配对协议**。实现须与现有 `/api` trust fence 协同，见 [06-security.md](./06-security.md)。

## 设计目标

- **无需账号**：不引入用户注册、OAuth 或云端身份
- **短期、一次性**：`pairToken` 仅用于换取设备 `sessionToken`
- **LAN 限定**：二维码携带局域网可达地址，不暴露公网入口
- **可撤销**：Host 维护已配对设备列表，支持单设备吊销

## 二维码 Payload

### 推荐格式：HTTPS URL（相机友好）

```
https://192.168.1.10:3080/mobile/pair?t=<pairToken>&e=<expiresUnix>&f=<fingerprint>
```

| 参数 | 说明 |
|------|------|
| `t` | `pairToken`，UUID v4 |
| `e` | 过期时间 Unix 秒；无密码 QR 为 mint 后 24h；有密码 QR 为 `0`（长期有效直至重新生成） |
| `f` | Host 实例指纹（见下） |
| `p` | 可选；`1` 表示手机须输入连接密码 |

### 备选格式：JSON（调试 / 手动输入降级）

```json
{
  "v": 1,
  "host": "192.168.1.10",
  "port": 3080,
  "pairToken": "550e8400-e29b-41d4-a716-446655440000",
  "expiresAt": "2026-08-17T09:05:00+08:00",
  "fingerprint": "a1b2c3d4"
}
```

### 备选 Deep Link（原生壳 M2+）

```
metacode://pair?host=192.168.1.10&port=3080&t=...&e=...&f=...
```

### Host 实例指纹 `fingerprint`

- Host 启动时生成的稳定实例 id（如首次启动写入 `~/.metacode/mobile-host-id`）
- 手机本地存储「上次连接的 fingerprint」，重连时可提示「是否同一台电脑」
- **非密钥**；真正的秘密是 `pairToken` 与 `sessionToken`

## 令牌模型

| 令牌 | 生命周期 | 用途 |
|------|----------|------|
| `pairToken` | TTL ≤ 5 分钟，**单次使用** | 换取 `sessionToken` |
| `sessionToken` | 长期直到吊销或 Host 重启策略 | 所有 `/api` 与 WS 请求 |
| `refreshToken` | M2 可选 | 延长会话而不重新扫码 |

### sessionToken 声明（逻辑结构）

```json
{
  "deviceId": "uuid",
  "deviceLabel": "iPhone 15",
  "scopes": ["session:read", "session:write", "command:execute"],
  "issuedAt": "2026-08-17T08:55:00+08:00",
  "expiresAt": "2026-09-16T08:55:00+08:00"
}
```

传输时使用 opaque 字符串（Host 内存或 SQLite 查找），M1 不必 JWT。

## API 端点（规划）

以下路径挂载在现有 `/api` 树下，由 `packages/host/mobile-pairing` 提供。

### `POST /api/mobile/pair`

**请求**（手机 → Host）：

```json
{
  "pairToken": "550e8400-e29b-41d4-a716-446655440000",
  "deviceLabel": "Pixel 8",
  "clientVersion": "mobile/0.1.0"
}
```

**Header**：常规浏览器 Fetch；须通过 trust fence（Host 为 LAN IP 且已在 `trustedHosts`）。

**响应 200**：

```json
{
  "sessionToken": "<opaque>",
  "deviceId": "<uuid>",
  "hostDisplayName": "DESKTOP-ABC",
  "fingerprint": "a1b2c3d4",
  "scopes": ["session:read", "session:write", "command:execute"],
  "expiresAt": "2026-09-16T08:55:00+08:00"
}
```

**错误**：

| 状态 | 含义 |
|------|------|
| 404 | `pairToken` 不存在或已消费 |
| 410 | 已过期 |
| 403 | trust fence 或待桌面确认被拒绝 |
| 409 | 需桌面确认，尚未批准（手机轮询或 WS 通知） |

### `POST /api/mobile/pair/confirm`（Host 桌面 UI 调用）

桌面用户点击「允许此设备」后，Host 内部完成 pending → active。

### `DELETE /api/mobile/devices/:deviceId`

Host 或桌面 UI 吊销设备；手机下次请求 401。

### `GET /api/mobile/pair/qrcode`（桌面 UI 调用）

返回当前有效 `pairToken` 与 QR 渲染所需字段（或桌面本地生成 QR，仅向 Host 注册 token）。

## 配对时序

```mermaid
sequenceDiagram
  participant DesktopUI as Desktop_Web_UI
  participant Host as Host_mobile_pairing
  participant Phone as Mobile_PWA
  participant API as api_trust_fence

  DesktopUI->>Host: 请求展示 QR
  Host->>Host: mint pairToken (24h if no password; persistent if password)
  Host->>DesktopUI: payload host port token
  DesktopUI->>DesktopUI: 渲染 QR

  Phone->>Phone: 扫码解析
  Phone->>API: POST /api/mobile/pair
  API->>Host: 校验 pairToken

  alt 需桌面确认
    Host->>DesktopUI: pending 设备弹窗
    DesktopUI->>Host: confirm
  end

  Host->>Host: 消费 pairToken 签发 sessionToken
  Host->>Phone: sessionToken + scopes
  Phone->>Phone: localStorage 持久化

  Phone->>API: GET host.describe Authorization Bearer
  Phone->>API: WS /api/events.mux ?token=
  Phone->>API: WS /api/events.host ?token=
```

## 与现有连接栈的集成

### HTTP

[`WebApiClient`](../../packages/client/connection/src/client/web-api-client.ts) 在 `doFetch` 中附加：

```
Authorization: Bearer <sessionToken>
```

### WebSocket

M1 方案（择一，实现时定稿）：

| 方案 | 做法 |
|------|------|
| A | Query：`/api/events.mux?access_token=...` |
| B | 子协议头：`Sec-WebSocket-Protocol: metacode-session,<token>` |
| C | 配对后短期 Cookie（同 site LAN IP） |

推荐 **A**（与现有 upgrade 路径改动最小）；须防 token 进日志。

### trust fence

现有 [`api-request-trust.ts`](../../packages/client/connection/src/api-request-trust.ts) 校验 **Host / Origin 可达性**，不是认证。

配对后新增一层：

1. **可达性**：手机请求 Host 仍须匹配 `trustedHosts`（web-app 绑定 LAN IP 时已写入）
2. **认证**：`/api/mobile/pair` 除外，其余 `/api/*` 若带 mobile `sessionToken` 则校验 scopes；无 token 的 LAN 请求仍按现策略（privileged 方法仅 loopback）

**不** 因 Mobile 方案开放 `metacode web --host 0.0.0.0`（见 `packages/bundle/web-app/src/startup.ts`）。

## pairToken 生成（Host 侧）

- 桌面点击「手机连接」或 CLI `metacode web` 启动后自动注册一个 token
- 同一时刻仅 **一个** 有效 pairToken（新 QR 使旧 token 失效）
- QR 界面显示 **倒计时**（与 `expiresAt` 同步）
- Host 进程退出时清除所有 pending token；已签发 sessionToken 策略可配置（默认保留至吊销）

## 手机端存储

| 键 | 内容 |
|----|------|
| `dsh.mobile.host` | `https://host:port` |
| `dsh.mobile.sessionToken` | opaque token |
| `dsh.mobile.deviceId` | 本机 device id |
| `dsh.mobile.fingerprint` | 上次 Host 指纹 |

清除存储 = 用户视角「退出连接」，不删除 Host 上 session 数据。

## 降级：手动配对

当相机不可用：

1. 用户在手机输入 `host:port`
2. 桌面 QR 页展示 **6 位数字配对码**（pairToken 短码映射）
3. `POST /api/mobile/pair`  body 增加 `shortCode`

## 错误恢复

| 场景 | 行为 |
|------|------|
| token 过期 | 手机提示重新扫码 |
| Host 重启 | 视策略：sessionToken 失效 → 重新扫码 |
| Wi-Fi 切换 | ConnectionController 连续重连 3 次；失败则清除配对并引导扫码 |
| 桌面拒绝配对 | 手机显示「桌面未授权」 |

## 下一步

- 架构落点：[04-architecture.md](./04-architecture.md)
- 安全细节：[06-security.md](./06-security.md)
