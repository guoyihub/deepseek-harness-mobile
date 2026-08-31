import { IconCheckOutline16, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MobileThemePreference } from './mobile-theme.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/** One selectable appearance option. */
export interface ThemePickerOption {
  /** Stored preference value. */
  id: MobileThemePreference
  /** User-visible label. */
  label: string
}

/** Props for {@link ThemePickerModal}. */
export interface ThemePickerModalProps {
  /** Current dialog visibility. */
  open: boolean
  /** Selected theme preference. */
  value: MobileThemePreference
  /** Close without changing selection. */
  onClose: () => void
  /** Select one theme preference. */
  onSelect: (value: MobileThemePreference) => void
  /** Available theme options. */
  options: readonly ThemePickerOption[]
}

/**
 * Appearance picker list for the mobile settings sheet.
 * @param props - open state, value, and options.
 */
export function ThemePickerModal({
  open,
  value,
  onClose,
  onSelect,
  options,
}: ThemePickerModalProps): JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title={mobileConversationT('settings.appearance')} closeLabel={mobileConversationT('common.close')}>
      <div className={css.mSetPickerList}>
        {options.map((option) => {
          const selected = option.id === value
          return (
            <button
              key={option.id}
              type="button"
              className={css.mSetPickerItem}
              data-selected={selected || undefined}
              onClick={() => {
                onSelect(option.id)
                onClose()
              }}
            >
              <span>{option.label}</span>
              {selected && <IconCheckOutline16 size={16} aria-hidden />}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
