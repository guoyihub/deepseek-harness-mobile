import {
  IconLinkOutline16,
  IconTrashOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SavedMobileConnection } from './mobile-session.ts'
import { MobileSettingsCard } from './MobileSettingsCard.tsx'
import { MobileSettingsRow } from './MobileSettingsRow.tsx'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** Props for {@link SavedConnectionList}. */
export interface SavedConnectionListProps {
  /** Saved Host rows, newest first. */
  entries: readonly SavedMobileConnection[]
  /** Active row id when paired to one saved Host. */
  activeId?: string | undefined
  /** Row id currently attempting reconnect. */
  reconnectingId?: string | undefined
  /** Restore one saved pairing. */
  onReconnect: (entry: SavedMobileConnection) => void
  /** Remove one saved row. */
  onRemove: (id: string) => void
}

function formatSavedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Saved Host rows inside one settings list card.
 * @param props - saved rows and handlers.
 */
export function SavedConnectionList({
  entries,
  activeId,
  reconnectingId,
  onReconnect,
  onRemove,
}: SavedConnectionListProps): JSX.Element | null {
  if (entries.length === 0) return null

  return (
    <MobileSettingsCard>
      {entries.map((entry) => {
        const isActive = entry.id === activeId
        const isReconnecting = entry.id === reconnectingId
        const busy = reconnectingId !== undefined
        return (
          <div key={entry.id} className={css.mSetSavedRow}>
            <MobileSettingsRow
              icon={<IconLinkOutline16 size={22} />}
              label={entry.hostDisplayName}
              value={isActive ? mobileConversationT('connection.currentBadge') : isReconnecting ? mobileConversationT('connection.reconnectingEllipsis') : formatSavedAt(entry.lastConnectedAt)}
              showChevron={!isActive}
              disabled={busy || isActive}
              onClick={isActive ? undefined : () => { onReconnect(entry) }}
            />
            {!isActive && (
              <button
                type="button"
                className={css.mSetSavedRemove}
                aria-label={mobileConversationT('connection.removeWithName', { name: entry.hostDisplayName })}
                disabled={busy}
                onClick={() => { onRemove(entry.id) }}
              >
                <IconTrashOutline16 size={16} aria-hidden />
              </button>
            )}
          </div>
        )
      })}
    </MobileSettingsCard>
  )
}

/** Empty-state hint when no saved connections exist yet. */
export function SavedConnectionEmptyHint(): JSX.Element {
  return (
    <p className={css.mSetEmptyHint}>
      {mobileConversationT('connection.savedEmptyHint')}
    </p>
  )
}
