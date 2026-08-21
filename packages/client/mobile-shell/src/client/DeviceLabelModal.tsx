import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link DeviceLabelModal}. */
export interface DeviceLabelModalProps {
  /** Current dialog visibility. */
  open: boolean
  /** Seed label when the dialog opens. */
  initialLabel: string
  /** Close without saving. */
  onClose: () => void
  /** Commit the trimmed device label. */
  onConfirm: (label: string) => void
}

/**
 * Device-name editor for the mobile connection settings sheet.
 * @param props - open state and callbacks.
 */
export function DeviceLabelModal({
  open,
  initialLabel,
  onClose,
  onConfirm,
}: DeviceLabelModalProps): JSX.Element {
  const [draft, setDraft] = useState(initialLabel)
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmed = draft.trim()
  const blocked = trimmed === ''

  useEffect(() => {
    if (!open) return
    setDraft(initialLabel)
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => { window.clearTimeout(timer) }
  }, [initialLabel, open])

  const submit = (): void => {
    if (blocked) return
    onConfirm(trimmed)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="设备名称"
      closeLabel="关闭"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={blocked} onClick={submit}>保存</Button>
        </>
      )}
    >
      <input
        ref={inputRef}
        className={css.mSetModalInput}
        type="text"
        value={draft}
        maxLength={64}
        aria-label="设备名称"
        onChange={(event) => { setDraft(event.target.value) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      />
    </Modal>
  )
}
