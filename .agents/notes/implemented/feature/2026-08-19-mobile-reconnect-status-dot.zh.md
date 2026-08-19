# Agent Note: 移动端重连状态点与有界重试

Status: implemented

[English](2026-08-19-mobile-reconnect-status-dot.md) | 中文

## 问题

Host 流断开时，每个移动页面都会出现通栏红色重连条。它与任务列表头像上的状态点重复，并把列表压在一层无法关掉的中断提示下面。`ConnectionController` 无上限重试还会在 Host 已不可达时继续占用配对，手机永远不会要求重新扫码。

## 决策

移动端断线只改状态点，不挂横幅。`TaskHomeHeader` 在 `connectionState === 'connected'` 时把头像角标画成绿色，已配对但未连接时画成红色。任务列表为空时重连中显示「正在重连…」，放弃后显示扫码入口。移动壳页面不挂载 `ConnectionBanner`。`ConnectionController` 接受可选 `maxAttempts`；移动端以 `3` 启动循环。连续重连失败达到该次数后控制器停止、触发 `onGiveUp`，壳层清除配对存储，下一次连接必须扫码。

桌面 `ctx.connection.start` 不传 `maxAttempts`，仍重试直到 `stop()`。

## 曾考虑的替代方案

- **保留横幅并同时改角标颜色。** 否决：横幅正是操作者要求去掉的中断提示；角标已在任务列表上。
- **在 `MobileConnectionContext` 里计数并调用 `stop()`。** 否决：除非控制器自己持有上限，泵仍会继续安排下一代连接。
- **桌面 Web 也使用 `maxAttempts: 3`。** 否决：桌面留在页面上，适合无界退避；移动配对绑定 LAN 令牌，失败后应退回扫码。

## 后果

- 连续三次重连失败会丢掉已存 session token；任务列表空态文案为「多次重连失败，请扫描电脑上的二维码重新连接」，并带扫码按钮。
- 一次成功的 generation 会重置尝试预算，之后的中断重新获得三次重试。
- 连接管理页文案仍显示「重连中」；状态点与任务列表角标使用同一红色。

## 测试

`packages/client/connection/tests/connection.client.spec.ts` 钉住构造拒绝、已连接 generation 在三次重连失败后放弃、无 `onGiveUp` 时仍停止，以及第三次重试仍然连上的路径。
