/**
 * @deepseek-ai/dsh-host-mobile-pairing — LAN mobile pairing without accounts:
 * pairToken mint/consume, sessionToken registry, and /api/mobile/* routes.
 * @module @deepseek-ai/dsh-host-mobile-pairing
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-host-webserver'
import MobilePairingService, { type MobilePairingConfig } from './service.ts'
import type { PublicScheme } from './types.ts'
import { DEFAULT_PAIR_TOKEN_TTL_MS } from './types.ts'

/** Stable Cordis plugin name. */
export const name = 'mobile-pairing'

/** Services required before pairing routes mount. */
export const inject = ['webServer']

/** Plugin config. */
export interface Config {
  /** Public URL scheme for QR payloads (`http` until Host TLS exists). */
  publicScheme?: PublicScheme
  /** Desktop confirmation policy for first-time devices. */
  confirmMode?: MobilePairingConfig['confirmMode']
  /** pairToken TTL in milliseconds. */
  pairTokenTtlMs?: number
  /** sessionToken TTL in milliseconds for no-password deployments. */
  sessionTokenTtlMs?: number
  /** Harness home for durable pairing state; defaults to `$DSH_HOME` or `~/.dsh`. */
  dshHome?: string
  /** Non-loopback authorities accepted by the /api trust fence. */
  trustedHosts?: string[]
}

export const Config: z<Config> = z.object({
  publicScheme: z.union([
    z.const('http'),
    z.const('https'),
  ]).default('http'),
  confirmMode: z.union([
    z.const('strict'),
    z.const('trusted-lan'),
    z.const('off'),
  ]).default('off'),
  pairTokenTtlMs: z.natural().min(60_000).default(DEFAULT_PAIR_TOKEN_TTL_MS),
  sessionTokenTtlMs: z.natural().min(3_600_000).default(DEFAULT_PAIR_TOKEN_TTL_MS),
  dshHome: z.string(),
  trustedHosts: z.array(String).default([]),
})

/**
 * Provide ctx.mobilePairing and mount /api/mobile/* routes.
 * @param ctx - Host plugin context.
 * @param config - resolved pairing policy and TTLs.
 */
export function apply(ctx: Context, config?: Config): void {
  const resolved: MobilePairingConfig = {
    publicScheme: config?.publicScheme ?? 'http',
    confirmMode: config?.confirmMode ?? 'off',
    pairTokenTtlMs: config?.pairTokenTtlMs ?? DEFAULT_PAIR_TOKEN_TTL_MS,
    sessionTokenTtlMs: config?.sessionTokenTtlMs ?? DEFAULT_PAIR_TOKEN_TTL_MS,
    ...(config?.dshHome !== undefined ? { dshHome: config.dshHome } : {}),
  }
  const trustedHosts = config?.trustedHosts ?? []
  const service = new MobilePairingService(ctx, resolved, trustedHosts)
  ctx.effect(
    () => service.mountRoutes(ctx.webServer.host, ctx.webServer.port),
    'mobile-pairing: /api/mobile routes',
  )
}

export { MobilePairingService } from './service.ts'
export type { ConfirmMode, DevicePairStatus, MobileScope, PairPasswordMode, PairPolicy, PairedDeviceView, PairingOffer, PairSuccess, SessionRecord } from './types.ts'
