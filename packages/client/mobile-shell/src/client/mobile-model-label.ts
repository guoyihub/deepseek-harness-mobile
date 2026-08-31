import type {
  ModelProviderGroup,
  ModelSelection,
} from '@deepseek-ai/dsh-api-session-controller/types'

/**
 * Resolve the user-visible label for one model selection against a provider catalog.
 * @param selection - current provider/model pair.
 * @param groups - advisory provider groups from `session.models`.
 * @returns display label, or a provider/model fallback when the catalog misses the pair.
 */
export function modelSelectionLabel(
  selection: ModelSelection | null,
  groups: readonly ModelProviderGroup[],
): string {
  if (selection === null) return '未设置'
  for (const group of groups) {
    if (group.id !== selection.provider) continue
    const model = group.models.find(item => item.id === selection.model)
    if (model === undefined) continue
    const effort = selection.reasoningEffort ?? model.reasoning?.defaultEffort
    const effortName = effort === undefined
      ? undefined
      : model.reasoning?.efforts.find(level => level.id === effort)?.name ?? effort
    return effortName === undefined ? model.name : `${model.name} ${effortName}`
  }
  return selection.model
}

/**
 * Resolve a display label from a bare model id when the full catalog is unavailable.
 * @param modelId - model id from `session/modelCatalog`.
 * @param groups - optional advisory provider groups.
 * @returns catalog name when found, otherwise the raw model id.
 */
export function modelIdLabel(
  modelId: string | undefined,
  groups: readonly ModelProviderGroup[] = [],
): string {
  if (modelId === undefined || modelId === '') return '未设置'
  for (const group of groups) {
    const model = group.models.find(item => item.id === modelId)
    if (model !== undefined) return model.name
  }
  return modelId
}
