import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link HostSettingsDesktopHintModal}. */
export interface HostSettingsDesktopHintModalProps {
  open: boolean
  title: string
  body: string
  onClose: () => void
}

/**
 * Explain that one Host settings section is edited on desktop Web only.
 * @param props - modal visibility, copy, and close handler.
 */
export function HostSettingsDesktopHintModal({
  open,
  title,
  body,
  onClose,
}: HostSettingsDesktopHintModalProps): JSX.Element {
  return (
    <Modal open={open} onClose={onClose} title={title} closeLabel="关闭">
      <p className={css.mSetDesktopHintBody}>{body}</p>
    </Modal>
  )
}
