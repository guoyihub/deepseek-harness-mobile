/** Line height for `.composerTextarea` in mobile-shell.module.css. */
export const MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX = 24

/** Visible draft lines before the textarea scrolls. */
export const MOBILE_COMPOSER_TEXTAREA_MAX_LINES = 4

/** Pixel cap for the mobile composer draft (`line-height × max lines`). */
export const MOBILE_COMPOSER_TEXTAREA_MAX_HEIGHT_PX =
  MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX * MOBILE_COMPOSER_TEXTAREA_MAX_LINES

/**
 * Grow the composer textarea with its draft up to {@link MOBILE_COMPOSER_TEXTAREA_MAX_LINES}.
 * @param textarea - composer draft control.
 */
export function syncMobileComposerTextareaHeight(textarea: HTMLTextAreaElement): void {
  textarea.style.height = '0px'
  const next = Math.min(
    Math.max(textarea.scrollHeight, MOBILE_COMPOSER_TEXTAREA_LINE_HEIGHT_PX),
    MOBILE_COMPOSER_TEXTAREA_MAX_HEIGHT_PX,
  )
  textarea.style.height = `${next}px`
}
