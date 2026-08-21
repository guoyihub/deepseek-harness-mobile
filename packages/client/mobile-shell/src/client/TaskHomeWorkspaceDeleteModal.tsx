import { useEffect, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './mobile-shell.module.css'

/** Props for {@link TaskHomeWorkspaceDeleteModal}. */
export interface TaskHomeWorkspaceDeleteModalProps {
  /** Current dialog visibility. */
  open: boolean
  /** Workspace title shown in the confirmation copy. */
  workspaceTitle: string
  /** Close without deleting. */
  onClose: () => void
  /** Delete the workspace account. */
  onConfirm: () => Promise<void>
}

/**
 * Workspace delete confirmation for the mobile task home.
 * @param props - open state and callbacks.
 */
export function TaskHomeWorkspaceDeleteModal({
  open,
  workspaceTitle,
  onClose,
  onConfirm,
}: TaskHomeWorkspaceDeleteModalProps): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    setBusy(false)
    setError(undefined)
  }, [open, workspaceTitle])

  const submit = (): void => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    void onConfirm()
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
      title="删除分组"
      description={`确定删除「${workspaceTitle}」？会话不会被删除，仅移除该工作区分组。`}
      closeLabel="关闭"
      footer={(
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={busy} onClick={submit}>删除分组</Button>
        </>
      )}
    >
      {busy && (
        <div className={css.taskHomeRenameError} role="status">正在删除…</div>
      )}
      {error !== undefined && (
        <div className={css.taskHomeRenameError} role="alert">{error}</div>
      )}
    </Modal>
  )
}
