/** `question` namespace copy for the mobile composer takeover. */

import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// LocaleNamespaceMap merge for `question`.
import type {} from '@deepseek-ai/dsh-client-ui-user-questions/client'
import { zh } from '@deepseek-ai/dsh-client-ui-user-questions/src/client/locales.ts'

/** Shorter question-composer copy for narrow mobile screens. */
const MOBILE_QUESTION_OVERRIDES: Partial<Record<keyof typeof zh, string>> = {
  'error.incomplete': '请先完成这道题',
  'error.unanswered': '请选择或填写答案',
  'nav.minimize': '收起',
  'nav.maximize': '展开',
  'nav.cancel': '放弃',
  'custom.placeholder': '输入答案',
  'action.skip': '跳过',
}

/** Common vocabulary used by QuestionComposer but owned by dsh-client-locale. */
const MOBILE_COMMON_OVERRIDES: Record<string, string> = {
  submit: '提交',
  submitting: '正在提交…',
}

/** Mobile-facing question composer locale seat. */
export const mobileQuestionT: TranslateNS<'question'> = key => (
  MOBILE_QUESTION_OVERRIDES[key as keyof typeof zh]
  ?? zh[key as keyof typeof zh]
  ?? MOBILE_COMMON_OVERRIDES[key]
  ?? key
)
