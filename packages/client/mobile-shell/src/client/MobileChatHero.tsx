import { mobileConversationT } from './mobile-locale.ts'
import css from './mobile-shell.module.css'

/**
 * Blank-session greeting shown before the first prompt.
 */
export function MobileChatHero(): JSX.Element {
  return (
    <div className={css.chatHero}>
      <h2 className={css.chatHeroGreeting}>{mobileConversationT('hero.greeting')}</h2>
      <p className={css.chatHeroPromptLine}>{mobileConversationT('hero.promptLead')}</p>
      <p className={css.chatHeroPromptLine}>{mobileConversationT('hero.promptTail')}</p>
    </div>
  )
}
