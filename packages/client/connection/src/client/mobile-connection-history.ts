/**
 * Saved mobile Host connections for settings quick reconnect.
 * Active pairing keys stay in {@link MOBILE_STORAGE_KEYS}; this list keeps
 * successful pair rows keyed by host fingerprint + base URL.
 */

import { MOBILE_STORAGE_KEYS } from './mobile-session.ts'

/** Maximum saved connections retained on device. */
export const MAX_MOBILE_CONNECTION_HISTORY = 8

/** One previously successful mobile Host pairing. */
export interface SavedMobileConnection {
  /** Stable row id (`fingerprint@hostBase`). */
  id: string
  /** Host instance fingerprint from the pair response. */
  fingerprint: string
  /** Canonical Host base URL. */
  hostBase: string
  /** Opaque session token for reconnect attempts. */
  sessionToken: string
  /** Registered device id. */
  deviceId: string
  /** Host display name from the pair response. */
  hostDisplayName: string
  /** First successful pairing instant (Unix ms). */
  connectedAt: number
  /** Most recent reconnect or pairing instant (Unix ms). */
  lastConnectedAt: number
}

/** Fields required to create or refresh a saved connection row. */
export interface RememberMobileConnectionInput {
  /** Host instance fingerprint. */
  fingerprint: string
  /** Canonical Host base URL. */
  hostBase: string
  /** Opaque session token. */
  sessionToken: string
  /** Registered device id. */
  deviceId: string
  /** Host display name. */
  hostDisplayName: string
}

/**
 * Build the stable history row id for one Host instance.
 * @param fingerprint - Host instance fingerprint.
 * @param hostBase - canonical Host base URL.
 */
export function connectionHistoryId(fingerprint: string, hostBase: string): string {
  return `${fingerprint}@${hostBase}`
}

/**
 * Read saved mobile connections, newest first.
 * @returns parsed history rows, or an empty list when storage is unavailable.
 */
export function readMobileConnectionHistory(): readonly SavedMobileConnection[] {
  try {
    const raw = globalThis.localStorage?.getItem(MOBILE_STORAGE_KEYS.connectionHistory)
    if (raw === null || raw === '') return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(isSavedMobileConnection)
      .sort((left, right) => right.lastConnectedAt - left.lastConnectedAt)
  } catch {
    return []
  }
}

/**
 * Upsert one successful pairing into the saved connection list.
 * @param input - pairing facts to persist.
 */
export function rememberMobileConnection(input: RememberMobileConnectionInput): void {
  const now = Date.now()
  const id = connectionHistoryId(input.fingerprint, input.hostBase)
  const existing = readMobileConnectionHistory().find(entry => entry.id === id)
  const next: SavedMobileConnection = {
    id,
    fingerprint: input.fingerprint,
    hostBase: input.hostBase,
    sessionToken: input.sessionToken,
    deviceId: input.deviceId,
    hostDisplayName: input.hostDisplayName,
    connectedAt: existing?.connectedAt ?? now,
    lastConnectedAt: now,
  }
  const rest = readMobileConnectionHistory().filter(entry => entry.id !== id)
  const merged = [next, ...rest].slice(0, MAX_MOBILE_CONNECTION_HISTORY)
  writeMobileConnectionHistory(merged)
}

/**
 * Mark one saved row as recently used after a manual reconnect.
 * @param id - {@link SavedMobileConnection.id}.
 */
export function touchMobileConnectionHistory(id: string): void {
  const now = Date.now()
  const merged = readMobileConnectionHistory()
    .map(entry => entry.id === id ? { ...entry, lastConnectedAt: now } : entry)
    .sort((left, right) => right.lastConnectedAt - left.lastConnectedAt)
  writeMobileConnectionHistory(merged)
}

/**
 * Remove one saved connection row.
 * @param id - {@link SavedMobileConnection.id}.
 */
export function removeMobileConnectionHistory(id: string): void {
  writeMobileConnectionHistory(readMobileConnectionHistory().filter(entry => entry.id !== id))
}

function writeMobileConnectionHistory(entries: readonly SavedMobileConnection[]): void {
  globalThis.localStorage?.setItem(
    MOBILE_STORAGE_KEYS.connectionHistory,
    JSON.stringify(entries),
  )
}

function isSavedMobileConnection(value: unknown): value is SavedMobileConnection {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && typeof record.fingerprint === 'string'
    && typeof record.hostBase === 'string'
    && typeof record.sessionToken === 'string'
    && typeof record.deviceId === 'string'
    && typeof record.hostDisplayName === 'string'
    && typeof record.connectedAt === 'number'
    && typeof record.lastConnectedAt === 'number'
}
