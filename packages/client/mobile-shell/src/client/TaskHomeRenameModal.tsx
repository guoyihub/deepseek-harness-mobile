import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeRenameModal}. */
export interface TaskHomeRenameModalProps {
  /** Current dialog visibility. */
  open: boolean
  /** Seed title when the dialog opens. */
  initialTitle: string
  /** Close without saving. */
  onClose: () => void
  /** Commit the trimmed title. */
  onConfirm: (title: string) => Promise<void>
}

/**
 * Session rename dialog for the mobile task home.
 * @param props - open state and callbacks.
 */
export function TaskHomeRenameModal({
  open,
  initialTitle,
  onClose,
  onConfirm,
}: TaskHomeRenameModalProps): JSX.Element {
  const [draft, setDraft] = useState(initialTitle)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const trimmed = draft.trim()
  const blocked = busy || trimmed === ''

  useEffect(() => {
    if (!open) return
    setDraft(initialTitle)
    setError(undefined)
    setBusy(false)
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => { window.clearTimeout(timer) }
  }, [initialTitle, open])

  const submit = (): void => {
    if (blocked) return
    setBusy(true)
    setError(undefined)
    void onConfirm(trimmed)
      .then(() => { onClose() })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : String(reason))
        setBusy(false)
      })
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onClose() }}
      title="重命名会话"
      closeLabel="关闭"
      footer={(
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={blocked} onClick={submit}>重命名</Button>
        </>
      )}
    >
      <input
        ref={inputRef}
        className={css.taskHomeRenameInput}
        type="text"
        value={draft}
        disabled={busy}
        aria-label="会话标题"
        onChange={(event) => {
          setDraft(event.target.value)
          setError(undefined)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      />
      {error !== undefined && (
        <div className={css.taskHomeRenameError} role="alert">{error}</div>
      )}
    </Modal>
  )
}
