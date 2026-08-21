/** Cordis service exposing mobile pairing to Host plugins and HTTP routes. */

import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'
import { Context, Service } from '@deepseek-ai/cordis'
import type { ConfirmMode, PublicScheme, PairingOffer, SessionRecord } from './types.ts'
import {
  loadMobilePairingSnapshot,
  resolveMobilePairingPath,
  saveMobilePairingSnapshot,
} from './persistence.ts'
import { MobilePairingStore } from './store.ts'
import { registerMobileRoutes } from './routes.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Mobile LAN pairing token lifecycle and device registry. */
    mobilePairing: MobilePairingService
  }
}

/** Resolved plugin config. */
export interface MobilePairingConfig {
  /** Scheme for QR URLs; default `http` matches the M1 plain-HTTP webserver. */
  publicScheme?: PublicScheme
  /** Desktop confirmation policy for new devices. */
  confirmMode: ConfirmMode
  /** pairToken TTL in milliseconds. */
  pairTokenTtlMs: number
  /** sessionToken TTL in milliseconds for no-password deployments. */
  sessionTokenTtlMs: number
  /** Harness home used for durable pairing state. */
  dshHome?: string
}

/**
 * Host-side mobile pairing service.
 * Mint pairTokens for QR display, validate sessionTokens on /api traffic,
 * and manage pending desktop confirmations.
 */
export class MobilePairingService extends Service {
  private readonly store: MobilePairingStore
  private readonly persistencePath: string

  /**
   * @param ctx - owning plugin context.
   * @param config - confirmation mode and token TTLs.
   * @param trustedHosts - LAN authorities for route trust checks.
   */
  constructor(
    ctx: Context,
    config: MobilePairingConfig,
    private readonly trustedHosts: readonly string[],
  ) {
    super(ctx, 'mobilePairing')
    this.persistencePath = resolveMobilePairingPath(config.dshHome)
    const loaded = loadMobilePairingSnapshot(this.persistencePath)
    const fingerprint = loaded?.fingerprint ?? randomUUID().slice(0, 8)
    this.store = new MobilePairingStore({
      publicScheme: config.publicScheme ?? 'http',
      confirmMode: config.confirmMode,
      pairTokenTtlMs: config.pairTokenTtlMs,
      sessionTokenTtlMs: config.sessionTokenTtlMs,
      fingerprint,
      hostDisplayName: hostname(),
      onPersist: () => saveMobilePairingSnapshot(this.persistencePath, this.store.snapshot()),
    })
    if (loaded !== undefined) {
      this.store.hydrate(loaded)
    } else {
      void saveMobilePairingSnapshot(this.persistencePath, this.store.snapshot()).catch(() => {
        // Best-effort persistence: pairing stays live in memory when the home is unwritable.
      })
    }
  }

  /**
   * Mint or return the active QR pairing offer.
   * @param host - reachable host authority for the QR URL.
   * @param port - listen port.
   * @returns QR payload fields.
   */
  createPairing(host: string, port: number): PairingOffer {
    return this.store.createPairing(host, port)
  }

  /**
   * Validate an opaque mobile session token.
   * @param token - Bearer or WebSocket access_token value.
   * @returns the live session, or undefined when invalid.
   */
  validateSessionToken(token: string): SessionRecord | undefined {
    return this.store.validateSessionToken(token)
  }

  /** Pending devices awaiting desktop confirmation. */
  listPending(): ReturnType<MobilePairingStore['listPending']> {
    return this.store.listPending()
  }

  /** Registered paired devices for desktop management UI. */
  listDevices(): ReturnType<MobilePairingStore['listDevices']> {
    return this.store.listDevices()
  }

  /** Host instance fingerprint carried in QR payloads. */
  get fingerprint(): string {
    return this.store.fingerprint
  }

  /**
   * Register HTTP routes and bind to the webserver.
   * @param bindHost - configured listen host.
   * @param bindPort - configured listen port.
   * @returns route disposer.
   */
  mountRoutes(bindHost: string, bindPort: number): () => void {
    return registerMobileRoutes({
      store: this.store,
      trustedHosts: this.trustedHosts,
      bindHost,
      bindPort,
    }, route => this.ctx.webServer.register(route))
  }
}

export default MobilePairingService
