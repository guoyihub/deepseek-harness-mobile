import type { ReactNode } from 'react'
import { IconFolderOpen16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { MobileBackButton } from './MobileBackButton.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link MobileChatHeader}. */
export interface MobileChatHeaderProps {
  /** Session title shown on the primary line. */
  title: string
  /** Host and workspace metadata on the secondary line. */
  meta: string
  /** Navigate back to the task list. */
  onBack: () => void
  /** Optional Conversation / Trajectory tablist under the title row. */
  tabs?: ReactNode
}

/**
 * Chat header: back control, title, then tabs with the workspace chip on the right.
 * @param props - title copy and navigation.
 */
export function MobileChatHeader({ title, meta, onBack, tabs }: MobileChatHeaderProps): JSX.Element {
  const workspace = (
    <div className={css.chatHeaderMeta} title={meta}>
      <IconFolderOpen16 size={14} aria-hidden />
      <span className={css.chatHeaderMetaText}>{meta}</span>
    </div>
  )

  if (tabs === undefined) {
    return (
      <header className={css.shellHeaderChat}>
        <MobileBackButton onClick={onBack} />
        <h1 className={css.chatHeaderTitle}>{title}</h1>
        {workspace}
      </header>
    )
  }

  return (
    <header className={css.shellHeaderChatWithTabs}>
      <MobileBackButton onClick={onBack} />
      <div className={css.chatHeaderMain}>
        <h1 className={css.chatHeaderTitle}>{title}</h1>
        <div className={css.chatHeaderTabRow}>
          {tabs}
          {workspace}
        </div>
      </div>
    </header>
  )
}
