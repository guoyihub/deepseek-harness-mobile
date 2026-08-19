# Agent Note: 移动端对话与轨迹 Tab

Status: implemented

[English](2026-08-19-mobile-conversation-trajectory-tabs.md) | 中文

## 问题

移动端会话页只展示聊天记录。与桌面 Web 对照的操作者需要同样的「对话 / 轨迹」划分，以及时间轴账本，而不是在手机上重做一套轨迹 UI。

## 决策

`ChatPage` 挂载与桌面一致的 Tab（`对话` / `轨迹`）。对话仍用现有移动端折叠。轨迹一次性启动 Cordis 的 `ConversationEventRegistry` + `ConversationViewRegistry`，注册桌面 Trajectory Definitions，在 `mobileApi` 上打开 client-runtime `Session`，按 session id 过滤 mux envelope 喂入，并用 `bindSnapshotSelector` 钩子渲染 `TrajectoryView`。账本文案来自 trajectory 包字典；Tab 标签放在 `mobile-locale.ts`。

## 曾考虑的替代方案

- **在移动端挂完整 Cordis 客户端运行时 + slot 环。** 本轮否决：移动端是基于 `WebApiClient` 的 React PWA，不是 web-app 插件图；最小 Session + 注册表足够装配轨迹。
- **手写轨迹列表。** 否决：会重复 `@deepseek-ai/dsh-client-ui-trajectory` 已拥有的工具栏、时间轴与账本。

## 后果

- 对话与轨迹分别加载历史（聊天折叠 vs `Session.open`）；实时 mux 共享。
- 轨迹与桌面一样依赖 Host 可浏览的事件历史。
- 窄屏下轨迹在 Tab 下全宽铺开；两个 Tab 都保留输入栏。
