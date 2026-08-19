import { useMemo } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createTrajectoryDurationStore } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/duration-store.ts'
import { TrajectoryView } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/TrajectoryView.tsx'
import { zh as trajectoryZh } from '@deepseek-ai/dsh-client-ui-trajectory/src/client/locales.ts'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-web-react'
import { useMobileSession } from './useMobileSession.ts'
import css from './mobile-shell.module.css'

const durationStore = createTrajectoryDurationStore()
const unusedInputStore = createSnapshotStore({
  draft: '',
  imageIds: [] as string[],
  draftRev: 0,
  phase: 'plain' as const,
  occurrences: [] as never[],
  queue: [] as never[],
})

function trajectoryT(key: string, params?: Record<string, unknown>): string {
  const template = (trajectoryZh as Record<string, string>)[key] ?? key
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}

/** Props for {@link MobileTrajectoryPane}. */
export interface MobileTrajectoryPaneProps {
  /** Active Host session. */
  sessionId: SessionId
}

/**
 * Mobile host for the desktop TrajectoryView (toolbar, timeline, ledger).
 * @param props - session id.
 */
export function MobileTrajectoryPane({ sessionId }: MobileTrajectoryPaneProps): JSX.Element {
  const { ready, error, useSession, useProjection, loadOlder } = useMobileSession(sessionId)
  const useDuration = useMemo(() => bindSnapshotSelector(durationStore), [])
  const useInput = useMemo(() => bindSnapshotSelector(unusedInputStore), [])
  const inputActions = useMemo(() => ({
    setDraft: () => {},
    addImages: () => true,
    removeImage: () => {},
    pruneImages: () => {},
    submit: () => {},
  }), [])

  if (!ready) {
    return <div className={css.trajectoryPaneStatus} role="status">正在加载轨迹…</div>
  }
  if (error !== undefined) {
    return <div className={css.trajectoryPaneStatus} role="alert">{error}</div>
  }

  const view = (
    <TrajectoryView
      sessionId={sessionId}
      useSession={useSession}
      useProjection={useProjection}
      useInput={useInput as never}
      inputActions={inputActions as never}
      useSessions={(() => undefined) as never}
      useWorkspaces={(() => undefined) as never}
      useDuration={useDuration}
      loadOlder={loadOlder}
      setActualDuration={(value) => { durationStore.set(value) }}
      inspect={null}
      t={trajectoryT}
    />
  )

  return (
    <div className={css.trajectoryPane}>
      {view}
    </div>
  )
}
