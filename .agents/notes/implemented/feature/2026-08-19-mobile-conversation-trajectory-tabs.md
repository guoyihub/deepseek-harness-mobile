# Agent Note: Mobile conversation and trajectory tabs

Status: implemented

English | [中文](2026-08-19-mobile-conversation-trajectory-tabs.zh.md)

## Problem

The mobile session page showed only a chat transcript. Operators comparing with desktop Web need the same Conversation / Trajectory split, including the timeline ledger, without rebuilding Trajectory UI on the phone.

## Decision

`ChatPage` mounts a desktop-matching tablist (`对话` / `轨迹`). Chat keeps the existing mobile fold. Trajectory boots a one-shot Cordis pair of `ConversationEventRegistry` + `ConversationViewRegistry`, registers the desktop Trajectory Definitions, opens a client-runtime `Session` on `mobileApi`, feeds mux envelopes filtered by session id, and renders `TrajectoryView` with `bindSnapshotSelector` hooks. Locale for the ledger comes from the trajectory package dictionary; tab labels live in `mobile-locale.ts`.

## Alternatives considered

- **Full Cordis client runtime + slot ring on mobile.** Rejected for this cut: mobile is a React PWA over `WebApiClient`, not a web-app plugin graph; a minimal Session + registries is enough for Trajectory assembly.
- **Hand-rolled trajectory list.** Rejected: duplicates toolbar, timeline, and ledger ownership already in `@deepseek-ai/dsh-client-ui-trajectory`.

## Consequences

- Chat and Trajectory load history separately (chat fold vs `Session.open`); live mux is shared.
- Trajectory depends on Host browse-capable event history the same as desktop.
- Narrow viewports keep Trajectory full-bleed under the tab strip; composer remains mounted on both tabs.
