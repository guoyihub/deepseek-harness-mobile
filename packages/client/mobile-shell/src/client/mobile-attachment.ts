/** Session-authorized image URL cache for the mobile transcript. */

import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { MessageImageLoader } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment/types'
import type { EncodedImageAttachment } from '@deepseek-ai/dsh-attachment/types'
import type { Session } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts'
import { bytesToBase64 } from '@deepseek-ai/dsh-util-crypto'

const cache = new Map<string, string>()
const pending = new Map<string, Promise<string>>()

function cacheKey(sessionId: string, attachmentId: string): string {
  return `${sessionId}:${attachmentId}`
}

function releaseUrl(url: string): void {
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

/**
 * Build a loader that reads one Session attachment into a browser URL.
 * @param session - open Session, or undefined before open.
 * @returns loader with a synchronous peek of already-resolved URLs.
 */
export function createMobileImageLoader(session: Session | undefined): MessageImageLoader {
  const load = (async (attachment: ImageAttachmentRef): Promise<string> => {
    if (session === undefined) {
      throw new Error('mobile image loader: session is not open')
    }
    const key = cacheKey(session.sessionId, attachment.attachmentId)
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const inFlight = pending.get(key)
    if (inFlight !== undefined) return inFlight
    const task = session.readAttachment(attachment.attachmentId).then((result) => {
      pending.delete(key)
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
      let url: string
      if (typeof URL.createObjectURL !== 'function') {
        url = `data:${result.value.attachment.mediaType};base64,${bytesToBase64(result.value.data)}`
      } else {
        const bytes = Uint8Array.from(result.value.data)
        url = URL.createObjectURL(new Blob([bytes.buffer], { type: result.value.attachment.mediaType }))
      }
      const previous = cache.get(key)
      cache.set(key, url)
      if (previous !== undefined && previous !== url) releaseUrl(previous)
      return url
    }).catch((error: unknown) => {
      pending.delete(key)
      throw error
    })
    pending.set(key, task)
    return task
  }) as MessageImageLoader
  load.peek = (attachment: ImageAttachmentRef) => {
    if (session === undefined) return undefined
    return cache.get(cacheKey(session.sessionId, attachment.attachmentId))
  }
  return load
}

const IMAGE_TYPES = new Set<string>(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

/**
 * Encode one browser file as a prompt image attachment.
 * @param file - image chosen from the album or camera.
 * @returns wire attachment, or undefined when the type is unsupported.
 */
export async function encodeMobileImageFile(file: File): Promise<EncodedImageAttachment | undefined> {
  if (!IMAGE_TYPES.has(file.type)) return undefined
  const buffer = await file.arrayBuffer()
  return {
    mediaType: file.type as ImageMediaType,
    data: bytesToBase64(new Uint8Array(buffer)),
    ...(file.name === '' ? {} : { name: file.name }),
  }
}
