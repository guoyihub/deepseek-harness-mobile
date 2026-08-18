import type { ReactNode } from 'react'
import css from './mobile-shell.module.css'

/** Props for {@link MobileViewportShell}. */
export interface MobileViewportShellProps {
  children: ReactNode
}

/**
 * Fixed mobile viewport frame: one column, no document scroll, safe-area aware.
 * @param props - shell pages.
 */
export function MobileViewportShell({ children }: MobileViewportShellProps): JSX.Element {
  return (
    <div className={css.viewportShell}>
      <div className={css.viewportFrame}>
        {children}
      </div>
    </div>
  )
}
