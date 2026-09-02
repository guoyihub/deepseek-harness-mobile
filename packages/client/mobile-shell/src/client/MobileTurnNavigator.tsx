/** Viewport-fixed turn rail for mobile: up to three PC-style tick marks. */

import { memo, useMemo } from 'react'
import type { RefObject } from 'react'
import type { TurnNavigationItem } from '@deepseek-ai/dsh-client-ui-chat/client'
import { mobileChatT } from './mobile-conversation-t.ts'
import {
  navigateToTurn,
  visibleTurnWindow,
} from './mobile-turn-navigation.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileTurnNavigator}. */
export interface MobileTurnNavigatorProps {
  /** Loaded turn navigation items. */
  items: readonly TurnNavigationItem[]
  /** Turn currently aligned with the reader position. */
  activeTurn: number | null
  /** Transcript scrollport. */
  listRef: RefObject<HTMLDivElement>
  /** Keep the rail mark aligned after an explicit jump. */
  onActiveTurnChange: (turn: number) => void
}

/**
 * Render a fixed three-slot turn rail aligned with desktop tick chrome.
 * @param props - navigation items, active turn, and scrollport ref.
 */
export const MobileTurnNavigator = memo(function MobileTurnNavigator({
  items,
  activeTurn,
  listRef,
  onActiveTurnChange,
}: MobileTurnNavigatorProps): JSX.Element | null {
  const windowItems = useMemo(
    () => visibleTurnWindow(items, activeTurn),
    [activeTurn, items],
  )
  if (windowItems.length < 2) return null
  return (
    <div className={css.mobileTurnNav}>
      <nav
        className={css.mobileTurnRail}
        aria-label={mobileChatT('chat.turnNavigation.label')}
        data-turn-count={windowItems.length}
      >
        {windowItems.map((item) => {
          const active = item.turn === activeTurn
          return (
            <button
              key={item.turn}
              type="button"
              className={active ? `${css.mobileTurnMark} ${css.mobileTurnMarkActive}` : css.mobileTurnMark}
              aria-label={mobileChatT('chat.turnNavigation.jump', { turn: item.turn })}
              aria-current={active ? 'true' : undefined}
              onClick={() => {
                const list = listRef.current
                if (list !== null) navigateToTurn(list, item)
                onActiveTurnChange(item.turn)
              }}
            />
          )
        })}
      </nav>
    </div>
  )
})
