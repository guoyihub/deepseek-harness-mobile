/** Viewport-fixed turn rail for mobile: up to three PC-style tick marks. */

import { memo, useMemo, useState } from 'react'
import type { RefObject } from 'react'
import type { TurnRailItem } from '@deepseek-ai/dsh-client-ui-chat/src/client/chat/turn-rail-items.ts'
import type { SessionSeq } from '@deepseek-ai/dsh-session/types'
import { mobileChatT } from './mobile-conversation-t.ts'
import {
  navigateToRailItem,
  visibleTurnWindow,
} from './mobile-turn-navigation.ts'
import css from './mobile-shell.module.css'

/** Props for {@link MobileTurnNavigator}. */
export interface MobileTurnNavigatorProps {
  /** Merged turn rail items. */
  items: readonly TurnRailItem[]
  /** Turn currently aligned with the reader position. */
  activeTurn: number | null
  /** Transcript scrollport. */
  listRef: RefObject<HTMLDivElement>
  /** Jump loader for marks outside the loaded window. */
  loadThrough: (seq: SessionSeq) => Promise<void>
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
  loadThrough,
  onActiveTurnChange,
}: MobileTurnNavigatorProps): JSX.Element | null {
  const [busyTurn, setBusyTurn] = useState<number | null>(null)
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
          const busy = item.turn === busyTurn
          return (
            <button
              key={item.turn}
              type="button"
              className={active ? `${css.mobileTurnMark} ${css.mobileTurnMarkActive}` : css.mobileTurnMark}
              aria-label={mobileChatT('chat.turnNavigation.jump', { turn: item.turn })}
              aria-current={active ? 'true' : undefined}
              aria-busy={busy ? 'true' : undefined}
              disabled={busy}
              onClick={() => {
                const list = listRef.current
                if (list === null) return
                setBusyTurn(item.turn)
                void navigateToRailItem(list, item, loadThrough).finally(() => {
                  setBusyTurn(current => (current === item.turn ? null : current))
                })
                onActiveTurnChange(item.turn)
              }}
            />
          )
        })}
      </nav>
    </div>
  )
})
