# Agent Note: Mobile turn status after turn/end

Status: implemented

[English](2026-09-02-mobile-turn-status-after-end.md) | 中文

## Problem

移动端对话在助手行已经结束（用量和用时都已出现）后，仍会在下方画出 `深度求索中...`。操作者往往只在回复落定后才看到这一行，且计时比页脚用时长。

## Decision

移动端没有 Session 控制流上的 running 推送。`Session.running` 从 `session.list` 抄来，可能在 `turn/end` 之后才变成 true（ChatPage 在输入框离开工作态时会刷新列表）。[`MobileChatFlow.tsx`](../../../packages/client/mobile-shell/src/client/MobileChatFlow.tsx) 只在 Chat 时间线仍有未结束 Turn、或乐观用户气泡还在等 `turn/start` 时挂 `TurnStatus`。[`deriveAgentWorkingFromSnapshot`](../../../packages/client/mobile-shell/src/client/chat-projection.ts) 用同一条未结束 Turn 规则；一旦已经折出任何 Turn，就忽略列表上的 `running` 位。

## Alternatives considered

- **在移动端接 `session/control` 并走 SessionManager。** 这次未采纳：比状态行缺陷大，而且 fold 已经知道 Turn 开闭。
- **继续用 `Session.running` 画 `TurnStatus`。** 未采纳：正是这个位在页脚之后才亮起来。

## Consequences

- `turn/start` 到达前，只要乐观用户气泡还在，状态行仍会显示。
- `turn/end` 之后列表再报 `running: true`，不会重新拉出状态行或输入框停止键。

## Testing

`packages/client/mobile-shell/tests/chat-projection.client.spec.ts` 固定未结束 Turn、已结束 Turn、以及空时间线下列表位的规则。
