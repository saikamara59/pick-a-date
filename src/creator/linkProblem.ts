// What's still missing before the link is worth sending, first problem only.
import type { Draft } from '../types'
import { cleanReply, draftToInvite } from '../lib/codec'

export function linkProblem(draft: Draft): string | null {
  if (!draft.from.trim()) return 'Add your name to get a link.'
  // With email set up, the text-me backup is optional, so only flag a half-typed number.
  const backupEmpty = !draft.reply.value.trim()
  if (draft.reply.kind !== 'none' && !(draft.notify?.sig && backupEmpty) && cleanReply(draft.reply.kind, draft.reply.value).kind === 'none')
    return draft.reply.kind === 'sms' ? 'Add your full number so she can text you.' : 'Add your Instagram handle.'
  // Both kinds need a way for her answer to reach him.
  if (!draft.notify?.sig && draft.reply.kind === 'none') return 'Add your email (or a number) so you hear back.'
  if (!draft.to.trim()) return 'Add her name to get a link.'
  if (draft.areas.length === 0) return 'Turn on at least one area.'
  if (draft.kind === 'his-plan') return draftToInvite(draft).plan ? null : 'Plan the date to get a link.'
  if (!draft.categories.some((c) => c.on && c.options.length >= 2)) return 'Turn on a question with 2+ options.'
  return null
}
