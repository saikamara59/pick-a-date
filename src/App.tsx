import { useEffect, useMemo, useState } from 'react'
import { Creator } from './creator/Creator'
import { Invite } from './invite/Invite'
import { BrokenLinkScreen } from './invite/screens'
import { decodeInvite, serialFor } from './lib/codec'
import { resolveShortLink, SHORT_ID_RE } from './lib/shortlink'

/** /i/<id or code> is an invite; anything else is the creator. */
function invitePath(): string | null {
  const m = window.location.pathname.match(/^\/i\/([^/]+)\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

type Loaded = { status: 'loading' } | { status: 'ready'; code: string } | { status: 'missing' }

export default function App() {
  const path = useMemo(invitePath, [])
  // Short ids are looked up on the server; older links carry the whole invite in the path.
  const [loaded, setLoaded] = useState<Loaded>(() =>
    !path ? { status: 'missing' } : SHORT_ID_RE.test(path) ? { status: 'loading' } : { status: 'ready', code: path },
  )

  useEffect(() => {
    if (!path || !SHORT_ID_RE.test(path)) return
    let live = true
    resolveShortLink(path).then((code) => {
      if (live) setLoaded(code ? { status: 'ready', code } : { status: 'missing' })
    })
    return () => {
      live = false
    }
  }, [path])

  const code = loaded.status === 'ready' ? loaded.code : null
  const invite = useMemo(() => (code ? decodeInvite(code) : null), [code])

  useEffect(() => {
    if (invite) document.title = `${invite.from} invited you · Pick a Date`
  }, [invite])

  if (!path) return <Creator />

  if (loaded.status === 'loading') {
    return <div className="invite-app t-riso" aria-busy="true" aria-label="Opening your invite" />
  }

  const theme = invite?.theme ?? 'riso'
  return (
    <div className={`invite-app t-${theme}`}>
      {invite && code ? <Invite inv={invite} code={code} serial={serialFor(code)} /> : <BrokenLinkScreen />}
    </div>
  )
}
