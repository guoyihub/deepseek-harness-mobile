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

  'input.accessMode': '权限模式：{name}',

  'access.confirm.title': '启用完全访问？',

  'access.confirm.description': '智能体将可以执行高风险操作。请确认你理解相关风险。',

  'access.confirm.acknowledge': '我了解相关风险',

  'access.confirm.cancel': '取消',

  'access.confirm.enable': '启用',

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

} as const



type Params = Record<string, string | number>



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
