# Agent Note: 移动端工作区选取与应用内新建

Status: implemented

[English](2026-08-19-mobile-workspace-pick-and-add.md) | 中文

## 问题

移动端空白聊天的工作区芯片能列出 Host 工作区并用 `sessions.create` 切换，但没有「添加工作区」路径。手机无法打开 OS 文件夹对话框，因此需要与 Web 客户端在[固定 browse](2026-08-19-web-directory-picker-pins-browse.md) 之后相同的、由 Host 驱动的应用内浏览器。

## 决策

`MobileWorkspaceSelect` 保留已有列表，并固定「添加工作区」页脚。点添加（或 Host 列表为空时点芯片）挂载 `@deepseek-ai/dsh-client-ui-directory-picker-browse` 的共享 `DirectoryBrowser`，由 `host.listDirectory` / `host.createDirectory` 驱动。确认时先 `workspace.create({ path })`，再 `sessions.create({ workspaceId })`，并进入新的空白会话。对话框与页脚文案放在 `mobile-locale.ts`（移动端没有 Cordis locale 插件）。

## 曾考虑的替代方案

- **手写一套移动端文件夹列表。** 否决：会重复 `DirectoryBrowser` 已拥有的 Miller 列与新建文件夹行为。
- **导入 Cordis browse 插件的 apply 入口。** 否决：移动 PWA 不是 Cordis 客户端；导入 `./client` 会拖入它未挂载的 slots 与 workspace 运行时。
- **调用 `host.pickDirectory`。** 否决：原生选择器绑定宿主显示器，局域网手机不可用。

## 后果

- 空白聊天的工作区切换与新建共用一个芯片；已有对话的会话仍不可切换工作区。
- Mobile Vite 为 browse 包的 `src/` 加别名，以便从源码解析 CSS modules。
- 浏览失败留在 `DirectoryBrowser` 内；创建/会话失败经 `ChatPage` 的 `StatusPanel` 展示。
