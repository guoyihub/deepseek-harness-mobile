/** Host-scoped read-mostly RPC cache invalidated by Connection generation. */

import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'
import type { PluginInventorySnapshot } from '@deepseek-ai/dsh-api-remotes/client'
import { mobileApi } from './mobile-api-client.ts'
import {
  getConnectionGeneration,
  subscribeConnectionGeneration,
} from './mobile-stream-runtime.ts'

export interface MobileAgentPresetsSnapshot {
  readonly presets: readonly unknown[]
  readonly authorable: boolean
}

export interface MobileSettingsDescribeSnapshot {
  readonly namespaces: readonly {
    readonly ns: string
    readonly value: unknown
    readonly revision: number
  }[]
  readonly writable: boolean
}

let generationSubscribed = false
let cachedGenerationId = -1

let cachedModelCatalog: ModelCatalog | undefined
let modelCatalogInFlight: Promise<ModelCatalog> | undefined

let cachedAgentPresets: MobileAgentPresetsSnapshot | undefined
let agentPresetsInFlight: Promise<MobileAgentPresetsSnapshot> | undefined

let cachedPluginInventory: PluginInventorySnapshot | undefined
let pluginInventoryInFlight: Promise<PluginInventorySnapshot> | undefined

let cachedSettingsDescribe: MobileSettingsDescribeSnapshot | undefined
let settingsDescribeInFlight: Promise<MobileSettingsDescribeSnapshot> | undefined

function ensureGenerationSubscription(): void {
  if (generationSubscribed) return
  generationSubscribed = true
  subscribeConnectionGeneration(() => {
    const generation = getConnectionGeneration()
    if (generation === undefined || generation.id !== cachedGenerationId) {
      clearMobileHostMetadataCache()
      cachedGenerationId = generation?.id ?? -1
    }
  })
}

function syncGeneration(): void {
  ensureGenerationSubscription()
  const generation = getConnectionGeneration()
  const nextId = generation?.id ?? -1
  if (nextId === cachedGenerationId) return
  clearMobileHostMetadataCache()
  cachedGenerationId = nextId
}

/** Drop every cached Host metadata snapshot. */
export function clearMobileHostMetadataCache(): void {
  cachedModelCatalog = undefined
  modelCatalogInFlight = undefined
  cachedAgentPresets = undefined
  agentPresetsInFlight = undefined
  cachedPluginInventory = undefined
  pluginInventoryInFlight = undefined
  cachedSettingsDescribe = undefined
  settingsDescribeInFlight = undefined
}

/** Invalidate settings describe after a mobile settings mutation. */
export function invalidateMobileSettingsDescribe(): void {
  cachedSettingsDescribe = undefined
  settingsDescribeInFlight = undefined
}

/** Invalidate agent preset list after a deployment default change. */
export function invalidateMobileAgentPresets(): void {
  cachedAgentPresets = undefined
  agentPresetsInFlight = undefined
}

/**
 * Read the Host model catalog once per Connection generation.
 * @param signal - optional abort for in-flight callers.
 */
export async function getMobileModelCatalog(signal?: AbortSignal): Promise<ModelCatalog> {
  syncGeneration()
  if (cachedModelCatalog !== undefined) return cachedModelCatalog
  modelCatalogInFlight ??= mobileApi.sessions.modelCatalog(signal).then((response) => {
    modelCatalogInFlight = undefined
    if (!response.result.ok) throw new Error(response.result.error.message)
    cachedModelCatalog = response.result.value
    return response.result.value
  })
  return modelCatalogInFlight
}

/**
 * Read agent preset list once per Connection generation.
 * @param signal - optional abort for in-flight callers.
 */
export async function getMobileAgentPresets(
  signal?: AbortSignal,
): Promise<MobileAgentPresetsSnapshot> {
  syncGeneration()
  if (cachedAgentPresets !== undefined) return cachedAgentPresets
  agentPresetsInFlight ??= mobileApi.agentPresets.list({}, signal).then((response) => {
    agentPresetsInFlight = undefined
    if (!response.result.ok) throw new Error(response.result.error.message)
    cachedAgentPresets = response.result.value
    return response.result.value
  })
  return agentPresetsInFlight
}

/**
 * Read plugin inventory once per Connection generation.
 * @param signal - optional abort for in-flight callers.
 */
export async function getMobilePluginInventory(
  signal?: AbortSignal,
): Promise<PluginInventorySnapshot> {
  syncGeneration()
  if (cachedPluginInventory !== undefined) return cachedPluginInventory
  pluginInventoryInFlight ??= mobileApi.pluginInventory.list(signal).then((response) => {
    pluginInventoryInFlight = undefined
    if (!response.result.ok) throw new Error(response.result.error.message)
    cachedPluginInventory = response.result.value
    return response.result.value
  })
  return pluginInventoryInFlight
}

/**
 * Read settings describe once per Connection generation.
 * @param signal - optional abort for in-flight callers.
 */
export async function getMobileSettingsDescribe(
  signal?: AbortSignal,
): Promise<MobileSettingsDescribeSnapshot> {
  syncGeneration()
  if (cachedSettingsDescribe !== undefined) return cachedSettingsDescribe
  settingsDescribeInFlight ??= mobileApi.settings.describe(signal).then((response) => {
    settingsDescribeInFlight = undefined
    if (!response.result.ok) throw new Error(response.result.error.message)
    cachedSettingsDescribe = response.result.value
    return response.result.value
  })
  return settingsDescribeInFlight
}
