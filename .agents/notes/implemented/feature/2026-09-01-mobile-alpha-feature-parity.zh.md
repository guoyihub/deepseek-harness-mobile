# Agent Note: 移动端 alpha 功能对齐（折叠、重连条、设置）

Status: implemented

[English](2026-09-01-mobile-alpha-feature-parity.md) | 中文

## 问题

移动端 PWA 会话流把 system-prompt 与 turn-process 节点打成 JSON，也缺少桌面 Web 在同一 Host generation 上已提供的立即重试、时长统计、图片附件、轮次跳转、正文字号、日程提醒、插件分组、子智能体模型白名单、语言偏好和预设搜索。

## 决策

`MobileChatNodeSeat` 包一层桌面 `ChatNodeSeat`，由 `MobileChatFlow` 提供 `compactTranscript` 与 `createChatStore`；`renderSlot` 挂 `SystemPromptNodeView` / `TurnProcessNodeView` 而不是 `JsonBlock`。投影读取走 `bindMobileUseProjection`（`session.projections.faceOf`）。`MobileReconnectBanner` 在 Home、Chat、连接页调用 `ConnectionController.reconnect()`；重试上限仍见 [重连状态点](2026-08-19-mobile-reconnect-status-dot.zh.md)。Composer 统计用 `buildStatsDetails` 展开 `sessionStats`。提示图片经 `encodeMobileImageFile` 编码；会话 transcript 用 `createMobileImageLoader` 读附件。顶栏轮次跳转滚动 `data-chat-anchor-key`；`applyMobileFontSize` 在 `body` 写 `--dsh-content-font-size`；`MobileScheduleSheet` 复用 `ui-schedule` 源码里的 `formatScheduleFrequency` / `orderScheduleRecords`。设置页列出插件库存分组、`settings` 命名空间 `subagent-model-selection` 的子智能体模型路由、zh/en/system 语言，以及预设搜索。移动端仍不是 Cordis 客户端插件宿主，供应商登录 UI 只到目录。移动 PWA 不提供桌面「轨迹」标签页。

## 曾考虑的替代方案

- **在移动端挂 web-app slot 图。** 否决：PWA 是 Connection RPC 加 React 页面，不是 `dsh.client` 功能插件的 Loader；包装桌面节点视图并走一元 Remote 是当前组合方式。
- **为库存和子智能体卡片导入 `@deepseek-ai/dsh-client-ui-settings-plugins`。** 否决：功能插件不得互相 value-import；mobile-shell 自备分组辅助并直接调用 `pluginInventory/list` / `settings.describe`。
- **重连只保留头像角标。** 否决（Chat 与连接页）：Host generation 断开时需要页内「立即重试」，但不能恢复桌面 `ConnectionBanner`。

## 后果

- 紧凑折叠需要完整 Turn 窗口（`historyIncomplete` 为 false）；分页载入的历史不会在 Turn 中途折叠。
- 文案跟 `document.documentElement.lang`；`MobileApp` 在页面渲染前应用已存语言偏好。
- 子智能体白名单在开关打开时至少要勾选一个模型才能保存。

## 测试

`packages/client/mobile-shell/tests/mobile-chat-node-seat.client.spec.tsx` 钉住系统提示词折叠文案。`mobile-stats-format.client.spec.ts` 与 `mobile-stats-line.client.spec.tsx` 钉住时长详情。`mobile-plugin-inventory.client.spec.ts`、`mobile-subagent-models.client.spec.ts`、`mobile-attachment.client.spec.ts`、`mobile-language-font.client.spec.ts` 钉住分组、路由键、图片编码与持久化。
