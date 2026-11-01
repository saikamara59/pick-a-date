# Pick a Date

A date-invite generator. You build an invite and text her the link. She picks the area, the food, the activity and real spots, then gets the plan back as a ticket and texts you her picks.

No database: the whole invite is compressed into the link. The only server code is one Netlify Function that proxies Google Places so the API key never reaches the browser.

## How it works

- **`/`** is the creator. The draft is saved in your browser, and **New invite** keeps your questions but clears her name.
- **`/i/<code>`** is the invite. `<code>` is the invite JSON compressed with `lz-string`. Every field is re-validated on decode (`src/lib/codec.ts`), so a hand-edited link can't inject anything.
- **`/api/places`** is `netlify/functions/places.ts`. It calls Places API (New) Text Search with Pro-tier fields only, restricted to the chosen area's bounding box, and caches identical searches at the CDN for an hour.

Areas: Manhattan, Brooklyn, Staten Island, Jersey City & Hoboken (`src/lib/areas.ts`).

## Develop

```bash
npm install
cp .env.example .env   # add GOOGLE_PLACES_API_KEY
npx netlify dev        # app + /api/places on one port
```

`npm run dev` also works for UI work, but the spot step will show its "couldn't load places" state without the function.

## Deploy

Netlify builds from `netlify.toml`. Set `GOOGLE_PLACES_API_KEY` under Project configuration → Environment variables.

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
