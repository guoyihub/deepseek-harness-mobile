# Agent Note: Web 目录选择固定为应用内浏览

Status: implemented

[English](2026-08-19-web-directory-picker-pins-browse.md) | 中文

## 问题

`-auto` 会把 Windows 或 macOS 上的回环 `dsh web` 判定为原生 OS 文件夹对话框。此时「添加工作区」离开页面：Playwright 场景无法驱动该对话框，另一台机器上的浏览器也看不到宿主屏幕。每位 Web 客户端都需要同一个应用内文件夹选择器。

## 决策

web-app 补丁固定 browse 这一对：`directory-picker` 为 `@deepseek-ai/dsh-host-directory-picker-browse`，`ui-directory-picker` 为 `@deepseek-ai/dsh-client-ui-directory-picker-browse`。对话框只列出文件夹，未给路径时从宿主主目录开始，且从不调用 `host.pickDirectory`。要恢复 OS 选择器或启动时自适应，用 overlay 挂上 `-native` 或 `-auto`。`-auto` 仍是组合插件，但不是随附 Web 的默认。选择器机制仍见[自适应默认 Agent Note](2026-07-29-directory-picker-adaptive-default.md)。

## 曾考虑的替代方案

- **把 `resolveDirectoryPickerBackend` 改成永远返回 `browse`。** 否决：`-auto` 将不再自适应，而文档化的切换点是直接组合 `-browse`。
- **随附补丁继续挂 `-auto`，只在测试里 overlay browse。** 否决：回环上的产品操作者仍会遇到 OS 对话框。

## 后果

- 「添加工作区」和对话空态选取对每位 Web 客户端都打开 `DirectoryBrowser`。
- Web e2e 与快照通道消费随附行；它们不再禁用 `-auto` 再插入 browse。
- `@deepseek-ai/dsh-web-app` 只依赖 browse 的宿主包与客户端包。
- 想要 OS 选择器的部署 overlay `-native` 的宿主与客户端这一对。
