# His-plan Invite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second invite kind, the His-plan invite: he builds the whole Plan by walking through her step screens, and she answers I'm in / Different time (Counter-time) / Can't make it, which emails him.

**Architecture:** The Plan rides inside the invite link as `Invite.plan` (ADR 0001), validated on decode by one shared `cleanPlan` used by both the browser codec and `/api/notify`. Pure logic (masking Surprises, Counter-time rules, reply text, email subjects, saved answers) lives in small tested lib files; React screens reuse the existing step screens, and `/api/notify` gains a `response` field for His-plan invites.

**Tech Stack:** React 19, TypeScript 7, Vite 8, Netlify Functions, lz-string, Vitest (added in Task 1).

**Spec:** `docs/superpowers/specs/2026-11-15-his-plan-invite-design.md` (read it with `CONTEXT.md` and `docs/adr/0001-his-plan-lives-in-the-link.md`).

## Global Constraints

- Use the glossary terms from `CONTEXT.md` in names, comments and copy: Plan, Her-pick invite, His-plan invite, Counter-time, Surprise, Left to him.
- Existing Her-pick links, drafts and behavior must keep working unchanged (apart from the first-visit chooser).
- Anything decoded from a link or a request body is untrusted and re-validated.
- Day and time are required in a His-plan invite and can never be a Surprise.
- Nothing she can see (ticket, her calendar entry, prefilled text) reveals a Surprise's choice or venue. His email shows the real places.
- Counter-time: any day in the next `WHEN_DAYS` (30) days from when she opens it, at one of the When question's times, never his own slot.
- The existing limit of 3 notify emails per invite (`allow(..., 3, 86400)`) covers all her answers combined.
- Copy uses the codebase's curly apostrophe `’`.

## Review Focus

1. **Old links:** a Her-pick link made before this change still decodes and behaves identically. Pinned in Task 2 (`decodes a pre-change Her-pick link unchanged`).
2. **Setup edited after planning:** he plans the date, then turns off a question, removes his chosen time, or switches off the chosen area. The Plan must shrink or clear itself, never send a stale or invalid Plan. Pinned in Task 2 (`draftToInvite drops plan parts the setup no longer allows`).
3. **Surprise leaking:** a Surprise must not appear in her rows, her text message, or her calendar location, including Food with a typed-in answer and Vibe. Pinned in Task 3 (`herRows hides choice and venue of a Surprise`, `herReplyMessage never mentions a Surprise`).
4. **Date already passed / Counter-time edge cases:** a past date hides I'm in; a Counter-time equal to his slot, a past time, or a time not on his list is rejected by both browser and server. Pinned in Task 3 (`isValidCounter`) and Task 4 (`notify rejects a bad counter`).
5. **Tampered request:** a His-plan notify call with forged `answers` must use the Plan from the link, not the body. Pinned in Task 4 (`his-plan email ignores body answers`).

---

### Task 1: Shared Plan validation, test runner, and the Left to him rename

**Files:**
- Modify: `package.json` (add `vitest` dev dependency and `"test": "vitest run"`)
- Create: `src/lib/plan.ts`
- Modify: `netlify/functions/notify.ts:12-45` (delete `cleanAnswers`, import `cleanPlan`)
- Modify: `src/types.ts:43-46`, `src/invite/Invite.tsx:167`, `src/invite/SpotStep.tsx` (lines 32-33, 90, 110, 158-179), `src/invite/TicketScreen.tsx:126`, `src/lib/share.ts:14`, `netlify/lib/gameplan.ts:60`, `netlify/functions/notify.ts:62`
- Test: `src/lib/plan.test.ts`

**Interfaces:**
- Produces: `cleanPlan(inv: Invite, raw: unknown): Answers` in `src/lib/plan.ts`; `SpotPick` variant renamed to `{ kind: 'left-to-him' }`.

- [ ] **Step 1: Install Vitest and add the script.** Run `npm i -D vitest`, add `"test": "vitest run"` to `scripts`. Run `npx vitest run`; expected: "No test files found".

- [ ] **Step 2: Write the failing tests** in `src/lib/plan.test.ts`, using an inline `Invite` fixture with categories `food` (spots), `vibe`, `when` (kind `'when'`, options `['7 PM','8 PM']`):

