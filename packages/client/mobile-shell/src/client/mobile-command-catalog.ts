import type { CommandEntry } from '@deepseek-ai/dsh-client-connection/client'

/** Slash-command catalog shown in the mobile composer menu. */
export const MOBILE_COMMANDS: readonly CommandEntry[] = [
  { name: 'compact', description: '压缩较早的对话历史' },
  { name: 'export', description: '导出会话日志为 ZIP' },
  { name: 'feedback', description: '记录对本会话的反馈' },
  {
    name: 'goal',
    description: '设置或查看长期任务目标',
    input: { hint: '[<objective>|clear|edit <objective>|pause|resume]' },
  },
  { name: 'permission', description: '切换权限预设（沙箱模式与审批策略）' },
  {
    name: 'plan',
    description: '进入或退出计划模式',
    input: { hint: '[off|message]' },
  },
  { name: 'model', description: '选择本会话使用的模型' },
]

/**
 * Look up one catalog entry by name.
 * @param name - slash command name without leading `/`.
 * @returns the catalog entry, or undefined when unknown.
 */
export function findMobileCommand(name: string): CommandEntry | undefined {
  return MOBILE_COMMANDS.find(command => command.name === name)
}

/**
 * Whether the command stays in the composer for arguments (desktop leadingInput).
 * @param command - catalog entry.
 */
export function isLeadingInputCommand(command: CommandEntry): boolean {
  return command.input !== undefined
}
