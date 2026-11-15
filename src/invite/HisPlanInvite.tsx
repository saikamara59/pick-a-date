// The His-plan invite she opens: intro → his plan as a ticket → I'm in / Different time / Can't make it.
// Each answer emails him right away. Her phone remembers her last answer for this invite.
import { useMemo, useState } from 'react'
import type { HisPlan, Invite } from '../types'
import { planWhen } from '../lib/codec'
import {
  herCalendarLocation,
  herPlanLines,
  herReplyMessage,
  herRows,
  isPassed,
  loadHerAnswer,
  saveHerAnswer,
  type HerResponse,
} from '../lib/hisPlan'
import { sendHerAnswer } from '../lib/notify'
import { copyText, replyHref } from '../lib/share'
import { buildIcs, formatWhen, googleCalendarUrl, whenToDate } from '../lib/when'
import { ArrowRight, Chat, Grain } from '../components/ui'
import { PlanTicket } from './PlanTicket'
import { IntroScreen, WhenStep } from './screens'

type Screen = 'intro' | 'plan' | 'counter' | 'sent' | 'confirm-change'

function sentTitle(inv: Invite, r: HerResponse): { kicker: string; title: string } {
  if (r.kind === 'in') return { kicker: 'You’re in', title: `See you ${formatWhen(planWhen(inv) ?? '')}.` }
  if (r.kind === 'counter') return { kicker: 'New time sent', title: `You asked for ${formatWhen(r.when)}.` }
  return { kicker: 'All good', title: 'You said not this time.' }
}

