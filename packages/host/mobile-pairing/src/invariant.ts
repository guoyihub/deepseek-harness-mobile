/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-host-mobile-pairing`.
 * @module @deepseek-ai/dsh-host-mobile-pairing/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-host-mobile-pairing'

/** Cordis companion plugin name. */
export const name = 'host-mobile-pairing-invariant'
/** Service required before the companion can register. */
export const inject = ['invariants']

/**
 * No runtime invariant: token lifecycle is request-scoped and the owned HTTP
 * routes are exercised by the package's host composition tests instead.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
