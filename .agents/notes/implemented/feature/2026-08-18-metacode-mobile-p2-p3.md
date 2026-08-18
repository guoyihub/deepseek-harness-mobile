# Agent Note: MetaCode Mobile P2/P3 completion

Status: implemented

> Scope: mobile PWA pairing UX, minimal chat, PWA packaging, and host pairing API extensions through Phase 3. Not in scope: native shell, push notifications, mDNS hostnames, durable device store.

## Problem

Phase 1 delivered a pairing spine and Phase 2 a minimal mobile shell, but phones could not poll strict-mode approval, desktops lacked an in-app QR surface, chat omitted tool progress, and the app was not installable as a PWA.

## Decision

**Host pairing grows a phone poll path and desktop management APIs.** `GET /api/mobile/pair/status`, `POST /api/mobile/pair/deny`, device list/revoke, and six-digit `shortCode` pairing live in `dsh-host-mobile-pairing` with in-memory `readyPickup` for post-confirm phone retrieval.

**Desktop QR ships as a client plugin, not inside the host package.** `dsh-client-ui-mobile-pairing` mounts from the web-app patch: QR with TTL, short code display, pending approve/deny, and revoke.

**Mobile shell owns pairing state machines and chat projection.** `pairWithPolling` turns 409 into status polling; `PairPage` supports QR paste, album decode (`jsqr`), and manual host/port/short code; `ChatPage` calls `sessions.cancel` and renders `tool/call` / `tool/result` status rows; theme follows light/dark/system with A2HS guidance.

**PWA is a thin Vite layer.** `apps/mobile` adds `manifest.webmanifest`, favicon, `vite-plugin-pwa` with `/api` navigate denylist, and root `build:mobile`.

## Consequences

Dev workflow: `pnpm metacode web` + `pnpm --filter @deepseek-ai/dsh-mobile-frontend dev`; phone traffic proxies `/api` to `:3080`. Revoked devices clear localStorage on 401. Package tests cover `chat-projection` and `pair-api` polling. Phase 4 (Capacitor, voice, push, mDNS) remains deferred.