export function HisPlanInvite({ inv, code, serial }: { inv: Invite & { plan: HisPlan }; code: string; serial: string }) {
  const [answer, setAnswer] = useState<HerResponse | null>(() => loadHerAnswer(code))
  const [screen, setScreen] = useState<Screen>(() => (answer ? 'sent' : 'intro'))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [changing, setChanging] = useState(false)
  /** The answer she last tried to send, so a failed send can fall back to texting him that answer */
  const [tried, setTried] = useState<HerResponse | null>(null)
  const passed = isPassed(inv)
  const rows = useMemo(() => herRows(inv), [inv])
  const whenCat = inv.categories.find((c) => c.kind === 'when')!

  const go = (s: Screen) => {
    setScreen(s)
    setError('')
    window.scrollTo(0, 0)
  }

  /** The tap is the answer: send it now. Without his email, it's saved and she texts him instead. */
  const answerWith = async (r: HerResponse) => {
    setSending(true)
    setError('')
    setTried(r)
    try {
      if (inv.notify) await sendHerAnswer(code, r, !!answer, answer?.kind)
      saveHerAnswer(code, r)
      setAnswer(r)
      setChanging(false)
      go('sent')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const textHim = (r: HerResponse) => {
    const href = replyHref(inv, herReplyMessage(inv, r))
    if (!href) return null
    return (
      <a
        className="btn btn-s wide"
        href={href}
        target={inv.reply.kind === 'ig' ? '_blank' : undefined}
        rel="noreferrer"
        onClick={() => {
          // Instagram can't prefill a DM, so put the message on her clipboard first.
          if (inv.reply.kind === 'ig') void copyText(herReplyMessage(inv, r))
        }}
      >
        <Chat />
        {inv.reply.kind === 'ig' ? `DM ${inv.from}` : `Text ${inv.from}`}
      </a>
    )
  }

  const errorLine = error && (
    <p className="fine err" role="alert">
      {error}
    </p>
  )

  if (screen === 'intro') {
    return (
      <IntroScreen
        inv={inv}
        serial={serial}
        stepCount={0}
        startLabel="See the plan"
        onStart={() => go('plan')}
        onDecline={() => go('plan')}
      />
    )
  }

  if (screen === 'counter') {
    return (
      <>
        {error && (
          <div className="pad">
            {errorLine}
            {tried && textHim(tried)}
          </div>
        )}
        <WhenStep
        nav={{ index: 0, total: 1, onBack: () => go(answer && !changing ? 'sent' : 'plan') }}
        cat={{ ...whenCat, question: 'When works better?' }}
        disabledValue={planWhen(inv)}
        nextLabel={sending ? 'Sending…' : `Send to ${inv.from}`}
        onPick={(when) => void answerWith({ kind: 'counter', when })}
        />
      </>
    )
  }

  if (screen === 'confirm-change') {
    return (
      <section className="screen">
        <Grain />
        <div className="center-body">
          <h1 className="big-2">Change your answer?</h1>
          <p className="sub-2">{inv.notify ? `${inv.from} gets another email.` : `You’ll want to text ${inv.from} the new answer.`}</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-p wide"
            onClick={() => {
              setChanging(true)
              go('plan')
            }}
          >
            Yes, change it
          </button>
          <button type="button" className="btn btn-t" onClick={() => go('sent')}>
            Keep it
          </button>
        </div>
      </section>
    )
  }

  if (screen === 'sent' && answer) {
    const t = sentTitle(inv, answer)
    const when = answer.kind === 'counter' ? answer.when : answer.kind === 'in' ? planWhen(inv) : undefined
    const cal = when
      ? (() => {
          const event = {
            uid: `${serial}-his-plan@pick-a-date`,
            title: `Date with ${inv.from}`,
            start: whenToDate(when),
            hours: 3,
            location: herCalendarLocation(inv),
            details: herPlanLines(inv).join('\n'),
          }
          return { google: googleCalendarUrl(event), ics: URL.createObjectURL(new Blob([buildIcs(event)], { type: 'text/calendar' })) }
        })()
      : null
    return (
      <section className="screen">
        <Grain />
        <div className="ticket-head">
          <span className="lbl kicker">{t.kicker}</span>
          <h1 className="plan-title">{t.title}</h1>
          {inv.notify && <p className="sub-2">{inv.from}’s got your answer.</p>}
        </div>
        {answer.kind !== 'decline' && <PlanTicket inv={inv} rows={rows} serial={serial} />}
        <div className="actions">
          {cal && (
            <div className="actions-row">
              <a className="btn btn-p" style={{ flex: 1 }} href={cal.google} target="_blank" rel="noreferrer">
                Add to my calendar
              </a>
              <a className="btn btn-s" style={{ padding: '0 20px' }} href={cal.ics} download="date.ics">
                .ics
              </a>
            </div>
          )}
          {textHim(answer)}
          <button type="button" className="btn btn-t" onClick={() => go('confirm-change')}>
            Change answer
          </button>
        </div>
      </section>
    )
  }

  // 'plan': his plan, and her answer
  return (
    <section className="screen">
      <Grain />
      <div className="ticket-head">
        <span className="lbl kicker">{passed ? 'That night’s gone' : `${inv.from} planned it`}</span>
        <h1 className="plan-title">{passed ? 'Pick another?' : 'Here’s the plan.'}</h1>
      </div>
      <PlanTicket inv={inv} rows={rows} serial={serial} stamp={passed ? 'NEW DATE?' : 'IT’S A DATE'} />
      <div className="actions">
        {!passed && (
          <button type="button" className="btn btn-p wide" disabled={sending} onClick={() => void answerWith({ kind: 'in' })}>
            {sending ? 'Sending…' : 'I’m in'}
            {!sending && <ArrowRight />}
          </button>
        )}
        <button type="button" className={`btn ${passed ? 'btn-p' : 'btn-s'} wide`} disabled={sending} onClick={() => go('counter')}>
          {passed ? 'Pick another time' : 'Different time'}
        </button>
        <button type="button" className="btn btn-t" disabled={sending} onClick={() => void answerWith({ kind: 'decline' })}>
          Can’t make it
        </button>
        {errorLine}
        {error && tried && textHim(tried)}
      </div>
    </section>
  )
}
