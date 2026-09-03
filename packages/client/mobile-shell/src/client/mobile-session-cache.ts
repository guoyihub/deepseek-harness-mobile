/** Warm Session + Conversation binding cache keyed by Connection generation. */

import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { Session } from '@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts'
import { createChatStore } from '@deepseek-ai/dsh-client-ui-chat/src/client/stores.ts'
import { getMobileConversationRuntime } from './mobile-conversation-runtime.ts'
import {
  bindMobileConversation,
  type MobileConversationBinding,
} from './mobile-conversation-binding.ts'
import {
  getConnectionGeneration,
  mobileSessionRemotes,
  subscribeConnectionGeneration,
} from './mobile-stream-runtime.ts'

const MAX_ENTRIES = 8

type MobileChatStore = ReturnType<ReturnType<typeof createChatStore>['create']>

interface MobileSessionEntry {
  session: Session
  binding: MobileConversationBinding | undefined
  chatStore: MobileChatStore
  generationId: number
  pinCount: number
  lastUsed: number
}

const entries = new Map<SessionId, MobileSessionEntry>()

let generationSubscribed = false
let trackedGenerationId = -1

function touchEntry(entry: MobileSessionEntry): void {
  entry.lastUsed = Date.now()
}

function disposeEntryBinding(entry: MobileSessionEntry): void {
  entry.binding?.dispose()
  entry.binding = undefined
}

function ensureGenerationSubscription(): void {
  if (generationSubscribed) return
  generationSubscribed = true
  subscribeConnectionGeneration(() => {
    const generation = getConnectionGeneration()
    if (generation === undefined) {
      clearMobileSessionCache()
      return
    }
    if (generation.id === trackedGenerationId) return
    trackedGenerationId = generation.id
    void resyncOpenEntries(generation.id)
  })
}

async function resyncOpenEntries(generationId: number): Promise<void> {
  for (const entry of entries.values()) {
    if (entry.generationId === generationId) continue
    entry.generationId = generationId
    disposeEntryBinding(entry)
    if (entry.pinCount === 0 && entry.session.getSnapshot().openState !== 'open') continue
    try {
      if (entry.session.getSnapshot().openState === 'open') {
        await entry.session.resync()
      }
      if (entry.pinCount > 0) {
        const runtime = await getMobileConversationRuntime()
        entry.binding = bindMobileConversation(
          entry.session.eventSource,
          runtime.events,
          runtime.views,
        )
      }
    } catch {
      // The next acquire/open retries after resync failure.
    }
  }
}

function evictIfNeeded(exceptSessionId?: SessionId): void {
  if (entries.size <= MAX_ENTRIES) return
  const candidates = [...entries.entries()]
    .filter(([id, entry]) => id !== exceptSessionId && entry.pinCount === 0)
    .sort((left, right) => left[1].lastUsed - right[1].lastUsed)
  while (entries.size > MAX_ENTRIES && candidates.length > 0) {
    const victim = candidates.shift()
    if (victim === undefined) break
    const [sessionId, entry] = victim
    disposeEntryBinding(entry)
    void entry.session.dispose()
    entries.delete(sessionId)
  }
}

function syncTrackedGeneration(): number {
  const generation = getConnectionGeneration()
  const nextId = generation?.id ?? 0
  if (trackedGenerationId !== nextId && generation !== undefined) {
    trackedGenerationId = nextId
  }
  return nextId
}

/** Bound Session + Conversation fold retained across ChatPage remounts. */
export interface AcquiredMobileSession {
  readonly session: Session
  readonly binding: MobileConversationBinding
}

/**
 * Pin one Session entry and ensure a live Conversation binding exists.
 * @param sessionId - Host session id.
 */
export async function acquireMobileSession(sessionId: SessionId): Promise<AcquiredMobileSession> {
  ensureGenerationSubscription()
  const generationId = syncTrackedGeneration()
  let entry = entries.get(sessionId)
  if (entry === undefined) {
    entry = {
      session: new Session(sessionId, mobileSessionRemotes),
      binding: undefined,
      chatStore: createChatStore().create(sessionId),
      generationId,
      pinCount: 0,
      lastUsed: Date.now(),
    }
    entries.set(sessionId, entry)
  }
  entry.pinCount += 1
  touchEntry(entry)
  if (entry.generationId !== generationId) {
    entry.generationId = generationId
    disposeEntryBinding(entry)
    if (entry.session.getSnapshot().openState === 'open') {
      await entry.session.resync()
    }
  }
  if (entry.binding === undefined) {
    const runtime = await getMobileConversationRuntime()
    entry.binding = bindMobileConversation(
      entry.session.eventSource,
      runtime.events,
      runtime.views,
    )
  }
  evictIfNeeded(sessionId)
  return { session: entry.session, binding: entry.binding }
}

/**
 * Drop one ChatPage pin without disposing the warm binding.
 * @param sessionId - Host session id.
 */
export function releaseMobileSession(sessionId: SessionId): void {
  const entry = entries.get(sessionId)
  if (entry === undefined) return
  entry.pinCount = Math.max(0, entry.pinCount - 1)
  touchEntry(entry)
}

/** Read the cached Session without pinning it. */
export function getCachedMobileSession(sessionId: SessionId): Session | undefined {
  return entries.get(sessionId)?.session
}

/** Session-scoped Chat selection store (Turn-process fold state). */
export function getMobileSessionChatStore(sessionId: SessionId): MobileChatStore | undefined {
  return entries.get(sessionId)?.chatStore
}

/** Whether a cached Session is already open. */
export function sessionReadyFromCache(sessionId: SessionId): boolean {
  return entries.get(sessionId)?.session.getSnapshot().openState === 'open'
}

/** Remove one session entry after delete or archive. */
export function evictMobileSession(sessionId: SessionId): void {
  const entry = entries.get(sessionId)
  if (entry === undefined) return
  disposeEntryBinding(entry)
  void entry.session.dispose()
  entries.delete(sessionId)
}

/** Clear every cached Session on disconnect, auth failure, or generation loss. */
export function clearMobileSessionCache(): void {
  for (const entry of entries.values()) {
    disposeEntryBinding(entry)
    void entry.session.dispose()
  }
  entries.clear()
  trackedGenerationId = -1
}
