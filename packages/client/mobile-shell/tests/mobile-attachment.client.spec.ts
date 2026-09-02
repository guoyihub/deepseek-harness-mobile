import { describe, expect, it } from 'vitest'
import { encodeMobileImageFile } from '../src/client/mobile-attachment.ts'

describe('encodeMobileImageFile', () => {
  it('encodes a supported image as base64 attachment data', async () => {
    const file = new File([Uint8Array.from([1, 2, 3, 4])], 'shot.png', { type: 'image/png' })
    const encoded = await encodeMobileImageFile(file)
    expect(encoded).toEqual({
      mediaType: 'image/png',
      data: 'AQIDBA==',
      name: 'shot.png',
    })
  })

  it('rejects an unsupported media type', async () => {
    const file = new File([Uint8Array.from([1])], 'note.txt', { type: 'text/plain' })
    expect(await encodeMobileImageFile(file)).toBeUndefined()
  })
})
