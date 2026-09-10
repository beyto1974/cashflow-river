# Cashflow River — roadmap

Where it stands: the river is rebuilt as an app on a tested domain, and it takes
real input. What follows makes the number trustworthy, then answers "so what".

## M1 — Get real numbers in — **done**

- **Accounts strip.** Rename an account, retype a balance, tick which accounts
  the forecast counts, add and remove accounts.
- **Full line editor, in place.** Label, amount, direction, recurring or
  one-off, cadence, the date it falls due, an optional start and end, category,
  whether the amount is a guess — plus delete and mute.
- **Add a line**, set the buffer and the horizon.
- **Kept in the browser**, written through on every change, with a reset back to
  the example. Storage sits behind a port so another backing store can be
  dropped in.

Left out on purpose: file import and export. Where a saved ledger should live
beyond this browser is still open — an object store was tried and backed out —
so the port stays and the decision waits.

## M2 — Make the number trustworthy

Each step is one slice: tests first, then the code, then the ledger and chart
catch up. The first three change the domain, so they come before anything that
reads it.

1. **Per-occurrence amounts.** `occurrenceAmount(line, date)` replaces the flat
   `line.amount` inside the projection, so an amount can depend on when it
   falls. Nothing changes on screen; it is the seam the next two steps need.
   *Tests:* a line with no rules returns its own amount on every occurrence.
2. **Indexation.** A yearly percentage rise per line from a given date — rent,
   insurance, energy. *Tests:* 2% a year lands on the anniversary, not on 1
   January; a rise applied to a month-end line keeps its day; the rise compounds
   over three years.
3. **Ranges on the estimated lines.** Groceries, fuel, leisure and the freelance
   invoices carry a low and a high as well as a likely figure. The projection
   returns three balances per day, the answer becomes a range on the read-out
   date, and the bed is drawn as a cone with the likely line inside it.
   *Tests:* the cone never crosses itself; a scenario with no estimates has a
   cone of zero width; the low band drives the buffer warnings, not the likely
   one.
4. **Payment-day rules.** `exact`, `last working day of the month`, and `shift
   off a weekend or public holiday`. The holiday list comes in through a small
   port so the calendar is data, not code. *Tests:* a salary anchored to the
   27th moves when the 27th is a Sunday; a rule that shifts backwards never
   moves a payment into the past.
5. **Ended lines.** A line whose end date has passed is shown as ended in the
   ledger instead of quietly contributing nothing.

## M3 — Answer "so what"

6. **Stretches, not days.** Group the days under the buffer into stretches with
   a start, an end and a depth. *Tests:* two breaches a day apart are one
   stretch; a single day is a stretch of one.
7. **A sentence at the top.** "You are fine until 24 October, then €254 short of
   your buffer for eleven days." Pure function over the projection, so it is
   tested rather than eyeballed.
8. **Smallest fix.** For each stretch, search for the least disruptive change
   that clears it: move a planned one-off later, pause the transfer to savings
   for a month or two, or split a one-off in half. *Tests:* the search returns
   the smallest change that works, and nothing when no single change is enough.
9. **The Horizon Dial's dials, here.** The prototype's what-if sliders — scale
   everything coming in, the day-to-day spending, the transfer to savings — as a
   layer over the scenario rather than an edit to it, so it can be thrown away.
   Plus its draggable needle on the bed panel, which answers "what about that
   day" without going through the date field.
10. **Compare two rivers.** Baseline against a variant (solar panels in June,
    car sold, one salary drops): two beds overlaid, a per-month delta strip.

## M4 — Keep it, share it

11. **Pick a backing store.** Still open, and the one decision that needs
    answering rather than building: a small service with a database, an object
    store, or a hosted runtime's own storage. Whatever it is goes behind the
    existing `ScenarioStore` port, with the browser copy kept as the offline
    fallback.
12. **Save, auto-save, restore.** Debounced writes, a revision per save so two
    devices cannot silently overwrite each other, and a list of earlier versions
    to restore from.
13. **Named ledgers.** More than one scenario side by side — the household's
    real one, and the variants worth keeping.
14. **A printable one-pager.** The month table, the bed and the tight days, for
    the conversation the tool is really for.

## M5 — Craft

15. **Recompute cost.** Every keystroke re-projects the whole horizon. Debounce
    the inputs and recompute from the changed month forward.
16. **Phone layout.** At 400px the ledger becomes a sheet you pull up over a
    chart that stays put, instead of forty rows above it.
17. **Spoken detail.** A summary sentence per month column for screen readers,
    and focus that lands where the eye does after a change.
18. **Tests at the edges.** The Playwright drive used by hand during M1 becomes
    a checked-in end-to-end suite, plus a screenshot check of both themes.
19. **Publish.** `npm run build` already emits one self-contained file; wire it
    to a published page so the household can open it without a dev server.
20. **Date the example relative to today.** A stored ledger is now rolled
    forward on load, but the example itself is written with absolute dates
    (10 September 2026 onwards). Opened much later it still reads correctly —
    the footer says which day the forecast starts, and the start date is
    editable — but the story it was built to tell (tight October, short
    November) drifts out of view. Generate its dates from today so the
    illustration always shows the same shape, and keep the fixed-date scenario
    as the tests' fixture.

## Next slice

Steps 1–3. They change the domain, everything else reads it, and the ranges are
what turn a single confident figure into an honest one.
