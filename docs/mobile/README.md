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

| 端 | 本机 | 局域网 |
|----|------|--------|
| 桌面 Web | http://127.0.0.1:3080 | `http://<电脑局域网 IP>:3080` |
| Mobile PWA | http://127.0.0.1:8030 | `http://<电脑局域网 IP>:8030` |
| 配对页 | http://127.0.0.1:8030/mobile/pair | 同上 Mobile 地址 |

### 配对步骤

1. 桌面 Web 侧边栏打开 **手机连接**，展示 QR 与 6 位短码；或在 **设置 → DSH 移动端** 调整连接验证。
2. 手机浏览器打开 Mobile（`:8030`），或扫描 QR / 输入短码。
3. 配对成功后进入任务列表（默认扫码即连；Host 可设 `confirmMode: strict`）。

Mobile 的 `/api` 与 WebSocket 由 Vite 代理到本机 Host `:3080`，二维码自动指向 Mobile 地址，无需手动填写穿透域名。

生产构建：`pnpm build:mobile`（输出 `apps/mobile/dist`）。
