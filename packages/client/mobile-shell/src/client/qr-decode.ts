/** Decode QR payloads from image files or live camera frames. */

import jsQR from 'jsqr'

/**
 * Decode the first QR payload from raw image pixels.
 * @param image - canvas image data from a file or video frame.
 */
export function decodeQrFromImageData(image: ImageData): string | undefined {
  return jsQR(image.data, image.width, image.height)?.data
}

/**
 * Read one image file and decode the first QR payload.
 * @param file - image selected from the device gallery.
 * @returns decoded QR text, or undefined when no code is found.
 */
export async function decodeQrFromFile(file: File): Promise<string | undefined> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (context === null) return undefined
  context.drawImage(bitmap, 0, 0)
  return decodeQrFromImageData(context.getImageData(0, 0, canvas.width, canvas.height))
}

/**
 * Sample one video frame and decode the first QR payload.
 * @param video - live camera preview element with an active stream.
 */
export function decodeQrFromVideoFrame(video: HTMLVideoElement): string | undefined {
  if (video.videoWidth <= 0 || video.videoHeight <= 0) return undefined
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const context = canvas.getContext('2d')
  if (context === null) return undefined
  context.drawImage(video, 0, 0)
  return decodeQrFromImageData(context.getImageData(0, 0, canvas.width, canvas.height))
}
