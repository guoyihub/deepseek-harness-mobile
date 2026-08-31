/** Per-Session Conversation assembly over a Session event window. */

import {
  createSnapshotStore,
  type ObservableSnapshot,
  type SnapshotStore,
} from '@deepseek-ai/dsh-client-store'
import type {
  SessionEventSource,
  SessionEventWindow,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { ConversationPublication } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ConversationNodeAssembler } from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation/assembler.ts'
import type { ConversationEventRegistry } from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation/event-registry.ts'
import type { ConversationViewRegistry } from '@deepseek-ai/dsh-client-ui-conversation/src/client/conversation/view-registry.ts'

/** Observable Conversation fold bound to one Session event source. */
export interface MobileConversationBinding {
  readonly snapshot: ObservableSnapshot<ConversationSnapshot>
  dispose(): void
}

/**
 * Fold one Session event window into Conversation target snapshots.
 * @param feed - Session event source.
 * @param events - Chat/Trajectory event Definitions.
 * @param views - Chat/Trajectory view builders.
 */
export function bindMobileConversation(
  feed: SessionEventSource,
  events: ConversationEventRegistry,
  views: ConversationViewRegistry,
): MobileConversationBinding {
  return new BoundMobileConversation(feed, new ConversationNodeAssembler(events, views))
}

class BoundMobileConversation implements MobileConversationBinding {
  readonly snapshot: SnapshotStore<ConversationSnapshot>
  private revision = -1
  private frame: number | undefined
  private readonly disposeFeed: () => void

  constructor(
    feed: SessionEventSource,
    private readonly assembler: ConversationNodeAssembler,
  ) {
    this.snapshot = createSnapshotStore(this.currentSnapshot())
    this.replace(feed.getSnapshot())
    this.disposeFeed = feed.subscribe(() => {
      this.accept(feed.getSnapshot())
    })
  }

  dispose(): void {
    if (this.frame !== undefined && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.frame)
    }
    this.frame = undefined
    this.disposeFeed()
  }

  private replace(window: SessionEventWindow): void {
    this.revision = window.revision
    this.publish(this.assembler.replaceWindow(window.entries, window.hasMore))
  }

  private accept(window: SessionEventWindow): void {
    if (window.revision === this.revision) return
    if (window.revision !== this.revision + 1 || window.change.kind === 'replace') {
      this.replace(window)
      return
    }
    this.revision = window.revision
    switch (window.change.kind) {
      case 'prepend':
        this.publish(this.assembler.prepend(window.change.entries, window.hasMore))
        return
      case 'append': {
        let publication: ConversationPublication = 'none'
        for (const event of window.change.entries) {
          const next = this.assembler.append(event)
          if (next === 'immediate' || publication === 'none') publication = next
        }
        this.publish(publication)
      }
    }
  }

  private publish(publication: ConversationPublication): void {
    if (publication === 'none') return
    if (publication === 'animation-frame' && typeof requestAnimationFrame === 'function') {
      if (this.frame !== undefined) return
      this.frame = requestAnimationFrame(() => {
        this.frame = undefined
        this.flush()
      })
      return
    }
    this.flush()
  }

  private flush(): void {
    if (this.assembler.flush()) this.snapshot.set(this.currentSnapshot())
  }

  private currentSnapshot(): ConversationSnapshot {
    return {
      views: this.assembler,
      activeTargets: this.assembler.activeTargets(),
    }
  }
}
