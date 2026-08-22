/**
 * Keep the focused editable while activating a nearby control so the keyboard stays open.
 * @param event - pointer-down event whose default focus transfer should be suppressed.
 * @returns the refocused editable, if any.
 */
export function keepEditableFocus(event: { preventDefault(): void }): HTMLTextAreaElement | HTMLInputElement | null {
  event.preventDefault()
  const active = document.activeElement
  if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
    active.focus({ preventScroll: true })
    return active
  }
  return null
}

/**
 * Whether hover tooltips should drive action chrome; coarse pointers rely on aria labels.
 */
export function prefersHoverTooltips(): boolean {
  if (typeof window === 'undefined') return true
  if (typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
