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
  /** Optional full-width bottom dock (e.g. multi-select actions). */
  dock?: ReactNode
  /** When set, replaces the default sticky header. */
  headerSlot?: ReactNode
  /** Apply task-home content padding and FAB clearance. */
  taskHomeContent?: boolean | undefined
  /** Task home with nested pull-to-refresh scrollport (see {@link MobilePullToRefresh}). */
  taskHomeNestedScroll?: boolean | undefined
  /** Blank chat hero layout: titleless header and bottom-anchored composer padding. */
  blankChat?: boolean | undefined
  /** Chat session body padding without an in-layout header slot. */
  chatContentLayout?: boolean | undefined
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
  dock,
  headerSlot,
  taskHomeContent = false,
  taskHomeNestedScroll = false,
  blankChat = false,
  chatContentLayout = false,
}: MobileShellLayoutProps): JSX.Element {
  const contentClass = taskHomeNestedScroll
    ? css.taskHomeContentHost
    : taskHomeContent
      ? css.taskHomeContent
      : blankChat
        ? css.chatBlankContent
        : headerSlot !== undefined || chatContentLayout
          ? css.chatContent
          : css.content

  const showTitle = !blankChat && (title !== undefined || subtitle !== undefined)
  const defaultHeader = (
    <header className={blankChat ? css.shellHeaderMinimal : css.shellHeader}>
      {onBack !== undefined && <MobileBackButton onClick={onBack} />}
      {showTitle && (
        <div className={css.headerTitle}>
          {title !== undefined && <div>{title}</div>}
          {subtitle !== undefined && <div className={css.headerSubtitle}>{subtitle}</div>}
        </div>
      )}
    </header>
  )

  return (
    <div className={css.page}>
      {headerSlot !== undefined ? headerSlot : chatContentLayout ? null : defaultHeader}
      <main className={contentClass} data-dock={dock !== undefined || undefined}>{children}</main>
      {dock !== undefined && <div className={css.dock}>{dock}</div>}
      {fab !== undefined && <div className={css.fab}>{fab}</div>}
    </div>
  )
}
