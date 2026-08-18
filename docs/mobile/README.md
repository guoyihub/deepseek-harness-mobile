# DeepSeek Harness 手机端

本目录描述 **DeepSeek Harness Mobile**（`@deepseek-ai/deepseek-harness-mobile`，手机端 PWA）的产品规划与已实现代码入口。

## 核心理念

| 维度 | Trae | DeepSeek Harness Mobile |
|------|------|-------------------------|
| 连接方式 | 同账号登录 + 云端授权 | **本地二维码扫码配对，无需账号** |
| 信任边界 | 账号体系 + 远程授权 | **同一 LAN + 短期配对令牌（可选连接密码）** |
| M1 形态 | 原生 App | **PWA / 移动 Web**（预留原生壳演进） |
| 协议 | 专有云端 | **复用现有 Host↔Client `/api` + WebSocket 协议** |

## 推荐阅读顺序

| 顺序 | 文档 | 内容 |
|------|------|------|
| 1 | [01-product-overview.md](./01-product-overview.md) | 产品定位、用户故事、M1 边界 |
| 2 | [02-trae-reference.md](./02-trae-reference.md) | Trae 功能拆解与 Harness 取舍 |
| 3 | [03-qr-pairing-protocol.md](./03-qr-pairing-protocol.md) | 二维码内容与配对协议（核心） |
| 4 | [04-architecture.md](./04-architecture.md) | 系统架构、复用现有包、新增模块 |
| 5 | [05-ui-ia.md](./05-ui-ia.md) | 信息架构与页面流 |
| 6 | [06-security.md](./06-security.md) | 威胁模型、权限分级 |
| 7 | [07-m1-roadmap.md](./07-m1-roadmap.md) | 分期交付与验收标准 |

## 相关代码

| 主题 | 路径 |
|------|------|
| Host 配对插件 | `packages/host/mobile-pairing/` |
| 桌面 QR Modal | `packages/client/ui-mobile-pairing/` |
| 手机壳 UI | `packages/client/mobile-shell/` |
| Host↔Client 连接 | `packages/client/connection/` |
| Mobile PWA 入口 | `apps/mobile/`（包名 `@deepseek-ai/deepseek-harness-mobile`） |
| Web profile 启动 | `packages/bundle/web-app/` |

## 本地开发

```powershell
# Terminal A — Host（默认 :3080）
pnpm dsh web

# Terminal B — Mobile PWA（Vite :8030，/api 代理到 Host）
pnpm dev:mobile
# 或：pnpm --filter @deepseek-ai/deepseek-harness-mobile dev
```

### 访问链接

| 端 | 用途 | 本机 | 局域网（示例，以 Vite 启动日志为准） |
|----|------|------|--------------------------------------|
| 桌面 Web | Host + 侧边栏「手机连接」 | [http://127.0.0.1:3080](http://127.0.0.1:3080) | `http://<电脑局域网 IP>:3080` |
| Mobile PWA | 手机端首页 | [http://127.0.0.1:8030](http://127.0.0.1:8030) | `http://<电脑局域网 IP>:8030` |
| Mobile 配对页 | 扫码 / 短码 / 深链 | [http://127.0.0.1:8030/mobile/pair](http://127.0.0.1:8030/mobile/pair) | `http://<电脑局域网 IP>:8030/mobile/pair` |
| Host 配对 API | QR 内容、短码 | [http://127.0.0.1:3080/api/mobile/pair/qrcode](http://127.0.0.1:3080/api/mobile/pair/qrcode) | 同上 Host 地址 |

桌面 QR 中的链接形如 `http://<Host>:3080/mobile/pair?t=<token>&e=…&f=…`。在手机浏览器打开该链接会进入 Mobile 配对页并自动发起配对；也可在 Mobile 内点击 **扫码连接电脑** 用摄像头识别同一 QR。

### 穿透 / Vite 代理配对

手机只访问 Mobile（Vite `:8030` 或穿透域名），`/api` 与 WebSocket 由 Vite 代理到本机 Host `:3080`。

1. 终端 A：`pnpm dsh web`（Host `:3080`）
2. 终端 B：`pnpm dev:mobile`（Mobile `:8030`）
3. 把 Mobile 的穿透地址（如 `https://xxx.natappfree.cc`）或局域网 `http://<电脑IP>:8030` 填到桌面「手机连接」→ **手机端访问地址** → **保存并刷新二维码**
4. 手机扫新二维码；勿再让 QR 指向 `127.0.0.1:3080`

配对成功后手机以当前页面 origin 调用 `/api` 与 `ws(s)://…/api/events.*`，经代理连本机 Host。

### 配对步骤

1. 桌面 Web 侧边栏点击 **手机连接**，展示 QR 与 6 位短码（穿透场景先填手机端访问地址）。
2. 手机浏览器打开 Mobile（本机或穿透链接），或扫描 QR / 粘贴 QR URL / 输入短码。
3. 配对成功后手机直接进入任务列表（默认无需桌面二次确认；可在 Host 配置 `confirmMode: strict` 启用待确认流程）。

生产构建：`pnpm run build:mobile`（输出 `apps/mobile/dist`）。

## 状态（2026-08）

| 阶段 | 状态 |
|------|------|
| Phase 0 规划文档 | 完成 |
| Phase 1 配对闭环 | 完成 |
| Phase 2 最小可用 UI | 完成 |
| Phase 3 体验补齐（PWA、主题、吊销、短码） | 完成 |
| Phase 4 原生壳 / 语音 / 推送 | 未开始 |

## 评审结论（M1 默认）

1. **LAN IP**：M1 QR 使用 Host 报告的 IP；mDNS 主机名留 Phase 4。
2. **PWA**：M1 锁定 PWA + 添加到主屏幕引导。
3. **桌面确认**：默认 `confirmMode: off`（扫码即连）；需要人工审批时可设为 `strict`。
4. **M1 范围**：续聊 + 新建会话；preset 只读 Badge，不切换 Work/Code。
