# Pick a Date

A date-invite generator, in two modes (terms in [CONTEXT.md](CONTEXT.md)):

- **Her-pick invite** ("Let her choose"): you set the options and text her the link. She picks the area, the food, the activity, real spots and a day and time, then sends it, and you get an email with her picks and a calendar invite.
- **His-plan invite** ("Take the lead"): you walk through the same steps yourself and send her the finished plan. Any part except the day and time can be a Surprise she can't see. She taps **I'm in**, **Different time** (a Counter-time) or **Can't make it**, and you get an email for each answer.

No database: the whole invite is compressed into the link. A few Netlify Functions keep the API keys server-side: Google Places search, email verification, and the notification email.

## How it works

- **`/`** is the creator. The draft is saved in your browser, and **New invite** keeps your questions but clears her name.
- **`/i/<id>`** is a short invite link. **Copy link** stores the invite in Netlify Blobs under a 9-character id made from a hash of the invite (`netlify/functions/invites.ts`), so the same invite always gets the same link.
- **`/i/<code>`** (older long links) is the invite. `<code>` is the invite JSON compressed with `lz-string`. Every field is re-validated on decode (`src/lib/codec.ts`), so a hand-edited link can't inject anything.
- **`/api/verify/start`, `/api/verify/check`** confirm his email with a 6-digit code. The server then signs the address into the invite link, so a link can't be edited to email someone else.
- **His-plan invites** carry his Plan in the link as `plan` ([ADR 0001](docs/adr/0001-his-plan-lives-in-the-link.md)), validated on decode by the same `cleanPlan` the server uses (`src/lib/plan.ts`, `src/lib/codec.ts`). Her side (Surprise masking, Counter-time rules, remembered answer) is `src/lib/hisPlan.ts`.
- **`/api/notify`** emails him her picks with a calendar invite (.ics) and an "Add to Google Calendar" link. It only sends to the signed address, at most 3 times per invite. Rate limits live in Netlify Blobs. For a His-plan invite the body is `{ code, response, update, previous }` instead of `answers`: the email is built from the Plan in the link, and a decline after a yes sends a calendar cancellation.
- **`/api/ai/search`** turns a typed-in answer ("something artsy, not a museum") into one or two map searches with Claude, so the spot step still finds real places. Falls back to her own words.
- **AI game plan:** `/api/notify` asks Claude for a timeline, getting-around tip, what to book, a backup and three conversation starters, using walking times computed from the real places. If AI is off or slow, the email goes out without it.
- **`/api/places`** is `netlify/functions/places.ts`. It calls Places API (New) Text Search with Pro-tier fields only, restricted to the chosen area's bounding box, and caches identical searches at the CDN for an hour.

Areas: Manhattan, Brooklyn, Staten Island, Jersey City & Hoboken (`src/lib/areas.ts`).

## Develop

```bash
npm install
cp .env.example .env   # add GOOGLE_PLACES_API_KEY
npx netlify dev        # app + /api/places on one port
npm test               # unit tests (Vitest)
```

`npm run dev` also works for UI work, but the spot step will show its "couldn't load places" state without the function.

## Deploy

Netlify builds from `netlify.toml`. Set these under Project configuration → Environment variables:

| Variable | What it is |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Places API (New) key |
| `RESEND_API_KEY` | From resend.com → API Keys |
| `NOTIFY_FROM` | Sender, e.g. `Pick a Date <onboarding@resend.dev>` (test sender only reaches your own Resend account email; verify a domain to email anyone) |
| `ANTHROPIC_API_KEY` | From console.anthropic.com → API Keys. Turns on the AI features; without it they're skipped |
| `ANTHROPIC_MODEL` | Optional. Defaults to `claude-haiku-5-5`; set e.g. `claude-sonnet-5-5` to switch |
| `SIGNING_SECRET` | Any long random string, e.g. `openssl rand -base64 32`. Changing it breaks existing email-enabled links. |

Google Cloud setup: enable **Places API (New)**, restrict the key to that API only, and set a daily quota cap plus a budget alert.

## Layout

```
src/
  creator/Creator.tsx      the form, live preview, link bar
  invite/Invite.tsx        flow controller and step list
  invite/screens.tsx       intro, area, choice, note, endings
  invite/SpotStep.tsx      real places: loading, results, empty, error
  invite/TicketScreen.tsx  the printed ticket and reply buttons
  lib/                     areas, codec, presets, places client, share text
netlify/functions/places.ts
```

## Notes

- Your phone number or IG handle is not shown on the invite, but it is inside the link. Only send a link to the person it's for.
- Google requires the "Places data from Google Maps" attribution wherever results show without a Google map.
