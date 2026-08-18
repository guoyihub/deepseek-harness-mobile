/** Loopback HTTP helpers for desktop mobile pairing UI. */

/** QR payload fields from Host. */
export interface PairingOffer {
  pairToken: string
  shortCode: string
  expiresAt: number
  host: string
  port: number
  fingerprint: string
  qrUrl: string
  /** PNG data URL rendered by the Host for desktop display. */
  qrDataUrl: string
  /** Whether phones must supply the shared pair password. */
  passwordRequired: boolean
  /** Desktop confirmation policy for this Host deployment. */
  confirmMode: 'strict' | 'trusted-lan' | 'off'
}

/** Pending device awaiting desktop confirmation. */
export interface PendingDeviceView {
  deviceId: string
  deviceLabel: string
  clientVersion: string
  pairToken: string
  createdAt: number
}

/** Registered paired device row. */
export interface PairedDeviceView {
  deviceId: string
  label: string
  revoked: boolean
  issuedAt: string
}

/** Pair password mode for the desktop modal. */
export type PairPasswordMode = 'none' | 'required'

/** Loopback pair password settings. */
export interface PairPasswordSettings {
  mode: PairPasswordMode
  confirmMode: 'strict' | 'trusted-lan' | 'off'
}

async function loopbackJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await globalThis.fetch(path, init)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`${path} failed (${String(response.status)}): ${detail}`)
  }
  return await response.json() as T
}

/**
 * Fetch or mint the active QR pairing offer.
 * @returns QR fields for desktop display.
 */
export async function fetchPairingOffer(): Promise<PairingOffer> {
  return await loopbackJson<PairingOffer>('/api/mobile/pair/qrcode')
}

/**
 * Read the current pair password mode.
 */
export async function fetchPairPasswordSettings(): Promise<PairPasswordSettings> {
  return await loopbackJson<PairPasswordSettings>('/api/mobile/pair/settings')
}

/**
 * Update pair password mode from the desktop modal.
 * @param mode - `none` or `required`.
 * @param password - required when mode is `required`.
 */
export async function updatePairPasswordSettings(
  mode: PairPasswordMode,
  password?: string,
): Promise<PairPasswordSettings> {
  return await loopbackJson<PairPasswordSettings>('/api/mobile/pair/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mode, password }),
  })
}

/**
 * List devices awaiting desktop confirmation.
 * @returns pending device rows.
 */
export async function fetchPendingDevices(): Promise<readonly PendingDeviceView[]> {
  const body = await loopbackJson<{ items: readonly PendingDeviceView[] }>('/api/mobile/pair/pending')
  return body.items
}

/**
 * List registered paired devices.
 * @returns device rows for management UI.
 */
export async function fetchPairedDevices(): Promise<readonly PairedDeviceView[]> {
  const body = await loopbackJson<{ items: readonly PairedDeviceView[] }>('/api/mobile/devices')
  return body.items
}

/**
 * Approve one pending device.
 * @param deviceId - pending device id from the pairing API.
 */
export async function confirmPendingDevice(deviceId: string): Promise<void> {
  await loopbackJson('/api/mobile/pair/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })
}

/**
 * Reject one pending device.
 * @param deviceId - pending device id from the pairing API.
 */
export async function denyPendingDevice(deviceId: string): Promise<void> {
  await loopbackJson('/api/mobile/pair/deny', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })
}

/**
 * Revoke one paired device.
 * @param deviceId - registered device id.
 */
export async function revokePairedDevice(deviceId: string): Promise<void> {
  await loopbackJson(`/api/mobile/devices/${encodeURIComponent(deviceId)}`, { method: 'DELETE' })
}

/**
 * Format remaining QR TTL as mm:ss.
 * @param expiresAt - expiry instant in Unix ms.
 */
export function formatTtl(expiresAt: number): string {
  const remainingMs = Math.max(0, expiresAt - Date.now())
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}
