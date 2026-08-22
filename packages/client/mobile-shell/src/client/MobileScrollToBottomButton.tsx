import type { MouseEvent, TouchEvent } from 'react'
import { keepMobileEditableFocus } from './mobile-editable-focus.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Trae-style down chevron; 16px glyph in the 40px circle matches {@link MobileBackButton}. */
function ScrollToBottomIcon(): JSX.Element {
  return (
    <svg
      className={css.scrollToBottomIcon}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4.75 6.75 8 10.25 11.25 6.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Props for {@link MobileScrollToBottomButton}. */export interface MobileScrollToBottomButtonProps {
  /** Whether the reader has scrolled away from the latest content. */
  visible: boolean
  /** Jump the message list back to the floor. */
  onClick: () => void
}

/**
 * Floating control that returns the mobile chat transcript to its latest row.
 * @param props - visibility and click handler.
 */
export function MobileScrollToBottomButton({
  visible,
  onClick,
}: MobileScrollToBottomButtonProps): JSX.Element | null {
  if (!visible) return null

  const keepComposerFocus = (
    event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>,
  ): void => {
    keepMobileEditableFocus(event.nativeEvent)
  }

  return (
    <div className={css.scrollToBottomSlot}>
      <button
        type="button"
        className={css.scrollToBottomFab}
        aria-label={mobileConversationT('chat.toBottom')}
        onTouchStart={keepComposerFocus}
        onMouseDown={keepComposerFocus}
        onClick={onClick}
      >
        <ScrollToBottomIcon />
      </button>
    </div>
  )
}
