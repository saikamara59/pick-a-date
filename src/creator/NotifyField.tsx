// "Email me when she answers": confirm the address once with a 6-digit code.
import { useState } from 'react'
import { EMAIL_RE } from '../lib/codec'
import { checkVerify, startVerify } from '../lib/notify'

type Notify = { email: string; sig: string } | undefined
type Pending = { email: string; exp: number; token: string }

export function NotifyField({ value, onChange }: { value: Notify; onChange: (v: Notify) => void }) {
  const [email, setEmail] = useState(value?.email ?? '')
  const [pending, setPending] = useState<Pending | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    const e = email.trim().toLowerCase()
    if (!EMAIL_RE.test(e)) return setError('That doesn’t look like an email address.')
    setBusy(true)
    setError('')
    try {
      const r = await startVerify(e)
      setPending({ email: e, ...r })
      setCode('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const check = async () => {
    if (!pending) return
    setBusy(true)
    setError('')
    try {
      const r = await checkVerify(pending.email, code, pending.exp, pending.token)
      onChange({ email: r.email, sig: r.sig })
      setPending(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (value?.sig) {
    return (
      <div className="notify-ok">
        <span className="check" aria-hidden="true">
          ✓
        </span>
        <span>
          You’ll get an email with her picks and a calendar invite at <b>{value.email}</b>
        </span>
        <button
          type="button"
          className="btn btn-t"
          onClick={() => {
            onChange(undefined)
            setEmail(value.email)
          }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      {pending ? (
        <form
          className="notify-row"
          onSubmit={(e) => {
            e.preventDefault()
            void check()
          }}
        >
          <label className="fl" htmlFor="notify-code" style={{ flexBasis: '100%' }}>
            Code sent to {pending.email}
          </label>
          <input
            id="notify-code"
            className="in code-in"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className="btn btn-p btn-sm" disabled={busy || code.length !== 6}>
            {busy ? 'Checking…' : 'Confirm'}
          </button>
          <button type="button" className="btn btn-t" onClick={() => setPending(null)}>
            Use a different email
          </button>
        </form>
      ) : (
        <form
          className="notify-row"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <label className="fl" htmlFor="notify-email" style={{ flexBasis: '100%' }}>
            Email me when she answers
          </label>
          <input
            id="notify-email"
            className="in"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-s btn-sm" disabled={busy || !email.trim()}>
            {busy ? 'Sending…' : 'Send code'}
          </button>
        </form>
      )}
      {error && (
        <span className="help err" role="alert">
          {error}
        </span>
      )}
      {!error && !pending && <span className="help">We’ll email you a code once to confirm it’s yours. Then you get her picks plus a calendar invite.</span>}
    </div>
  )
}
