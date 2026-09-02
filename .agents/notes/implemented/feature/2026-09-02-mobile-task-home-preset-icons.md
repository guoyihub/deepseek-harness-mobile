# Agent Note: Mobile task-home agent-preset icons

Status: implemented

English | [中文](2026-09-02-mobile-task-home-preset-icons.zh.md)

## Problem

Task-home session rows showed only a title. Operators could not see which agent preset a session used until they opened chat.

## Decision

`deriveGroups` and `deriveSearchResults` copy a non-empty `projectionValues.agentPreset` onto each `SessionNode` / `SearchResultNode`. Mobile `HomePage` passes that id to `AgentPresetIcon` through the row `leading` slot (status slot, then icon, then title). The icon map is the same as the chat header: `standard`, `code`, `minimal`, `cordis`, and a custom fallback. Desktop rows omit `leading`. A missing or empty projection omits the icon.

## Alternatives considered

- **Render the icon inside `SessionNodeItem` from the preset id.** Rejected: `ui-workspace` would own mobile preset glyphs; a generic `leading` slot keeps that map in `mobile-shell`.
- **Default to the `standard` icon when the projection is absent.** Rejected: a guessed glyph would mislabel sessions whose list snapshot has not published a preset yet.

## Consequences

- Task home and search rows stay aligned with `session.list` projections; they do not subscribe to live `useProjection`.
- Changing a preset in chat appears on the list after the next list snapshot that carries the new `agentPreset`.

## Testing

`packages/client/ui-workspace/tests/tree.client.spec.ts` pins projection copy onto group and search rows. `packages/client/mobile-shell/tests/task-home-row.client.spec.tsx` pins the mobile leading-slot order.
