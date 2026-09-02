# Agent Note: Mobile task-home agent-preset icons

Status: implemented

[English](2026-09-02-mobile-task-home-preset-icons.md) | 中文

## Problem

任务首页会话行只显示标题。操作者在打开对话前无法看出该会话使用哪一个 Agent 预设。

## Decision

`deriveGroups` 与 `deriveSearchResults` 会把非空的 `projectionValues.agentPreset` 抄到每个 `SessionNode` / `SearchResultNode`。移动端 `HomePage` 把该 id 交给 `AgentPresetIcon`，经行组件的 `leading` 槽渲染（状态槽、图标、标题）。图标映射与聊天页标题栏相同：`standard`、`code`、`minimal`、`cordis`，以及自定义回退。桌面行不传 `leading`。投影缺失或为空时不画图标。

## Alternatives considered

- **在 `SessionNodeItem` 内按预设 id 画图标。** 未采纳：`ui-workspace` 会持有移动端预设字形；通用 `leading` 槽把映射留在 `mobile-shell`。
- **投影缺失时默认画 `standard` 图标。** 未采纳：列表快照尚未发布预设时，猜测字形会标错会话。

## Consequences

- 任务首页与搜索行对齐 `session.list` 投影，不订阅实时 `useProjection`。
- 在对话里改预设后，要等下一次带新 `agentPreset` 的列表快照才会出现在首页。

## Testing

`packages/client/ui-workspace/tests/tree.client.spec.ts` 固定投影抄到分组行与搜索行。`packages/client/mobile-shell/tests/task-home-row.client.spec.tsx` 固定移动端 leading 槽顺序。
