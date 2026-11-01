import { useId, type ReactNode } from 'react'

type IconProps = { size?: number }
const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

export const ArrowRight = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
export const ArrowLeft = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} aria-hidden="true">
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
)
export const Plus = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.2} {...stroke} aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
)
export const Cross = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...stroke} aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
export const External = ({ size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2.4} {...stroke} aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
)
export const Chat = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
    <path d="M4 5h16v11H9l-5 4Z" />
  </svg>
)
export const LinkIcon = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  </svg>
)
export const Eye = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
export const CopyIcon = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h8" />
  </svg>
)
export const Dice = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={2} {...stroke} aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    <circle cx="15" cy="15" r="1.2" fill="currentColor" />
    <circle cx="15" cy="9" r="1.2" fill="currentColor" />
    <circle cx="9" cy="15" r="1.2" fill="currentColor" />
  </svg>
)
/** Filled check used on selected cards; the tick is cut out in the accent color */
export const CheckBadge = ({ size = 22 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="currentColor" />
    <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const TicketLogo = ({ size = 30 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <path d="M6 5H22A2 2 0 0 1 24 7V11A3 3 0 0 0 24 17V21A2 2 0 0 1 22 23H6A2 2 0 0 1 4 21V17A3 3 0 0 0 4 11V7A2 2 0 0 1 6 5Z" fill="var(--accent)" />
    <path d="M17 8.5V19.5" stroke="var(--bg)" strokeWidth="1.6" strokeDasharray="2 2" />
  </svg>
)

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`tg${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    />
  )
}

export function StepTop({ onBack, index, total }: { onBack: () => void; index: number; total: number }) {
  return (
    <div className="top">
      <button type="button" className="ico" aria-label="Back" onClick={onBack}>
        <ArrowLeft size={18} />
      </button>
      <div className="ticks" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1}>
        {Array.from({ length: total }, (_, i) => (
          <i key={i} className={i <= index ? 'on' : undefined} />
        ))}
      </div>
      <span className="cnt lbl">
        {index + 1}/{total}
      </span>
    </div>
  )
}

/** Paper grain over the whole screen. Color and strength come from the theme. */
export function Grain() {
  const id = useId().replace(/:/g, '')
  return (
    <svg className="grain" aria-hidden="true">
      <filter id={`g${id}`}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} stitchTiles="stitch" />
        <feColorMatrix className="grain-tint" values="0 0 0 0 0.13 0 0 0 0 0.12 0 0 0 0 0.29 0 0 0 0.35 0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#g${id})`} />
    </svg>
  )
}

/** A loose hand-drawn loop, drawn around whatever she picked. */
export function Ring() {
  return (
    <svg className="ring" viewBox="0 0 200 62" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M14 34 C10 12, 120 2, 178 14 C204 22, 186 52, 110 56 C46 60, 4 50, 8 30 C11 18, 40 10, 76 8"
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth="3.2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        pathLength={1}
      />
    </svg>
  )
}

export function Question({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div className="q">
      <span>{eyebrow}</span>
      <h1>{children}</h1>
    </div>
  )
}
