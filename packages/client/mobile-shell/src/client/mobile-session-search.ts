/** Session search helpers aligned with desktop WorkspaceBrowser. */

import type {
  SessionId,
  SessionSearchItem,
  SessionSummary,
  WorkspaceView,
} from '@deepseek-ai/dsh-client-connection/client'
import type { PendingInteractionStatus } from '@deepseek-ai/dsh-client-runtime/client'
import {
  deriveSearchResults,
  type SearchResultNode,
  type SearchResultSet,
} from '@deepseek-ai/dsh-client-ui-workspace/src/client/tree.ts'
import { toSessionListState } from './mobile-task-groups.ts'

/** Debounce for Host content search, matching desktop WorkspaceBrowser. */
export const MOBILE_SEARCH_DEBOUNCE_MS = 250

/** `session.search` wire bound, measured in JavaScript UTF-16 code units. */
const SEARCH_QUERY_MAX_CODE_UNITS = 500

/**
 * Protocol-owned merged result page size (`SESSION_SEARCH_RESULT_LIMIT`).
 * Keep in sync with `@deepseek-ai/dsh-host-apiproxy/api`.
 */
export const MOBILE_SEARCH_RESULT_LIMIT = 20

/**
 * Keep controlled input and RPC payload inside the session.search wire contract.
 * @param value - raw input text.
 * @returns sanitized query text.
 */
export function sanitizeSearchQuery(value: string): string {
  const withoutNul = value.replaceAll('\0', '')
  if (withoutNul.length <= SEARCH_QUERY_MAX_CODE_UNITS) return withoutNul
  let end = SEARCH_QUERY_MAX_CODE_UNITS
  const last = withoutNul.charCodeAt(end - 1)
  const next = withoutNul.charCodeAt(end)
  if (last >= 0xD800 && last <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF) end--
  return withoutNul.slice(0, end)
}

/** Remote content-search page state for one query. */
export interface MobileRemoteSearchState {
  query: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  items: readonly SessionSearchItem[]
  hasMore: boolean
}

/**
 * Merge local title/workspace matches with Host content hits (desktop rules).
 * @param sessions - wire session.list rows.
 * @param workspaces - workspace.list rows.
 * @param archivedSessionIds - archive set from workspace.list.
 * @param query - trimmed sanitized query.
 * @param remote - current remote page (must match query when ready).
 * @param pendingBySession - live pending status by session id.
 * @param completedBySession - local completion reminders by session id.
 * @returns bounded merged rows plus hasMore.
 */
export function deriveMobileSearchResults(
  sessions: readonly SessionSummary[],
  workspaces: readonly WorkspaceView[],
  archivedSessionIds: readonly SessionId[],
  query: string,
  remote: MobileRemoteSearchState,
  pendingBySession?: ReadonlyMap<SessionId, PendingInteractionStatus>,
  completedBySession?: ReadonlyMap<SessionId, boolean>,
): SearchResultSet {
  const list = toSessionListState(sessions, pendingBySession, completedBySession)
  const currentRemote = remote.query === query
    ? remote
    : { query, status: 'loading' as const, items: [], hasMore: false }
  return deriveSearchResults(
    list,
    workspaces,
    query,
    archivedSessionIds,
    currentRemote,
    MOBILE_SEARCH_RESULT_LIMIT,
  )
}

export type { SearchResultNode }
