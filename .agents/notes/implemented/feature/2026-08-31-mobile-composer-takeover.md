# Agent Note: Mobile composer takeover for approval and ask-user waits

Status: implemented

English | [中文](2026-08-31-mobile-composer-takeover.zh.md)

## Problem

The mobile PWA opened the Host `$events` generation but ignored every frame after `ready`. `ChatPage` bound `pendingInteraction` to an empty array, and `MobileComposerTakeover` returned `null`, so tool approvals and `ask_user_question` waits could not be answered on the phone even though desktop Web shows `ApprovalPanel` / `QuestionComposer`.

## Decision

`mobile-stream-runtime` dispatches forwarded waterfall frames through `handleMobileRemoteEventFrame`, which creates `PendingApproval` / `PendingQuestion` carriers, registers them in `mobile-pending-registry`, and posts `$events/result` when the desktop composer components settle. `ChatPage` subscribes with `useMobilePendingInteraction` and swaps `MobileComposer` for `MobileComposerTakeover`, reusing `@deepseek-ai/dsh-client-ui-approval` and `@deepseek-ai/dsh-client-ui-user-questions` with a narrow `useMobileComposerTakeoverKit` stub face. Task-home dots reuse `setMobilePendingInteraction` from the existing pending tracker.

## Alternatives considered

- **Hand-rolled mobile approval/question UI.** Rejected: duplicates desktop copy, validation, and plan-review presentation already owned by the ui-approval and ui-user-questions packages.
- **Full Cordis client slot graph on mobile.** Rejected for this cut: mobile is a React PWA over Connection RPC, not a web-app plugin host; a process-local registry plus desktop takeover components is enough for answerable waits.

## Consequences

- Only `approval/request` and `user-questions/request` waterfall events are handled; other Remote Event kinds remain desktop-only until mobile needs them.
- Plan-review waits ride the question path (`PendingQuestion` with `plan-review` kind) through `QuestionComposer`.
- Pending state clears on connection generation end; reconnect drops in-flight waits the same as desktop disconnect semantics.
