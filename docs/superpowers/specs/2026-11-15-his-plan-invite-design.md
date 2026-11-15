# His-plan invite — design

Date: 2026-11-15 · Terms follow [CONTEXT.md](../../../CONTEXT.md) · See [ADR 0001](../../adr/0001-his-plan-lives-in-the-link.md)

## Intent

Today every invite is a **Her-pick invite**: he offers options, she builds the **Plan**. Many women like it when the guy takes the lead and just says "be there at 7." The app should market and support both: he can also build the whole Plan himself and send a **His-plan invite**. The pitch becomes "Take the lead, or let her choose."

## Goals

- He can build a complete Plan himself and send it as an invite.
- She can answer a His-plan invite with **I'm in**, **Different time** (a **Counter-time**), or **Can't make it**, and he finds out.
- Both modes get equal billing in the product and the copy.

## Non-goals

- No confirmation loop inside the app. He locks in a Counter-time by texting her.
- No server-side storage of invites beyond the existing short links.
- No way for the app to contact her.

## Anti-goals (failure even if it works)

- Her answer goes nowhere because he left no way to hear back.
- An old link becomes a dead end.
- Her-pick invites change in any way existing users would notice, apart from the new first-visit choice.

## Approaches considered

1. **He walks through her steps (chosen).** "Plan the date" in the creator runs him through the existing invite step screens (area, neighborhood, each question, real spot, When). The result is the same Plan shape the ticket, share text and `/api/notify` already use. Most reuse; the link now carries place data, which must be validated on decode.
2. **Inline in the creator.** One-pick fields and a spot search inside the creator form. All on one page, but it duplicates the spot-search UI.
3. **Free-text plan.** He types the plan and picks a time. Cheapest, but loses real places, map links, and the AI game plan's structure.

Picked 1 for reuse and because his Plan comes out in the exact shape the rest of the app consumes.

## Decided behavior

### First visit
- Neither mode is preselected. The creator first shows two cards: **Take the lead** (His-plan) and **Let her choose** (Her-pick).
- The choice is remembered on his device. After that, the creator opens in the last-used mode, with a switch at the top: **Let her pick** / **I'll plan it**.
- The headline matches the mode: Her-pick keeps "She picks the plan. You just show up."; His-plan uses "You plan it. She just shows up." (exact copy left to the builder).

### Creator, His-plan mode
- **Plan the date** leads the page. It walks him through her step screens using his setup.
- Below it, compact versions of the "Where" and "Questions" sections stay editable: he can turn questions on/off and edit options, times and areas. **Both modes share one setup**, so switching modes loses nothing. The areas he switched on are the ones his walkthrough offers, and the When question's times are the ones she can choose from for a Counter-time.
- In his walkthrough, the "Surprise me" option (**Left to him**) is not offered. Instead, every question except When has a **Keep it a surprise** switch, including questions with no spot (like Vibe) and spot questions where he typed his own answer or Places was down.
- **Day and time are required** and can never be a Surprise.
- **A Surprise hides both his choice and the venue** (she sees "Dinner: it's a surprise", not "Sushi"). The area and neighborhood are always shown to her. Nothing she can see gives a Surprise away: her ticket, the calendar location in anything she sees, and her prefilled "text him" message all leave it out.
- The live preview shows his finished ticket, and he can redo any step.
- **A His-plan invite needs a way to reach him:** a verified email, or text/Instagram as the reply method. Until he has one, the link bar won't make a link and says so ("Add your email or number so you hear her answer").

### What she sees (His-plan invite)
- Intro along the lines of "I planned something. You just show up.", then his Plan as the ticket.
- A Surprise shows as a teaser ("Dinner: it's a surprise") with the area and neighborhood visible. Neither his choice nor the real spot is ever rendered to her.
- Three actions: **I'm in**, **Different time**, **Can't make it**.
- **Different time** opens the existing When step: any day in the next 30 days (`WHEN_DAYS`) counted from when she opens it, at any of his listed times. His own day and time is greyed out.
- **If his date has passed**, "I'm in" is hidden and the ticket says "That night's gone. Pick another?", leading straight to the Counter-time step.
- **Can't make it** looks like today's decline screen, but also emails him (see Emails to him).
- After any answer, if he set text/Instagram, she gets a "text him" button with a prefilled message (for example "Can we do Thu 8 PM instead?"), following the pattern of `declineMessage` and `replyHref`.

### Sending her answer
- In a His-plan invite, the tap is the answer: **I'm in**, confirming a Counter-time, or **Can't make it** emails him straight away. There is no separate "Send it to him" button (Her-pick invites keep theirs).
- If he also set text/Instagram, the "text him" button appears after the email has gone out.

### Changing her answer
- Her device remembers her last answer for that invite. Reopening the link shows "You said you're in · Change answer" (or the matching state).
- She can change her answer. **Change answer** asks her to confirm before sending, so a quick change of mind doesn't use up an email. Each change emails him, and the subject marks it as an update.
- The existing limit of 3 emails per invite applies to all her answers combined. When it's used up, the "text him" button still works.

### Emails to him
- **I'm in:** "<her name>'s in · <day, time>", with his Plan rows (Surprises shown as the real place, since he chose them), the calendar invite (.ics and Google link), and the AI game plan.
- **Counter-time:** "<her name> can't do <day>. How about <new day, time>? Text her to lock it in.", with a calendar invite for the new time.
- **Can't make it:** "<her name> can't make it this time." Every answer emails him, declines included, so an email-only setup still hears back. If she had earlier said I'm in or sent a Counter-time, the email carries a calendar cancellation for that event (same UID, `METHOD:CANCEL`). *(Builder's call, filled in during review.)*
- **Update:** a changed answer uses the same templates with an "Update:" prefix.

## Constraints

- The invite stays entirely in the link (plus the existing short-link store). See ADR 0001.
- Anything decoded from a link is untrusted. The Plan, including place data, is re-validated on decode, the same way `cleanAnswers` in `netlify/functions/notify.ts` re-validates today.
- Existing Her-pick links and drafts keep working unchanged.

## Left to the builder

- The exact field name and shape for the Plan inside `Invite`, and how the link codec versions it. Old links must still decode as Her-pick.
- Moving `cleanAnswers` into shared code so the browser codec and `/api/notify` validate a Plan the same way.
- How `/api/notify` learns which email to send (I'm in / Counter-time / Update). Keep the server deriving the content from the invite plus validated input, never from free text.
- Renaming the code's `SpotPick` `{ kind: 'surprise' }` (which today means **Left to him**) to match the glossary, and how His-plan Surprises are represented.
- Calendar updates: the .ics already uses a stable per-invite UID, so a Counter-time or Update can reuse it (with a higher SEQUENCE) so calendars replace the event instead of adding a second one.
- Storage key for remembering her answer and his last-used mode.
- Final copy for the cards, headlines, teaser and email subjects.
