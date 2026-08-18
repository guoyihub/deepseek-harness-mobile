/**
 * Mobile composer claim for leadingInput slash commands (`/plan`, `/goal`).
 * Mirrors desktop `CommandClaim`: token stays in the field until submit.
 */

/** Active leadingInput claim in the mobile composer. */
export interface MobileComposerClaim {
  /** Slash name without `/`. */
  name: string
  /** Leading token including trailing space, e.g. `/plan `. */
  token: string
  /** Argument text after the token. */
  args: string
}

/**
 * Build a claim for a leadingInput catalog command.
 * @param name - slash command name without `/`.
 * @returns claim with empty args.
 */
export function beginMobileClaim(name: string): MobileComposerClaim {
  return { name, token: `/${name} `, args: '' }
}

/**
 * Full slash line submitted to `command.execute`.
 * @param claim - active claim.
 */
export function claimExecuteLine(claim: MobileComposerClaim): string {
  return `${claim.token}${claim.args}`.trimEnd()
}
