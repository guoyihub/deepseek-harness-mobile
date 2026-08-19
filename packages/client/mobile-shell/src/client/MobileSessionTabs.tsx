import css from './mobile-shell.module.css'
import { mobileConversationT } from './mobile-locale.ts'

/** Active session body view. */
export type MobileSessionViewId = 'chat' | 'trajectory'

/** Props for {@link MobileSessionTabs}. */
export interface MobileSessionTabsProps {
  /** Selected tab. */
  active: MobileSessionViewId
  /** Switch the session body view. */
  onChange: (view: MobileSessionViewId) => void
}

const TABS: readonly { id: MobileSessionViewId; labelKey: string }[] = [
  { id: 'chat', labelKey: 'view.chat' },
  { id: 'trajectory', labelKey: 'view.trajectory' },
]

/**
 * Conversation / Trajectory tablist matching the desktop session header chrome.
 * @param props - active view and switch handler.
 */
export function MobileSessionTabs({ active, onChange }: MobileSessionTabsProps): JSX.Element {
  return (
    <div className={css.sessionTabs} role="tablist" aria-label={mobileConversationT('view.tabs')}>
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          className={tab.id === active ? `${css.sessionTab} ${css.sessionTabActive}` : css.sessionTab}
          onClick={() => { onChange(tab.id) }}
        >
          {mobileConversationT(tab.labelKey)}
        </button>
      ))}
    </div>
  )
}