```ts
test('keeps valid picks, spots and area', () => { /* picks.food = Sushi, spots.food = place with https://maps.google.com/... → kept */ })
test('drops picks for unknown categories and bad when values', () => {
  expect(cleanPlan(inv, { picks: { nope: { value: 'x' }, when: { value: 'Friday' } } }).picks).toEqual({})
})
test('blanks a non-Google maps URL', () => {
  const a = cleanPlan(inv, { picks: { food: { value: 'Sushi' } }, spots: { food: { kind: 'place', place: { name: 'X', mapsUrl: 'https://evil.example/' } } } })
  expect(a.spots.food).toMatchObject({ kind: 'place', place: { mapsUrl: '' } })
})
test('reads legacy surprise spots as left-to-him', () => {
  expect(cleanPlan(inv, { picks: { food: { value: 'Surprise me' } }, spots: { food: { kind: 'surprise' } } }).spots.food).toEqual({ kind: 'left-to-him' })
})
test('drops a hood that is not in the area', () => { /* area manhattan, hood 'astoria' → hood undefined */ })
```

- [ ] **Step 3: Run** `npm test`. Expected: FAIL, `cleanPlan` not found.

- [ ] **Step 4: Implement** `cleanPlan` in `src/lib/plan.ts` by moving `cleanAnswers` (plus `s`, `coord`, `MAPS_RE`) out of `notify.ts` unchanged, except: accept `sp.kind === 'surprise' || 'left-to-him'` → `{ kind: 'left-to-him' }`. In `notify.ts`, replace `cleanAnswers(inv, body.answers)` with `cleanPlan(...)`. Rename the `SpotPick` variant to `'left-to-him'` and update every usage listed in Files (same behavior, new name). The UI string "Surprise me" does not change.

- [ ] **Step 5: Run** `npm test && npm run build && npm run lint`. Expected: all pass.

- [ ] **Step 6: Commit** `git commit -m "refactor: share Plan validation, rename Left to him, add vitest"`

---

### Task 2: Invite model and codec for His-plan invites

**Files:**
- Modify: `src/types.ts`, `src/lib/codec.ts`
- Test: `src/lib/codec.test.ts`

**Interfaces:**
- Consumes: `cleanPlan` (Task 1).
- Produces, in `src/types.ts`:
  - `type InviteKind = 'her-pick' | 'his-plan'`
  - `interface HisPlan extends Answers { surprises: string[] }` (category ids that are Surprises)
  - `Invite.plan?: HisPlan` (present means His-plan invite)
  - `Draft` gains `kind?: InviteKind` (undefined means not chosen yet) and `plan?: HisPlan`
