import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/invariant.ts'

describe('host-mobile-pairing invariant', () => {
  it('registers the package companion', async () => {
    const ctx = new Context()
    const registrations: string[] = []
    ctx.provide('invariants', {
      register(name: string) {
        registrations.push(name)
        return () => {
          registrations.splice(registrations.indexOf(name), 1)
        }
      },
    } as never)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(registrations).toContain('@deepseek-ai/dsh-host-mobile-pairing')
    await fiber.dispose()
  })
})
