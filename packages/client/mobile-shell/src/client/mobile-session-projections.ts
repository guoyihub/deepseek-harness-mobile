import type { SessionProjectionsBlock } from '@deepseek-ai/dsh-client-connection/client'
import type { SessionProjectionMap } from '@deepseek-ai/dsh-session-projection/types'
// SessionProjectionMap merges used by the mobile chat chrome.
import type {} from '@deepseek-ai/dsh-goal/client'
import type {} from '@deepseek-ai/dsh-permission-presets/client'
import type {} from '@deepseek-ai/dsh-plan-mode/client'
import type {} from '@deepseek-ai/dsh-session-stats/client'
import type {} from '@deepseek-ai/dsh-session-title/client'
import type {} from '@deepseek-ai/dsh-token-meter/client'

interface ProjectionRow {
  value: unknown
  seq: number
}

/** Per-session projection store mirroring desktop ProjectionValueStore semantics. */
export interface MobileProjectionStore {
  asOfSeq: number
  rows: Map<string, ProjectionRow>
}

/**
 * Create an empty mobile projection store.
 * @returns store with no seeded rows.
 */
export function createProjectionStore(): MobileProjectionStore {
  return { asOfSeq: 0, rows: new Map() }
}

/**
 * Read current projection values as one object map.
 * @param store - projection store.
 * @returns typed partial projection map.
 */
export function projectionValues(store: MobileProjectionStore): Readonly<Partial<SessionProjectionMap>> {
  return Object.fromEntries(
    [...store.rows.entries()].map(([key, row]) => [key, row.value]),
  ) as Partial<SessionProjectionMap>
}

function applyRow(store: MobileProjectionStore, key: string, value: unknown, seq: number): void {
  const row = store.rows.get(key)
  if (row !== undefined && seq <= row.seq) return
  store.rows.set(key, { value, seq })
}

/**
 * Seed the store from one history tail projections block.
 * @param store - current store.
 * @param baseline - tail-page projections from session.history.
 * @returns updated store.
 */
export function seedProjectionStore(
  store: MobileProjectionStore,
  baseline: SessionProjectionsBlock,
): MobileProjectionStore {
  const rows = new Map(store.rows)
  for (const [key, value] of Object.entries(baseline.values)) {
    applyRow({ asOfSeq: baseline.asOfSeq, rows }, key, value, baseline.asOfSeq)
  }
  for (const [key, row] of rows) {
    if (Object.hasOwn(baseline.values, key)) continue
    if (row.seq > baseline.asOfSeq) continue
    rows.delete(key)
  }
  return { asOfSeq: baseline.asOfSeq, rows }
}

/**
 * Apply one live session/projection mux frame.
 * @param store - current store.
 * @param key - projection key.
 * @param value - whole projection value.
 * @param seq - frame seq watermark.
 * @returns updated store when the frame wins, otherwise the same store reference.
 */
export function applyProjectionFrame(
  store: MobileProjectionStore,
  key: string,
  value: unknown,
  seq: number,
): MobileProjectionStore {
  const existing = store.rows.get(key)
  if (existing !== undefined && seq <= existing.seq) return store
  const rows = new Map(store.rows)
  rows.set(key, { value, seq })
  return { asOfSeq: Math.max(store.asOfSeq, seq), rows }
}
