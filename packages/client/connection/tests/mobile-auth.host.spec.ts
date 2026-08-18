import { describe, expect, it } from 'vitest'
import {
  isMobileSessionAuthorized,
  parseAccessTokenFromUrl,
  parseBearerToken,
} from '../src/mobile-auth.ts'

describe('mobile-auth', () => {
  it('parses Bearer tokens and access_token query params', () => {
    expect(parseBearerToken({ authorization: 'Bearer abc.def' })).toBe('abc.def')
    expect(parseBearerToken({ authorization: 'Basic x' })).toBeUndefined()
    expect(parseAccessTokenFromUrl('/api/events.mux?access_token=secret')).toBe('secret')
  })

  it('accepts missing tokens and rejects invalid tokens when a validator is loaded', () => {
    const validator = { validateSessionToken: (token: string) => token === 'good' ? {} : undefined }
    expect(isMobileSessionAuthorized(validator, undefined)).toBe(true)
    expect(isMobileSessionAuthorized(validator, 'good')).toBe(true)
    expect(isMobileSessionAuthorized(validator, 'bad')).toBe(false)
    expect(isMobileSessionAuthorized(undefined, 'any')).toBe(false)
  })
})
