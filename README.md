# DeepSeek Harness Mobile

English / upstream: see [README.zh.md](README.zh.md) for the DeepSeek Harness project overview.

This checkout is **DeepSeek Harness** plus a phone PWA that pairs to the desktop Host over the local network (QR / short code, no account).

## Quick start

```powershell
pnpm install
pnpm dsh web
```

In a second terminal:

```powershell
pnpm dev:mobile
```

- Desktop Web: http://127.0.0.1:3080 — use the sidebar **手机连接** to show the QR.
- Mobile PWA: http://127.0.0.1:8030 — scan, paste the QR URL, or enter the short code.

Mobile details (code map, LAN / tunnel tips, production build): [docs/mobile/README.md](docs/mobile/README.md).

## License

MIT（same as DeepSeek Harness）.
