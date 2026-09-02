import type { ReactNode } from 'react'
import { IconFolderOpen16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { MobileBackButton } from './MobileBackButton.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link MobileChatHeader}. */
export interface MobileChatHeaderProps {
  /** Session title shown on the primary line. */
  title: string
  /** Host workspace title on the tab-row chip when {@link MobileChatHeaderProps.metaSlot} is absent. */
  meta: string
  /** Optional tab-row control replacing the static workspace chip (e.g. blank-session picker). */
  metaSlot?: ReactNode
  /** Read-only agent preset label rendered on the former conversation-tab row. */
  presetLabel?: ReactNode
  /** Navigate back to the task list. */
  onBack: () => void
  /** Optional title-row actions (turn jump, schedules). */
  actions?: ReactNode
}

/**
 * Chat header: back control and title on the first row; agent preset then workspace on the tab row.
 * @param props - title copy and navigation.
 */
export function MobileChatHeader({
  title,
  meta,
  metaSlot,
  presetLabel,
  onBack,
  actions,
}: MobileChatHeaderProps): JSX.Element {
  const workspace = metaSlot ?? (
    <div className={css.chatHeaderMeta} title={meta}>
      <IconFolderOpen16 size={14} aria-hidden />
      <span className={css.chatHeaderMetaText}>{meta}</span>
    </div>
  )

  return (
    <header className={css.shellHeaderChatWithTabsPinned}>
      <MobileBackButton onClick={onBack} />
      <div className={css.chatHeaderMain}>
        <h1 className={css.chatHeaderTitle}>{title}</h1>
        <div className={css.chatHeaderTabRow}>
          {presetLabel}
          {workspace}
        </div>
      </div>
      {actions}
    </header>
  )
}
