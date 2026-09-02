import type { TurnNavigationItem } from '@deepseek-ai/dsh-client-ui-chat/client'
import { isMobileMessageListAtBottom } from './mobile-message-list-scroll.ts'

/** Maximum turn marks shown on the mobile rail at once. */
export const MOBILE_TURN_WINDOW = 3

/**
 * Choose up to three navigation items around the active turn.
 * First turn shows itself plus the next two; last turn shows the previous two plus itself;
 * otherwise show previous, current, and next.
 * @param items - loaded turn navigation items.
 * @param activeTurn - turn currently owning the reader position.
 * @param maxVisible - rail capacity; defaults to {@link MOBILE_TURN_WINDOW}.
 */
export function visibleTurnWindow(
  items: readonly TurnNavigationItem[],
  activeTurn: number | null,
  maxVisible = MOBILE_TURN_WINDOW,
): readonly TurnNavigationItem[] {
  const visible = items.filter(item => item.anchorKey.length > 0)
  if (visible.length <= maxVisible) return visible
  const fallbackIndex = visible.length - 1
  const activeIndex = activeTurn === null
    ? fallbackIndex
    : visible.findIndex(item => item.turn === activeTurn)
  const index = activeIndex < 0 ? fallbackIndex : activeIndex
  if (index <= 0) return visible.slice(0, maxVisible)
  if (index >= visible.length - 1) return visible.slice(-maxVisible)
  return visible.slice(index - 1, index + 2)
}

function turnAtLine(list: HTMLElement, line: number): number | null {
  const content = list.getBoundingClientRect()
  if (typeof document.elementsFromPoint === 'function' && content.width > 0) {
    for (const element of document.elementsFromPoint(content.left + content.width / 2, line)) {
      const row = element instanceof HTMLElement ? element.closest<HTMLElement>('[data-chat-turn]') : null
      const turn = Number(row?.dataset.chatTurn)
      if (row !== null && list.contains(row) && Number.isSafeInteger(turn)) return turn
    }
  }
  let found: number | null = null
  for (const row of list.querySelectorAll<HTMLElement>('[data-chat-turn]')) {
    if (row.getBoundingClientRect().top > line) break
    const turn = Number(row.dataset.chatTurn)
    if (Number.isSafeInteger(turn)) found = turn
  }
  return found
}

/**
 * Derive the turn mark that should read as active for the current scroll position.
 * @param list - mobile transcript scrollport.
 * @param items - loaded turn navigation items.
 * @returns active turn number, or null when no turn is loaded.
 */
export function activeTurnAtScroll(
  list: HTMLElement,
  items: readonly TurnNavigationItem[],
): number | null {
  const first = items.find(item => item.anchorKey.length > 0)
  if (first === undefined) return null
  const readingLine = list.getBoundingClientRect().top + Math.min(96, list.clientHeight * 0.2)
  const reading = turnAtLine(list, readingLine)
  let next = first.turn
  if (reading !== null) {
    for (const item of items) {
      if (item.anchorKey.length === 0) continue
      if (item.turn > reading) break
      next = item.turn
    }
  }
  if (isMobileMessageListAtBottom(list)) {
    const last = items.filter(item => item.anchorKey.length > 0).at(-1)
    if (last !== undefined) next = last.turn
  }
  return next
}

/**
 * Scroll the transcript so one turn anchor sits under the reader line.
 * @param list - mobile transcript scrollport.
 * @param item - destination turn navigation item.
 */
export function navigateToTurn(list: HTMLElement, item: TurnNavigationItem): void {
  const row = list.querySelector<HTMLElement>(`[data-chat-anchor-key="${CSS.escape(item.anchorKey)}"]`)
  if (row === null) return
  list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top - 24
}
