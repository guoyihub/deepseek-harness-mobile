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
