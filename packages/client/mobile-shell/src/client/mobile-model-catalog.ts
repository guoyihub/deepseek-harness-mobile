import type {
  ModelCatalog,
  ModelProviderGroup,
  ModelSelection,
} from '@deepseek-ai/dsh-api-session-controller/types'

/** Session picker state derived from the Host-generation catalog. */
export interface MobileModelDirectory {
  current: ModelSelection | null
  groups: readonly ModelProviderGroup[]
}

function isModelSelection(value: unknown): value is ModelSelection {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.provider === 'string' && typeof record.model === 'string'
}

/**
 * Map `session/modelCatalog` onto the mobile picker directory.
 * The Host catalog names the deployment default `default`, not `current`.
 * @param catalog - Host-generation catalog, or a partial/malformed payload.
 */
export function directoryFromModelCatalog(
  catalog: ModelCatalog | Partial<ModelCatalog> | null | undefined,
): MobileModelDirectory {
  const groups = Array.isArray(catalog?.groups) ? catalog.groups : []
  const current = isModelSelection(catalog?.default) ? catalog.default : null
  return { current, groups }
}

/**
 * Stable menu row id for one selection, when the pair is complete.
 * @param selection - current or default model pair.
 */
export function modelSelectionKey(
  selection: ModelSelection | null | undefined,
): string | undefined {
  if (!isModelSelection(selection)) return undefined
  return `${selection.provider}:${selection.model}`
}
