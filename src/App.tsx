import { useEffect, useMemo } from 'react'
import { Creator } from './creator/Creator'
import { Invite } from './invite/Invite'
import { BrokenLinkScreen } from './invite/screens'
import { decodeInvite, serialFor } from './lib/codec'

/** /i/<code> is an invite; anything else is the creator. */
function inviteCode(): string | null {
  const m = window.location.pathname.match(/^\/i\/([^/]+)\/?$/)
  return m ? decodeURIComponent(m[1]) : null
}

export default function App() {
  const code = useMemo(inviteCode, [])
  const invite = useMemo(() => (code ? decodeInvite(code) : null), [code])

  useEffect(() => {
    if (invite) document.title = `${invite.from} invited you · Pick a Date`
  }, [invite])

  if (!code) return <Creator />

  const theme = invite?.theme ?? 'riso'
  return (
    <div className={`invite-app t-${theme}`}>
      {invite ? <Invite inv={invite} code={code} serial={serialFor(code)} /> : <BrokenLinkScreen />}
    </div>
  )
}
