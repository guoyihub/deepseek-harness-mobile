import { useMemo } from 'react'

import type { SessionId } from '@deepseek-ai/dsh-client-connection/client'

import { Button, ConnectionBanner, FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'

import { useMobileConnection } from './MobileConnectionContext.tsx'

import { MobileShellLayout } from './MobileShellLayout.tsx'

import { formatSessionUpdatedAt, sessionDisplayTitle } from './session-label.ts'

import { StatusPanel } from './StatusPanel.tsx'

import css from './mobile-shell.module.css'



/** Props for {@link HomePage}. */

export interface HomePageProps {

  /** Navigate to the pairing flow. */

  onPair: () => void

  /** Open the full task list. */

  onOpenTasks: () => void

  /** Open one chat session. */

  onOpenChat: (sessionId: SessionId) => void

  /** Open connection management. */

  onOpenConnection: () => void

}



/**

 * Mobile home surface: greeting, connection status, and recent tasks.

 * @param props - navigation callbacks.

 */

export function HomePage({

  onPair,

  onOpenTasks,

  onOpenChat,

  onOpenConnection,

}: HomePageProps): JSX.Element {

  const {

    paired,

    hostBase,

    hostDescription,

    connectionState,

    sessions,

    sessionsLoading,

    error,

    revoked,

    refreshSessions,

  } = useMobileConnection()



  const recent = sessions.slice(0, 5)

  const presetBadge = useMemo(() => {

    if (hostDescription?.model !== undefined) return hostDescription.model

    if (hostDescription?.provider !== undefined) return hostDescription.provider

    return undefined

  }, [hostDescription])



  return (

    <>

      <ConnectionBanner reconnecting={connectionState === 'reconnecting'} />

      <MobileShellLayout

        title="MetaCode"

        subtitle={paired ? '已连接电脑' : '未连接'}

        fab={paired

          ? <Button variant="primary" onClick={() => { void refreshSessions() }}>刷新任务</Button>

          : undefined}

      >

        <section className={css.hero}>

          <FishLogo size={34} />

          {presetBadge !== undefined && (

            <span className={css.presetBadge}>{presetBadge}</span>

          )}

          <h1 className={css.heroTitle}>MetaCode 今天能帮你做什么？</h1>

          <p className={css.heroCopy}>

            {paired

              ? '在手机上继续桌面 Agent 任务，消息与桌面 Web 共用同一条会话日志。'

              : '扫码连接同一局域网内的 MetaCode 电脑，无需账号。'}

          </p>

          {!paired && (

            <Button variant="primary" onClick={onPair}>扫码连接电脑</Button>

          )}

          {paired && (

            <button type="button" className={css.connectionBar} onClick={onOpenConnection}>

              <span className={css.connectionDot} aria-hidden="true" />

              <span className={css.connectionMeta}>

                <span className={css.connectionHost}>

                  {hostDescription?.provider ?? 'MetaCode Host'}

                </span>

                <span className={css.connectionAddress}>{hostBase ?? '未知地址'}</span>

              </span>

            </button>

          )}

          <StatusPanel error={revoked ? '设备已被桌面吊销，请重新扫码' : error} />

        </section>



        <h2 className={css.sectionTitle}>最近任务</h2>

        {!paired && (

          <div className={css.emptyState}>连接后可见 Host 上的 Agent 任务</div>

        )}

        {paired && sessionsLoading && recent.length === 0 && (

          <div className={css.emptyState}>正在加载任务…</div>

        )}

        {paired && !sessionsLoading && recent.length === 0 && (

          <div className={css.emptyState}>暂无任务，前往全部任务新建一个</div>

        )}

        {paired && recent.length > 0 && (

          <ul className={css.taskList}>

            {recent.map(item => (

              <li key={item.sessionId}>

                <button type="button" className={css.taskItem} onClick={() => { onOpenChat(item.sessionId) }}>

                  <span className={css.taskTitle}>{sessionDisplayTitle(item)}</span>

                  <span className={css.taskMeta}>{formatSessionUpdatedAt(item.updatedAt)}</span>

                </button>

              </li>

            ))}

          </ul>

        )}

        {paired && (

          <div className={css.actionRow} style={{ marginTop: 16 }}>

            <Button variant="outline" onClick={onOpenTasks}>查看全部任务</Button>

            <Button variant="ghost" onClick={onOpenConnection}>连接管理</Button>

          </div>

        )}

      </MobileShellLayout>

    </>

  )

}
