<h1 align="center">DeepSeek Harness Mobile（DSH Mobile）</h1>

<p align="center">
  <strong>面向 iOS 和 Android 的开源 DeepSeek Harness 手机端。</strong><br>
  扫码配对，无需账号。<br>
  在手机上查看任务、继续 Agent 对话。
</p>

<p align="center"><sub>基于 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 构建的社区扩展。中文 · <a href="README.en.md">English</a></sub></p>

<p align="center">
  <img src="assets/mobile-hero.png" alt="DeepSeek Harness 手机端任务列表" width="360">
  &nbsp;&nbsp;
  <img src="assets/mobile-preview.png" alt="DeepSeek Harness Mobile 对话界面" width="360">
</p>

<p align="center">
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/github/stars/deepseek-ai/deepseek-harness?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/iOS%20%7C%20Android-PWA-4493F8?style=flat-square" alt="Supported platforms: iOS and Android PWA">
  <img src="https://img.shields.io/badge/LAN%20%E9%85%8D%E5%AF%B9-2EA44F?style=flat-square" alt="LAN pairing">
</p>

DSH Mobile 把 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Agent 能力带到手机浏览器：通过局域网二维码与桌面 Host 配对，在 PWA 中浏览任务列表、进入会话、查看工具进度与轨迹。Host 仍运行在电脑上；Mobile 负责配对、连接与移动壳 UI，并通过官方插件机制与 Harness 组合。

<a id="run"></a>

## 快速开始

手机与电脑需在同一局域网，或通过手机可访问的穿透地址访问 **Mobile PWA（:8030）**。无需注册账号。

| 端 | 地址 | 说明 |
| --- | --- | --- |
| 桌面 Host | `http://127.0.0.1:3080` | `pnpm dsh web`；侧栏 **手机连接** 展示二维码 |
| Mobile PWA（本机） | `http://127.0.0.1:8030` | `pnpm dsh mobile`；**仅适合在电脑浏览器预览** |
| Mobile PWA（局域网） | `http://<电脑 IP>:8030` | 手机请用此地址；`/api` 与 WebSocket 由 Vite 代理到 Host `:3080` |
| Mobile PWA（穿透） | `https://<你的隧道域名>` | 只穿透 **8030**，不要穿透 Host `:3080` |

### 本机访问 vs 局域网 / 穿透（易踩坑）
<a id="access-local-vs-tunnel"></a>

开发时有两条路径，用途不同：

| 场景 | 打开哪个地址 | 说明 |
| --- | --- | --- |
| 电脑上调试 Mobile UI | `http://127.0.0.1:8030` | 本机回环；配对、扫码链路仍依赖下方「手机可达」地址 |
| 手机配对 / 日常使用 | `http://<电脑 IP>:8030` 或穿透域名 | 手机必须能打开这个地址；页面再通过同源 `/api` 代理到 Host |

**架构要点：** 手机只跟 Mobile（:8030）说话；Mobile 开发服务器把 `/api` 与 WebSocket **代理到本机 Host（:3080）**。二维码与配对页也应指向 Mobile，而不是 Host。

常见踩坑：

1. **手机打开 `127.0.0.1:8030`**：手机上的 `127.0.0.1` 是手机自己，连不到电脑，页面打不开或配对失败。请改用电脑局域网 IP，或穿透地址。
2. **只穿透 / 只访问 Host `:3080`**：配对页在 Mobile 上（`/mobile/pair`），且 `/api` 代理在 Vite 侧；手机直连 Host 会缺代理与配对路径。**穿透时只暴露 `:8030`。**
3. **二维码里是电脑内网 IP，手机却不在同一局域网**：扫码后无法打开配对页。同网用局域网 IP；异地用穿透，并确保二维码 / 短码对应的是穿透后的 Mobile 地址。
4. **电脑上 `127.0.0.1:8030` 能开、手机用穿透却配对失败**：确认隧道指向的是 Mobile（8030）而非 Host（3080）；本仓库 Vite 已对代理请求去掉 Origin/Referer，避免穿透来源被 Host 的 Origin 校验拦住。

