# @deepseek-ai/dsh-host-mobile-pairing

LAN mobile pairing for the Web Host: `pairToken` mint/consume, opaque `sessionToken` registry, and `/api/mobile/*` routes.

## Config (`cordis.yml`)

| Key | Default | Role |
|-----|---------|------|
| `confirmMode` | `off` | `strict` requires desktop confirmation; `off` issues session tokens immediately |
| `pairTokenTtlMs` | `86400000` (24h) | No-password QR lifetime; password-protected QRs stay valid until replaced |
| `sessionTokenTtlMs` | `86400000` (24h) | No-password paired session lifetime; password-protected sessions do not expire |
| `dshHome` | `$DSH_HOME` / `~/.dsh` | Harness home for `mobile-pairing.json` durable state |
| `trustedHosts` | `[]` | Same LAN authority list as `client-connection` |

## Persistence

Paired devices and session tokens are written to `<harness home>/mobile-pairing.json`. Host restart reloads active sessions so phones can reconnect without re-scanning. The host fingerprint is stable across restarts.

Session expiry follows the pair-password policy:

- **No password:** sessions expire after `sessionTokenTtlMs` (default 24h).
- **Password required:** sessions do not expire until revoked.

## HTTP routes

| Method | Path | Trust |
|--------|------|-------|
| `POST` | `/api/mobile/pair` | LAN / loopback trust fence; body accepts `pairToken` or `shortCode` |
| `POST` | `/api/mobile/pair/confirm` | Loopback only; approve pending device |
| `POST` | `/api/mobile/pair/deny` | Loopback only; reject pending device |
| `GET` | `/api/mobile/pair/status?deviceId=` | LAN; phone poll while strict confirmation is pending |
| `GET` | `/api/mobile/pair/qrcode` | Loopback only; mint QR offer + short code |
| `GET` | `/api/mobile/pair/pending` | Loopback only; list pending devices |
| `GET` | `/api/mobile/devices` | Loopback only; list paired devices |
| `DELETE` | `/api/mobile/devices/:deviceId` | Loopback only; revoke paired device |

## Service

`ctx.mobilePairing.validateSessionToken(token)` — used by `client-connection` for Bearer and WebSocket `access_token` checks.

## Desktop UI

`@deepseek-ai/dsh-client-ui-mobile-pairing` — sidebar trigger + QR modal (TTL, short code, pending approve/deny, device revoke). Bundled via `packages/bundle/web-app/cordis.patch.yml`.

## Model Experience

No model-visible prompt or tool changes. Pairing is transport-only; session content remains in the existing session log.

## Known Limitations and Deferred Work

- mDNS hostname in QR payload deferred to Phase 4.
