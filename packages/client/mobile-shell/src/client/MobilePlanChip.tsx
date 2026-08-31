import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { IconCloseFill14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileApi } from './mobile-api-client.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobilePlanChip}. */
export interface MobilePlanChipProps {
  sessionId: SessionId
  locked: boolean
  /** Called before `/plan off` so the transcript can stay pinned. */
  onCommandSubmit?: (() => void) | undefined
  /** Surface exit failures on the chat error strip. */
  onCommandError?: ((message: string) => void) | undefined
}

/**
 * Plan-mode status chip: exits via `command.execute('/plan off')` like desktop.
 * @param props - session id and lock state.
 */
export function MobilePlanChip({
  sessionId,
  locked,
  onCommandSubmit,
  onCommandError,
}: MobilePlanChipProps): JSX.Element {
  const onExit = async (): Promise<void> => {
    onCommandSubmit?.()
    try {
      const response = await mobileApi.commands.execute({
        sessionId,
        line: '/plan off',
      })
      if (!response.result.ok) {
        onCommandError?.(response.result.error.message)
        return
      }
      if (!response.result.value.matched) {
        onCommandError?.(mobileConversationT('command.unknown', { name: 'plan' }))
      }
    } catch (error: unknown) {
      onCommandError?.(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <button
      type="button"
      className={css.planChip}
      aria-label={mobileConversationT('plan.chip.aria')}
      title={mobileConversationT('plan.chip.title')}
      disabled={locked}
      onClick={() => { void onExit() }}
    >
      Plan
      <span className={css.planChipClose} aria-hidden>
        <IconCloseFill14 size={12} />
      </span>
    </button>
  )
}
