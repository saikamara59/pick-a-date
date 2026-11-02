// The creator: he builds an invite and gets a link. The draft is saved in this browser.
import { useEffect, useMemo, useState } from 'react'
import type { Draft, ReplyKind, ThemeId } from '../types'
import { AREAS, type AreaId } from '../lib/areas'
import { defaultDraft, isSurprise, SPOT_CATEGORY_IDS } from '../lib/presets'
import { cleanReply, draftToInvite, encodeInvite, inviteUrl, serialFor } from '../lib/codec'
import { createShortLink, copyAsync } from '../lib/shortlink'
import { buildSteps } from '../invite/Invite'
import { IntroScreen } from '../invite/screens'
import { CopyIcon, Cross, Eye, LinkIcon, Plus, TicketLogo, Toggle } from '../components/ui'
import { NotifyField } from './NotifyField'

const STORAGE_KEY = 'pick-a-date:draft'
/** Bump when default options change, so saved drafts pick up new presets once. */
const PRESETS_VERSION = 5
const VERSION_KEY = 'pick-a-date:presets'
const LEGACY_THEMES: Record<string, ThemeId> = { cherry: 'riso', plum: 'stationery', midnight: 'night' }

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = { ...defaultDraft(), ...(JSON.parse(raw) as Partial<Draft>) }
      saved.theme = LEGACY_THEMES[saved.theme] ?? saved.theme
      const savedVersion = Number(localStorage.getItem(VERSION_KEY) ?? 1)
      if (savedVersion < 4) {
        // "When" became a real day + time picker.
        const when = defaultDraft().categories.find((c) => c.id === 'when')!
        saved.categories = saved.categories.map((c) => (c.id === 'when' ? { ...when, on: c.on } : c))
      }
      if (savedVersion < 5) {
        // Queens and The Bronx were added; turn them on alongside his other areas.
        saved.areas = AREAS.map((a) => a.id).filter((id) => saved.areas.includes(id) || id === 'queens' || id === 'bronx')
      }
      if (savedVersion < PRESETS_VERSION) {
        // Add new default options to his saved questions, keeping his edits.
        // "Surprise me" stays last; the list is capped at 12.
        const defaults = defaultDraft().categories
        saved.categories = saved.categories.map((c) => {
          const def = defaults.find((d) => d.id === c.id)
          if (!def) return c
          const extra = def.options.filter((o) => !c.options.some((x) => x.toLowerCase() === o.toLowerCase()))
          const all = [...c.options, ...extra]
          const surprise = all.filter(isSurprise)
          const rest = all.filter((o) => !isSurprise(o))
          return { ...c, options: [...rest.slice(0, 12 - surprise.length), ...surprise].slice(0, 12) }
        })
      }
      return saved
    }
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return defaultDraft()
}

const THEMES: { id: ThemeId; name: string; note: string; bg: string; dot: string; ring?: string }[] = [
  { id: 'riso', name: 'Riso', note: 'printed poster', bg: '#F6F3EE', dot: '#FF4F9E', ring: '#CFC9DA' },
  { id: 'stationery', name: 'Stationery', note: 'letterpress card', bg: '#FCFBF9', dot: '#4A1420', ring: '#E5D6D6' },
  { id: 'night', name: 'Late Night', note: 'dark, soft glow', bg: '#121015', dot: '#FF7FA8' },
]

const REPLY: { id: ReplyKind; label: string }[] = [
  { id: 'sms', label: 'Text' },
  { id: 'ig', label: 'Instagram' },
  { id: 'none', label: 'None' },
]

