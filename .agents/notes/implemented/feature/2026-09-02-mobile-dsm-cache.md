# Agent Note: Mobile DSM connection-scoped caches

Status: implemented

English | [中文](2026-09-02-mobile-dsm-cache.zh.md)

## Problem

The mobile PWA re-folded conversation history and re-fetched Host metadata on every ChatPage mount, page refresh boot, and settings modal open. A cached open `Session` fast path skipped `bindMobileConversation`, so remounting chat could render an empty transcript while still paying full `Session.open` cost on the slow path.

## Decision

Mobile caches use `ConnectionGeneration.id` from [`mobile-stream-runtime.ts`](../../../packages/client/mobile-shell/src/client/mobile-stream-runtime.ts) as the cross-layer invalidation epoch. [`mobile-session-cache.ts`](../../../packages/client/mobile-shell/src/client/mobile-session-cache.ts) pins warm `Session` + `MobileConversationBinding` pairs across ChatPage unmount, rebuilds bindings after generation change or `Session.resync()`, and LRU-evicts unpinned entries (cap 8). [`mobile-host-metadata-cache.ts`](../../../packages/client/mobile-shell/src/client/mobile-host-metadata-cache.ts) single-flights `session/modelCatalog`, `agentPresets/list`, `pluginInventory/list`, and `settings/describe` per generation. [`MobileConnectionContext.tsx`](../../../packages/client/mobile-shell/src/client/MobileConnectionContext.tsx) coalesces concurrent `session/list` refresh calls and prefetches the Cordis conversation runtime as soon as pairing storage is live. [`mobile-attachment.ts`](../../../packages/client/mobile-shell/src/client/mobile-attachment.ts) revokes blob URLs when the generation clears. Conversation folds are not persisted to storage; live `session/follow` remains authoritative.

## Alternatives considered

- **Keep binding disposal on ChatPage unmount.** Rejected: every home→chat navigation repeated `assembler.replaceWindow`.
- **TTL-based metadata cache without generation binding.** Rejected: reconnect could serve stale catalog or preset rows against a new Host mux.
- **Persist conversation snapshots in sessionStorage.** Rejected: large, hard to align with incremental follow frames, and easy to diverge from desktop Host state.

## Consequences

- Disconnect, auth failure, and `publishGeneration(undefined)` clear session, metadata, and image caches together.
- Settings mutations call targeted invalidators (`invalidateMobileSettingsDescribe`, `invalidateMobileAgentPresets`) where Host push is absent.
- Each first open after a full page reload still performs one `Session.open` and one window fold; caches remove duplicate work inside a generation and across SPA navigations.

## Testing

`packages/client/mobile-shell/tests/mobile-session-cache.client.spec.ts` pins binding reuse, generation clear, and LRU eviction. `mobile-host-metadata-cache.client.spec.ts` pins single-flight reads and generation invalidation. `mobile-attachment.client.spec.ts` pins blob revocation after `clearMobileImageCache`.
