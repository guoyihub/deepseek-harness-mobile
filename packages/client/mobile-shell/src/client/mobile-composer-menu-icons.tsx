import type { IconProps } from '@deepseek-ai/dsh-client-ui-primitives'

/** Camera outline glyph aligned with ui-primitives 16px filled icons. */
export function IconCameraOutline16({ size = 16, className }: IconProps): JSX.Element {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M6.375 2.125C6.375 1.64175 6.76675 1.25 7.25 1.25H8.75C9.23325 1.25 9.625 1.64175 9.625 2.125V3.375H6.375V2.125Z"
        fill="currentColor"
      />
      <path
        d="M4.625 4.375C3.72753 4.375 3 5.10253 3 6V11.375C3 12.2725 3.72753 13 4.625 13H11.375C12.2725 13 13 12.2725 13 11.375V6C13 5.10253 12.2725 4.375 11.375 4.375H10.375H5.625H4.625ZM4.625 5.625H11.375C11.444 5.625 11.5 5.681 11.5 5.75V11.375C11.5 11.444 11.444 11.5 11.375 11.5H4.625C4.556 11.5 4.5 11.444 4.5 11.375V5.75C4.5 5.681 4.556 5.625 4.625 5.625Z"
        fill="currentColor"
      />
      <path
        d="M8 7.125C9.29493 7.125 10.375 8.20507 10.375 9.5C10.375 10.7949 9.29493 11.875 8 11.875C6.70507 11.875 5.625 10.7949 5.625 9.5C5.625 8.20507 6.70507 7.125 8 7.125ZM8 8.375C7.39551 8.375 6.875 8.89551 6.875 9.5C6.875 10.1045 7.39551 10.625 8 10.625C8.60449 10.625 9.125 10.1045 9.125 9.5C9.125 8.89551 8.60449 8.375 8 8.375Z"
        fill="currentColor"
      />
    </svg>
  )
}
