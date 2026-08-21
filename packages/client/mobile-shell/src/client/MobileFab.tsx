import type { ReactNode } from 'react'
import { IconNewChatOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link MobileFab}. */
export interface MobileFabProps {
  /** Accessible label for the floating action. */
  label: string
  /** Click handler. */
  onClick: () => void
  /** Optional custom icon; defaults to new-chat outline. */
  icon?: ReactNode
}

/**
 * Circular floating action button aligned with the mobile task home layout.
 * @param props - label, handler, and optional icon override.
 */
export function MobileFab({ label, onClick, icon }: MobileFabProps): JSX.Element {
  return (
    <button type="button" className={css.mobileFab} aria-label={label} onClick={onClick}>
      {icon ?? <IconNewChatOutline16 size={20} aria-hidden />}
    </button>
  )
}
