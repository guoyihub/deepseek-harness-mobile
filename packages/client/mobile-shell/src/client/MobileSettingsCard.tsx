import { Children, isValidElement, type ReactNode } from 'react'
import css from './mobile-shell.module.css'

/** Props for {@link MobileSettingsCard}. */
export interface MobileSettingsCardProps {
  /** Settings rows and other card children. */
  children: ReactNode
}

/**
 * White grouped list card with inset dividers between rows.
 * @param props - row children.
 */
export function MobileSettingsCard({ children }: MobileSettingsCardProps): JSX.Element {
  const rows = Children.toArray(children).filter(isValidElement)
  return (
    <div className={css.mSetCard}>
      {rows.map((row, index) => (
        <div key={row.key ?? index} className={css.mSetCardItem}>
          {index > 0 && <div className={css.mSetDivider} aria-hidden="true" />}
          {row}
        </div>
      ))}
    </div>
  )
}
