import type { SessionSeq } from '@deepseek-ai/dsh-session/types'
import type { TurnNavigationItem } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TurnRailItem } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/turn-rail-items.ts'
import { isMobileMessageListAtBottom } from './mobile-message-list-scroll.ts'

/** Maximum turn marks shown on the mobile rail at once. */
export const MOBILE_TURN_WINDOW = 3

/**
 * Choose up to three rail items around the active turn.
 * @param items - merged turn rail items.
 * @param activeTurn - turn currently owning the reader position.
 * @param maxVisible - rail capacity; defaults to {@link MOBILE_TURN_WINDOW}.
 */
export function visibleTurnWindow(
  items: readonly TurnRailItem[],
  activeTurn: number | null,
  maxVisible = MOBILE_TURN_WINDOW,
): readonly TurnRailItem[] {
  if (items.length <= maxVisible) return items
  const fallbackIndex = items.length - 1
  const activeIndex = activeTurn === null
    ? fallbackIndex
    : items.findIndex(item => item.turn === activeTurn)
  const index = activeIndex < 0 ? fallbackIndex : activeIndex
  if (index <= 0) return items.slice(0, maxVisible)
  if (index >= items.length - 1) return items.slice(-maxVisible)
  return items.slice(index - 1, index + 2)
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

function loadedRailItems(items: readonly TurnRailItem[]): readonly TurnNavigationItem[] {
  return items.flatMap((item) => {
    if (item.anchor.kind !== 'loaded') return []
    return [{
      turn: item.turn,
      anchorKey: item.anchor.key,
      prompt: item.prompt,
      response: item.response,
    }]
  })
}

/**
 * Derive the turn mark that should read as active for the current scroll position.
 * @param list - mobile transcript scrollport.
 * @param items - merged turn rail items.
 * @returns active turn number, or null when no turn is loaded.
 */
export function activeTurnAtScroll(
  list: HTMLElement,
  items: readonly TurnRailItem[],
): number | null {
  const loaded = loadedRailItems(items)
  const first = loaded[0]
  if (first === undefined) return null
  const readingLine = list.getBoundingClientRect().top + Math.min(96, list.clientHeight * 0.2)
  const reading = turnAtLine(list, readingLine)
  let next = first.turn
  if (reading !== null) {
    for (const item of loaded) {
      if (item.turn > reading) break
      next = item.turn
    }
  }
  if (isMobileMessageListAtBottom(list)) {
    const last = loaded.at(-1)
    if (last !== undefined) next = last.turn
  }
  return next
}

/**
 * Scroll the transcript so one loaded turn anchor sits under the reader line.
 * @param list - mobile transcript scrollport.
 * @param anchorKey - destination anchor key.
 */
export function navigateToLoadedTurn(list: HTMLElement, anchorKey: string): void {
  const row = list.querySelector<HTMLElement>(`[data-chat-anchor-key="${CSS.escape(anchorKey)}"]`)
  if (row === null) return
  list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top - 24
}

/**
 * Scroll to one turn row after history paging lands.
 * @param list - mobile transcript scrollport.
 * @param turn - target turn number.
 */
export function navigateToTurnNumber(list: HTMLElement, turn: number): void {
  const row = list.querySelector<HTMLElement>(`[data-chat-turn="${turn}"]`)
  if (row === null) return
  list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top - 24
}

/**
 * Reach one rail mark: scroll when loaded, otherwise page history through its seq.
 * @param list - mobile transcript scrollport.
 * @param item - destination rail item.
 * @param loadThrough - jump loader owned by the session face.
 */
export async function navigateToRailItem(
  list: HTMLElement,
  item: TurnRailItem,
  loadThrough: (seq: SessionSeq) => Promise<void>,
): Promise<void> {
  if (item.anchor.kind === 'loaded') {
    navigateToLoadedTurn(list, item.anchor.key)
    return
  }
  await loadThrough(item.anchor.seq)
  navigateToTurnNumber(list, item.turn)
}

/** @deprecated Use {@link navigateToLoadedTurn} with merged rail items. */
export function navigateToTurn(list: HTMLElement, item: TurnNavigationItem): void {
  navigateToLoadedTurn(list, item.anchorKey)
}
