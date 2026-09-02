// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AgentPresetIcon } from '../src/client/mobile-agent-preset-icon.tsx'

describe('AgentPresetIcon', () => {
  it('renders a distinct glyph for each built-in preset', () => {
    const markup = (presetId: string): string =>
      render(<AgentPresetIcon presetId={presetId} />).container.innerHTML

    const standard = markup('standard')
    const code = markup('code')
    const minimal = markup('minimal')
    const cordis = markup('cordis')
    const custom = markup('mine')

    expect(new Set([standard, code, minimal, cordis, custom]).size).toBe(5)
  })
})
