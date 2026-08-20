/** Minimal conversation locale strings for the mobile chat surface. */

const zh = {
  'message.contextInjection': '上下文注入',
  'message.contextRecall': '跨会话召回',
  'copy': '复制',
  'copied': '已复制',
  'row.running': '正在生成',
  'row.failed': '调用失败',
  'row.stopped': '已中断',
  'hero.greeting': '你好 👋',
  'hero.promptLead': '今天想让我帮你',
  'hero.promptTail': '做什么？',
  'placeholder.default': '给智能体发消息',
  'placeholder.plan': '描述你的任务以生成计划',
  'hint.plan': '描述你的任务以生成计划',
  'hint.goal': '输入目标，智能体将持续执行',
  'hint.goal.active': '当前目标进行中。可输入 edit 修改 / pause 暂停 / resume 继续 / clear 清除',
  'input.send': '发送消息',
  'input.commands': '命令',
  'input.stop': '停止',
  'input.clearClaim': '取消命令',
  'plan.chip.aria': 'plan mode 已开启，按下关闭',
  'plan.chip.title': 'plan mode 已开启 — 点击关闭（/plan off）',
  'nav.back': '返回',
  'input.accessMode': '访问模式，当前：{name}',
  'permission.readOnly': '只读',
  'permission.workspaceWrite': '工作区写入',
  'permission.fullAccess': '完全访问',
  'access.confirm.title': '确认启用 Full access？',
  'access.confirm.description': '启用 Full access 后，agent 将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。',
  'access.confirm.acknowledge': '我已了解风险，并愿意继续',
  'access.confirm.cancel': '取消',
  'access.confirm.enable': '启用 Full access',
  'stats.counts': '{turns} 轮 · {steps} 步',
  'stats.llm': 'LLM {duration}',
  'stats.toolCall': '工具调用 {duration}',
  'stats.ttftAverage': '首 token 平均 {duration}',
  'stats.tokensPerSecond': '{throughput} tok/s',
  'stats.cacheHit': '缓存命中 {percent}%',
  'stats.tokens': '输入 {input} tok · 输出 {output} tok',
  'command.title': '命令',
  'command.running': '正在执行…',
  'command.done': '已完成',
  'command.failed': '执行失败',
  'command.unknown': '未知命令：/{name}',
  'message.compaction.running': '正在压缩…',
  'message.compaction.empty': '暂无可以压缩的历史记录',
  'message.compaction.completed': '已压缩 {items} 条历史记录（约 {tokens} tokens）',
  'ask.rowTitle': '提问',
  'ask.waiting': '等待回答',
  'ask.cancelled': '已取消',
  'ask.interrupted': '已中断',
  'ask.answered': '{answered}/{total} 已回答',
  'workspace.add': '添加工作区…',
  'workspace.choose': '选择工作区',
  'view.tabs': '会话视图',
  'view.chat': '对话',
  'view.trajectory': '轨迹',
  'browser.title': '选择工作区目录',
  'browser.home': '主目录',
  'browser.newFolder': '新建文件夹',
  'browser.folderName': '文件夹名称',
  'browser.createIn': '在"{name}"中新建文件夹',
  'browser.untitledFolder': '未命名文件夹',
  'browser.create': '创建',
  'browser.cancel': '取消',
  'browser.open': '打开',
  'browser.editPath': '编辑路径',
  'browser.loading': '加载中…',
  'browser.truncated': '文件夹过多，仅显示开头部分。',
  'browser.showHidden': '显示隐藏文件',
} as const

type Params = Record<string, string | number>

const PERMISSION_LABEL_KEYS = {
  'read-only': 'permission.readOnly',
  'workspace-write': 'permission.workspaceWrite',
  'danger-full-access': 'permission.fullAccess',
} as const

/**
 * Render a permission preset label for the mobile composer menu.
 * @param value - preset machine value from the permissions projection.
 * @param name - host-supplied preset name for custom entries.
 */
export function mobilePermissionLabel(value: string, name: string): string {
  const key = PERMISSION_LABEL_KEYS[value as keyof typeof PERMISSION_LABEL_KEYS]
  if (key !== undefined) return mobileConversationT(key)
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return name
  return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

/**
 * Resolve one conversation namespace string for the mobile shell.
 * @param key - locale key without namespace prefix.
 * @param params - optional `{name}` placeholders.
 */
export function mobileConversationT(key: string, params?: Params): string {
  const template = (zh as Record<string, string>)[key] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}
