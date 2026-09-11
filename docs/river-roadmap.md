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

## M2 — Make the number trustworthy — **done**

Each step was one slice: tests first, then the code, then the ledger and chart
catching up. The first three changed the domain, so they came before anything
that reads it.

1. **Per-occurrence amounts.** *(done)* `occurrenceAmount(line, date)` replaces the flat
   `line.amount` inside the projection, so an amount can depend on when it
   falls. Nothing changes on screen; it is the seam the next two steps need.
   *Tests:* a line with no rules returns its own amount on every occurrence.
2. **Indexation.** *(done)* A yearly percentage rise per line from a given date — rent,
   insurance, energy. *Tests:* 2% a year lands on the anniversary, not on 1
   January; a rise applied to a month-end line keeps its day; the rise compounds
   over three years.
3. **Ranges on the estimated lines.** *(done)* Groceries, fuel, leisure, the
   household and the freelance invoices carry a low and a high as well as a
   likely figure; the read-out says what it could be either way, and the bed
   carries a band around the likely line. The buffer and overdraft warnings read
   the low edge.

   One thing changed while building it. Reading every guess at its worst for
   thirty months assumes the groceries are dear every single week for two and a
   half years, and it drew a band so wide the balance line was a flat smudge in
   the middle of it. Each guessed occurrence is now an independent wobble, so
   the spreads add in quadrature and the band grows with the square root of the
   number of guesses — with each side kept separately, so an off-centre guess
   leans the band the way it actually leans. The per-occurrence extremes are
   still on every movement, so a literal worst case can be shown later if it
   turns out to be wanted.
4. **Payment-day rules.** *(done)* Four rules per line — on that date, the next
   working day, the working day before, the last working day of the month — and
   a list of closed days on the scenario, so the calendar is data rather than
   code. The sequence still counts from the anchor and only the day the money
   moves shifts, so a rule can never make the occurrences drift.

   Still to do here: nothing edits the closed days yet. They validate and load,
   but a household cannot add its own bank holidays from the interface.
5. **Ended lines.** *(done)* A line past its last date is badged as ended, dimmed,
   and left out of the group subtotals — the subtotals now count exactly what
   the forecast counts. A line that has not started yet says when it does.

## M3 — Answer "so what"

6. **Stretches, not days.** *(done)* The days below a line are grouped into
   stretches with a start, an end, the deepest day and how far short it goes.
   The page shows a chip per stretch that moves the read-out to its worst day.
7. **A sentence at the top.** *(done)* The sentence states the likely reading;
   what the guesses could do to it is a second, plainly conditional sentence, so
   a worst case is never dressed as fact.
8. **Smallest fix.** *(done)* On demand, the app searches for the least
   disruptive single change that clears the first tight stretch and offers up to
   four, cheapest first. A transfer to savings may be paused outright; a living
   cost is only ever trimmed. The search aims at the likely reading, not the
   pessimistic edge of the band.
9. **The Horizon Dial's dials, here.** *(done)* Three sliders sit over the
   ledger without changing it — everything coming in, day-to-day and the car,
   transfers to savings — with "keep these figures" to write them in and "put
   the dials back" to throw them away. The needle drags along the bed panel, so
   any day can be read without going near the date field.
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
20. **Date the example relative to today.** *(done)* `sampleScenario(today)`
    generates every anchor, one-off and bank holiday from the day it is opened,
    so the same story shows whenever somebody looks: tight within a couple of
    months, overdrawn a month after that, recovering the following spring. The
    tests run it on three different days and assert the shape rather than the
    dates.

## Next slice

Step 8, the smallest fix — the stretches and the sentence are in place, so the
search has something to aim at. Step 15 (debounce,
and recompute from the changed month forward) has moved up in importance now
that every keystroke re-projects and re-bands the whole horizon. Step 15 (debounce, and recompute from the
changed month forward) has moved up in importance now that every keystroke
re-projects and re-bands the whole horizon.
