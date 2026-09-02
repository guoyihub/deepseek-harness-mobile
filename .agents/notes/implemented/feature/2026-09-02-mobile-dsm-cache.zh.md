# Agent Note：Mobile DSM 连接代际缓存

Status: implemented

[English](2026-09-02-mobile-dsm-cache.md) | 中文

## 问题

Mobile PWA 在每次进入 ChatPage、刷新后启动、以及打开设置弹窗时都会重新 fold 会话历史并重复拉取 Host 元数据。已 open 的 `Session` 走 fast path 时会跳过 `bindMobileConversation`，导致 remount 聊天页可能出现空 transcript，慢路径则仍承担完整的 `Session.open` 成本。

## 决策

Mobile 以 [`mobile-stream-runtime.ts`](../../../packages/client/mobile-shell/src/client/mobile-stream-runtime.ts) 的 `ConnectionGeneration.id` 作为跨层失效 epoch。[`mobile-session-cache.ts`](../../../packages/client/mobile-shell/src/client/mobile-session-cache.ts) 在 ChatPage unmount 后保留 warm 的 `Session` + `MobileConversationBinding`，在 generation 变化或 `Session.resync()` 后重建 binding，并对未 pin 条目做 LRU 淘汰（上限 8）。[`mobile-host-metadata-cache.ts`](../../../packages/client/mobile-shell/src/client/mobile-host-metadata-cache.ts) 对每个 generation 合并并发 `session/modelCatalog`、`agentPresets/list`、`pluginInventory/list` 与 `settings/describe`。[`MobileConnectionContext.tsx`](../../../packages/client/mobile-shell/src/client/MobileConnectionContext.tsx) 合并并发 `session/list`，并在 pairing storage 可用时预取 Cordis conversation runtime。[`mobile-attachment.ts`](../../../packages/client/mobile-shell/src/client/mobile-attachment.ts) 在 generation 清空时 revoke blob URL。conversation fold 不写入 storage；live `session/follow` 仍为权威源。

## 备选方案

- **ChatPage unmount 时继续 dispose binding。** 否：每次首页↔聊天都会重复 `assembler.replaceWindow`。
- **仅用 TTL、不绑定 generation 的元数据缓存。** 否：重连后可能对新的 Host mux Serving 旧 catalog 或 preset。
- **把 conversation snapshot 持久化到 sessionStorage。** 否：体积大、难与 follow 增量对齐，且易与桌面 Host 状态分叉。

## 后果

- 断开、鉴权失败与 `publishGeneration(undefined)` 会一并清空 session、元数据与图片缓存。
- 在 Host 无 push 的设置变更路径上，调用方通过定向 invalidator（`invalidateMobileSettingsDescribe`、`invalidateMobileAgentPresets`）失效缓存。
- 完整刷新后每个会话的首次打开仍需要一次 `Session.open` 与一次 window fold；缓存消除的是同 generation 内以及 SPA 导航间的重复劳动。

## 测试

`packages/client/mobile-shell/tests/mobile-session-cache.client.spec.ts` 覆盖 binding 复用、generation 清空与 LRU。`mobile-host-metadata-cache.client.spec.ts` 覆盖 single-flight 与 generation 失效。`mobile-attachment.client.spec.ts` 覆盖 `clearMobileImageCache` 后的 blob revoke。
