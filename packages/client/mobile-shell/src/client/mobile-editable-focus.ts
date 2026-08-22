import { keepEditableFocus } from '@deepseek-ai/dsh-client-ui-primitives'
import { pinMobileLayoutViewport } from './mobile-visual-viewport.ts'

/**
 * Whether WebKit on iOS/iPadOS will scroll the layout viewport on editable focus.
 */
export function needsMobileFocusWithoutScroll(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return ios
}

/**
 * Focus an editable without the iOS first-focus layout viewport scroll.
 * @param element - textarea or text input receiving focus.
 */
export function focusMobileEditableWithoutScroll(element: HTMLElement): void {
  pinMobileLayoutViewport()
  element.focus({ preventScroll: true })
}

/**
 * Keep the focused editable while activating a nearby control so the keyboard stays open.
 * @param event - pointer-down event whose default focus transfer should be suppressed.
 * @returns the refocused editable, if any.
 */
export function keepMobileEditableFocus(event: { preventDefault(): void }): HTMLTextAreaElement | HTMLInputElement | null {
  pinMobileLayoutViewport()
  return keepEditableFocus(event)
}

/**
 * Bind iOS composer focus helpers that pin the layout viewport without blocking paste.
 * Starts readonly while blurred to suppress the keyboard accessory bar on unfocused fields;
 * touchstart unlocks editing without {@link TouchEvent.preventDefault} so long-press can
 * reach WebKit's Paste callout. Layout scroll is handled by passive pin plus global focusin hooks.
 * @param element - textarea or text input receiving focus.
 * @returns disposer for the touch listener.
 */
export function bindMobileEditableFocusWithoutScroll(element: HTMLElement): () => void {
  if (!needsMobileFocusWithoutScroll()) return () => {}

  const lockAccessoryBar = (): void => {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      if (!element.disabled && document.activeElement !== element) element.readOnly = true
    }
  }

  const unlockEditing = (): void => {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.readOnly = false
    }
  }

  lockAccessoryBar()

  const onTouchStart = (): void => {
    unlockEditing()
    pinMobileLayoutViewport()
  }

  const onBlur = (): void => {
    lockAccessoryBar()
  }

  element.addEventListener('touchstart', onTouchStart, { passive: true })
  element.addEventListener('blur', onBlur)
  return () => {
    element.removeEventListener('touchstart', onTouchStart)
    element.removeEventListener('blur', onBlur)
    unlockEditing()
  }
}
