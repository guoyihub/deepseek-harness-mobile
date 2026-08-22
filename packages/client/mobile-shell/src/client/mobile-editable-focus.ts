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
 * Bind touch-to-focus that blocks iOS layout viewport scroll on first composer focus.
 * @param element - textarea or text input receiving focus.
 * @returns disposer for the touch listener.
 */
export function bindMobileEditableFocusWithoutScroll(element: HTMLElement): () => void {
  if (!needsMobileFocusWithoutScroll()) return () => {}

  const onTouchStart = (event: TouchEvent): void => {
    if (!event.cancelable) return
    event.preventDefault()
    focusMobileEditableWithoutScroll(element)
  }

  element.addEventListener('touchstart', onTouchStart, { passive: false })
  return () => { element.removeEventListener('touchstart', onTouchStart) }
}
