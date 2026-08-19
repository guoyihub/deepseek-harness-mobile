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
 * TRAE-style chat header: circular back control, bold title, workspace meta row.
 * @param props - title copy and navigation.
 */
export function MobileChatHeader({ title, meta, onBack, tabs }: MobileChatHeaderProps): JSX.Element {
  return (
    <header className={tabs === undefined ? css.shellHeaderChat : css.shellHeaderChatWithTabs}>
      <div className={css.chatHeaderTopRow}>
        <MobileBackButton onClick={onBack} />
        <div className={css.chatHeaderTitleBlock}>
          <h1 className={css.chatHeaderTitle}>{title}</h1>
          <div className={css.chatHeaderMeta}>
            <IconFolderOpen16 size={14} aria-hidden />
            <span className={css.chatHeaderMetaText}>{meta}</span>
          </div>
        </div>
      </div>
      {tabs}
    </header>
  )
}