export function Creator() {
  const [draft, setDraft] = useState<Draft>(loadDraft)
  const [copied, setCopied] = useState(false)
  const [short, setShort] = useState<{ code: string; url: string } | null>(null)
  const [linkNote, setLinkNote] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [newOption, setNewOption] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      localStorage.setItem(VERSION_KEY, String(PRESETS_VERSION))
    } catch {
      /* not fatal */
    }
  }, [draft])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setCat = (id: string, patch: Partial<Draft['categories'][number]>) =>
    setDraft((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))

  const invite = useMemo(() => draftToInvite(draft), [draft])
  const code = useMemo(() => encodeInvite(invite), [invite])
  const url = inviteUrl(code)
  const steps = useMemo(() => buildSteps(invite, { picks: {}, spots: {}, note: '' }), [invite])

  // What's still missing before the link is worth sending, first problem only.
  const problem = (() => {
    if (!draft.from.trim()) return 'Add your name to get a link.'
    // With email set up, the text-me backup is optional, so only flag a half-typed number.
    const backupEmpty = !draft.reply.value.trim()
    if (draft.reply.kind !== 'none' && !(draft.notify?.sig && backupEmpty) && cleanReply(draft.reply.kind, draft.reply.value).kind === 'none')
      return draft.reply.kind === 'sms' ? 'Add your full number so she can text you.' : 'Add your Instagram handle.'
    if (!draft.notify?.sig && draft.reply.kind === 'none') return 'Add your email (or a number) so you hear back.'
    if (!draft.to.trim()) return 'Add her name to get a link.'
    if (draft.areas.length === 0) return 'Turn on at least one area.'
    if (!draft.categories.some((c) => c.on && c.options.length >= 2)) return 'Turn on a question with 2+ options.'
    return null
  })()

  const shortUrl = short?.code === code ? short.url : null

  const copy = async () => {
    if (problem) return
    setLinkNote('')
    // Make (or reuse) the short link. If the server can't, fall back to the long link so he can still send it.
    const link = shortUrl
      ? Promise.resolve(shortUrl)
      : createShortLink(code)
          .then((u) => {
            setShort({ code, url: u })
            return u
          })
          .catch(() => {
            setLinkNote('Couldn’t make a short link, so the full link was copied instead.')
            return url
          })
    if (await copyAsync(link)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } else {
      await link
      setLinkNote('Your browser blocked copying. Press and hold the link above to copy it.')
    }
  }

  const addOption = (id: string) => {
    const v = newOption.trim().slice(0, 40)
    const cat = draft.categories.find((c) => c.id === id)
    if (v && cat && !cat.options.some((o) => o.toLowerCase() === v.toLowerCase()) && cat.options.length < 12) {
      setCat(id, { options: [...cat.options, v] })
    }
    setNewOption('')
    setAdding(null)
  }

  const toggleArea = (id: AreaId, on: boolean) =>
    set('areas', on ? AREAS.map((a) => a.id).filter((a) => a === id || draft.areas.includes(a)) : draft.areas.filter((a) => a !== id))

  const onCount = draft.categories.filter((c) => c.on).length

  return (
    <div className="creator t-riso">
      <header className="c-header">
        <div className="brand">
          <TicketLogo />
          <span>Pick a Date</span>
        </div>
        <div className="c-header-right">
          <span className="hint">Keeps your questions. Clears her name.</span>
          <button type="button" className="btn btn-s btn-sm" onClick={() => set('to', '')}>
            <Plus size={18} />
            New invite
          </button>
        </div>
      </header>

      <main className="c-main">
        <div className="c-form">
          <div>
            <h1 className="c-title">Build the invite.</h1>
            <p className="c-lede">She picks the plan. You just show up.</p>
          </div>

          <section>
            <div className="sh">
              <span>01</span>
              <h2>You</h2>
            </div>
            <div className="fields">
              <div>
                <label className="fl" htmlFor="you-name">
                  Your name
                </label>
                <input id="you-name" className="in" maxLength={40} value={draft.from} onChange={(e) => set('from', e.target.value)} placeholder="Your first name" />
              </div>
              <div className="span-all">
                <NotifyField value={draft.notify} onChange={(v) => set('notify', v)} />
              </div>
              <div>
                <span className="fl" id="reply-l">
                  {draft.notify?.sig ? 'Backup: she can also text you' : 'Or she texts you her picks'}
                </span>
                <div className="seg" role="radiogroup" aria-labelledby="reply-l">
                  {REPLY.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={draft.reply.kind === r.id}
                      onClick={() => set('reply', { kind: r.id, value: r.id === draft.reply.kind ? draft.reply.value : '' })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {draft.reply.kind !== 'none' && (
                <div>
                  <label className="fl" htmlFor="you-contact">
                    {draft.reply.kind === 'sms' ? 'Your number' : 'Your Instagram'}
                  </label>
                  <input
                    id="you-contact"
                    className="in"
                    type={draft.reply.kind === 'sms' ? 'tel' : 'text'}
                    inputMode={draft.reply.kind === 'sms' ? 'tel' : 'text'}
                    maxLength={40}
                    placeholder={draft.reply.kind === 'sms' ? '(347) 555-0142' : '@yourhandle'}
                    value={draft.reply.value}
                    onChange={(e) => set('reply', { ...draft.reply, value: e.target.value })}
                  />
                  <span className="help">
                    {draft.reply.kind === 'sms' ? 'Her picks open as a text to this number.' : 'Her picks get copied and your DMs open.'}{' '}
                    Not shown on the invite, but it’s inside the link, so only send it to her.
                  </span>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="sh">
              <span>02</span>
              <h2>Her</h2>
            </div>
            <div className="fields">
              <div>
                <label className="fl" htmlFor="her-name">
                  Her name
                </label>
                <input id="her-name" className="in" maxLength={40} value={draft.to} onChange={(e) => set('to', e.target.value)} placeholder="Her first name" />
              </div>
              <div>
                <label className="fl" htmlFor="her-intro">
                  Intro line
                </label>
                <textarea id="her-intro" className="in" rows={2} maxLength={140} value={draft.intro} onChange={(e) => set('intro', e.target.value)} />
              </div>
            </div>
          </section>

          <section>
            <div className="sh">
              <span>03</span>
              <h2>Where</h2>
              <em>She picks one. Turn off anywhere you won’t go.</em>
            </div>
            <div className="area-grid">
              {AREAS.map((a) => (
                <div className="area-card" key={a.id}>
                  <div>
                    <b>{a.label}</b>
                    <span className="mono">{a.hint}</span>
                  </div>
                  <Toggle on={draft.areas.includes(a.id)} onChange={(on) => toggleArea(a.id, on)} label={`Include ${a.label}`} />
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="sh">
              <span>04</span>
              <h2>Questions</h2>
              <em>
                {onCount} of {draft.categories.length} on
              </em>
            </div>
            <div className="q-grid">
              {draft.categories.map((c) => (
                <div className={`qc${c.on ? '' : ' off'}`} key={c.id}>
                  <div className="qc-head">
                    <b>{c.label}</b>
                    <Toggle on={c.on} onChange={(on) => setCat(c.id, { on })} label={`Include ${c.label}`} />
                  </div>
                  <div>
                    <label className="fl" htmlFor={`q-${c.id}`}>
                      Question
                    </label>
                    <input id={`q-${c.id}`} className="in" maxLength={90} value={c.question} onChange={(e) => setCat(c.id, { question: e.target.value })} disabled={!c.on} />
                  </div>
                  <div>
                    <span className="fl">{c.kind === 'when' ? 'Times she can pick' : 'Options'}</span>
                    <div className="chips">
                      {c.options.map((o) => (
                        <span className="chip" key={o}>
                          {o}
                          <button type="button" aria-label={`Remove ${o}`} disabled={!c.on} onClick={() => setCat(c.id, { options: c.options.filter((x) => x !== o) })}>
                            <Cross />
                          </button>
                        </span>
                      ))}
                      {adding === c.id ? (
                        <form
                          className="chip-form"
                          onSubmit={(e) => {
                            e.preventDefault()
                            addOption(c.id)
                          }}
                        >
                          <input
                            autoFocus
                            className="chip-input"
                            aria-label={`New ${c.label} option`}
                            maxLength={40}
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            onBlur={() => addOption(c.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setNewOption('')
                                setAdding(null)
                              }
                            }}
                          />
                        </form>
                      ) : (
                        <button type="button" className="chip-add" disabled={!c.on || c.options.length >= 12} onClick={() => setAdding(c.id)}>
                          <Plus />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                  {c.kind === 'when' && <span className="help">She picks a day in the next 30 days, then one of these times. Use times like “7 PM”.</span>}
                  {SPOT_CATEGORY_IDS.has(c.id) && (
                    <div className="qc-foot">
                      <div>
                        <b>Let her pick a real spot</b>
                        <span>Each option is searched on Google Maps in her area.</span>
                      </div>
                      <Toggle on={c.spots} onChange={(spots) => setCat(c.id, { spots })} label={`Let her pick a real ${c.label.toLowerCase()} spot`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="sh">
              <span>05</span>
              <h2>Finishing touches</h2>
            </div>
            <div className="finish">
              <div className="area-card">
                <div>
                  <b>Let her leave a note</b>
                  <span>Adds an “Anything I should know?” step at the end.</span>
                </div>
                <Toggle on={draft.note} onChange={(v) => set('note', v)} label="Let her leave a note" />
              </div>
              <div>
                <span className="fl" id="theme-l">
                  Theme
                </span>
                <div className="swatches" role="radiogroup" aria-labelledby="theme-l">
                  {THEMES.map((t) => {
                    const on = draft.theme === t.id
                    return (
                      <button key={t.id} type="button" className="sw" role="radio" aria-checked={on} onClick={() => set('theme', t.id)}>
                        <i
                          style={{
                            background: t.bg,
                            boxShadow: on
                              ? `0 0 0 3px ${t.bg}, 0 0 0 5px var(--ink)${t.ring ? `, inset 0 0 0 1px ${t.ring}` : ''}`
                              : t.ring
                                ? `inset 0 0 0 1.5px ${t.ring}`
                                : 'none',
                          }}
                        >
                          <b style={{ background: t.dot }} />
                        </i>
                        <span className="sw-name">{t.name}</span>
                        <span className="sw-note">{t.note}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="c-preview" aria-label="Live preview">
          <div className="live">
            <span className="dot" />
            Live preview · what she sees first
          </div>
          <div className={`phone t-${draft.theme}`} inert>
            <IntroScreen
              inv={{ ...invite, to: invite.to || 'Her name', from: invite.from || 'You' }}
              serial={serialFor(code)}
              stepCount={steps.length}
            />
          </div>
        </aside>
      </main>

      <div className="c-bar">
        <div className="c-bar-inner">
          <div className="linkbox">
            <LinkIcon />
            <span className="mono">
              {problem ? (
                <span className="muted">{problem}</span>
              ) : shortUrl ? (
                <span className="link-text">
                  {shortUrl.replace(/^https?:\/\//, '').replace(/\/i\/.*/, '/i/')}
                  <b>{shortUrl.split('/i/')[1]}</b>
                </span>
              ) : (
                <span className="muted">Your short link appears when you copy it.</span>
              )}
            </span>
          </div>
          <a
            className={`btn btn-s${problem ? ' is-disabled' : ''}`}
            href={problem ? undefined : url}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!!problem}
          >
            <Eye />
            Preview
          </a>
          <button type="button" className="btn btn-p" disabled={!!problem} onClick={copy} aria-live="polite">
            <CopyIcon />
            {copied ? 'Copied. Send it.' : 'Copy link'}
          </button>
          {linkNote && (
            <p className="help err link-note" role="status">
              {linkNote}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
