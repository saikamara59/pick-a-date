// Dates and times for the "When" step. Every invite is NYC/NJ, so wall-clock times are New York time.
// Shared by the app and the Netlify notify function.

export const TZ = 'America/New_York'
const WHEN_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i

/** A picked date-time is stored as New York wall-clock text: "2026-11-07T19:00". */
export const isWhenValue = (v: string) => WHEN_RE.test(v)

/** "7 PM" or "7:30pm" → { h: 19, m: 30 }. Null if it isn't a time. */
export function parseTime(label: string): { h: number; m: number } | null {
  const t = TIME_RE.exec(label.trim())
  if (!t) return null
  let h = Number(t[1]) % 12
  if (t[3].toLowerCase() === 'pm') h += 12
  const m = Number(t[2] ?? 0)
  return h < 24 && m < 60 ? { h, m } : null
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's date in New York as YYYY-MM-DD parts. */
function nyToday(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value)
  return { y: get('year'), m: get('month'), d: get('day') }
}

/** The next `count` days starting tomorrow (New York), as YYYY-MM-DD. */
export function upcomingDays(count = 14, now = new Date()): string[] {
  const { y, m, d } = nyToday(now)
  return Array.from({ length: count }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + 1 + i))
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
  })
}

/** Wall-clock parts as a UTC date so Intl can format them without shifting. */
function wall(value: string): Date {
  const [, y, mo, d, h, mi] = WHEN_RE.exec(value) ?? WHEN_RE.exec(`${value}T00:00`)!
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi))
}

export const dayParts = (day: string) => {
  const w = wall(`${day}T00:00`)
  return {
    weekday: w.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    date: w.getUTCDate(),
    month: w.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
  }
}

/** "Fri, Nov 7 · 7 PM" */
export function formatWhen(value: string): string {
  if (!isWhenValue(value)) return value
  const w = wall(value)
  const day = w.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  const time = w
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: w.getUTCMinutes() ? '2-digit' : undefined, timeZone: 'UTC' })
    .replace(':00', '')
  return `${day} · ${time}`
}

/** Offset of New York from UTC, in minutes, at a given instant (e.g. -300 in winter). */
function nyOffset(at: Date): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at)
  const get = (t: string) => Number(p.find((x) => x.type === t)!.value)
  return (Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - at.getTime()) / 60000
}

/** New York wall-clock "2026-11-07T19:00" → the real instant. */
export function whenToDate(value: string): Date {
  const guess = wall(value).getTime()
  const first = guess - nyOffset(new Date(guess)) * 60000
  // Re-check once in case the guess straddled a DST change.
  return new Date(guess - nyOffset(new Date(first)) * 60000)
}

/** 20261108T000000Z */
export const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export interface CalendarEvent {
  uid: string
  title: string
  start: Date
  hours: number
  location: string
  details: string
}

/** Link that opens Google Calendar with the event filled in. No API, no sign-in. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const end = new Date(e.start.getTime() + e.hours * 3600000)
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${icsStamp(e.start)}/${icsStamp(end)}`,
    details: e.details,
    location: e.location,
  })
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Fold long lines at 75 octets as the iCalendar spec requires. */
function fold(line: string): string {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

/** An .ics invite. With an organizer and attendee, Gmail and Apple Mail show RSVP / add buttons. */
export function buildIcs(
  e: CalendarEvent,
  opts: { method?: 'REQUEST' | 'PUBLISH' | 'CANCEL'; sequence?: number; organizer?: string; attendee?: { email: string; name: string } } = {},
): string {
  const end = new Date(e.start.getTime() + e.hours * 3600000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pick a Date//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${opts.method ?? 'PUBLISH'}`,
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    ...(opts.sequence !== undefined ? [`SEQUENCE:${opts.sequence}`] : []),
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(e.start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    `LOCATION:${icsText(e.location)}`,
    `DESCRIPTION:${icsText(e.details)}`,
    ...(opts.organizer ? [`ORGANIZER;CN=Pick a Date:mailto:${opts.organizer}`] : []),
    ...(opts.attendee
      ? [`ATTENDEE;CN=${icsText(opts.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${opts.attendee.email}`]
      : []),
    opts.method === 'CANCEL' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** How far ahead she can pick a date. */
export const WHEN_DAYS = 30

/** 0 = Sunday … 6 = Saturday */
export const weekdayIndex = (day: string) => wall(`${day}T00:00`).getUTCDay()

/** "November 2026" */
export const monthLabel = (day: string) =>
  wall(`${day}T00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Days grouped by month, each padded so day 1 lines up under its weekday. */
export function calendarMonths(days: string[]): { label: string; cells: (string | null)[] }[] {
  const months: { label: string; cells: (string | null)[] }[] = []
  for (const d of days) {
    const label = monthLabel(d)
    let m = months[months.length - 1]
    if (!m || m.label !== label) {
      m = { label, cells: Array(weekdayIndex(d)).fill(null) }
      months.push(m)
    }
    m.cells.push(d)
  }
  return months
}
