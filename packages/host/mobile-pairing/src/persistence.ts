/** Durable mobile pairing state under the harness home. */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import type { PairPasswordMode, SessionRecord } from './types.ts'
import { PAIR_TOKEN_NO_EXPIRY_MS } from './types.ts'

/** On-disk filename inside the harness home. */
export const MOBILE_PAIRING_FILE_NAME = 'mobile-pairing.json'

/** Current persisted store format version. */
export const MOBILE_PAIRING_STORE_VERSION = 1

/** One registered device row in the persisted snapshot. */
export interface PersistedDeviceRecord {
  /** User-visible device label. */
  label: string
  /** Whether the device was revoked. */
  revoked: boolean
  /** Session issuance instant (Unix ms). */
  issuedAt: number
}

/** Durable mobile pairing registry written to disk. */
export interface MobilePairingSnapshot {
  /** Snapshot format version. */
  version: typeof MOBILE_PAIRING_STORE_VERSION
  /** Stable host instance fingerprint. */
  fingerprint: string
  /** Current pair password mode. */
  pairPasswordMode: PairPasswordMode
  /** Shared pair password when mode is `required`. */
  pairPassword: string
  /** Mobile PWA origin baked into QR deep links. */
  mobilePublicBaseUrl: string
  /** Registered devices keyed by device id. */
  devices: Record<string, PersistedDeviceRecord>
  /** Live session tokens keyed by opaque token. */
  sessions: Record<string, SessionRecord>
}

/**
 * Resolve the default persistence file path.
 * @param dshHome - harness home override; defaults to `$DSH_HOME` or `~/.dsh`.
 * @returns absolute path to the pairing snapshot file.
 */
export function resolveMobilePairingPath(dshHome?: string): string {
  return join(resolveDshHome(dshHome), MOBILE_PAIRING_FILE_NAME)
}

/**
 * Read a persisted pairing snapshot, dropping expired no-password sessions.
 * @param filename - absolute snapshot path.
 * @returns the hydrated snapshot, or undefined when absent or invalid.
 */
export function loadMobilePairingSnapshot(filename: string): MobilePairingSnapshot | undefined {
  let text: string
  try {
    text = readFileSync(filename, 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return undefined
  }
  if (!isMobilePairingSnapshot(parsed)) return undefined
  return pruneExpiredSessions(parsed, Date.now())
}

/**
 * Persist the pairing snapshot atomically.
 * @param filename - absolute snapshot path.
 * @param snapshot - next durable store contents.
 */
export async function saveMobilePairingSnapshot(
  filename: string,
  snapshot: MobilePairingSnapshot,
): Promise<void> {
  await writeFileAtomic(filename, `${JSON.stringify(snapshot)}\n`, {
    mode: 0o600,
    dirMode: 0o700,
  })
}

function isMobilePairingSnapshot(value: unknown): value is MobilePairingSnapshot {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  if (record.version !== MOBILE_PAIRING_STORE_VERSION) return false
  if (typeof record.fingerprint !== 'string') return false
  if (record.pairPasswordMode !== 'none' && record.pairPasswordMode !== 'required') return false
  if (typeof record.pairPassword !== 'string') return false
  if (typeof record.mobilePublicBaseUrl !== 'string') return false
  if (typeof record.devices !== 'object' || record.devices === null || Array.isArray(record.devices)) return false
  if (typeof record.sessions !== 'object' || record.sessions === null || Array.isArray(record.sessions)) return false
  return true
}

function pruneExpiredSessions(snapshot: MobilePairingSnapshot, now: number): MobilePairingSnapshot {
  const sessions: Record<string, SessionRecord> = {}
  for (const [token, session] of Object.entries(snapshot.sessions)) {
    if (session.expiresAt !== PAIR_TOKEN_NO_EXPIRY_MS && session.expiresAt <= now) continue
    sessions[token] = session
  }
  return { ...snapshot, sessions }
}
