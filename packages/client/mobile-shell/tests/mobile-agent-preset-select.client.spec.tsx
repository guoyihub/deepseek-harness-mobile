// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { MobileAgentPresetSelect } from '../src/client/MobileAgentPresetSelect.tsx'

vi.mock('../src/client/mobile-host-metadata-cache.ts', () => ({
  getMobileAgentPresets: vi.fn(async () => ({
    presets: [
      { id: 'standard', trust: 'system', isDefault: true },
      { id: 'minimal', trust: 'system', isDefault: false },
      { id: 'broken', trust: 'user', broken: 'load failed' },
    ],
    authorable: false,
  })),
}))

const select = vi.hoisted(() => vi.fn(async () => ({
  result: { ok: true as const, value: 'minimal' },
})))

vi.mock('../src/client/mobile-api-client.ts', () => ({
  mobileApi: {
    agentPresets: { select },
  },
}))

describe('MobileAgentPresetSelect', () => {
  it('shows the current preset and applies a pick on a blank session', async () => {
    render(
      <MobileAgentPresetSelect
        sessionId={'sess-1' as SessionId}
        currentId="standard"
        locked={false}
      />,
    )
    expect(await screen.findByRole('button', { name: /标准模式/ })).toBeTruthy()

    await act(async () => {
      screen.getByRole('button', { name: /标准模式/ }).click()
    })
    const option = await screen.findByRole('menuitem', { name: '极简模式' })
    expect(screen.queryByRole('menuitem', { name: /broken/ })).toBeNull()

    await act(async () => {
      option.click()
    })
    expect(select).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      agentPreset: 'minimal',
    })
    expect(await screen.findByRole('button', { name: /极简模式/ })).toBeTruthy()
  })
})
