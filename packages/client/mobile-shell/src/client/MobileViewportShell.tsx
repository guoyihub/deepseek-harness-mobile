import { useEffect, useRef, type ReactNode } from 'react'
import {
  applyMobileStandaloneDocumentFlags,
  bindMobileLayoutViewportPin,
  bindMobileViewportShellFrame,
} from './mobile-visual-viewport.ts'
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
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const removeStandaloneFlags = applyMobileStandaloneDocumentFlags()
    const shell = shellRef.current
    if (shell === null) {
      const disposePin = bindMobileLayoutViewportPin()
      return () => {
        disposePin()
        removeStandaloneFlags()
      }
    }
    const disposeFrame = bindMobileViewportShellFrame(shell)
    const disposePin = bindMobileLayoutViewportPin(shell)
    return () => {
      disposeFrame()
      disposePin()
      removeStandaloneFlags()
    }
  }, [])

  return (
    <div ref={shellRef} className={css.viewportShell} data-mobile-viewport-shell>
      <div className={css.viewportFrame}>
        {children}
      </div>
    </div>
  )
}
