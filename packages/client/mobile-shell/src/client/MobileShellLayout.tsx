import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link MobileShellLayout}. */
export interface MobileShellLayoutProps {
  /** Top bar title. */
  title: string
  /** Optional subtitle under the title. */
  subtitle?: string | undefined
  /** Optional back button handler. */
  onBack?: (() => void) | undefined
  /** Page body. */
  children: ReactNode
  /** Optional floating action rendered above safe area. */
  fab?: ReactNode
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
}: MobileShellLayoutProps): JSX.Element {
  return (
    <div className={css.page}>
      <header className={css.header}>
        {onBack !== undefined && (
          <Button variant="ghost" size="sm" onClick={onBack} aria-label="返回">
            返回
          </Button>
        )}
        <div className={css.headerTitle}>
          <div>{title}</div>
          {subtitle !== undefined && <div className={css.headerSubtitle}>{subtitle}</div>}
        </div>
      </header>
      <main className={css.content}>{children}</main>
      {fab !== undefined && <div className={css.fab}>{fab}</div>}
    </div>
  )
}
