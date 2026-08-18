import type { ReactNode } from 'react'
import { MobileBackButton } from './MobileBackButton.tsx'
import css from './mobile-shell.module.css'

/** Props for {@link MobileShellLayout}. */
export interface MobileShellLayoutProps {
  /** Top bar title. */
  title?: string | undefined
  /** Optional subtitle under the title. */
  subtitle?: string | undefined
  /** Optional back button handler. */
  onBack?: (() => void) | undefined
  /** Page body. */
  children: ReactNode
  /** Optional floating action rendered above safe area. */
  fab?: ReactNode
  /** When set, replaces the default sticky header. */
  headerSlot?: ReactNode
  /** Apply task-home content padding and FAB clearance. */
  taskHomeContent?: boolean | undefined
  /** Blank chat hero layout: titleless header and bottom-anchored composer padding. */
  blankChat?: boolean | undefined
}

/**
 * Shared mobile page chrome aligned with desktop design tokens.
 * @param props - layout copy and body.
 */
export function MobileShellLayout({
  title,
  subtitle,
  onBack,
  children,
  fab,
  headerSlot,
  taskHomeContent = false,
  blankChat = false,
}: MobileShellLayoutProps): JSX.Element {
  const contentClass = taskHomeContent
    ? css.taskHomeContent
    : blankChat
      ? css.chatBlankContent
      : headerSlot !== undefined
        ? css.chatContent
        : css.content

  const showTitle = !blankChat && (title !== undefined || subtitle !== undefined)

  return (
    <div className={css.page}>
      {headerSlot ?? (
        <header className={blankChat ? css.shellHeaderMinimal : css.shellHeader}>
          {onBack !== undefined && <MobileBackButton onClick={onBack} />}
          {showTitle && (
            <div className={css.headerTitle}>
              {title !== undefined && <div>{title}</div>}
              {subtitle !== undefined && <div className={css.headerSubtitle}>{subtitle}</div>}
            </div>
          )}
        </header>
      )}
      <main className={contentClass}>{children}</main>
      {fab !== undefined && <div className={css.fab}>{fab}</div>}
    </div>
  )
}
