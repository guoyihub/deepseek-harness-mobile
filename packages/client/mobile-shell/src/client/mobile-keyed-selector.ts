/** Per-key snapshot selectors for Chat node seats on mobile. */

import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import type { KeyedSnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-ui-renderer/src/client/bind.ts'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'

/**
 * Bind one keyed resolver into a stable per-key uSES hook.
 * @param resolve - returns the observable snapshot for one Context key.
 */
export function bindKeyedSnapshotSelector<Value>(
  resolve: (key: string) => ObservableSnapshot<Value>,
): KeyedSnapshotSelectorHook<Value> {
  const hooks = new WeakMap<object, SnapshotSelectorHook<Value>>()
  return ((key: string, selector?: (value: Value) => unknown, equal?: (left: unknown, right: unknown) => boolean) => {
    const source = resolve(key)
    let useValue = hooks.get(source)
    if (useValue === undefined) {
      useValue = bindSnapshotSelector(source)
      hooks.set(source, useValue)
    }
    return useValue(selector ?? ((value: Value) => value), equal)
  }) as KeyedSnapshotSelectorHook<Value>
}
