/** In-memory pairToken, pending-device, and sessionToken registry (M1). */

import { randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import type {
  ConfirmMode,
  DevicePairStatus,
  MobileScope,
  PairedDeviceView,
  PairingOffer,
  PairSuccess,
  PairPasswordMode,
  PairPasswordSettings,
  PairPolicy,
  PairTokenRecord,
  PendingDevice,
  PublicScheme,
  SessionRecord,
} from './types.ts'
import { DEFAULT_MOBILE_SCOPES, MOBILE_PWA_PORT, PAIR_TOKEN_NO_EXPIRY_MS } from './types.ts'

/** Mutable pairing state owned by {@link MobilePairingStore}. */
export interface MobilePairingStoreOptions {
  /** Public scheme for QR URLs; M1 Host serves plain HTTP. */
  publicScheme: PublicScheme
  /** Desktop confirmation policy. */
  confirmMode: ConfirmMode
  /** pairToken TTL in milliseconds. */
  pairTokenTtlMs: number
  /** sessionToken TTL in milliseconds. */
  sessionTokenTtlMs: number
  /** Stable host instance fingerprint. */
  fingerprint: string
  /** Host display name for pair responses. */
  hostDisplayName: string
}

/** Result of a pair attempt before session issuance. */
export type PairAttemptResult =
  | { kind: 'success'; value: PairSuccess }
  | { kind: 'pending'; deviceId: string }
  | { kind: 'not-found' }
  | { kind: 'expired' }
  | { kind: 'consumed' }
  | { kind: 'password-required' }
  | { kind: 'password-invalid' }

interface DeviceRecord {
  /** User-visible device label. */
  label: string
  /** Whether the device was revoked. */
  revoked: boolean
  /** Session issuance instant (Unix ms). */
  issuedAt: number
}

/**
 * Owns pairToken minting, pending approval, and sessionToken lookup.
 * One active pairToken at a time; a new QR invalidates the previous token.
 */
export class MobilePairingStore {
  private activePair: PairTokenRecord | undefined
  private pairPasswordMode: PairPasswordMode = 'none'
  private pairPassword = ''
  /** Mobile PWA origin used in QR deep links (tunnel or LAN Vite). */
  private mobilePublicBaseUrl = ''
  private readonly sessions = new Map<string, SessionRecord>()
  private readonly pending = new Map<string, PendingDevice>()
  private readonly readyPickup = new Map<string, PairSuccess>()
  private readonly deniedDevices = new Set<string>()
  private readonly devices = new Map<string, DeviceRecord>()

  /**
   * @param options - TTL, confirmation mode, and host identity facts.
   */
  constructor(private readonly options: MobilePairingStoreOptions) {}

  /** Host instance fingerprint (non-secret). */
  get fingerprint(): string {
    return this.options.fingerprint
  }

  /** LAN-visible pairing policy for the mobile shell. */
  pairPolicy(): PairPolicy {
    return { passwordRequired: this.pairPasswordMode === 'required' }
  }

  /** Loopback pairing password settings for the desktop modal. */
  pairPasswordSettings(): PairPasswordSettings {
    return {
      mode: this.pairPasswordMode,
      confirmMode: this.options.confirmMode,
      mobilePublicBaseUrl: this.mobilePublicBaseUrl,
    }
  }

  /**
   * Update pair password mode from the desktop UI.
   * @param mode - `none` clears the password; `required` needs a non-empty secret.
   * @param password - shared pair password when mode is `required`.
   * @returns false when `required` was requested without a password.
   */
  setPairPasswordSettings(mode: PairPasswordMode, password?: string): boolean {
    if (mode === 'none') {
      this.pairPasswordMode = 'none'
      this.pairPassword = ''
      this.refreshActivePairExpiry()
      return true
    }
    const trimmed = password?.trim() ?? ''
    if (trimmed === '') {
      if (this.pairPasswordMode === 'required' && this.pairPassword !== '') return true
      return false
    }
    this.pairPasswordMode = 'required'
    this.pairPassword = trimmed
    this.refreshActivePairExpiry()
    return true
  }

  /**
   * Set the Mobile PWA origin baked into QR deep links.
   * @param baseUrl - absolute origin such as `https://tunnel.example.com`, or empty to clear.
   * @returns false when the value is not a valid http(s) origin.
   */
  setMobilePublicBaseUrl(baseUrl: string): boolean {
    const trimmed = baseUrl.trim()
    if (trimmed === '') {
      this.mobilePublicBaseUrl = ''
      return true
    }
    try {
      const url = new URL(trimmed)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
      this.mobilePublicBaseUrl = url.origin
      return true
    } catch {
      return false
    }
  }

  /**
   * Mint a fresh pairToken for QR display.
   * @param host - reachable host authority (IP or hostname).
   * @param port - listen port.
   * @returns QR payload fields for the desktop UI.
   */
  createPairing(host: string, port: number): PairingOffer {
    const now = Date.now()
    const expiresAt = this.pairTokenExpiresAt(now)
    const shortCode = this.mintShortCode()
    this.activePair = { token: randomUUID(), shortCode, expiresAt, consumed: false }
    const authority = this.resolveOfferAuthority(host, port)
    const qrUrl = this.formatQrUrl(authority.host, authority.port, this.activePair.token, this.activePair)
    return this.offerFromRecord(authority.host, authority.port, this.activePair, qrUrl)
  }

  /**
   * Read the current pairing offer without minting a new token.
   * @param host - reachable host authority.
   * @param port - listen port.
   * @returns the active offer, or undefined when none is valid.
   */
  currentPairing(host: string, port: number): PairingOffer | undefined {
    if (
      this.activePair === undefined
      || this.isPairExpired(this.activePair)
      || this.activePair.consumed
    ) return undefined
    const authority = this.resolveOfferAuthority(host, port)
    const qrUrl = this.formatQrUrl(authority.host, authority.port, this.activePair.token, this.activePair)
    return this.offerFromRecord(authority.host, authority.port, this.activePair, qrUrl)
  }

  /**
   * Exchange a pairToken for a sessionToken (or enter pending in strict mode).
   * @param pairToken - token from the QR payload.
   * @param deviceLabel - user-visible phone label.
   * @param clientVersion - mobile client version string.
   * @returns pair outcome discriminant.
   */
  attemptPair(
    pairToken: string,
    deviceLabel: string,
    clientVersion: string,
    pairPassword?: string,
  ): PairAttemptResult {
    const record = this.activePair
    if (record === undefined || record.token !== pairToken) return { kind: 'not-found' }
    return this.attemptPairRecord(record, deviceLabel, clientVersion, pairPassword)
  }

  /**
   * Exchange a six-digit short code for a sessionToken.
   * @param shortCode - manual pairing code from the desktop QR page.
   * @param deviceLabel - user-visible phone label.
   * @param clientVersion - mobile client version string.
   * @returns pair outcome discriminant.
   */
  attemptPairByShortCode(
    shortCode: string,
    deviceLabel: string,
    clientVersion: string,
    pairPassword?: string,
  ): PairAttemptResult {
    const record = this.activePair
    if (record === undefined || record.shortCode !== shortCode) return { kind: 'not-found' }
    return this.attemptPairRecord(record, deviceLabel, clientVersion, pairPassword)
  }

  /**
   * Approve a pending device and issue its sessionToken.
   * @param deviceId - pending device id.
   * @returns issued session facts, or undefined when not pending.
   */
  confirmPending(deviceId: string): PairSuccess | undefined {
    const pending = this.pending.get(deviceId)
    if (pending === undefined) return undefined
    this.pending.delete(deviceId)
    this.deniedDevices.delete(deviceId)
    const success = this.issueSession(pending.deviceId, pending.deviceLabel)
    this.readyPickup.set(deviceId, success)
    return success
  }

  /**
   * Reject a pending device request.
   * @param deviceId - pending device id.
   * @returns true when a pending device was denied.
   */
  denyPending(deviceId: string): boolean {
    if (!this.pending.has(deviceId)) return false
    this.pending.delete(deviceId)
    this.deniedDevices.add(deviceId)
    this.readyPickup.delete(deviceId)
    return true
  }

  /**
   * Poll strict-mode pairing progress for one device id.
   * @param deviceId - device id returned from the initial 409 response.
   * @returns current pairing status for the phone.
   */
  pollDeviceStatus(deviceId: string): DevicePairStatus {
    if (this.pending.has(deviceId)) return { status: 'pending' }
    if (this.deniedDevices.has(deviceId)) return { status: 'denied' }
    const ready = this.readyPickup.get(deviceId)
    if (ready !== undefined) {
      this.readyPickup.delete(deviceId)
      return { status: 'ready', value: ready }
    }
    const device = this.devices.get(deviceId)
    if (device !== undefined) return { status: 'expired' }
    return { status: 'not-found' }
  }

  /**
   * Validate an opaque session token.
   * @param token - Bearer or WebSocket access_token value.
   * @returns the live session record, or undefined when absent or expired.
   */
  validateSessionToken(token: string): SessionRecord | undefined {
    const session = this.sessions.get(token)
    if (session === undefined) return undefined
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token)
      return undefined
    }
    const device = this.devices.get(session.deviceId)
    if (device?.revoked === true) {
      this.sessions.delete(token)
      return undefined
    }
    return session
  }

  /**
   * Revoke one paired device and drop its sessions.
   * @param deviceId - registered device id.
   * @returns true when the device existed.
   */
  revokeDevice(deviceId: string): boolean {
    const device = this.devices.get(deviceId)
    if (device === undefined) return false
    device.revoked = true
    for (const [token, session] of this.sessions) {
      if (session.deviceId === deviceId) this.sessions.delete(token)
    }
    return true
  }

  /** Pending devices awaiting desktop confirmation. */
  listPending(): readonly PendingDevice[] {
    return [...this.pending.values()]
  }

  /** Registered paired devices for desktop management UI. */
  listDevices(): readonly PairedDeviceView[] {
    return [...this.devices.entries()].map(([deviceId, device]) => ({
      deviceId,
      label: device.label,
      revoked: device.revoked,
      issuedAt: new Date(device.issuedAt).toISOString(),
    }))
  }

  private attemptPairRecord(
    record: PairTokenRecord,
    deviceLabel: string,
    clientVersion: string,
    pairPassword?: string,
  ): PairAttemptResult {
    if (record.consumed) return { kind: 'consumed' }
    if (this.isPairExpired(record)) return { kind: 'expired' }
    const passwordOutcome = this.checkPairPassword(pairPassword)
    if (passwordOutcome === 'password-required') return { kind: 'password-required' }
    if (passwordOutcome === 'password-invalid') return { kind: 'password-invalid' }
    record.consumed = true
    const deviceId = randomUUID()
    if (this.options.confirmMode === 'strict') {
      this.pending.set(deviceId, {
        deviceId,
        deviceLabel,
        clientVersion,
        pairToken: record.token,
        createdAt: Date.now(),
      })
      return { kind: 'pending', deviceId }
    }
    return { kind: 'success', value: this.issueSession(deviceId, deviceLabel) }
  }

  private issueSession(deviceId: string, deviceLabel: string): PairSuccess {
    const expiresAtMs = Date.now() + this.options.sessionTokenTtlMs
    const token = randomBytes(32).toString('base64url')
    const scopes: readonly MobileScope[] = DEFAULT_MOBILE_SCOPES
    this.devices.set(deviceId, { label: deviceLabel, revoked: false, issuedAt: Date.now() })
    this.sessions.set(token, {
      token,
      deviceId,
      deviceLabel,
      scopes,
      expiresAt: expiresAtMs,
    })
    return {
      sessionToken: token,
      deviceId,
      hostDisplayName: this.options.hostDisplayName,
      fingerprint: this.options.fingerprint,
      scopes,
      expiresAt: new Date(expiresAtMs).toISOString(),
    }
  }

  private mintShortCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0')
  }

  private offerFromRecord(
    host: string,
    port: number,
    record: PairTokenRecord,
    qrUrl: string,
  ): PairingOffer {
    return {
      pairToken: record.token,
      shortCode: record.shortCode,
      expiresAt: record.expiresAt,
      host,
      port,
      fingerprint: this.options.fingerprint,
      qrUrl,
      passwordRequired: this.pairPasswordMode === 'required',
      confirmMode: this.options.confirmMode,
    }
  }

  private checkPairPassword(provided: string | undefined): 'ok' | 'password-required' | 'password-invalid' {
    if (this.pairPasswordMode === 'none') return 'ok'
    if (provided === undefined || provided.trim() === '') return 'password-required'
    const expected = Buffer.from(this.pairPassword, 'utf8')
    const actual = Buffer.from(provided, 'utf8')
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      return 'password-invalid'
    }
    return 'ok'
  }

  private refreshActivePairExpiry(): void {
    const record = this.activePair
    if (record === undefined || record.consumed) return
    record.expiresAt = this.pairTokenExpiresAt(Date.now())
  }

  private pairTokenExpiresAt(now: number): number {
    if (this.pairPasswordMode === 'required') return PAIR_TOKEN_NO_EXPIRY_MS
    return now + this.options.pairTokenTtlMs
  }

  private isPairExpired(record: PairTokenRecord): boolean {
    if (record.expiresAt === PAIR_TOKEN_NO_EXPIRY_MS) return false
    return record.expiresAt <= Date.now()
  }

  private resolveOfferAuthority(fallbackHost: string, _fallbackPort: number): { host: string; port: number } {
    if (this.mobilePublicBaseUrl === '') {
      return { host: fallbackHost, port: MOBILE_PWA_PORT }
    }
    try {
      const url = new URL(this.mobilePublicBaseUrl)
      const port = url.port !== ''
        ? Number(url.port)
        : (url.protocol === 'https:' ? 443 : 80)
      return { host: url.hostname, port }
    } catch {
      return { host: fallbackHost, port: MOBILE_PWA_PORT }
    }
  }

  private formatQrUrl(host: string, _port: number, pairToken: string, record: PairTokenRecord): string {
    const passwordFlag = this.pairPasswordMode === 'required' ? '&p=1' : ''
    const expiresUnix = record.expiresAt === PAIR_TOKEN_NO_EXPIRY_MS
      ? 0
      : Math.floor(record.expiresAt / 1000)
    const query = `t=${pairToken}&e=${String(expiresUnix)}&f=${this.options.fingerprint}${passwordFlag}`
    if (this.mobilePublicBaseUrl !== '') {
      return `${this.mobilePublicBaseUrl}/mobile/pair?${query}`
    }
    return `${this.options.publicScheme}://${host}:${String(MOBILE_PWA_PORT)}/mobile/pair?${query}`
  }
}
