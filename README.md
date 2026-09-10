# Moraview

What does my money look like on a given future date? You describe what comes in
and what goes out — recurring lines and planned one-offs — and the forecast runs
day by day from today to the horizon.

Three interfaces were prototyped over one engine; the **Cashflow River** is the
one being built out. See `docs/interfaces.md` for all three and why, and
`docs/river-roadmap.md` for what is next.

## Run it

```bash
npm install
npm run dev      # Vite dev server; the port is printed
npm test         # Vitest over the domain
npm run check    # svelte-check and tsc
npm run build    # one self-contained HTML file in dist-app/
```

The build is a single file on purpose, so it can be published as-is.

## Layout

```
src/domain/       money in integer cents, calendar dates, cadences,
                  the day-by-day projection and its rollups — no UI, all tested
src/persistence/  the ScenarioStore port, its browser adapter and a validating codec
src/data/         the example household the app opens on
src/ui/           Svelte components, the colour bands, and the chart's geometry
                  as a pure model (tested separately from its rendering)
tests/            Vitest suites, written before the code they cover
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

Nothing leaves the browser: the scenario is kept in `localStorage` under
`moraview.scenario.v1`, and there is a reset back to the example.
