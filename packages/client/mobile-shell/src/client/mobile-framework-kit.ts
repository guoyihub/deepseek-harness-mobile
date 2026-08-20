/** Framework session-kit stubs for mounting desktop slot components on mobile. */

import { useMemo, type ReactNode } from 'react'
import { createSnapshotStore, type UseProjection } from '@deepseek-ai/dsh-client-runtime/client'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import type { SessionAreaProps } from '@deepseek-ai/dsh-client-ui-slots'

/** Projection reader that always reads absent (mobile chrome seeds projections locally). */
export const absentProjection: UseProjection = ((
  _key: string,
  selector?: (value: undefined) => unknown,
) => (selector === undefined ? undefined : selector(undefined))) as UseProjection

const unusedInputStore = createSnapshotStore({
  draft: '',
  imageIds: [] as string[],
  draftRev: 0,
  phase: 'plain' as const,
  occurrences: [] as never[],
  queue: [] as never[],
})

/** Satisfy PropsRuntime SessionProvider without nesting a real session area. */
export function PassthroughSessionProvider(_props: SessionAreaProps): ReactNode {
  return null
}

/** Input machine stubs required by session-scope desktop components. */
export function useMobileInputKit(): {
  useInput: ReturnType<typeof bindSnapshotSelector>
  inputActions: {
    setDraft: () => void
    addImages: () => boolean
    removeImage: () => void
    pruneImages: () => void
    submit: () => void
  }
} {
  const useInput = useMemo(() => bindSnapshotSelector(unusedInputStore), [])
  const inputActions = useMemo(() => ({
    setDraft: () => {},
    addImages: () => true,
    removeImage: () => {},
    pruneImages: () => {},
    submit: () => {},
  }), [])
  return { useInput, inputActions }
}
