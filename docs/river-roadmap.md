# Cashflow River — roadmap (proposal)

Where it stands: the river reads and re-cuts correctly, but only two things can
be changed per line (its amount, and whether it counts), the household is a
hard-coded sample, and nothing survives a different browser. The order below
fixes those in the order that makes the tool usable by a real household.

## M1 — Get real numbers in

The one thing standing between the prototype and daily use.

- **Accounts strip.** Edit balances, name accounts, choose which ones the
  forecast counts (the savings account is already excluded — that should be a
  switch, not a flag in the source).
- **Full line editor.** Today only the amount is editable. Needs: label,
  cadence, anchor day, first and last date, category, delete. Editing a line
  should open in place, not in a modal — the ledger is the interface.
- **Statement import.** Paste a bank CSV (or a Belgian CODA/CAMT export) into a
  textarea; group the rows by counterparty and amount, cluster the intervals,
  and propose recurring lines to accept or skip. Detection does not have to be
  clever to beat typing twenty lines by hand.
- **Export and import as text.** The artifact viewer sandbox blocks downloads a
  page starts itself, so "save my ledger" has to be copy-to-clipboard JSON and
  paste-back, not a file link. Worth knowing before designing that flow.

## M2 — Make the number trustworthy

- **Ranges on estimates.** Groceries, fuel, leisure and the freelance invoices
  are estimates. Give them a low/likely/high and draw the bed as a cone; the
  headline answer becomes a range on those dates, which is the honest reading.
- **Payment-day rules.** "Last working day of the month", weekend and Belgian
  bank-holiday shifting, quarterly VAT on the 20th. Salary on the 27th is a
  simplification that will drift against the real statement.
- **Indexation and end dates.** A yearly percentage rise per line (rent,
  insurance, energy) and a visible end date (the kitchen loan already has one,
  but nothing shows it).
- **Engine tests.** `node:test` over the occurrence generator: month-end
  clamping (31st in February), leap day, cadence end dates, a line whose anchor
  is in the past, and the UTC-only arithmetic. Wire it into the build.

## M3 — Answer "so what"

- **Tight-day panel.** List every breach of the buffer, and for each one the
  smallest fix: move a planned one-off three weeks later, or cut the savings
  transfer for two months. The forecast already knows enough to search for this.
- **Compare two rivers.** Baseline against a variant (solar panels in June, car
  sold, one salary drops) — two beds overlaid, a per-month delta strip.
- **A sentence at the top.** Plain language: "You are fine until 24 October,
  then €254 short of your buffer for eleven days." That is the answer most
  people came for.

## M4 — Keep it, share it

- **Cross-device state.** Browser storage is per-viewer and per-browser; a
  household ledger needs the artifact runtime's own storage (and the viewer
  identity that goes with it). Check the capability roster before designing
  this, then keep the local copy as the offline fallback.
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

## Suggested first slice

M1's line editor and accounts strip, then the paste import. That turns the
prototype into something a household can put its own numbers into, which is the
only way to find out whether the river actually answers the question.
