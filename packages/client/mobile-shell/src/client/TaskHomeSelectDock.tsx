/** Fixed bottom action dock for task-home multi-select mode. */

import { IconArchiveOutline20 } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeSelectDock}. */
export interface TaskHomeSelectDockProps {
  /** Whether bulk actions are disabled. */
  disabled: boolean
  /** Pin selected sessions to the top of their workspace. */
  onPin: () => void
  /** Archive selected sessions. */
  onArchive: () => void
}

/** Lightweight pushpin glyph (no shared pin icon in ui-primitives yet). */
function PinIcon({ size }: { size: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M8.2 2.8h3.6c.4 0 .7.3.7.7v1.1l1.6 1.6c.5.5.8 1.2.8 1.9v.6c0 .4-.3.7-.7.7h-2.1v5.1c0 .5-.4.9-.9.9h-.8c-.5 0-.9-.4-.9-.9V9.4H6.5c-.4 0-.7-.3-.7-.7v-.6c0-.7.3-1.4.8-1.9l1.6-1.6V3.5c0-.4.3-.7.7-.7z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M10 15.5V17.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Bottom dock with pin + archive actions while selecting sessions.
 * @param props - enablement and handlers.
 */
export function TaskHomeSelectDock({
  disabled,
  onPin,
  onArchive,
}: TaskHomeSelectDockProps): JSX.Element {
  return (
    <div className={css.taskHomeSelectBar} role="toolbar" aria-label={mobileConversationT('taskHome.batchActions')}>
      <button
        type="button"
        className={css.taskHomeSelectAction}
        disabled={disabled}
        onClick={onPin}
      >
        <PinIcon size={18} />
        <span>{mobileConversationT('taskHome.pin')}</span>
      </button>
      <button
        type="button"
        className={css.taskHomeSelectArchive}
        disabled={disabled}
        onClick={onArchive}
      >
        <IconArchiveOutline20 size={18} />
        <span>{mobileConversationT('taskHome.archive')}</span>
      </button>
    </div>
  )
}
