import { IconChevronLeftOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileBackButton}. */
export interface MobileBackButtonProps {
  /** Navigate to the previous screen. */
  onClick: () => void
  /** Accessible label; defaults to the mobile shell back string. */
  label?: string | undefined
}

/**
 * Circular back control shared across mobile shell headers.
 * @param props - click handler and optional label.
 */
export function MobileBackButton({
  onClick,
  label = mobileConversationT('nav.back'),
}: MobileBackButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className={css.mobileBackButton}
      aria-label={label}
      onClick={onClick}
    >
      <IconChevronLeftOutline14 size={16} aria-hidden />
    </button>
  )
}