更细的穿透与短码说明见 [手机端开发文档](docs/mobile/README.md)。

### 配对步骤

1. 电脑启动 Host，再启动 Mobile PWA（见下方「开发」）。
2. 桌面 Web 侧栏点击 **手机连接**，或进入 **设置 → DSH 移动端** 配置连接密码（可选）。
3. **手机**用局域网 IP 或穿透地址打开 Mobile，扫描电脑二维码；或在配对页从相册选择二维码图片。不要用手机访问电脑的 `127.0.0.1`。
4. 配对成功后进入 **全部任务** 列表，点选任务继续对话。

<p align="center">
  <img src="assets/desktop-mobile-qr.png" alt="桌面侧栏手机连接二维码" width="720">
</p>

<p align="center">
  <img src="assets/mobile-pair-scan.png" alt="手机扫码配对" width="360">
  &nbsp;&nbsp;
  <img src="assets/mobile-home-unpaired.png" alt="未配对时的手机首页" width="360">
</p>

短码配对、生产构建与代码地图见 [手机端开发文档](docs/mobile/README.md)。

## 文档

| 目标 | 入口 |
| --- | --- |
| 本地开发与配对细节 | [手机端开发文档](docs/mobile/README.md) |
| iOS / Android 原生 App | [原生 App 打包](docs/mobile/native-app.md) |
| Host 配对 API 与配置 | [`packages/host/mobile-pairing/README.md`](packages/host/mobile-pairing/README.md) |
| 手机壳与桌面 QR 代码地图 | [手机端开发文档 — 相关代码](docs/mobile/README.md#相关代码) |
| Harness 架构与插件系统 | [架构文档](docs/architecture.md) |
| 参与上游贡献 | [CONTRIBUTING.md](CONTRIBUTING.md) |

## 主要功能

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>扫码配对</h3>
      <p>桌面 Host 生成二维码与 6 位短码；手机扫码或输入短码即可配对。支持可选连接密码与桌面确认模式，无需第三方账号。</p>
      <p align="center"><img src="assets/desktop-mobile-settings.png" alt="DSH 移动端设置与二维码" width="100%"></p>
    </td>
    <td width="50%" valign="top">
      <h3>任务列表</h3>
      <p>iOS 风格任务首页：浏览全部或运行中任务、搜索历史会话、查看连接状态，右下角一键新建任务。</p>
      <p align="center"><img src="assets/mobile-hero.png" alt="手机任务列表" width="240"></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>移动对话</h3>
      <p>在手机上发送消息、查看 Agent 回复、工具调用进度与轨迹；支持模型选择、Plan 模式与上下文统计。</p>
      <p align="center"><img src="assets/mobile-chat-streaming.png" alt="手机对话与工具进度" width="240"></p>
    </td>
    <td width="50%" valign="top">
      <h3>PWA 安装</h3>
      <p>手机浏览器可添加到主屏幕，获得更接近原生 App 的全屏体验。开发模式下通过 Vite 代理访问 Host API。</p>
      <p align="center"><img src="assets/mobile-preview.png" alt="手机对话完成态" width="240"></p>
    </td>
  </tr>
</table>

## 插件化设计

DSH Mobile 没有单独 fork 一套 Agent 运行时。Host 配对（`dsh-host-mobile-pairing`）、桌面 QR UI（`dsh-client-ui-mobile-pairing`）与手机壳（`dsh-client-mobile-shell`）都是合法的 DSH 插件，通过 `cordis.patch.yml` 与官方 Web profile 组合。会话、模型、工具与插件能力仍来自桌面 Host；Mobile 负责配对传输层与移动 presentation。

## 项目结构

Mobile 相关代码嵌在 DeepSeek Harness monorepo 中，按 Host / Client / App 三层分工：

```text
apps/mobile/                         # Mobile PWA 入口（Vite + PWA）
packages/
  host/mobile-pairing/               # Host：配对 API、二维码、短码、设备管理
  client/
    ui-mobile-pairing/               # 桌面：侧栏「手机连接」与「DSH 移动端」设置
    mobile-shell/                    # 手机：任务首页、扫码、对话、轨迹、连接管理
    connection/                      # Host↔Client 连接与会话传输
  bundle/web-app/                    # Web profile：把上述插件 patch 进官方运行时
docs/mobile/                         # 手机端开发说明
```

| 路径 | 职责 |
| --- | --- |
| `apps/mobile/` | PWA 壳、`manifest`、Vite 开发服务器；`:8030` 把 `/api` 与 WebSocket 代理到 Host `:3080` |
| `packages/host/mobile-pairing/` | `/api/mobile/*` 路由：发码、配对、确认/拒绝、设备列表与吊销 |
| `packages/client/ui-mobile-pairing/` | 桌面侧 QR Modal 与设置页（连接验证、设备管理） |
| `packages/client/mobile-shell/` | 手机 UI：配对页、任务列表、Chat / 轨迹、Composer |
| `packages/client/connection/` | 配对后的 Bearer / WebSocket 连接与会话 RPC |
| `packages/bundle/web-app/` | 将 Mobile 相关插件编入 `dsh web` profile |

详细代码地图与穿透说明见 [手机端开发文档](docs/mobile/README.md)。

## 与官方项目的关系

本项目在 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 之上扩展手机端能力。

官方项目提供 Agent 循环、插件系统、会话持久化与桌面 Web UI。本扩展主要负责：

- 局域网 / 穿透环境下的手机配对与设备管理
- Mobile PWA 壳：任务首页、对话、轨迹与连接管理
- 桌面侧 **手机连接** 入口与 **DSH 移动端** 设置
- 手机端 `/api` 代理与 PWA 打包（`apps/mobile`）

核心 Harness 开发与 CLI 使用请优先查看[官方仓库](https://github.com/deepseek-ai/deepseek-harness)。

## 特别感谢

感谢 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 与 DeepSeek AI 团队提供的 Agent 框架与 Web UI；感谢 [Cordis](https://github.com/cordiverse/cordis) 的插件化基础；也感谢 [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) 社区在桌面体验上的探索——Mobile 与 Desktop 互补，共同把 Harness 带到更多设备。

<a id="run-from-source"></a>

## 开发

安装依赖后，**构建**与**启动**各只需记一条命令：

```powershell
pnpm install

# 构建（已含 build:lib，无需再单独执行）
pnpm build:mobile   # 仅 Mobile PWA 生产包
pnpm build:web      # 仅桌面 Web 前端
pnpm build          # Web + Mobile 全部构建

# 开发启动
pnpm dsh web        # 仅 Host（:3080）
pnpm dsh mobile     # 仅 Mobile PWA（:8030）
pnpm dsh            # 同时启动 Host + Mobile（同一终端，Ctrl+C 停止两者）
```

服务器或无图形界面时，Host 建议加 `--no-open`：`pnpm dsh web --no-open`。

生产构建输出：`pnpm build:web` → Web dist；`pnpm build:mobile` → `apps/mobile/dist`。包级测试与更多细节见 [手机端开发文档](docs/mobile/README.md) 与各包 README。

## 友情链接

| 项目 | 简介 | 链接 |
| --- | --- | --- |
| DeepSeek | DeepSeek 官方网站。 | [deepseek.com](https://www.deepseek.com) |
| Linux.do 社区 | 本项目获社区认可与支持。 | [linux.do](https://linux.do) |

## License

本项目遵循 [MIT License](LICENSE)。

> 本项目是基于 DeepSeek Harness 构建的社区手机端扩展，并非 DeepSeek 官方独立产品。

> DeepSeek 是 DeepSeek AI 的商标。DSH Mobile 是社区扩展，与 DeepSeek 官方没有隶属关系，也未获得其背书。

## Star History

<a href="https://www.star-history.com/?repos=deepseek-ai%2Fdeepseek-harness&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=deepseek-ai/deepseek-harness&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=deepseek-ai/deepseek-harness&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=deepseek-ai/deepseek-harness&type=date&legend=top-left" />
 </picture>
</a>
