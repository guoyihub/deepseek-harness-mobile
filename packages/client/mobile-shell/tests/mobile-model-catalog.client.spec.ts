import { describe, expect, it } from 'vitest'
import type { ModelCatalog } from '@deepseek-ai/dsh-api-session-controller/types'
import {
  directoryFromModelCatalog,
  modelSelectionKey,
} from '../src/client/mobile-model-catalog.ts'

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

describe('directoryFromModelCatalog', () => {
  it('uses catalog.default as the current selection', () => {
    expect(directoryFromModelCatalog(catalog)).toEqual({
      current: catalog.default,
      groups: catalog.groups,
    })
  })

  it('tolerates a missing or malformed catalog payload', () => {
    expect(directoryFromModelCatalog(undefined)).toEqual({ current: null, groups: [] })
    expect(directoryFromModelCatalog({ groups: catalog.groups })).toEqual({
      current: null,
      groups: catalog.groups,
    })
    expect(directoryFromModelCatalog({} as Partial<ModelCatalog>)).toEqual({
      current: null,
      groups: [],
    })
  })
})

describe('modelSelectionKey', () => {
  it('omits incomplete selections', () => {
    expect(modelSelectionKey(null)).toBeUndefined()
    expect(modelSelectionKey(undefined)).toBeUndefined()
    expect(modelSelectionKey(catalog.default)).toBe('deepseek:deepseek-chat')
  })
})
