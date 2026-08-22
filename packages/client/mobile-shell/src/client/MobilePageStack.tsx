import type { ReactNode } from 'react'
import type { MobileNavTransition } from './useMobileNavigation.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobilePageStack}. */
export interface MobilePageStackProps {
  /** Active page body. */
  children: ReactNode
  /** Optional page shown beneath during a back transition. */
  underlay?: ReactNode | undefined
  /** Current slide direction. */
  transition: MobileNavTransition
}

/**
 * Full-height page container with iOS-style horizontal slide transitions.
 * @param props - active page, optional underlay, and motion direction.
 */
export function MobilePageStack({
  children,
  underlay,
  transition,
}: MobilePageStackProps): JSX.Element {
  const showUnderlay = underlay !== undefined && transition === 'back'

  return (
    <div className={css.pageStack} data-transition={transition}>
      {showUnderlay && (
        <div className={css.pageLayer} data-layer="underlay" data-motion="enter-back" aria-hidden>
          {underlay}
        </div>
      )}
      <div className={css.pageLayer} data-layer="active" data-motion={transition === 'forward' ? 'enter-forward' : transition === 'back' ? 'exit-back' : 'idle'}>
        {children}
      </div>
    </div>
  )
}
