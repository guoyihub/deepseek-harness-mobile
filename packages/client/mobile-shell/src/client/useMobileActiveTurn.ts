import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TurnNavigationItem } from '@deepseek-ai/dsh-client-ui-chat/client'
import { activeTurnAtScroll } from './mobile-turn-navigation.ts'

/** Active-turn state for the viewport-fixed mobile turn rail. */
export interface MobileActiveTurnSeat {
  /** Turn aligned with the reader position. */
  activeTurn: number | null
  /** Pin the rail mark after an explicit jump. */
  setActiveTurn: (turn: number) => void
  /** Reschedule a scroll-aligned active-turn read. */
  scheduleActiveTurn: () => void
}

/**
 * Track which turn owns the reader line while the transcript scrolls.
 * @param listRef - mobile message-list scrollport.
 * @param turnItems - loaded turn navigation items.
 * @param sessionId - active session id; resets state on change.
 * @param contentRevision - transcript signature that should re-sync the mark.
 */
export function useMobileActiveTurn(
  listRef: RefObject<HTMLDivElement | null>,
  turnItems: readonly TurnNavigationItem[],
  sessionId: SessionId,
  contentRevision: string,
): MobileActiveTurnSeat {
  const lastTurn = turnItems.filter(item => item.anchorKey.length > 0).at(-1)?.turn ?? null
  const [activeTurn, setActiveTurn] = useState<number | null>(() => lastTurn)
  const activeFrameRef = useRef<number | null>(null)

  useEffect(() => {
    setActiveTurn(lastTurn)
  }, [lastTurn, sessionId])

  const syncActiveTurn = (): void => {
    const list = listRef.current
    if (list === null) return
    const next = activeTurnAtScroll(list, turnItems)
    setActiveTurn(current => (current === next ? current : next))
  }

  const scheduleActiveTurn = (): void => {
    if (activeFrameRef.current !== null) return
    activeFrameRef.current = requestAnimationFrame(() => {
      activeFrameRef.current = null
      syncActiveTurn()
    })
  }

  useEffect(() => () => {
    if (activeFrameRef.current !== null) cancelAnimationFrame(activeFrameRef.current)
  }, [])

  useLayoutEffect(() => {
    scheduleActiveTurn()
  }, [contentRevision, turnItems.length])

  return { activeTurn, setActiveTurn, scheduleActiveTurn }
}
