import { describe, expect, it } from 'vitest'
import { findMobileCommand, isLeadingInputCommand } from '../src/client/mobile-command-catalog.ts'

describe('mobile command catalog', () => {
  it('treats feedback as leadingInput like the host command registry', () => {
    const feedback = findMobileCommand('feedback')
    expect(feedback).toMatchObject({ input: { hint: '<text>' } })
    expect(feedback !== undefined && isLeadingInputCommand(feedback)).toBe(true)
  })

  it('keeps compact as a bare execute command', () => {
    const compact = findMobileCommand('compact')
    expect(compact).toBeDefined()
    expect(compact !== undefined && isLeadingInputCommand(compact)).toBe(false)
  })
})
