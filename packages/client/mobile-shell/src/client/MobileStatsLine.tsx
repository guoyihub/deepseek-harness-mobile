import { Fragment, useState } from 'react'

import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import type { SessionStatsProjection } from '@deepseek-ai/dsh-session-stats/client'

import { buildStatsDetails, buildStatsGroups } from './mobile-stats-format.ts'

import { mobileConversationT } from './mobile-locale.ts'

import css from './mobile-shell.module.css'

/** Props for {@link MobileStatsLine}. */
export interface MobileStatsLineProps {
  tokenUsage: TokenUsageProjection | undefined
  sessionStats?: SessionStatsProjection | undefined
}

/**
 * Render cache hit and token totals on one line under the mobile composer.
 * Expand to duration and throughput details when the sessionStats projection is present.
 * @param props - token usage and optional whole-log stats.
 */
export function MobileStatsLine({ tokenUsage, sessionStats }: MobileStatsLineProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const groups = buildStatsGroups(tokenUsage, mobileConversationT)
  const details = buildStatsDetails(sessionStats, mobileConversationT)
  const line = groups.length > 0 ? groups.join(' | ') : undefined
  const expandable = details.length > 0

  return (
    <div className={css.statsBlock}>
      <button
        type="button"
        className={css.statsLine}
        aria-label={line}
        aria-hidden={line === undefined ? true : undefined}
        aria-expanded={expandable ? open : undefined}
        disabled={!expandable}
        onClick={() => { if (expandable) setOpen(value => !value) }}
      >
        {groups.map((group, groupIndex) => (
          <Fragment key={group}>
            {groupIndex > 0 && (
              <span className={css.statsSep} aria-hidden>|</span>
            )}
            <span>{group}</span>
          </Fragment>
        ))}
      </button>
      {open && details.length > 0 && (
        <div className={css.statsDetails} role="region" aria-label={mobileConversationT('stats.details')}>
          {details.map(group => (
            <div key={group}>{group}</div>
          ))}
        </div>
      )}
    </div>
  )
}
