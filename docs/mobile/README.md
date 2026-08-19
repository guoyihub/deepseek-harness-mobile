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
# Terminal A — Host（默认 :3080）
pnpm dsh web

# Terminal B — Mobile PWA（Vite :8030，/api 代理到 Host）
pnpm dev:mobile
```

一键后台启动见根目录 [README — 一键启动](../../README.md#run-from-source)（`deploy/dsh.sh` / `deploy/dsh.bat`）。

| 端 | 本机 | 局域网 |
|----|------|--------|
| 桌面 Web | http://127.0.0.1:3080 | `http://<电脑局域网 IP>:3080` |
| Mobile PWA | http://127.0.0.1:8030 | `http://<电脑局域网 IP>:8030` |
| 配对页 | http://127.0.0.1:8030/mobile/pair | 同上 Mobile 地址 |

### 配对步骤

1. 桌面 Web 侧边栏打开 **手机连接**，展示 QR 与 6 位短码。
2. 手机浏览器打开 Mobile，或扫描 QR / 输入短码。
3. 配对成功后进入任务列表（默认扫码即连；Host 可设 `confirmMode: strict`）。

### 穿透 / Vite 代理

手机只访问 Mobile（`:8030` 或穿透域名），`/api` 与 WebSocket 由 Vite 代理到本机 Host `:3080`。在桌面「手机连接」中填写 **手机端访问地址** 后保存并刷新二维码；勿让 QR 指向 `127.0.0.1:3080`。

生产构建：`pnpm run build:mobile`（输出 `apps/mobile/dist`）。
