import type { ReactNode } from 'react'
import { IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link MobileSettingsRow}. */
export interface MobileSettingsRowProps {
  /** Leading outline icon. */
  icon?: ReactNode
  /** Primary row label. */
  label: string
  /** Optional trailing value before the chevron. */
  value?: string | undefined
  /** Show the default trailing chevron. */
  showChevron?: boolean
  /** Destructive action styling. */
  destructive?: boolean
  /** Disable interaction. */
  disabled?: boolean
  /** Row tap handler. */
  onClick?: (() => void) | undefined
}

/**
 * One settings list row: icon, label, optional value, and chevron.
 * @param props - row content and interaction.
 */
export function MobileSettingsRow({
  icon,
  label,
  value,
  showChevron = true,
  destructive = false,
  disabled = false,
  onClick,
}: MobileSettingsRowProps): JSX.Element {
  const interactive = onClick !== undefined && !disabled
  const Tag = interactive ? 'button' : 'div'

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      className={css.mSetRow}
      data-destructive={destructive || undefined}
      disabled={interactive ? disabled : undefined}
      onClick={interactive ? onClick : undefined}
    >
      {icon !== undefined && (
        <span className={css.mSetRowIcon} aria-hidden="true">{icon}</span>
      )}
      <span className={css.mSetRowLabel}>{label}</span>
      {value !== undefined && value !== '' && (
        <span className={css.mSetRowValue}>{value}</span>
      )}
      {showChevron && (
        <IconChevronRightOutline14
          size={14}
          className={css.mSetRowChevron}
          aria-hidden
        />
      )}
    </Tag>
  )
}
