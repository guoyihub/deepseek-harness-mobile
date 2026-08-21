/** Browser-local expand/collapse state for mobile task-home workspace groups. */

const STORAGE_KEY = 'dsh.mobile.taskHome.groupExpansion'

/** Read persisted group expansion flags; unknown keys fall back to defaults at resolve time. */
export function loadMobileGroupExpansion(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'boolean') out[key] = value
    }
    return out
  } catch {
    return {}
  }
}

/**
 * Persist one group expansion change and return the merged map.
 * @param current - prior persisted flags.
 * @param key - workspace group key or ungrouped bucket key.
 * @param expanded - next expanded state.
 */
export function saveMobileGroupExpansion(
  current: Record<string, boolean>,
  key: string,
  expanded: boolean,
): Record<string, boolean> {
  const next = { ...current, [key]: expanded }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* quota/private mode: keep in-memory state only */
  }
  return next
}

/**
 * Drop expansion entries for groups that no longer exist.
 * @param persisted - stored flags.
 * @param groupKeys - current derived group keys in render order.
 */
export function pruneMobileGroupExpansion(
  persisted: Record<string, boolean>,
  groupKeys: readonly string[],
): Record<string, boolean> {
  const retained = new Set(groupKeys)
  const next: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(persisted)) {
    if (retained.has(key)) next[key] = value
  }
  return next
}

/**
 * Resolve whether one group is expanded: persisted value wins; otherwise only the first group opens.
 * @param key - group key.
 * @param groupKeys - ordered group keys for the current list.
 * @param persisted - stored flags.
 */
export function isMobileGroupExpanded(
  key: string,
  groupKeys: readonly string[],
  persisted: Record<string, boolean>,
): boolean {
  if (key in persisted) return persisted[key] === true
  return key === groupKeys[0]
}

/**
 * Build the expanded-group key list consumed by {@link deriveGroups}.
 * @param groupKeys - ordered group keys for the current list.
 * @param persisted - stored flags.
 */
export function mobileExpandedGroupKeys(
  groupKeys: readonly string[],
  persisted: Record<string, boolean>,
): readonly string[] {
  return groupKeys.filter(key => isMobileGroupExpanded(key, groupKeys, persisted))
}
