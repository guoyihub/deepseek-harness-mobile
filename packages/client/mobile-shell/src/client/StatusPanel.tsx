import css from './mobile-shell.module.css'

/** Props for {@link StatusPanel}. */
export interface StatusPanelProps {
  /** Optional error message. */
  error?: string | undefined
  /** Optional neutral status message. */
  message?: string | undefined
}

/**
 * Shared status/error panel for mobile shell pages.
 * @param props - optional message lines.
 */
export function StatusPanel({ error, message }: StatusPanelProps): JSX.Element | null {
  if (error === undefined && message === undefined) return null
  return (
    <div className={css.statusPanel}>
      {message !== undefined && <p className={css.statusText}>{message}</p>}
      {error !== undefined && <p className={`${css.statusText} ${css.statusTextError}`}>{error}</p>}
    </div>
  )
}
