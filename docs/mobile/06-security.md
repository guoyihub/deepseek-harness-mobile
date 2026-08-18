# 06 — 安全设计

[← 索引](./README.md) | [UI IA →](./05-ui-ia.md)

## 威胁模型

MetaCode Mobile 假设：**攻击者与用户在同一个局域网**，或能获取 QR 截图/照片。不假设公网零信任，也不假设账号体系。

| 威胁 | 描述 | 严重性 |
|------|------|--------|
| T1 | LAN 内未授权设备扫码 | 高 |
| T2 | QR 照片泄露后被重放 | 高 |
| T3 | pairToken 暴力猜测 | 中 |
| T4 | sessionToken 泄露（手机丢失、恶意 App 读 storage） | 高 |
| T5 | DNS rebinding 对 `/api` 的攻击 | 高（已有 fence） |
| T6 | 跨站页面诱导浏览器请求本地 Host | 中（已有 Origin 检查） |
| T7 | 手机端越权调用 privileged Remote | 高 |

## 现有防护（复用）

[`packages/client/connection/src/api-request-trust.ts`](../../packages/client/connection/src/api-request-trust.ts) 与 [connection README](../../packages/client/connection/README.md)：

- 所有 `/api` 请求校验 **Host 权威**（loopback 或 `trustedHosts`）
- 浏览器请求校验 **Origin** 与 `sec-fetch-site`
- **Privileged 方法** 仅 loopback：settings、credentials、agentPreset 写、native 对话框等

Mobile 方案 **建立在此之上**，不削弱 fence。

## 新增控制

### 1. pairToken

| 控制 | 说明 |
|------|------|
| 高熵 | UUID v4，不可预测 |
| 短 TTL | ≤ 5 分钟 |
| 单次使用 | 兑换后立即作废 |
| 单活跃 | 新 QR 使旧 token 失效 |
| 速率限制 | 同一 IP 每分钟最多 N 次 pair 尝试（M1 可选） |

### 2. sessionToken

| 控制 | 说明 |
|------|------|
| Opaque | 随机 256-bit，服务端查表 |
| Scoped | 见下表 |
| 可吊销 | 桌面设备管理 |
| 过期 | 默认 30 天或可配置；Host 重启策略文档化 |
| 传输 | HTTPS 推荐；纯 HTTP LAN 接受为 M1 权衡（与现有 web 一致） |

### 3. 桌面确认（Trae「等待授权」的 MetaCode 版）

| 模式 | 行为 | 适用 |
|------|------|------|
| **off**（M1 默认） | 验证 pairToken（及可选连接密码）后立即签发 sessionToken | 家庭 / dev / 日常 LAN |
| **strict** | 每次新 deviceId 首次配对需桌面点击「允许」 | 需人工审批的办公 LAN |
| **trusted-lan** | 同 subnet 首次确认，同 deviceId 重连免确认 | 规划项 |

配置项（规划）：`~/.metacode/mobile-pairing.yaml` 或 settings 命名空间。

### 4. Scope 分级

| Scope | 允许操作 | Mobile M1 |
|-------|----------|-----------|
| `session:read` | 列表、读消息投影 | 是 |
| `session:write` | 发 user message、创建会话 | 是 |
| `command:execute` | `/` 命令（若暴露） | 可选 |
| `settings:read` | — | **否** |
| `settings:write` | — | **否** |
| `credentials:*` | — | **否** |
| `agentPreset:write` | — | **否** |
| `host:native` | 目录选择、打开路径 | **否** |

实现：Typert gateway 或 mobile-pairing 中间件在 Remote dispatch 前检查 scope + 方法 allowlist。

### 5. WebSocket token

Query param token 可能进 access log。缓解：

- Host 日志不记录 query string（或脱敏）
- token 仅短期有效 + 可吊销

## 与 `--host 0.0.0.0` 禁令

[`web-app/startup.ts`](../../packages/bundle/web-app/src/startup.ts) 明确拒绝 `0.0.0.0`：

> intentionally not supported until remote access has an authentication layer

Mobile 配对 **不算**「无认证公网暴露」的充分条件，因此：

- **M1 不解禁** `0.0.0.0`
- 仅 **显式 LAN IP + pairToken + sessionToken** 组合
- 若未来支持公网，需独立设计（VPN / mTLS / 账号），不在本文范围

## 数据驻留

| 数据 | 位置 |
|------|------|
| Session 日志、Agent 状态 | 仅 Host 磁盘（`~/.metacode`） |
| sessionToken | Host 内存/本地 DB + 手机 localStorage |
| 配对记录 | Host 本地 |
| 云端 | **无** |

## 手机丢失

用户应在连接管理或桌面设备列表 **吊销 deviceId**。Host 立即 401 该 token。

手机端「退出连接」仅清本地 storage，不等同吊销。

## 合规表述（对用户）

文档与 UI 应说明：

- 扫码即允许该设备在 LAN 内 **代表你继续 Agent 任务**
- 仅在 **可信 Wi-Fi** 使用
- 二维码勿截图分享
- MetaCode Mobile **不是** 零信任远程访问方案

## 安全验收（Phase 1）

- [ ] 过期 pairToken 返回 410
- [ ] 已消费 pairToken 不可重用
- [ ] 无 token 的 LAN 客户端无法调用 privileged Remote
- [ ] 吊销后 401
- [ ] strict 模式下未确认设备无法获得 sessionToken

## 下一步

- 排期：[07-m1-roadmap.md](./07-m1-roadmap.md)
