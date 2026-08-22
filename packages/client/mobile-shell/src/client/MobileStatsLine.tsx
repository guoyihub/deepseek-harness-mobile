import { Fragment } from 'react'

import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'

import { buildStatsGroups } from './mobile-stats-format.ts'

import { mobileConversationT } from './mobile-locale.ts'

import css from './mobile-shell.module.css'

/** Props for {@link MobileStatsLine}. */
export interface MobileStatsLineProps {
  tokenUsage: TokenUsageProjection | undefined
}

/**
 * Render cache hit and token totals on one line under the mobile composer.
 * @param props - token usage projection.
 */
export function MobileStatsLine({ tokenUsage }: MobileStatsLineProps): JSX.Element | null {
  const groups = buildStatsGroups(tokenUsage, mobileConversationT)
  if (groups.length === 0) return null

  const line = groups.join(' | ')

  return (
    <div className={css.statsLine} aria-label={line}>
      {groups.map((group, groupIndex) => (
        <Fragment key={group}>
          {groupIndex > 0 && (
            <span className={css.statsSep} aria-hidden>|</span>
          )}
          <span>{group}</span>
        </Fragment>
      ))}
    </div>
  )
}
