# Agent Note: Mobile alpha feature parity (fold, reconnect strip, settings)

Status: implemented

English | [中文](2026-09-01-mobile-alpha-feature-parity.zh.md)

## Problem

The mobile PWA chat transcript dumped system-prompt and turn-process nodes as JSON, omitted reconnect retry, token-duration details, image attach, turn jump, content font size, schedule reminders, plugin inventory grouping, subagent model allowlist, language preference, and preset search that desktop Web already exposes for the same Host generation.

## Decision

`MobileChatNodeSeat` wraps desktop `ChatNodeSeat` with `compactTranscript` and a `createChatStore` handle from `MobileChatFlow`, and `renderSlot` mounts `SystemPromptNodeView` / `TurnProcessNodeView` instead of `JsonBlock`. Session projections use `bindMobileUseProjection` over `session.projections.faceOf`. `MobileReconnectBanner` calls `ConnectionController.reconnect()` on Home, Chat, and Connection; attempt caps stay as in [reconnect status dot](2026-08-19-mobile-reconnect-status-dot.md). Composer stats expand `sessionStats` via `buildStatsDetails`. Prompt images encode through `encodeMobileImageFile`; the transcript loads attachments with `createMobileImageLoader`. Header turn jump scrolls `data-chat-anchor-key`; `applyMobileFontSize` writes `--dsh-content-font-size` on `body`; `MobileScheduleSheet` reuses `formatScheduleFrequency` / `orderScheduleRecords` from `ui-schedule` source. Settings list plugin inventory groups, subagent model routes in `settings` namespace `subagent-model-selection`, zh/en/system language, and preset search. Mobile still does not host Cordis client plugins, so provider sign-in UI stays catalog-only. The mobile PWA does not ship the desktop Trajectory tab.

## Alternatives considered

- **Mount the web-app slot graph on mobile.** Rejected: the PWA is Connection RPC plus React pages, not a Loader of `dsh.client` feature plugins; wrapping desktop node views and unary remotes is the current composition.
- **Import `@deepseek-ai/dsh-client-ui-settings-plugins` for inventory and subagent cards.** Rejected: client feature plugins must not value-import each other; mobile-shell copies grouping helpers and talks to `pluginInventory/list` / `settings.describe` itself.
- **Keep reconnect as avatar-dot only.** Rejected for Chat and Connection: operators need an in-page Retry now while the Host generation is down, without restoring desktop `ConnectionBanner`.

## Consequences

- Compact fold needs a complete Turn window (`historyIncomplete` false); paged-in history does not fold mid-Turn.
- Language follows `document.documentElement.lang` in `mobileConversationT`; `MobileApp` applies the stored preference before pages render.
- Subagent allowlist save requires at least one checked model when the toggle is on.

## Testing

`packages/client/mobile-shell/tests/mobile-chat-node-seat.client.spec.tsx` pins system-prompt disclosure copy. `mobile-stats-format.client.spec.ts` and `mobile-stats-line.client.spec.tsx` pin duration details. `mobile-plugin-inventory.client.spec.ts`, `mobile-subagent-models.client.spec.ts`, `mobile-attachment.client.spec.ts`, and `mobile-language-font.client.spec.ts` pin grouping, route keys, image encode, and persistence.
