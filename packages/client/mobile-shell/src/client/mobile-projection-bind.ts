/** Bind Session projection faces to the framework `useProjection` seat. */

import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ProjectionValueStore } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/projection-store.ts'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'

const absentFace = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}

/**
 * Keyed projection reader over one Session store, or absent when no Session is open.
 * @param store - Session projection store, when the Session object exists.
 * @returns `useProjection` for Chat chrome and desktop node views.
 */
export function bindMobileUseProjection(store: ProjectionValueStore | undefined): UseProjection {
  const hooks = new Map<string, ReturnType<typeof bindSnapshotSelector<unknown>>>()
  return ((
    key: string,
    selector?: (value: unknown) => unknown,
    eq?: (left: unknown, right: unknown) => boolean,
  ) => {
    let hook = hooks.get(key)
    if (hook === undefined) {
      hook = bindSnapshotSelector(store === undefined ? absentFace : store.faceOf(key))
      hooks.set(key, hook)
    }
    return selector === undefined ? hook(value => value) : hook(selector, eq)
  }) as UseProjection
}
