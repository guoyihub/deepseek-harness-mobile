# Agent Note: Mobile turn status after turn/end

Status: implemented

English | [中文](2026-09-02-mobile-turn-status-after-end.zh.md)

## Problem

The mobile transcript showed `深度求索中...` under a finished assistant row (usage + 用时 already visible). Operators saw the line only after the reply settled, with a clock longer than the footer duration.

## Decision

Mobile has no Session-control running stream. `Session.running` is copied from `session.list`, which can flip true after `turn/end` (ChatPage refreshes the list when the composer leaves the working state). [`MobileChatFlow.tsx`](../../../packages/client/mobile-shell/src/client/MobileChatFlow.tsx) mounts `TurnStatus` only while the Chat timeline has an open Turn, or while optimistic user text is waiting for `turn/start`. [`deriveAgentWorkingFromSnapshot`](../../../packages/client/mobile-shell/src/client/chat-projection.ts) uses the same open-Turn rule and ignores a list `running` bit once any Turn has been folded.

## Alternatives considered

- **Wire `session/control` through a mobile SessionManager.** Rejected for this fix: larger than the status-line bug, and the fold already knows Turn open/closed.
- **Keep showing `TurnStatus` from `Session.running`.** Rejected: that bit is what appeared after the footer.

## Consequences

- First-token wait before `turn/start` still shows the line when optimistic user text is mounted.
- A list `running: true` after `turn/end` no longer resurrects the status line or the composer stop control.

## Testing

`packages/client/mobile-shell/tests/chat-projection.client.spec.ts` pins open-Turn vs closed-Turn vs empty-timeline list-bit rules.
