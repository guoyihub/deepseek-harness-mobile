/** Header alarm + bottom sheet of active Session schedules. */

import { useEffect, useMemo, useState } from 'react'
import type { ScheduleRecord } from '@deepseek-ai/dsh-schedule/client'
import { IconAlarmClockOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-schedule/src/client/index.ts'
import {
  formatScheduleFrequency,
  formatScheduleLocalTime,
  formatScheduleRelative,
  orderScheduleRecords,
} from '@deepseek-ai/dsh-client-ui-schedule/src/client/ScheduleCatalogAction.tsx'
import { zh as scheduleZh, en as scheduleEn, NS, type ScheduleCatalogKey } from '@deepseek-ai/dsh-client-ui-schedule/src/client/locales.ts'
import { useMobileLanguage } from './mobile-locale.ts'
import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

const EMPTY: readonly ScheduleRecord[] = []

/** Props for {@link MobileScheduleSheet}. */
export interface MobileScheduleSheetProps {
  records: readonly ScheduleRecord[] | undefined
}

function scheduleT(language: 'zh' | 'en', key: ScheduleCatalogKey, params?: Record<string, unknown>): string {
  const dict = language === 'en' ? scheduleEn : scheduleZh
  const template = dict[key]
  if (params === undefined) return template
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)),
    template,
  )
}

/**
 * Compact header alarm that opens a touch sheet of active reminders.
 * @param props - schedule projection records.
 */
export function MobileScheduleSheet({ records }: MobileScheduleSheetProps): JSX.Element | null {
  const language = useMobileLanguage()
  const t: TranslateNS<typeof NS> = (key, params) => scheduleT(language, key as ScheduleCatalogKey, params)
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const list = records ?? EMPTY
  const visible = list.length > 0
  const rows = useMemo(() => orderScheduleRecords(list, now), [list, now])

  useEffect(() => {
    if (!open) return
    setNow(Date.now())
    const timer = window.setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { window.clearInterval(timer) }
  }, [open])

  if (!visible) return null

  return (
    <>
      <button
        type="button"
        className={css.scheduleTrigger}
        aria-label={t(list.length === 1 ? 'trigger.one' : 'trigger.other', { count: list.length })}
        onClick={() => { setOpen(true) }}
      >
        <IconAlarmClockOutline16 size={16} />
        <span>{list.length}</span>
      </button>
      {open && (
        <div className={css.scheduleBackdrop} role="presentation" onClick={() => { setOpen(false) }}>
          <div
            className={css.scheduleSheet}
            role="dialog"
            aria-label={mobileConversationT('schedule.title')}
            onClick={(event) => { event.stopPropagation() }}
          >
            <div className={css.scheduleSheetHead}>
              <h2>{mobileConversationT('schedule.title')}</h2>
              <button type="button" onClick={() => { setOpen(false) }}>
                {mobileConversationT('common.close')}
              </button>
            </div>
            <ul className={css.scheduleList} aria-label={t('list.aria')}>
              {rows.map((record) => {
                const overdue = Date.parse(record.scheduledAt) <= now
                return (
                  <li key={record.id} className={overdue ? css.scheduleRowOverdue : css.scheduleRow}>
                    <div className={css.schedulePrompt}>{record.prompt}</div>
                    <div className={css.scheduleMeta}>
                      {formatScheduleFrequency(record, t)}
                      {' · '}
                      {formatScheduleLocalTime(record.scheduledAt, document.documentElement.lang)}
                      {' · '}
                      {formatScheduleRelative(record.scheduledAt, now, t)}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
