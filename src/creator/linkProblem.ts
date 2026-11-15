// What's still missing before the link is worth sending, first problem only.
import type { Draft } from '../types'
import { cleanReply, draftToInvite } from '../lib/codec'
import { isPassed } from '../lib/hisPlan'
import { parseTime } from '../lib/when'

export function linkProblem(draft: Draft, now = new Date()): string | null {
  if (!draft.from.trim()) return 'Add your name to get a link.'
  // With email set up, the text-me backup is optional, so only flag a half-typed number.
  const backupEmpty = !draft.reply.value.trim()
  if (draft.reply.kind !== 'none' && !(draft.notify?.sig && backupEmpty) && cleanReply(draft.reply.kind, draft.reply.value).kind === 'none')
    return draft.reply.kind === 'sms' ? 'Add your full number so she can text you.' : 'Add your Instagram handle.'
  // Both kinds need a way for her answer to reach him.
  if (!draft.notify?.sig && draft.reply.kind === 'none') return 'Add your email (or a number) so you hear back.'
  if (!draft.to.trim()) return 'Add her name to get a link.'
  if (draft.areas.length === 0) return 'Turn on at least one area.'
  if (draft.kind === 'his-plan') {
    // A His-plan always has a day and time, so When must be on with at least one real time.
    const when = draft.categories.find((c) => c.kind === 'when')
    if (!when?.on || !when.options.some((o) => parseTime(o))) return 'Turn on When and add a time. She needs to know when.'
    const inv = draftToInvite(draft)
    if (!inv.plan) return 'Plan the date to get a link.'
    return isPassed(inv, now) ? 'Your date has passed. Plan a new day.' : null
  }
  if (!draft.categories.some((c) => c.on && c.options.length >= 2)) return 'Turn on a question with 2+ options.'
  return null
}
