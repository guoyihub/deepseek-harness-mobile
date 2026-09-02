/** Durable and preview images inside mobile chat bubbles. */

import { useEffect, useState } from 'react'
import type { MessageImagesOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './mobile-shell.module.css'

/**
 * Render one message's images using the Session attachment loader.
 * @param props - image sources, loader, and alignment.
 */
export function MobileMessageImages({
  images,
  loadImage,
  align,
}: MessageImagesOwnerProps): JSX.Element | null {
  if (images.length === 0) return null
  return (
    <div className={css.messageImages} data-align={align}>
      {images.map((source, index) => (
        'preview' in source
          ? (
            <img
              key={`preview:${source.preview.url}:${String(index)}`}
              className={css.messageImage}
              src={source.preview.url}
              alt={source.preview.name ?? ''}
            />
          )
          : (
            <MobileDurableImage
              key={source.attachment.attachmentId}
              attachmentId={source.attachment.attachmentId}
              name={source.attachment.name}
              load={() => loadImage(source.attachment)}
              peek={loadImage.peek?.(source.attachment)}
            />
          )
      ))}
    </div>
  )
}

function MobileDurableImage({
  attachmentId,
  name,
  load,
  peek,
}: {
  attachmentId: string
  name?: string | undefined
  load: () => Promise<string>
  peek: string | undefined
}): JSX.Element {
  const [url, setUrl] = useState(peek)
  useEffect(() => {
    if (url !== undefined) return
    let cancelled = false
    void load().then((next) => {
      if (!cancelled) setUrl(next)
    }).catch(() => {
      // Attachment read failed; the bubble still shows text.
    })
    return () => { cancelled = true }
  }, [attachmentId, load, url])
  if (url === undefined) {
    return <div className={css.messageImagePending} aria-hidden />
  }
  return <img className={css.messageImage} src={url} alt={name ?? ''} />
}
