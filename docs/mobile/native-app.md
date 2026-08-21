# 原生 App 打包（Capacitor）

DSH Mobile 可通过 [Capacitor](https://capacitorjs.com/) 打包为 iOS / Android 安装包。原生壳内嵌与 PWA 相同的 React UI；用户首次打开 App 时手动配置已部署的 Mobile 服务器外网地址，之后所有 `/api` 与 WebSocket 请求都发往该地址。

## 与 PWA 的差异

| 场景 | PWA（浏览器） | 原生 App |
| --- | --- | --- |
| 访问入口 | 手机浏览器打开 `:8030` 或穿透域名 | 安装 App，配置服务器 URL |
| API 基址 | 页面同源（Vite 代理到 Host） | 用户配置的 Mobile 服务器 URL |
| 首次启动 | 直接扫码配对 | 先配置服务器，再扫码配对 |

部署 Mobile 服务时，仍需在服务器上运行 Mobile 静态站点，并将 `/api` 反代到 Host（与 [开发文档](./README.md) 中穿透说明一致）。App 只保存该 Mobile 服务的外网地址，而不是 Host `:3080`。

## 环境要求

- Node.js ^22.19 或 >=24（与仓库一致）
- **Android**：Android Studio、JDK 17+
- **iOS**：macOS、Xcode（仅 macOS 可构建 iOS）

## 构建步骤

```powershell
pnpm install

# 1. 编译原生壳用的 Web 资源（启用 VITE_DSH_NATIVE_SHELL）
pnpm --filter @deepseek-ai/deepseek-harness-mobile run build:native

# 2. 首次：添加原生平台（只需一次）
cd apps/mobile
pnpm exec cap add android
# macOS 上可选：
# pnpm exec cap add ios

# 3. 同步 Web 资源到原生工程
pnpm exec cap sync

# 4. 用 Android Studio / Xcode 打开并打包
pnpm exec cap open android
# pnpm exec cap open ios
```

根目录快捷命令：

```powershell
pnpm --filter @deepseek-ai/deepseek-harness-mobile run cap:sync
pnpm --filter @deepseek-ai/deepseek-harness-mobile run cap:android
```

## 用户配置服务器

1. 在 A 服务器部署 Mobile（`pnpm build:mobile` 产物 + 反代 `/api` 到 Host）。
2. 用户安装 App，首次启动进入 **服务器地址** 页。
3. 输入例如 `https://mobile.example.com`，点 **测试连接** 再 **保存并继续**。
4. 按 usual 流程扫码与桌面 Host 配对。

已配置地址可在 **连接管理 → Mobile 服务器** 中修改。

## HTTP 与混合内容

- 推荐使用 **HTTPS** 外网地址。
- 开发或内网 HTTP 时，Capacitor 已启用 `cleartext` 与 `allowMixedContent`；生产环境请仍优先 HTTPS。

## 相关代码

| 主题 | 路径 |
| --- | --- |
| Capacitor 配置 | `apps/mobile/capacitor.config.ts` |
| 原生构建 Vite 开关 | `apps/mobile/vite.config.ts`（`VITE_DSH_NATIVE_SHELL`） |
| 服务器 URL 存储与 API 基址 | `packages/client/connection/src/client/mobile-origin.ts` |
| 配置 UI | `packages/client/mobile-shell/src/client/ServerSetupPage.tsx` |
