# Agent Note: Mobile reconnect status dot and bounded retries

Status: implemented

English | [中文](2026-08-19-mobile-reconnect-status-dot.zh.md)

## Problem

A lost Host stream showed a full-width red reconnect banner on every mobile page. That banner duplicated the task-home avatar badge and hid the list under an outage chrome that operators cannot dismiss. Unbounded `ConnectionController` retries also kept a dead pairing alive after the Host was gone, so the phone never asked for a fresh scan.

## Decision

Mobile outages are a status-dot change, not a banner. `TaskHomeHeader` paints the avatar badge green while `connectionState === 'connected'` and red while paired but not connected. `ConnectionBanner` is not mounted on mobile shell pages. `ConnectionController` accepts optional `maxAttempts`; mobile starts the loop with `3`. After that many consecutive failed reconnects the controller stops, fires `onGiveUp`, and the shell clears pairing storage so the next connect is a scan.

Desktop `ctx.connection.start` omits `maxAttempts` and still retries until `stop()`.

## Alternatives considered

- **Keep the banner and recolor the badge.** Rejected: the banner is the outage chrome operators asked to remove; the badge already sits on the task list.
- **Count retries in `MobileConnectionContext` and call `stop()`.** Rejected: the pump would keep scheduling generations unless the controller owns the cap.
- **Apply `maxAttempts: 3` to desktop Web.** Rejected: desktop remains on the page and benefits from unbounded backoff; mobile pairing is LAN-token scoped and should fall back to a scan.

## Consequences

- Three failed reconnects drop the stored session token; the task list shows the unpaired scan CTA plus `多次重连失败，请重新扫码连接`.
- A successful generation resets the attempt budget, so a later outage gets three new retries.
- Connection-management copy still says 重连中; its status dot uses the same red as the task-home badge.

## Testing

`packages/client/connection/tests/connection.client.spec.ts` pins construction rejection, give-up after three failed reconnects of a live generation, give-up with no `onGiveUp`, and a third retry that still connects.
