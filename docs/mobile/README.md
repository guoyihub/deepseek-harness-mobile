# DeepSeek Harness 手机端

DeepSeek Harness Mobile（`@deepseek-ai/deepseek-harness-mobile`）是手机端 PWA：通过本机局域网二维码扫码配对桌面 Host，无需账号。

## 相关代码

| 主题 | 路径 |
|------|------|
| Host 配对插件 | `packages/host/mobile-pairing/` |
| 桌面 QR Modal | `packages/client/ui-mobile-pairing/` |
| 手机壳 UI | `packages/client/mobile-shell/` |
| Host↔Client 连接 | `packages/client/connection/` |
| Mobile PWA 入口 | `apps/mobile/` |
| Web profile 启动 | `packages/bundle/web-app/` |

## 本地开发

```powershell
pnpm install

# 构建（已含 build:lib）
pnpm build:mobile   # 仅 Mobile PWA
pnpm build:web      # 仅桌面 Web
pnpm build          # 全部

# 开发启动
pnpm dsh web        # Host（:3080）
pnpm dsh mobile     # Mobile PWA（:8030）
pnpm dsh            # 同时启动两者
```

服务器上 Host 建议：`pnpm dsh web --no-open`。

| 端 | 本机（电脑浏览器） | 手机可达 |
|----|------|--------|
| 桌面 Web / Host | http://127.0.0.1:3080 | 一般不必给手机用 |
| Mobile PWA | http://127.0.0.1:8030 | `http://<电脑局域网 IP>:8030` 或穿透到 **8030** 的域名 |
| 配对页 | http://127.0.0.1:8030/mobile/pair | 同上 Mobile 地址下的 `/mobile/pair` |

### 本机访问 vs 局域网 / 穿透

- **本机 `127.0.0.1:8030`**：只适合在电脑上预览 Mobile UI。手机访问 `127.0.0.1` 会连到手机自己，配对必失败。
- **局域网 / 穿透**：手机只打开 Mobile（:8030）。Vite 把同源 `/api` 与 WebSocket 代理到本机 Host（:3080）。**不要**把 Host `:3080` 单独穿透给手机。
- 二维码与短码应对准手机能打开的 Mobile 地址；异地穿透时确认隧道目标是 8030，且与二维码里的主机一致。

根目录 [README.md](../../README.md#access-local-vs-tunnel) 有踩坑对照表。

### 配对步骤

1. 桌面 Web 侧边栏打开 **手机连接**，展示 QR 与 6 位短码；或在 **设置 → DSH 移动端** 调整连接验证。
2. 用局域网 IP 或穿透地址在**手机**浏览器打开 Mobile（`:8030`），或扫描 QR / 输入短码。
3. 配对成功后进入任务列表（默认扫码即连；Host 可设 `confirmMode: strict`）。

Mobile 的 `/api` 与 WebSocket 由 Vite 代理到本机 Host `:3080`；代理会去掉 Origin/Referer，避免穿透来源被 Host Origin 校验拒绝。二维码应指向 Mobile 地址，无需把 Host 域名填给手机。

生产构建：`pnpm build:mobile`（输出 `apps/mobile/dist`）。

## 原生 App（Capacitor）

需要 iOS / Android 安装包、且由用户手动配置已部署 Mobile 服务器地址时，见 [原生 App 打包](./native-app.md)。
