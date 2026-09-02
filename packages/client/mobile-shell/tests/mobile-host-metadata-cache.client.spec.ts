import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'

const catalog: ModelCatalog = {
  default: { provider: 'deepseek', model: 'deepseek-chat' },
  routableProviders: ['deepseek'],
  groups: [{
    id: 'deepseek',
    name: 'DeepSeek',
    models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }],
  }],
  failures: [],
}

const modelCatalog = vi.fn(async () => ({ result: { ok: true as const, value: catalog } }))

vi.mock('../src/client/mobile-api-client.ts', () => ({
  mobileApi: {
    sessions: { modelCatalog },
    agentPresets: { list: vi.fn() },
    pluginInventory: { list: vi.fn() },
    settings: { describe: vi.fn() },
  },
}))

const generationListeners = new Set<() => void>()
let generation: { id: number; host: { home: string } } | undefined = { id: 3, host: { home: '/tmp' } }

vi.mock('../src/client/mobile-stream-runtime.ts', () => ({
  getConnectionGeneration: () => generation,
  subscribeConnectionGeneration: (listener: () => void) => {
    generationListeners.add(listener)
    return () => { generationListeners.delete(listener) }
  },
}))

function publishGeneration(next: typeof generation): void {
  generation = next
  for (const listener of [...generationListeners]) listener()
}

describe('mobile-host-metadata-cache', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    generation = { id: 3, host: { home: '/tmp' } }
    const cache = await import('../src/client/mobile-host-metadata-cache.ts')
    cache.clearMobileHostMetadataCache()
  })

  it('single-flights concurrent modelCatalog reads', async () => {
    const cache = await import('../src/client/mobile-host-metadata-cache.ts')
    const [first, second] = await Promise.all([
      cache.getMobileModelCatalog(),
      cache.getMobileModelCatalog(),
    ])
    expect(first).toBe(second)
    expect(modelCatalog).toHaveBeenCalledTimes(1)
  })

  it('drops cached metadata when the Connection generation changes', async () => {
    const cache = await import('../src/client/mobile-host-metadata-cache.ts')
    await cache.getMobileModelCatalog()
    publishGeneration({ id: 4, host: { home: '/tmp' } })
    await cache.getMobileModelCatalog()
    expect(modelCatalog).toHaveBeenCalledTimes(2)
  })
})
