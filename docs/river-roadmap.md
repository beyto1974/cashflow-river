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

- **Ranges on estimates.** Groceries, fuel, leisure and the freelance invoices
  are estimates. Give them a low/likely/high and draw the bed as a cone; the
  headline answer becomes a range on those dates, which is the honest reading.
- **Payment-day rules.** "Last working day of the month", and shifting a due
  date off a weekend or a public holiday. A salary pinned to the 27th is a
  simplification that will drift against the real statement.
- **Indexation and end dates.** A yearly percentage rise per line (rent,
  insurance, energy) and a visible end date (the kitchen loan already has one,
  but nothing shows it).
- **Engine tests.** `node:test` over the occurrence generator: month-end
  clamping (31st in February), leap day, cadence end dates, a line whose anchor
  is in the past, and the UTC-only arithmetic. Wire it into the build.

## M3 — Answer "so what"

- **The Horizon Dial's dials, here.** The prototype's what-if sliders — scale
  everything coming in, the day-to-day spending, the transfer to savings — and
  its draggable needle, brought into the river. Both are worth having: the
  sliders answer "what if this changed", the needle answers "what about that
  day" without going through a date field.

- **Tight-day panel.** List every breach of the buffer, and for each one the
  smallest fix: move a planned one-off three weeks later, or cut the savings
  transfer for two months. The forecast already knows enough to search for this.
- **Compare two rivers.** Baseline against a variant (solar panels in June, car
  sold, one salary drops) — two beds overlaid, a per-month delta strip.
- **A sentence at the top.** Plain language: "You are fine until 24 October,
  then €254 short of your buffer for eleven days." That is the answer most
  people came for.

## M4 — Keep it, share it

- **Somewhere to keep it.** Browser storage is per-browser: clear the site data
  and the ledger is gone, and a second person cannot see it. Pick a backing
  store (a service, an object store, a hosted runtime's own storage) and put it
  behind the existing `ScenarioStore` port, keeping the local copy as the
  offline fallback.
- **A printable one-pager.** Month table, the bed, the tight days — for the
  kitchen-table conversation the tool is really for.

## M5 — Craft

- **Recompute cost.** Every keystroke currently re-projects 913 days and redraws
  everything. Debounce the inputs, and recompute from the changed month forward
  rather than from today.
- **Keyboard and screen reader.** The river's month columns should be walkable
  with arrow keys the way the Runway Grid's cells are, plus a spoken summary of
  each column.
- **Phone layout.** At 400px the ledger and the river stack; the ledger wants to
  become a sheet you pull up, not 40 rows above the chart.
- **Repo shape.** Engine as a real module with tests, templates split into
  partials, `build.mjs` keeping the single-file publish it does now.

## Next slice

M2: ranges on the estimated lines and the payment-day rules, both of which the
engine's cadence registry and the chart's geometry model are already shaped for.
