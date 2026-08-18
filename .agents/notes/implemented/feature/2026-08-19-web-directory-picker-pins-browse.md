# Agent Note: Web directory picker pins in-app browse

Status: implemented

English | [中文](2026-08-19-web-directory-picker-pins-browse.zh.md)

## Problem

`-auto` resolves a loopback `dsh web` on Windows or macOS to the native OS folder dialog. Add Workspace then leaves the page: a Playwright scenario cannot drive that dialog, and a browser on another machine cannot see the host display. Operators need one in-app folder picker for every Web client.

## Decision

The web-app patch pins the browse pair: `directory-picker` is `@deepseek-ai/dsh-host-directory-picker-browse`, and `ui-directory-picker` is `@deepseek-ai/dsh-client-ui-directory-picker-browse`. The dialog lists folders only, starts at the host home directory when no path is given, and never calls `host.pickDirectory`. Overlay `-native` or `-auto` to restore the OS chooser or boot-time adaptivity. `-auto` remains a composition plugin; it is not the shipped Web default. The chooser mechanism stays in [the adaptive-default note](2026-07-29-directory-picker-adaptive-default.md).

## Alternatives considered

- **Change `resolveDirectoryPickerBackend` to always return `browse`.** Rejected: `-auto` would stop adapting, and the documented swap is composing `-browse` directly.
- **Keep `-auto` in the shipped patch and overlay browse only in tests.** Rejected: product operators on loopback would still get the OS dialog.

## Consequences

- Add Workspace and the conversation empty-state pick open `DirectoryBrowser` for every Web client.
- Web e2e and snapshot lanes consume the shipped rows; they no longer disable `-auto` and insert browse.
- `@deepseek-ai/dsh-web-app` depends on the browse host and client packages only.
- A deployment that wants the OS chooser overlays the `-native` host and client pair.
