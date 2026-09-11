# Moraview

What does my money look like on a given future date? You describe what comes in
and what goes out — recurring lines and planned one-offs — and the forecast runs
day by day from today to the horizon.

Three interfaces were prototyped over one engine; the **Cashflow River** is the
one being built out. See `docs/interfaces.md` for all three and why, and
`docs/river-roadmap.md` for what is next.

## What it does

- **A ledger you can actually type into** — accounts, every line editable in
  place, cadences, payment-day rules, yearly rises, guesses with a range.
- **One sentence at the top** saying what happens and when: *"You are fine until
  24 October, then under your €2,500 buffer — 73 days of it across 8 stretches,
  and overdrawn from 2 November."* What the guesses could do to that is said
  separately, never as fact.
- **The smallest fix.** On demand, a search for the least disruptive single
  change that clears the first tight stretch — put off a one-off, trim a line,
  split a payment — with the ones that clear everything marked.
- **Dials over the ledger.** Scale what comes in, day-to-day spending, or the
  transfers to savings without touching what you typed; keep the figures or
  throw them away.
- **Two rivers side by side.** Pin a baseline, change something, see what it did
  month by month.
- **Named ledgers with a version history**, kept in the browser, and a print
  stylesheet for the kitchen-table conversation.

## Run it

```bash
npm install
npm run dev      # Vite dev server; the port is printed
npm test         # Vitest over the domain
npm run check    # svelte-check and tsc
npm run bench    # what a change costs
npm run build    # one self-contained HTML file in dist-app/
```

The build is a single file on purpose, so it can be published as-is.

## Layout

```
src/domain/       money in integer cents, calendar dates, cadences, payment-day
                  rules, the day-by-day projection and the band around it, the
                  rollups, the tight stretches, the sentence, the fix search and
                  the what-if layer — no UI, all tested
src/persistence/  the LedgerStore port, its browser adapter (named ledgers,
                  version history) and a validating codec
src/data/         the example household the app opens on
src/ui/           Svelte components, the colour bands, and the chart's geometry
                  as a pure model (tested separately from its rendering)
tests/            Vitest suites, written before the code they cover
scripts/bench.mjs what a change costs, so performance claims stay honest
legacy/           the three original single-file prototypes and their inlining build
dist/             the prototypes as published
docs/             the interfaces, the decision, the roadmap, screenshots
```

## How it is put together

- **Money is integer cents.** Euros exist only where a person types or reads
  one. The float prototype leaked (a monthly net of `2142.0199999999995`).
- **Dates are UTC calendar days** held as `YYYY-MM-DD`, so a summer-time change
  cannot move a payment.
- **One cadence registry.** Each cadence knows its label, its average rate per
  month and how to find its nth occurrence; adding one is a new entry, not an
  edit to the projection.
- **One projection.** `project(scenario)` is the only place a line becomes
  money; the month table, the breakdowns and the chart all read it. Every
  movement carries the likely amount and the two ends of its guess.
- **Guesses add in quadrature.** The band around the balance grows with the
  square root of the number of guessed occurrences, not their sum: a household
  does not have a dear grocery week every week for two years. Warnings read the
  low edge of that band, never the likely line.
- **Storage is behind a port.** The browser adapter is the only one today; a
  remote one can be added without the app knowing.

Nothing leaves the browser: ledgers and their version histories are kept in
`localStorage`, and there is a reset back to the example. Where a ledger should
live beyond one browser is still an open decision — whatever it is implements
`LedgerStore`, and the browser copy stays as the offline fallback.
