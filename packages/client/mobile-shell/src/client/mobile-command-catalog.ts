import type { CommandEntry } from '@deepseek-ai/dsh-client-connection/client'

/**
 * Composer surface opened instead of a bare slash execute — mirrors desktop
 * popupSelect decorations for `/model` and `/permission`.
 */
export type MobileCommandSurface = 'model' | 'permission'

/** Slash-command catalog shown in the mobile composer menu. */
export interface MobileCommandEntry extends CommandEntry {
  /** When set, the + menu opens this composer surface instead of executing. */
  surface?: MobileCommandSurface
}

export const MOBILE_COMMANDS: readonly MobileCommandEntry[] = [
  { name: 'compact', description: '压缩较早的对话历史' },
  { name: 'export', description: '导出会话日志为 ZIP' },
  {
    name: 'feedback',
    description: '记录对本会话的反馈',
    input: { hint: '<text>' },
  },
  {
    name: 'goal',
    description: '设置或查看长期任务目标',
    input: { hint: '[<objective>|clear|edit <objective>|pause|resume]' },
  },
  {
    name: 'permission',
    description: '切换权限预设（沙箱模式与审批策略）',
    surface: 'permission',
  },
  {
    name: 'plan',
    description: '进入或退出计划模式',
    input: { hint: '[off|message]' },
  },
  {
    name: 'model',
    description: '选择本会话使用的模型',
    surface: 'model',
  },
]

/**
 * Look up one catalog entry by name.
 * @param name - slash command name without leading `/`.
 * @returns the catalog entry, or undefined when unknown.
 */
export function findMobileCommand(name: string): MobileCommandEntry | undefined {
  return MOBILE_COMMANDS.find(command => command.name === name)
}

/**
 * Whether the command stays in the composer for arguments (desktop leadingInput).
 * @param command - catalog entry.
 */
export function isLeadingInputCommand(command: CommandEntry): boolean {
  return command.input !== undefined
}

/**
 * Whether the + menu should open a dedicated composer surface (desktop popupSelect).
 * @param command - catalog entry.
 */
export function isSurfaceCommand(command: MobileCommandEntry): command is MobileCommandEntry & {
  surface: MobileCommandSurface
} {
  return command.surface !== undefined
}
