/** Mobile pairing domain types (types-only module). */

/** Desktop confirmation policy for new device pairing. */
export type ConfirmMode = 'strict' | 'trusted-lan' | 'off'

/** Whether phones must supply a shared pair password after scanning. */
export type PairPasswordMode = 'none' | 'required'

/** Sentinel `expiresAt` for password-protected pairTokens (no time-based expiry). */
export const PAIR_TOKEN_NO_EXPIRY_MS = Number.MAX_SAFE_INTEGER

/** Default no-password pairToken lifetime (24 hours). */
export const DEFAULT_PAIR_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

/** URL scheme for QR payloads and mobile base URLs. */
export type PublicScheme = 'http' | 'https'

/** Scope granted to a paired mobile session. */
export type MobileScope = 'session:read' | 'session:write' | 'command:execute'

/** Active pairToken minted for QR display. */
export interface PairTokenRecord {
  /** Opaque pair token (UUID v4). */
  token: string
  /** Six-digit manual pairing code mapped to this token. */
  shortCode: string
  /** Expiry instant (Unix ms). */
  expiresAt: number
  /** Whether the token was exchanged for a sessionToken. */
  consumed: boolean
}

/** Device awaiting desktop confirmation in strict mode. */
export interface PendingDevice {
  /** Stable device id for this pairing attempt. */
  deviceId: string
  /** User-visible label from the phone. */
  deviceLabel: string
  /** Mobile client version string. */
  clientVersion: string
  /** pairToken that initiated the pending state. */
  pairToken: string
  /** Creation instant (Unix ms). */
  createdAt: number
}

/** Issued mobile session bound to one device. */
export interface SessionRecord {
  /** Opaque session token presented as Bearer / query param. */
  token: string
  /** Registered device id. */
  deviceId: string
  /** User-visible device label. */
  deviceLabel: string
  /** Granted scopes for this session. */
  scopes: readonly MobileScope[]
  /** Expiry instant (Unix ms). */
  expiresAt: number
}

/** QR payload fields returned to the desktop UI. */
export interface PairingOffer {
  /** Current pair token. */
  pairToken: string
  /** Expiry instant (Unix ms). */
  expiresAt: number
  /** Host authority hostname or IP literal. */
  host: string
  /** Listen port. */
  port: number
  /** Host instance fingerprint (non-secret). */
  fingerprint: string
  /** Camera-friendly URL encoding the pairing parameters. */
  qrUrl: string
  /** Six-digit manual pairing code for degraded pairing flows. */
  shortCode: string
  /** When true, the phone must send `pairPassword` before pairing proceeds. */
  passwordRequired: boolean
  /** Desktop confirmation policy for this Host deployment. */
  confirmMode: ConfirmMode
}

/** Loopback pairing password policy for the desktop modal. */
export interface PairPasswordSettings {
  /** Current pair password mode. */
  mode: PairPasswordMode
  /** Desktop confirmation policy (`off` pairs immediately). */
  confirmMode: ConfirmMode
}

/** LAN-visible pairing policy for the mobile shell. */
export interface PairPolicy {
  /** Whether the phone must collect a pair password. */
  passwordRequired: boolean
}

/** Desktop QR API response — extends {@link PairingOffer} with a rendered image. */
export interface PairingQrcodeResponse extends PairingOffer {
  /** PNG data URL for desktop modal display. */
  qrDataUrl: string
}

/** Successful pair exchange response. */
export interface PairSuccess {
  /** Opaque session token. */
  sessionToken: string
  /** Registered device id. */
  deviceId: string
  /** Host display name. */
  hostDisplayName: string
  /** Host instance fingerprint. */
  fingerprint: string
  /** Granted scopes. */
  scopes: readonly MobileScope[]
  /** Session expiry (ISO-8601). */
  expiresAt: string
}

/** One registered paired device for desktop management UI. */
export interface PairedDeviceView {
  /** Registered device id. */
  deviceId: string
  /** User-visible device label. */
  label: string
  /** Whether the device was revoked. */
  revoked: boolean
  /** Session issuance instant (ISO-8601). */
  issuedAt: string
}

/** Phone-side poll outcome while strict confirmation is in flight. */
export type DevicePairStatus =
  | { status: 'pending' }
  | { status: 'ready'; value: PairSuccess }
  | { status: 'denied' }
  | { status: 'expired' }
  | { status: 'not-found' }

/** Default scopes for M1 mobile sessions. */
export const DEFAULT_MOBILE_SCOPES: readonly MobileScope[] = [
  'session:read',
  'session:write',
  'command:execute',
]
