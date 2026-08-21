import css from './mobile-shell.module.css'

/** Props for {@link HostFingerprintBadge}. */
export interface HostFingerprintBadgeProps {
  /** Host instance fingerprint shown inside the badge. */
  fingerprint: string
  /** Whether this Host is the active or reconnecting target. */
  active?: boolean
  /** Compact size for list rows. */
  compact?: boolean
}

/**
 * Stylized fingerprint badge for saved Host identity.
 * @param props - fingerprint text and visual state.
 */
export function HostFingerprintBadge({
  fingerprint,
  active = false,
  compact = false,
}: HostFingerprintBadgeProps): JSX.Element {
  const label = fingerprint.trim().toUpperCase()
  return (
    <div
      className={css.fingerprintBadge}
      data-active={active || undefined}
      data-compact={compact || undefined}
      aria-hidden="true"
    >
      <svg className={css.fingerprintGlyph} viewBox="0 0 64 64" focusable="false">
        <path d="M32 8c-8.8 0-16 7.2-16 16 0 2.2.5 4.3 1.3 6.2" />
        <path d="M32 8c8.8 0 16 7.2 16 16 0 2.2-.5 4.3-1.3 6.2" />
        <path d="M16 24c0 8.8 7.2 16 16 16" />
        <path d="M48 24c0 8.8-7.2 16-16 16" />
        <path d="M20 34c2.8 6.2 8.8 10 12 10s9.2-3.8 12-10" />
        <path d="M24 42c1.8 4.2 5.2 7 8 7s6.2-2.8 8-7" />
        <path d="M32 49v7" />
        <path d="M24 18c-1.2 2.4-2 5-2 8" />
        <path d="M40 18c1.2 2.4 2 5 2 8" />
      </svg>
      {active && <span className={css.fingerprintScan} />}
      <span className={css.fingerprintCode}>{label}</span>
    </div>
  )
}