- Produces, in `src/lib/codec.ts`:
  - `isHisPlan(inv: Invite): inv is Invite & { plan: HisPlan }`
  - `planWhen(inv: Invite): string | undefined` (the When pick's value from `inv.plan`)
  - `cleanHisPlan(inv: Omit<Invite, 'plan'>, raw: unknown): HisPlan | undefined`: `cleanPlan` + `surprises` filtered to known, non-When, picked category ids + `note: ''`; returns `undefined` unless a valid When pick and an area that is in `inv.areas` exist.
  - `draftToInvite` sets `plan` only when `draft.kind === 'his-plan'`, via `cleanHisPlan`.
  - `decodeInvite` reads `j.plan` via `cleanHisPlan`. A link that has `plan` but fails validation returns `null` (broken link), so she never sees half a plan.

- [ ] **Step 1: Write the failing tests** in `src/lib/codec.test.ts`:

```ts
test('round-trips a His-plan invite', () => { /* encode → decode → isHisPlan true, plan equal, surprises ['vibe'] */ })
test('decodes a pre-change Her-pick link unchanged', () => {
  // build a v1 Her-pick invite with no plan; encodeInvite → decodeInvite → toEqual(original); isHisPlan false
})
test('rejects a His-plan link without a valid when', () => {
  expect(decodeInvite(encodeInvite({ ...hisInv, plan: { ...hisInv.plan, picks: { food: { value: 'Sushi', custom: false } } } }))).toBeNull()
})
test('strips the When category and unknown ids from surprises', () => {
  expect(cleanHisPlan(base, { ...plan, surprises: ['when', 'nope', 'vibe'] })!.surprises).toEqual(['vibe'])
})
test('draftToInvite drops plan parts the setup no longer allows', () => {
  // draft.kind 'his-plan' with plan picks for food+vibe+when; turn vibe off → plan has no vibe pick and no 'vibe' surprise
  // remove '7 PM' from when options while plan when is ...T19:00 → plan undefined
  // switch off the plan's area → plan undefined
})
test('draftToInvite ignores plan in her-pick mode', () => { /* kind 'her-pick' with a plan → invite.plan undefined */ })
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.

- [ ] **Step 3: Implement** the types and codec functions above. In `cleanHisPlan`, a When value is valid only if `isWhenValue` and its `HH:MM` matches one of the When category's `parseTime` options. Keep `v: 1`. Old links have no `plan` key, so no version bump is needed.

- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.

- [ ] **Step 5: Commit** `git commit -m "feat: carry a His-plan in the invite link"`

---

### Task 3: Her side's pure logic (masking, Counter-time rules, reply text, saved answer)

**Files:**
- Create: `src/lib/hisPlan.ts`
- Test: `src/lib/hisPlan.test.ts`

**Interfaces:**
- Consumes: `isHisPlan`, `planWhen` (Task 2); `formatWhen`, `whenToDate`, `upcomingDays`, `WHEN_DAYS`, `dayParts`, `parseTime`, `isWhenValue` from `src/lib/when.ts`; `placeLabel` from `areas.ts`; `declineMessage` from `share.ts`.
- Produces:
  - `type HerResponse = { kind: 'in' } | { kind: 'counter'; when: string } | { kind: 'decline' }`
  - `interface PlanRow { label: string; value: string; sub?: string; link?: string }`
  - `herRows(inv): PlanRow[]`: Where (area + hood), then each picked question. A Surprise shows `value: 'It’s a surprise'` with no `sub` or `link`. The When row shows `formatWhen`.
  - `herPlanLines(inv): string[]`: the rows as `Label: value` text (for her calendar details).
  - `herCalendarLocation(inv): string`: always `placeLabel(area, hood)`, never a venue.
  - `isPassed(inv, now = new Date()): boolean`: `whenToDate(planWhen) <= now`
  - `counterDays(now = new Date()): string[]`: `upcomingDays(WHEN_DAYS, now)`
  - `isValidCounter(inv, value: string, now = new Date()): boolean`: `isWhenValue`, time is on the When options, `value !== planWhen(inv)`, `whenToDate(value) > now`, and the day is in `upcomingDays(WHEN_DAYS + 1, now)` or today (the +1 tolerates server/browser clock and timezone differences).
  - `herReplyMessage(inv, r: HerResponse): string`: in → `` `Hey ${from}! I’m in for ${formatWhen(when)}.` ``; counter → `` `Hey ${from}, can we do ${formatWhen(r.when)} instead?` ``; decline → `declineMessage(inv)`.
  - `answerKey(code: string): string`: `'pick-a-date:answer:' +` an 8-hex-digit hash of the full code (same 31-multiplier hash as `serialFor`, unreduced).
  - `loadHerAnswer(code): HerResponse | null`, `saveHerAnswer(code, r: HerResponse): void`: localStorage, wrapped in try/catch, and the load re-validates its shape.

- [ ] **Step 1: Write the failing tests**, with fixture `inv.from = 'Sam'`, plan when `'2026-11-20T19:00'`, When options `['7 PM','8 PM']`, food = place "Via Carota" and a Surprise, vibe = "Chill" and a Surprise, `now = new Date('2026-11-15T17:00:00Z')`:

```ts
test('herRows hides choice and venue of a Surprise', () => {
  const food = herRows(inv).find((r) => r.label === 'Food')!
  expect(food).toEqual({ label: 'Food', value: 'It’s a surprise' })
  expect(JSON.stringify(herRows(inv))).not.toMatch(/Via Carota|Chill/)
})
test('herReplyMessage never mentions a Surprise', () => {
  expect(herReplyMessage(inv, { kind: 'in' })).toBe('Hey Sam! I’m in for Fri, Nov 20 · 7 PM.')
  expect(herReplyMessage(inv, { kind: 'counter', when: '2026-11-19T20:00' })).toBe('Hey Sam, can we do Thu, Nov 19 · 8 PM instead?')
})
test('herCalendarLocation is the area, never a venue', () => { expect(herCalendarLocation(inv)).toBe(placeLabel('manhattan', 'west-village')) })
test('isPassed', () => { expect(isPassed(inv, now)).toBe(false); expect(isPassed(inv, new Date('2026-11-21T00:00:00Z'))).toBe(true) })
test('isValidCounter', () => {
  expect(isValidCounter(inv, '2026-11-19T20:00', now)).toBe(true)
  expect(isValidCounter(inv, '2026-11-20T19:00', now)).toBe(false) // his slot
  expect(isValidCounter(inv, '2026-11-19T21:00', now)).toBe(false) // not on his list
  expect(isValidCounter(inv, '2026-11-14T20:00', now)).toBe(false) // past
  expect(isValidCounter(inv, '2027-02-01T20:00', now)).toBe(false) // beyond 30 days
})
test('saved answer round-trips and rejects junk', () => { /* stub localStorage; save counter → load equal; set junk JSON → null */ })
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/lib/hisPlan.ts`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: her side of a His-plan (masking, Counter-time, saved answer)"`

---

### Task 4: `/api/notify` for His-plan answers

**Files:**
- Modify: `src/lib/when.ts` (`buildIcs` opts), `netlify/functions/notify.ts`, `src/lib/notify.ts`
- Create: `netlify/lib/hisPlanEmail.ts`
- Test: `netlify/lib/hisPlanEmail.test.ts`, `src/lib/when.test.ts`

**Interfaces:**
- Consumes: `HerResponse`, `isValidCounter`, `planWhen`, `isHisPlan` (Tasks 2-3).
- Produces:
  - `buildIcs` opts gain `method?: 'REQUEST' | 'PUBLISH' | 'CANCEL'` and `sequence?: number`. It emits `SEQUENCE:<n>` when given, and `STATUS:CANCELLED` when the method is `CANCEL` (otherwise `STATUS:CONFIRMED`, as today).
  - `hisPlanSubject(inv, r: HerResponse, update: boolean): string`:
    - in: `` `${to}’s in · ${formatWhen(when)}` ``
    - counter: `` `${to} can’t do ${weekday of his day}. How about ${formatWhen(r.when)}?` ``
    - decline: `` `${to} can’t make it this time` ``
    - `update` prefixes `'Update: '`.
  - `hisPlanHeadline(inv, r): string`, the `<h1>` / first text line. Counter adds the sentence `Text her to lock it in.`
  - `cleanResponse(inv, raw: unknown, now = new Date()): HerResponse | null`, using `isValidCounter` for counters.
  - Browser: `sendHerAnswer(code: string, response: HerResponse, update: boolean, previous?: HerResponse['kind'])` in `src/lib/notify.ts`, posting `{ code, response, update, previous }`.
  - Server behavior for a His-plan invite:
    - Rows come from `inv.plan` (real places, Surprises included for him); body `answers` are ignored.
    - in → REQUEST ics at the plan's time.
    - counter → REQUEST ics at the counter time.
    - decline with `previous` of `in` or `counter` → CANCEL ics.
    - All of these share the per-invite UID `${inviteKey}@pick-a-date`, with `sequence: Math.floor(Date.now() / 1000)`.
    - The AI game plan only runs for in and counter.
    - An invalid `response` returns 400 `'That answer didn’t look right. Try again.'`
    - Her-pick requests keep today's path untouched.

- [ ] **Step 1: Write the failing tests:**

```ts
// hisPlanEmail.test.ts (inv.to 'Maya', plan when 2026-11-20T19:00)
expect(hisPlanSubject(inv, { kind: 'in' }, false)).toBe('Maya’s in · Fri, Nov 20 · 7 PM')
expect(hisPlanSubject(inv, { kind: 'counter', when: '2026-11-19T20:00' }, false)).toBe('Maya can’t do Fri. How about Thu, Nov 19 · 8 PM?')
expect(hisPlanSubject(inv, { kind: 'decline' }, true)).toBe('Update: Maya can’t make it this time')
test('notify rejects a bad counter', () => { expect(cleanResponse(inv, { kind: 'counter', when: '2026-11-20T19:00' }, now)).toBeNull() })
test('his-plan email ignores body answers', () => { /* hisPlanRows(inv) built only from inv.plan; assert it's called with no answers param */ })
// when.test.ts
test('buildIcs CANCEL with sequence', () => {
  const ics = buildIcs(event, { method: 'CANCEL', sequence: 5 })
  expect(ics).toContain('METHOD:CANCEL'); expect(ics).toContain('SEQUENCE:5'); expect(ics).toContain('STATUS:CANCELLED')
})
```

For the "ignores body answers" test, export `hisPlanRows(inv: Invite & { plan: HisPlan }): Row[]` from `hisPlanEmail.ts`. Its signature takes no answers, which is the guarantee. Move `Row` and the existing `rowsFor` row-building into that file so both kinds of invite share one row renderer.

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the above. Restructure `notify.ts` into `if (isHisPlan(inv)) { … } else { existing path }`, with the HTML/text email shell shared between the two branches.
- [ ] **Step 4: Run** `npm test && npm run build && npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: notify him of her His-plan answer"`

---

### Task 5: His walkthrough (Plan the date)

**Files:**
- Create: `src/creator/PlanWalkthrough.tsx`
- Modify: `src/invite/Invite.tsx` (`buildSteps` gains a `who` param), `src/invite/SpotStep.tsx` (`allowLeftToHim` prop), `src/invite/screens.tsx` (add `SurpriseStep`)
- Test: `src/invite/buildSteps.test.ts`

**Interfaces:**
- Consumes: `HisPlan`, `cleanHisPlan` (Task 2).
- Produces:
  - `buildSteps(inv, a, who: 'her' | 'him' = 'her'): Step[]`. With `'him'`: no `note` step, a `{ kind: 'surprises' }` step at the end, and every choice step uses the category with Left to him options removed (`!isSurprise(o)`).
  - `SpotStep` prop `allowLeftToHim?: boolean` (default `true`). With `false`, the "he picks the spot" choice is hidden.
  - `SurpriseStep({ nav, questions: Category[], value: string[], onDone: (ids: string[]) => void })`: one **Keep it a surprise** toggle per picked non-When question.
  - `PlanWalkthrough({ inv, initial?: HisPlan, onDone: (p: HisPlan) => void, onCancel: () => void })`: a full-screen themed overlay (`invite-app t-${theme}`) driving the same screens as `Invite.tsx`. Back from the first step calls `onCancel`.

- [ ] **Step 1: Write the failing tests:**

```ts
test('him: no note step, ends with surprises', () => { expect(buildSteps(inv, empty, 'him').map((s) => s.kind).at(-1)).toBe('surprises'); /* no 'note' */ })
test('him: Left to him options removed', () => { /* the choice step's cat.options has no "Surprise me" */ })
test('her: unchanged', () => { expect(buildSteps(inv, empty)).toEqual(buildSteps(inv, empty, 'her')) /* and matches today's snapshot */ })
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Extract the step-switch rendering in `Invite.tsx` into a shared `renderStep(...)` that both `Invite` and `PlanWalkthrough` use, so the step screens aren't duplicated.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: Plan the date walkthrough"`

> Note: the spec puts a Surprise switch on each question. This plan collects them on one final **SurpriseStep** instead. It's simpler to build and gives the same result, since every non-When question gets a switch. This is a builder's call.

---

### Task 6: Creator modes

**Files:**
- Create: `src/creator/linkProblem.ts`, `src/creator/ModeChooser.tsx`, `src/invite/PlanTicket.tsx`
- Modify: `src/creator/Creator.tsx`, `src/lib/presets.ts`
- Test: `src/creator/linkProblem.test.ts`

**Interfaces:**
- Consumes: `PlanWalkthrough` (Task 5), `herRows` (Task 3), `Draft.kind`/`plan` (Task 2).
- Produces:
  - `linkProblem(draft: Draft): string | null`. This moves the current inline `problem` logic unchanged, then for `kind === 'his-plan'`:
    - skip the "question with 2+ options" rule;
    - add `'Plan the date to get a link.'` when `draftToInvite(draft).plan` is undefined.
    - The existing rule `'Add your email (or a number) so you hear back.'` already enforces the spec's "a way to reach him" for both kinds of invite.
  - `DEFAULT_HIS_INTRO = 'I planned something. You just show up.'` in `presets.ts`. When he switches modes, swap the intro only if it still equals the other mode's default.
  - `PlanTicket({ inv, rows: PlanRow[], serial })`: the ticket `<article>` markup from `TicketScreen`, fed by rows.
  - `ModeChooser({ onPick: (k: InviteKind) => void })`: two cards, **Take the lead** (`'his-plan'`) and **Let her choose** (`'her-pick'`).

- [ ] **Step 1: Write the failing tests:**

```ts
test('her-pick problems unchanged', () => { /* the current rules, in order, for a few drafts */ })
test('his-plan needs a plan', () => { expect(linkProblem(hisDraftNoPlan)).toBe('Plan the date to get a link.') })
test('his-plan needs a way to reach him', () => { expect(linkProblem({ ...hisDraft, notify: undefined, reply: { kind: 'none', value: '' } })).toBe('Add your email (or a number) so you hear back.') })
test('his-plan does not need 2+ options', () => { /* every question with one option + a plan → null */ })
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `Creator.tsx`:
  - If `draft.kind` is undefined, render `ModeChooser` in place of the form.
  - Otherwise show a `seg` switch **Let her pick** / **I'll plan it** under the title.
  - The lede is mode-specific. Her-pick keeps "She picks the plan. You just show up."; His-plan shows "You plan it. She just shows up."
  - In His-plan mode, show a **Plan the date** section first. It shows the button (or "Edit the plan" plus a small `PlanTicket` summary), and opens `PlanWalkthrough` on click. The Where and Questions sections stay below, unchanged.
  - The preview `<aside>` shows `PlanTicket` with `herRows` when a plan exists. Otherwise it shows `IntroScreen`.
  - `loadDraft` leaves `kind` undefined for existing saved drafts, so they see the chooser once.
- [ ] **Step 4: Run** `npm test && npm run build && npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "feat: creator modes and first-visit chooser"`

---

### Task 7: Her His-plan invite

**Files:**
- Create: `src/invite/HisPlanInvite.tsx`
- Modify: `src/invite/Invite.tsx` (return `<HisPlanInvite …/>` when `isHisPlan(inv)`), `src/invite/screens.tsx` (`WhenStep` gains optional `disabledValue?: string`; `IntroScreen` gains optional `startLabel?: string`)

**Interfaces:**
- Consumes: everything in Tasks 2-4 and 6 (`PlanTicket`, `herRows`, `isPassed`, `isValidCounter`, `herReplyMessage`, `loadHerAnswer`/`saveHerAnswer`, `sendHerAnswer`, `replyHref`).
- Produces: `HisPlanInvite({ inv, code, serial })` with these screens:
  - `intro`: `IntroScreen`, `startLabel="See the plan"`.
  - `plan`: `PlanTicket` plus actions.
    - Not passed: **I'm in** / **Different time** / **Can't make it**.
    - Passed: the headline "That night’s gone. Pick another?" and only **Pick another time** / **Can't make it**.
  - `counter`: `WhenStep` with `disabledValue = planWhen(inv)`. Its Next button sends the counter.
  - `sent`: "Sent", then "<from>’s got it." plus:
    - the "Text/DM <from>" button (`replyHref(inv, herReplyMessage(inv, r))`), if a reply method is set;
    - "Add to my calendar" (location = `herCalendarLocation`, details = `herPlanLines`), for in and counter;
    - **Change answer**.
  - `confirm-change`: "Change your answer? <from> gets another email." with **Yes, change it** / **Keep it**.
- Behavior:
  - On mount, `loadHerAnswer(code)`. If one is saved, open on `sent` with the headline "You said you’re in" (or "You asked for <time>" / "You said not this time").
  - Answering sends right away. It calls `sendHerAnswer(code, r, update, previous)` with `update = saved answer exists`, then calls `saveHerAnswer`.
  - If sending fails, the error shows with the text-him fallback, and nothing is saved.
  - If the invite has no `notify`, skip the email and go straight to `sent` with the text-him button.

- [ ] **Step 1: Implement** the component and the two optional props. `WhenStep` renders a time button as disabled when `${day}T${time}` equals `disabledValue`.
- [ ] **Step 2: Run** `npm run build && npm run lint && npm test`. Expected: PASS.
- [ ] **Step 3: Commit** `git commit -m "feat: her His-plan invite"`

---

### Task 8: End-to-end check

- [ ] **Step 1:** Run `npm test && npm run build && npm run lint`. Expected: all pass.
- [ ] **Step 2:** Start `npx netlify dev` (the email needs `RESEND_API_KEY`, `NOTIFY_FROM` and `SIGNING_SECRET` in `.env`; if they're missing, check the UI only and say so). In the browser, check:
  - first-visit chooser;
  - His-plan: plan the date with Food as a Surprise, then copy the link;
  - open the link: Food shows "It’s a surprise";
  - I'm in → email arrives;
  - reopen → "You said you’re in";
  - Change answer → Different time → his slot greyed out → email "Update: …";
  - an old Her-pick link still works end to end;
  - edit the setup after planning (remove the chosen time) → "Plan the date to get a link."
- [ ] **Step 3:** Update `README.md` ("How it works": a line on His-plan invites and the `response` field of `/api/notify`). Commit with `git commit -m "docs: His-plan invites in README"`.
