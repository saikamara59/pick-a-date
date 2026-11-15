// First visit: he decides whether he plans the date or lets her pick. Neither is preselected.
import type { InviteKind } from '../types'
import { ArrowRight } from '../components/ui'

const MODES: { kind: InviteKind; title: string; body: string }[] = [
  { kind: 'his-plan', title: 'Take the lead', body: 'You plan the whole date. She gets the plan and just says she’s in.' },
  { kind: 'her-pick', title: 'Let her choose', body: 'You set the options. She picks the spot, the vibe and the time.' },
]

export function ModeChooser({ onPick }: { onPick: (k: InviteKind) => void }) {
  return (
    <div className="mode-chooser">
      <h1 className="c-title">How do you want to do this?</h1>
      <div className="mode-cards">
        {MODES.map((m) => (
          <button key={m.kind} type="button" className="mode-card" onClick={() => onPick(m.kind)}>
            <b>{m.title}</b>
            <span>{m.body}</span>
            <ArrowRight />
          </button>
        ))}
      </div>
      <p className="help">You can switch any time.</p>
    </div>
  )
}
