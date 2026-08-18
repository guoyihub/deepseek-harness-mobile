# Agent Note: Mobile workspace pick and in-app add

Status: implemented

English | [中文](2026-08-19-mobile-workspace-pick-and-add.zh.md)

## Problem

The mobile blank-chat workspace chip lists Host workspaces and switches via `sessions.create`, but it has no Add Workspace path. Phones cannot open the OS folder dialog, so operators need the same Host-backed in-app browser the Web client uses after [the browse pin](2026-08-19-web-directory-picker-pins-browse.md).

## Decision

`MobileWorkspaceSelect` keeps the existing list and pins an Add Workspace footer. Choosing Add (or tapping the chip when the Host list is empty) mounts the shared `DirectoryBrowser` from `@deepseek-ai/dsh-client-ui-directory-picker-browse`, driven by `host.listDirectory` / `host.createDirectory`. Confirm runs `workspace.create({ path })` then `sessions.create({ workspaceId })` and navigates to the new blank session. Copy for the dialog and the footer lives in `mobile-locale.ts` (mobile has no Cordis locale plugin).

## Alternatives considered

- **Hand-roll a mobile-only folder list.** Rejected: duplicates Miller-column and create-folder behavior already owned by `DirectoryBrowser`.
- **Import the Cordis browse plugin apply entry.** Rejected: the mobile PWA is not a Cordis client; importing `./client` would pull slots and workspace runtime it does not mount.
- **Call `host.pickDirectory`.** Rejected: native choosers are host-display-bound and unavailable to a phone on the LAN.

## Consequences

- Blank-chat workspace switching and creation share one chip; conversation sessions remain non-switchable.
- Mobile Vite aliases the browse package `src/` so CSS modules resolve from source.
- Browse failures stay inside `DirectoryBrowser`; create/session failures surface through `ChatPage` `StatusPanel`.
