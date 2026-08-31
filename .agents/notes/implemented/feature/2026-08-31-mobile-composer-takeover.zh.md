# Agent Note: 移动端审批与追问 Composer 接管

Status: implemented

[English](2026-08-31-mobile-composer-takeover.md) | 中文

## 问题

移动端 PWA 会打开 Host 的 `$events` generation，但 `ready` 之后的帧全部被忽略。`ChatPage` 把 `pendingInteraction` 绑成空数组，`MobileComposerTakeover` 直接 `return null`，因此手机上无法响应工具审批和 `ask_user_question` 等待，而桌面 Web 会显示 `ApprovalPanel` / `QuestionComposer`。

## 决策

`mobile-stream-runtime` 把转发的 waterfall 帧交给 `handleMobileRemoteEventFrame`：创建 `PendingApproval` / `PendingQuestion` 载体，写入 `mobile-pending-registry`，并在桌面 composer 组件结算后 POST `$events/result`。`ChatPage` 通过 `useMobilePendingInteraction` 订阅，在有 pending 时用 `MobileComposerTakeover` 替换 `MobileComposer`，复用 `@deepseek-ai/dsh-client-ui-approval` 与 `@deepseek-ai/dsh-client-ui-user-questions`，配套窄化的 `useMobileComposerTakeoverKit` stub face。任务首页圆点继续走既有 `setMobilePendingInteraction`。

## 曾考虑的替代方案

- **手写移动端审批/追问 UI。** 否决：会重复 ui-approval 与 ui-user-questions 已拥有的文案、校验与 plan-review 展示。
- **在移动端挂完整 Cordis 客户端 slot 图。** 本轮否决：移动端是基于 Connection RPC 的 React PWA，不是 web-app 插件宿主；进程内注册表加桌面 takeover 组件足以覆盖可回答的等待。

## 后果

- 目前只处理 `approval/request` 与 `user-questions/request` waterfall 事件；其他 Remote Event 种类仍属桌面专属，直到移动端需要为止。
- plan-review 等待走追问路径（`kind === 'plan-review'` 的 `PendingQuestion`），由 `QuestionComposer` 渲染。
- 连接 generation 结束时清空 pending；重连会丢弃进行中的等待，语义与桌面断连一致。
