<h1 align="center">DeepSeek Harness Mobile (DSH Mobile)</h1>

<p align="center">
  <strong>An open-source mobile client for DeepSeek Harness on iOS and Android.</strong><br>
  Pair with a QR code. No account required.<br>
  Review tasks and continue Agent conversations from your phone.
</p>

<p align="center"><sub>Community extension built on <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>. <a href="README.md">中文</a> · English</sub></p>

<p align="center">
  <img src="assets/mobile-hero.png" alt="DeepSeek Harness Mobile task list" width="360">
  &nbsp;&nbsp;
  <img src="assets/mobile-preview.png" alt="DeepSeek Harness Mobile chat UI" width="360">
</p>

<p align="center">
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img src="https://img.shields.io/github/stars/deepseek-ai/deepseek-harness?style=flat&label=%E2%98%85&color=08C" alt="GitHub stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2EA44F?style=flat" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/iOS%20%7C%20Android-PWA-4493F8?style=flat-square" alt="Supported platforms: iOS and Android PWA">
  <img src="https://img.shields.io/badge/LAN%20pairing-2EA44F?style=flat-square" alt="LAN pairing">
</p>

DSH Mobile brings [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Agent capabilities to the mobile browser: pair with a desktop Host over LAN via QR code, then browse tasks, open sessions, and follow tool progress and trajectories in a PWA. The Host still runs on your computer; Mobile handles pairing, connection, and the mobile shell UI through the official plugin composition model.

<a id="run"></a>

## Quick start

Your phone and computer should be on the same LAN, or the phone should reach the **Mobile PWA (:8030)** through a tunnel URL. No signup is required.

| Surface | URL | Notes |
| --- | --- | --- |
| Desktop Host | `http://127.0.0.1:3080/?token=...` | See **Development** below; open **手机连接** in the sidebar for the QR code |
| Mobile PWA (loopback) | `http://127.0.0.1:8030` | See **Development** below; desktop browser preview only |
| Mobile PWA (LAN) | `http://<computer-ip>:8030` | Use this on the phone; Vite proxies `/api` and WebSocket to Host `:3080` |
| Mobile PWA (tunnel) | `https://<your-tunnel-host>` | Tunnel **:8030 only** — do not expose Host `:3080` |

### Loopback vs LAN / tunnel (common pitfalls)
<a id="access-local-vs-tunnel"></a>

These paths serve different jobs:

| Scenario | Open | Notes |
| --- | --- | --- |
| Debug Mobile UI on the computer | `http://127.0.0.1:8030` | Loopback on the PC; pairing still needs a phone-reachable URL below |
| Pair / use from a phone | `http://<computer-ip>:8030` or a tunnel URL | The phone must load this origin; same-origin `/api` is then proxied to the Host |

**Architecture:** phones talk only to Mobile (:8030). The Mobile Vite server proxies `/api` and WebSocket to the local Host (:3080). QR codes and the pairing page must target Mobile, not Host.

Pitfalls:

1. **Opening `127.0.0.1:8030` on the phone** — that is the phone’s own loopback, not your PC. Use the computer’s LAN IP or a tunnel.
2. **Tunneling or opening only Host `:3080`** — pairing lives on Mobile (`/mobile/pair`), and the `/api` proxy is on Vite. **Expose `:8030` only.**
3. **QR encodes a LAN IP while the phone is off that network** — the pairing page never loads. Stay on LAN, or use a tunnel whose URL matches the QR / short-code offer.
4. **Desktop `127.0.0.1:8030` works but tunnel pairing fails** — confirm the tunnel targets Mobile (8030), not Host (3080). This repo’s Vite proxy strips Origin/Referer so tunnel page origins do not fail the Host Origin check.

More tunnel and short-code detail: [mobile development guide](docs/mobile/README.md).

### Pairing steps

1. Start the Host on your computer, then the Mobile PWA (see **Development** below).
2. On desktop Web, click **手机连接** in the sidebar, or open **Settings → DSH 移动端** for an optional connection password.
3. On the **phone**, open Mobile via LAN IP or tunnel, then scan the desktop QR code (or pick a QR image on the pairing page). Do not use the PC’s `127.0.0.1` from the phone.
4. After pairing succeeds, open **全部任务**, pick a task, and continue the conversation.

<p align="center">
  <img src="assets/desktop-mobile-qr.png" alt="Desktop sidebar mobile pairing QR modal" width="720">
</p>

<p align="center">
  <img src="assets/mobile-pair-scan.png" alt="Mobile QR scan pairing" width="360">
  &nbsp;&nbsp;
  <img src="assets/mobile-home-unpaired.png" alt="Unpaired mobile home screen" width="360">
</p>

Short-code pairing, production builds, and the code map live in the [mobile development guide](docs/mobile/README.md).

## Documentation

| Goal | Entry |
| --- | --- |
| Local development and pairing details | [Mobile development guide](docs/mobile/README.md) |
| Host pairing API and config | [`packages/host/mobile-pairing/README.md`](packages/host/mobile-pairing/README.md) |
| Mobile shell and desktop QR code map | [Mobile development guide — related code](docs/mobile/README.md#相关代码) |
| Harness architecture and plugins | [Architecture](docs/architecture.md) |
| Upstream contribution | [CONTRIBUTING.md](CONTRIBUTING.md) |

## Key features

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>QR pairing</h3>
      <p>The desktop Host mints a QR code and a 6-digit short code. Phones pair by scanning or entering the code. Optional connection passwords and desktop confirmation modes are supported without third-party accounts.</p>
      <p align="center"><img src="assets/desktop-mobile-settings.png" alt="DSH mobile settings and QR code" width="100%"></p>
    </td>
    <td width="50%" valign="top">
      <h3>Task home</h3>
      <p>An iOS-style task list: browse all or running tasks, search history, inspect connection status, and start a new task from the floating action button.</p>
      <p align="center"><img src="assets/mobile-hero.png" alt="Mobile task list" width="240"></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>Mobile chat</h3>
      <p>Send messages, read Agent replies, follow tool-call progress, and inspect trajectories from the phone. Model selection, Plan mode, and context stats are included.</p>
      <p align="center"><img src="assets/mobile-chat-streaming.png" alt="Mobile chat with tool progress" width="240"></p>
    </td>
    <td width="50%" valign="top">
      <h3>PWA install</h3>
      <p>Add Mobile to the home screen for a near-native full-screen experience. In development, Vite proxies Host APIs for the phone browser.</p>
      <p align="center"><img src="assets/mobile-preview.png" alt="Completed mobile chat view" width="240"></p>
    </td>
  </tr>
</table>

## Plugin composition

DSH Mobile does not fork a separate Agent runtime. Host pairing (`dsh-host-mobile-pairing`), desktop QR UI (`dsh-client-ui-mobile-pairing`), and the mobile shell (`dsh-client-mobile-shell`) are regular DSH plugins composed through `cordis.patch.yml` into the official Web profile. Sessions, models, tools, and plugin capabilities still come from the desktop Host; Mobile owns pairing transport and mobile presentation.

## Project layout

Mobile code lives inside the DeepSeek Harness monorepo and splits across Host, Client, and App layers:

```text
apps/mobile/                         # Mobile PWA entry (Vite + PWA)
packages/
  host/mobile-pairing/               # Host: pairing API, QR, short code, device management
  client/
    ui-mobile-pairing/               # Desktop: sidebar pairing modal and mobile settings
    mobile-shell/                    # Phone: task home, scan, chat, trajectory, connection
    connection/                      # Host↔Client connection and session transport
  bundle/web-app/                    # Web profile: patch the plugins into the official runtime
docs/mobile/                         # Mobile development notes
```

| Path | Role |
| --- | --- |
| `apps/mobile/` | PWA shell, `manifest`, Vite dev server; `:8030` proxies `/api` and WebSocket to Host `:3080` |
| `packages/host/mobile-pairing/` | `/api/mobile/*` routes: mint QR, pair, confirm/deny, list and revoke devices |
| `packages/client/ui-mobile-pairing/` | Desktop QR modal and settings (connection verification, device management) |
| `packages/client/mobile-shell/` | Mobile UI: pairing page, task list, chat / trajectory, composer |
| `packages/client/connection/` | Post-pairing Bearer / WebSocket connection and session RPC |
| `packages/bundle/web-app/` | Composes Mobile plugins into the `dsh web` profile |

See the [mobile development guide](docs/mobile/README.md) for the code map and tunnel notes.

## Relationship to the official project

This extension builds on [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness).

The official project provides the Agent loop, plugin system, session persistence, and desktop Web UI. This extension mainly adds:

- Phone pairing and device management over LAN or tunnel URLs
- The Mobile PWA shell: task home, chat, trajectories, and connection management
- Desktop **手机连接** entry points and **DSH 移动端** settings
- Mobile `/api` proxying and PWA packaging (`apps/mobile`)

For core Harness development and CLI usage, start with the [official repository](https://github.com/deepseek-ai/deepseek-harness).

## Acknowledgements

Thanks to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) and the DeepSeek AI team for the Agent framework and Web UI; thanks to [Cordis](https://github.com/cordiverse/cordis) for the plugin foundation; and thanks to the [DSH Desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) community for pushing the desktop experience forward. Mobile and Desktop complement each other across devices.

<a id="run-from-source"></a>

## Development

After `pnpm install`, use one command per build or dev task:

```powershell
pnpm install

# Build (includes build:lib — no separate step)
pnpm build:mobile   # Mobile PWA production bundle only
pnpm build:web      # Desktop Web frontend only
pnpm build          # Web + Mobile
```

Dev servers (two terminals, start manually):

```powershell
# Terminal 1 — Host (:3080)
pnpm dsh web --no-open

# Terminal 2 — Mobile PWA (:8030)
pnpm run dev:mobile
```

After the Host is ready, open the desktop GUI with the `dsh web:` token URL from terminal 1; open Mobile at `http://127.0.0.1:8030/`.

Production output: `pnpm build:web` → Web dist; `pnpm build:mobile` → `apps/mobile/dist`. Package tests and more detail live in the [mobile development guide](docs/mobile/README.md) and package READMEs.

## Related projects

| Project | Summary | Links |
| --- | --- | --- |
| DeepSeek | Official DeepSeek website. | [deepseek.com](https://www.deepseek.com) |
| Linux.do | Recognized and supported by the community. | [linux.do](https://linux.do) |

## License

This project follows the [MIT License](LICENSE).

> This is a community mobile extension built on DeepSeek Harness, not an official standalone DeepSeek product.

> DeepSeek is a trademark of DeepSeek AI. DSH Mobile is a community extension and is not affiliated with or endorsed by DeepSeek.

## Star History

<a href="https://www.star-history.com/?repos=deepseek-ai%2Fdeepseek-harness&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=deepseek-ai/deepseek-harness&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=deepseek-ai/deepseek-harness&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=deepseek-ai/deepseek-harness&type=date&legend=top-left" />
 </picture>
</a>
