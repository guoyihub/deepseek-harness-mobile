/** Distance from the scroll floor within which stick-to-bottom and the FAB hide. */
export const MOBILE_MESSAGE_LIST_BOTTOM_THRESHOLD = 64

/**
 * Pixels between the scrollport floor and the latest content.
 * @param list - chat scrollport element.
 */
export function mobileMessageListDistanceFromBottom(list: HTMLElement): number {
  return list.scrollHeight - list.scrollTop - list.clientHeight
}

/**
 * Whether the reader is pinned near the latest transcript row.
 * @param list - chat scrollport element.
 * @param threshold - distance treated as at-bottom; defaults to {@link MOBILE_MESSAGE_LIST_BOTTOM_THRESHOLD}.
 */
export function isMobileMessageListAtBottom(
  list: HTMLElement,
  threshold = MOBILE_MESSAGE_LIST_BOTTOM_THRESHOLD,
): boolean {
  return mobileMessageListDistanceFromBottom(list) <= threshold
}

/**
 * Pin a mobile chat message list to its latest content after layout settles.
 * @param list - chat scrollport element.
 */
export function scrollMobileMessageListToBottom(list: HTMLDivElement): void {
  const apply = (): void => {
    list.scrollTop = list.scrollHeight
  }
  apply()
  requestAnimationFrame(() => {
    apply()
    requestAnimationFrame(apply)
  })
}
