/** Session row status presentation aligned with desktop Workspace browser rows. */

import type { PendingInteractionStatus } from './mobile-session-pending-tracker.ts'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import { relativeTime } from '@deepseek-ai/dsh-client-ui-primitives'
import { zh as workspaceZh } from '@deepseek-ai/dsh-client-ui-workspace/src/client/locales.ts'

type Params = Record<string, string | number>

/** One rendered session status (dot state + localized label). */
export interface MobileSessionStatus {
  state: StateDotState
  label: string
}

function t(key: string, params?: Params): string {
  const template = (workspaceZh as Record<string, string>)[key] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}

/**
 * Resolve session row statuses using the same priority as desktop Rows.tsx.
 * @param node - running, descendant activity, pending, and completion fields.
 */
export function mobileSessionStatuses(node: {
  pendingInteraction?: PendingInteractionStatus
  running: boolean
  runningSubagentCount?: number
  completed?: boolean
}): readonly MobileSessionStatus[] {
  const subagents: MobileSessionStatus | undefined = (node.runningSubagentCount ?? 0) === 0
    ? undefined
    : {
      state: 'ongoing',
      label: t(
        node.runningSubagentCount === 1
          ? 'status.subagentsRunning.one'
          : 'status.subagentsRunning.other',
        { n: node.runningSubagentCount as number },
      ),
    }
  let pending: MobileSessionStatus | undefined
  switch (node.pendingInteraction) {
    case 'approval':
      pending = { state: 'warning', label: t('status.waitingApproval') }
      break
    case 'plan-review':
      pending = { state: 'warning', label: t('status.planReview') }
      break
    case 'question':
      pending = { state: 'warning', label: t('status.waitingAnswer') }
      break
    default:
      break
  }
  if (pending !== undefined) return subagents === undefined ? [pending] : [pending, subagents]
  if (node.running) {
    const primary: MobileSessionStatus = { state: 'ongoing', label: t('status.running') }
    return subagents === undefined ? [primary] : [primary, subagents]
  }
  if (subagents !== undefined) return [subagents]
  if (node.completed === true) return [{ state: 'done', label: t('status.completed') }]
  return [{ state: 'done', label: t('status.idle') }]
}

/**
 * Compact relative updated time for task rows (`37分钟`, `1小时`, …).
 * @param updatedAt - unix ms from session.list.
 * @param now - reference clock.
 */
export function formatSessionRelativeTime(updatedAt: number, now: number = Date.now()): string {
  const { unit, n } = relativeTime(updatedAt, now)
  return unit === 'now' ? t('time.now') : t(`time.${unit}`, { n })
}

/**
 * Whether a session should appear under the mobile “进行中” filter.
 * @param node - one grouped session node or wire summary fields.
 */
export function mobileSessionIsActive(node: {
  running: boolean
  pendingInteraction?: PendingInteractionStatus
}): boolean {
  return node.running || node.pendingInteraction !== undefined
}
