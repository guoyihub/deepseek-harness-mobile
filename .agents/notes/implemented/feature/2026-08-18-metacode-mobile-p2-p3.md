# Agent Note: MetaCode Mobile P2/P3 completion

Status: implemented

> Scope: mobile PWA pairing UX, minimal chat, PWA packaging, and host pairing API extensions through Phase 3. Not in scope: native shell, push notifications, mDNS hostnames, durable device store.

## Problem

Phase 1 delivered a pairing spine and Phase 2 a minimal mobile shell, but phones could not poll strict-mode approval, desktops lacked an in-app QR surface, chat omitted tool progress, and the app was not installable as a PWA.

## Decision

**Host pairing grows a phone poll path and desktop management APIs.** `GET /api/mobile/pair/status`, `POST /api/mobile/pair/deny`, device list/revoke, and six-digit `shortCode` pairing live in `dsh-host-mobile-pairing` with in-memory `readyPickup` for post-confirm phone retrieval.

**Desktop QR ships as a client plugin, not inside the host package.** `dsh-client-ui-mobile-pairing` mounts from the web-app patch: the sidebar footer opens a QR-only modal; Settings registers `settings.section` id `dsh-mobile` (nav **DSH 移动端**) for password policy, Mobile public base URL, QR, pending approve/deny, and revoke. Desktop UI does not show the six-digit pairing code.

**Mobile shell owns pairing state machines and chat projection.** `pairWithPolling` turns 409 into status polling; `PairPage` is camera/album scan; `ChatPage` calls `sessions.cancel` and renders `tool/call` / `tool/result` status rows. Composer `+` menu matches desktop: bare commands run `command.execute('/name')`; `/plan` and `/goal` claim the field (`/plan ` + hint「描述你的任务以生成计划」) and send `command.execute('/plan <task>')`. Plan mode shows a Plan chip that exits with `/plan off`.

**PWA is a thin Vite layer.** `apps/mobile` adds `manifest.webmanifest`, favicon, `vite-plugin-pwa` with `/api` navigate denylist, and root `build:mobile`.

## Consequences

Dev workflow: `pnpm dsh web` + `pnpm dev:mobile` (`@deepseek-ai/deepseek-harness-mobile`); phone traffic proxies `/api` to `:3080`. Revoked devices clear localStorage on 401. Package tests cover `chat-projection` and `pair-api` polling. Phase 4 (Capacitor, voice, push, mDNS) remains deferred.
